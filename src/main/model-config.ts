import { app, safeStorage } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  AgentProvider,
  CustomModelConfig,
  ModelConfig,
  SaveCustomModelInput,
  SaveModelConfigInput,
  ThinkingLevel
} from '../shared/agent'
import { defaultModelConfig } from '../shared/agent'

type StoredCustomModel = Omit<CustomModelConfig, 'apiKeyConfigured'> & {
  encryptedApiKey: string
}

type StoredModelConfig = {
  provider: string
  modelId: string
  thinkingLevel: ThinkingLevel
  apiKeys: Record<string, string>
  customModels: StoredCustomModel[]
}

type RuntimeCustomModel = CustomModelConfig & { apiKey: string }

const builtInProviders: AgentProvider[] = ['anthropic', 'openai']
const thinkingLevels: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
const defaultInputContextLength = 128_000
const defaultOutputContextLength = 8_192

const providerEnv: Partial<Record<AgentProvider, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY'
}

export class ModelConfigStore {
  private readonly filePath = join(app.getPath('userData'), 'config', 'model.json')
  private current: StoredModelConfig | null = null

  async get(): Promise<ModelConfig> {
    return this.toPublic(await this.load())
  }

  async save(input: SaveModelConfigInput): Promise<ModelConfig> {
    const current = await this.load()
    this.validate(input, current)

    const provider = input.provider.trim()
    const next: StoredModelConfig = {
      ...current,
      provider,
      modelId: input.modelId.trim(),
      thinkingLevel: input.thinkingLevel ?? current.thinkingLevel,
      apiKeys: { ...current.apiKeys }
    }

    if (input.apiKey !== undefined && input.apiKey.trim()) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('系统安全存储不可用，无法保存 API Key')
      }
      next.apiKeys[provider] = safeStorage.encryptString(input.apiKey.trim()).toString('base64')
    }

    await this.persist(next)
    return this.toPublic(next)
  }

  async getCustomModels(): Promise<CustomModelConfig[]> {
    const config = await this.load()
    return config.customModels.map((model) => this.toPublicCustomModel(model))
  }

  async ensureProvider(provider: string): Promise<string> {
    const normalized = provider.trim()
    const config = await this.load()
    if (!isKnownProvider(normalized, config.customModels)) throw new Error('不支持的模型提供方')
    return normalized
  }

  async saveCustomModel(input: SaveCustomModelInput): Promise<CustomModelConfig> {
    const normalized = this.normalizeCustomModelInput(input)
    const current = await this.load()
    const providerId = createProviderId(normalized.providerName, normalized.endpoint)
    const existingIndex = input.id
      ? current.customModels.findIndex((model) => model.id === input.id)
      : current.customModels.findIndex(
          (model) =>
            model.providerId === providerId &&
            model.modelId === normalized.modelId &&
            model.protocol === normalized.protocol
        )
    if (input.id && existingIndex < 0) throw new Error('自定义模型不存在')
    const existing = existingIndex >= 0 ? current.customModels[existingIndex] : undefined
    const model: StoredCustomModel = {
      id: existing?.id ?? createModelId(providerId, normalized.modelId),
      providerId,
      providerName: normalized.providerName,
      endpoint: normalized.endpoint,
      modelId: normalized.modelId,
      protocol: normalized.protocol,
      supportsTools: normalized.supportsTools,
      supportsImages: normalized.supportsImages,
      inputContextLength: normalized.inputContextLength,
      outputContextLength: normalized.outputContextLength,
      encryptedApiKey: normalized.apiKey
        ? this.encryptApiKey(normalized.apiKey)
        : (existing?.encryptedApiKey ?? '')
    }

    const customModels = [...current.customModels]
    if (existingIndex >= 0) customModels[existingIndex] = model
    else customModels.unshift(model)

    const next: StoredModelConfig = { ...current, customModels }
    await this.persist(next)
    return this.toPublicCustomModel(model)
  }

  async deleteCustomModel(id: string): Promise<void> {
    const current = await this.load()
    const customModels = current.customModels.filter((model) => model.id !== id)
    if (customModels.length === current.customModels.length) return

    const next: StoredModelConfig = {
      ...current,
      customModels,
      ...(customModels.some((model) => model.providerId === current.provider)
        ? {}
        : builtInProviders.includes(current.provider as AgentProvider)
          ? {}
          : { provider: defaultModelConfig.provider, modelId: '' })
    }
    await this.persist(next)
  }

  async getApiKey(provider: string): Promise<string | undefined> {
    const config = await this.load()
    const encrypted = config.apiKeys[provider]
    if (encrypted) return this.decryptApiKey(encrypted)

    const custom = config.customModels.find((model) => model.providerId === provider)
    return custom?.encryptedApiKey ? this.decryptApiKey(custom.encryptedApiKey) : undefined
  }

  async getRuntimeCustomModels(): Promise<RuntimeCustomModel[]> {
    const config = await this.load()
    return config.customModels.map((model) => ({
      ...this.toPublicCustomModel(model),
      apiKey: model.encryptedApiKey ? this.decryptApiKey(model.encryptedApiKey) : ''
    }))
  }

  getProviderEnv(provider: string): string | undefined {
    return providerEnv[provider as AgentProvider] ?? customProviderApiKeyEnv(provider)
  }

  private async load(): Promise<StoredModelConfig> {
    if (this.current) return this.current

    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<StoredModelConfig>
      const customModels = normalizeStoredCustomModels(parsed.customModels)
      const provider = isKnownProvider(parsed.provider, customModels)
        ? parsed.provider!.trim()
        : defaultModelConfig.provider
      const modelId =
        Array.isArray(parsed.customModels) && typeof parsed.modelId === 'string'
          ? parsed.modelId.trim()
          : ''
      const thinkingLevel = thinkingLevels.includes(parsed.thinkingLevel as ThinkingLevel)
        ? (parsed.thinkingLevel as ThinkingLevel)
        : defaultModelConfig.thinkingLevel
      this.current = {
        provider,
        modelId,
        thinkingLevel,
        apiKeys: isStringRecord(parsed.apiKeys) ? parsed.apiKeys : {},
        customModels
      }
    } catch {
      this.current = {
        provider: defaultModelConfig.provider,
        modelId: '',
        thinkingLevel: defaultModelConfig.thinkingLevel,
        apiKeys: {},
        customModels: []
      }
    }

    return this.current
  }

  private async persist(config: StoredModelConfig): Promise<void> {
    const directory = join(app.getPath('userData'), 'config')
    const tempPath = `${this.filePath}.tmp`
    await mkdir(directory, { recursive: true })
    await writeFile(tempPath, JSON.stringify(config, null, 2), 'utf8')
    await rename(tempPath, this.filePath)
    this.current = config
  }

  private validate(input: SaveModelConfigInput, current: StoredModelConfig): void {
    const provider = input.provider.trim()
    if (!isKnownProvider(provider, current.customModels)) throw new Error('不支持的模型提供方')
    if (input.thinkingLevel && !thinkingLevels.includes(input.thinkingLevel)) {
      throw new Error('不支持的思考级别')
    }
  }

  private normalizeCustomModelInput(input: SaveCustomModelInput): SaveCustomModelInput & {
    inputContextLength: number
    outputContextLength: number
    apiKey: string
  } {
    const providerName = input.providerName.trim()
    const endpoint = input.endpoint.trim().replace(/\/$/, '')
    const modelId = input.modelId.trim()
    const apiKey = input.apiKey?.trim() ?? ''
    if (!providerName) throw new Error('供应商名称不能为空')
    if (!modelId) throw new Error('模型名称不能为空')
    try {
      const url = new URL(endpoint)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      throw new Error('接口地址必须是 http 或 https 地址')
    }
    if (!['openai-completions', 'openai-responses'].includes(input.protocol)) {
      throw new Error('不支持的接口形式')
    }
    const inputContextLength = input.inputContextLength ?? defaultInputContextLength
    const outputContextLength = input.outputContextLength ?? defaultOutputContextLength
    if (!isPositiveInteger(inputContextLength) || !isPositiveInteger(outputContextLength)) {
      throw new Error('上下文长度必须是正整数')
    }
    return {
      ...input,
      providerName,
      endpoint,
      modelId,
      apiKey,
      inputContextLength: Math.floor(inputContextLength),
      outputContextLength: Math.floor(outputContextLength)
    }
  }

  private encryptApiKey(apiKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储不可用，无法保存 API Key')
    }
    return safeStorage.encryptString(apiKey).toString('base64')
  }

  private decryptApiKey(encrypted: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储不可用，无法读取 API Key')
    }
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  }

  private toPublic(config: StoredModelConfig): ModelConfig {
    return {
      provider: config.provider,
      modelId: config.modelId,
      thinkingLevel: config.thinkingLevel,
      apiKeyConfigured: Boolean(
        config.apiKeys[config.provider] ??
        config.customModels.find((model) => model.providerId === config.provider)?.encryptedApiKey
      )
    }
  }

  private toPublicCustomModel(model: StoredCustomModel): CustomModelConfig {
    const publicModel = Object.fromEntries(
      Object.entries(model).filter(([key]) => key !== 'encryptedApiKey')
    ) as Omit<StoredCustomModel, 'encryptedApiKey'>
    return { ...publicModel, apiKeyConfigured: Boolean(model.encryptedApiKey) }
  }
}

export function customProviderApiKeyEnv(providerId: string): string {
  return `KAIFANG_CUSTOM_API_KEY_${hashString(providerId).toString(36).toUpperCase()}`
}

function normalizeStoredCustomModels(value: unknown): StoredCustomModel[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isStoredCustomModel(item)) return []
    return [
      {
        ...item,
        providerName: item.providerName.trim(),
        endpoint: item.endpoint.trim().replace(/\/$/, ''),
        modelId: item.modelId.trim()
      }
    ]
  })
}

function isStoredCustomModel(value: unknown): value is StoredCustomModel {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<StoredCustomModel>
  return (
    typeof item.id === 'string' &&
    typeof item.providerId === 'string' &&
    typeof item.providerName === 'string' &&
    typeof item.endpoint === 'string' &&
    typeof item.modelId === 'string' &&
    (item.protocol === 'openai-completions' || item.protocol === 'openai-responses') &&
    typeof item.supportsTools === 'boolean' &&
    typeof item.supportsImages === 'boolean' &&
    isPositiveInteger(item.inputContextLength) &&
    isPositiveInteger(item.outputContextLength) &&
    typeof item.encryptedApiKey === 'string' &&
    Boolean(item.providerId.trim()) &&
    Boolean(item.providerName.trim()) &&
    Boolean(item.endpoint.trim()) &&
    Boolean(item.modelId.trim())
  )
}

function isKnownProvider(provider: unknown, customModels: readonly StoredCustomModel[]): boolean {
  if (typeof provider !== 'string' || !provider.trim()) return false
  return (
    builtInProviders.includes(provider.trim() as AgentProvider) ||
    customModels.some((model) => model.providerId === provider.trim())
  )
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string')
  )
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function createProviderId(providerName: string, endpoint: string): string {
  const slug =
    providerName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 32) || 'provider'
  return `custom-${slug}-${hashString(`${providerName}\n${endpoint}`).toString(36)}`
}

function createModelId(providerId: string, modelId: string): string {
  return `custom-model-${hashString(`${providerId}\n${modelId}`).toString(36)}`
}

function hashString(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
