import { app } from 'electron'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  AgentEvent,
  AgentModelInfo,
  AgentResources,
  AgentStartInput,
  CustomModelConfig,
  ModelConfig,
  SaveCustomModelInput,
  SaveModelConfigInput,
  ThinkingLevel
} from '../shared/agent'
import { ModelConfigStore, customProviderApiKeyEnv } from './model-config'
import {
  loadPiSdk,
  preparePiEnvironment,
  type PiAgentSession,
  type PiAgentSessionEvent,
  type PiModelRuntime,
  type PiSdk
} from './pi-sdk'

type AgentEventSink = (event: AgentEvent) => void

type ActiveSession = {
  ownerId: number
  provider: string
  modelId: string
  thinkingLevel: ThinkingLevel
  workspacePath: string
  session: PiAgentSession
  runtime: PiModelRuntime
  unsubscribe: () => void
}

type PiRuntime = {
  sdk: PiSdk
  runtime: PiModelRuntime
}

const codingAgentPrompt = '你是档案治理工作台中的基础 Agent。请使用简体中文回答。'
const agentToolNames = ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls']
const thinkingLevels: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

export class AgentService {
  private readonly sessions = new Map<string, ActiveSession>()
  private readonly configStore = new ModelConfigStore()

  async getConfig(): Promise<ModelConfig> {
    return this.configStore.get()
  }

  async saveConfig(input: SaveModelConfigInput): Promise<ModelConfig> {
    return this.configStore.save(input)
  }

  async getCustomModels(): Promise<CustomModelConfig[]> {
    return this.configStore.getCustomModels()
  }

  async saveCustomModel(input: SaveCustomModelInput): Promise<CustomModelConfig> {
    const model = await this.configStore.saveCustomModel(input)
    await this.syncPiModels()
    return model
  }

  async deleteCustomModel(id: string): Promise<void> {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error('非法模型标识')
    await this.configStore.deleteCustomModel(id)
    await this.syncPiModels()
  }

  async getModels(): Promise<AgentModelInfo[]> {
    const customProviderIds = new Set(
      (await this.configStore.getCustomModels()).map((model) => model.providerId)
    )
    const { runtime } = await this.createRuntime()
    return runtime
      .getModels()
      .filter(
        (model) =>
          model.provider === 'anthropic' ||
          model.provider === 'openai' ||
          customProviderIds.has(model.provider)
      )
      .map((model) => ({
        provider: model.provider,
        id: model.id,
        name: model.name,
        reasoning: model.reasoning,
        contextWindow: model.contextWindow
      }))
  }

  async getResources(workspacePath?: string): Promise<AgentResources> {
    const modelConfig = await this.configStore.get()
    const workspace = await resolveWorkspacePath(workspacePath)
    const { sdk, runtime } = await this.createRuntime(modelConfig.provider)
    const tools = await this.getToolNames(modelConfig.provider, modelConfig.modelId)
    const agentDir = join(app.getPath('userData'), 'pi')
    const settingsManager = sdk.SettingsManager.create(workspace, agentDir)
    const resourceLoader = new sdk.DefaultResourceLoader({
      cwd: workspace,
      agentDir,
      settingsManager,
      appendSystemPrompt: [codingAgentPrompt]
    })
    await resourceLoader.reload()

    const created = await sdk.createAgentSession({
      cwd: workspace,
      agentDir,
      model: modelConfig.modelId
        ? runtime.getModel(modelConfig.provider, modelConfig.modelId)
        : undefined,
      thinkingLevel: 'off',
      modelRuntime: runtime,
      resourceLoader,
      settingsManager,
      sessionManager: sdk.SessionManager.inMemory(workspace),
      tools
    })

    try {
      const allTools = created.session.getAllTools()
      const toolsByName = new Map(allTools.map((tool) => [tool.name, tool]))
      const builtinNames = new Set(tools)
      const builtinTools = created.session
        .getActiveToolNames()
        .filter((name) => builtinNames.has(name))
        .map((name) => toolsByName.get(name))
        .filter((tool): tool is (typeof allTools)[number] => tool !== undefined)
        .map((tool) => ({
          name: tool.name,
          description: tool.description,
          source: tool.sourceInfo.source,
          path: tool.sourceInfo.path
        }))

      return {
        prompts: resourceLoader.getPrompts().prompts.map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          path: prompt.filePath
        })),
        skills: resourceLoader.getSkills().skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          path: skill.filePath
        })),
        contextFiles: resourceLoader.getAgentsFiles().agentsFiles.map(({ path }) => path),
        builtinTools,
        tools: allTools
          .filter((tool) => tool.sourceInfo.source !== 'builtin')
          .map((tool) => ({
            name: tool.name,
            description: tool.description,
            source: tool.sourceInfo.source,
            path: tool.sourceInfo.path
          }))
      }
    } finally {
      created.session.dispose()
    }
  }

  async start(input: AgentStartInput, ownerId: number, sink: AgentEventSink): Promise<void> {
    validateAgentStartInput(input)
    validateTaskId(input.taskId)
    const config = await this.configStore.get()
    const provider = await this.configStore.ensureProvider(
      input.provider?.trim() || config.provider
    )
    const modelId = input.modelId.trim() || config.modelId
    const thinkingLevel = input.thinkingLevel ?? config.thinkingLevel
    if (!modelId.trim()) throw new Error('模型不能为空，请先在设置中配置模型')
    const tools = await this.getToolNames(provider, modelId)

    const workspacePath = await resolveWorkspacePath(input.workspacePath)
    const current = this.sessions.get(input.taskId)
    if (
      current &&
      current.ownerId === ownerId &&
      current.provider === provider &&
      current.modelId === modelId &&
      current.thinkingLevel === thinkingLevel &&
      current.workspacePath === workspacePath
    ) {
      return
    }

    if (current && current.ownerId !== ownerId) {
      throw new Error('Agent 会话已被其他窗口占用')
    }

    if (current) this.disposeSession(input.taskId, current)

    const { sdk, runtime } = await this.createRuntime(provider)
    const model = runtime.getModel(provider, modelId)
    if (!model) throw new Error(`找不到模型：${provider}/${modelId}`)

    const agentDir = join(app.getPath('userData'), 'pi')
    const sessionDir = join(agentDir, 'sessions')
    await mkdir(sessionDir, { recursive: true })
    const settingsManager = sdk.SettingsManager.create(workspacePath, agentDir)
    const resourceLoader = new sdk.DefaultResourceLoader({
      cwd: workspacePath,
      agentDir,
      settingsManager,
      appendSystemPrompt: [codingAgentPrompt]
    })
    await resourceLoader.reload()

    const sessionManager = await this.getSessionManager(
      sdk,
      input.taskId,
      workspacePath,
      sessionDir
    )
    let session: PiAgentSession
    try {
      session = (
        await sdk.createAgentSession({
          cwd: workspacePath,
          agentDir,
          model,
          thinkingLevel,
          modelRuntime: runtime,
          resourceLoader,
          settingsManager,
          sessionManager,
          tools
        })
      ).session
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error))
    }

    const active: ActiveSession = {
      ownerId,
      provider,
      modelId,
      thinkingLevel,
      workspacePath,
      session,
      runtime,
      unsubscribe: () => {}
    }
    active.unsubscribe = session.subscribe((event) =>
      this.handleEvent(input.taskId, active, sink, event)
    )
    this.sessions.set(input.taskId, active)
  }

  async prompt(taskId: string, ownerId: number, message: string): Promise<void> {
    if (typeof taskId !== 'string' || typeof message !== 'string') {
      throw new Error('Agent 消息参数无效')
    }
    const session = this.getOwnedSession(taskId, ownerId)
    if (!message.trim()) throw new Error('消息不能为空')
    await session.session.prompt(message.trim(), { source: 'interactive' })
  }

  async abort(taskId: string, ownerId: number): Promise<void> {
    const session = this.getOwnedSession(taskId, ownerId)
    await session.session.abort()
  }

  dispose(): void {
    for (const [taskId, session] of this.sessions) this.disposeSession(taskId, session)
    this.sessions.clear()
  }

  private async createRuntime(provider?: string): Promise<PiRuntime> {
    preparePiEnvironment()
    const sdk = await loadPiSdk()
    const agentDir = join(app.getPath('userData'), 'pi')
    await mkdir(agentDir, { recursive: true })
    await this.syncPiModels()
    const runtime = await sdk.ModelRuntime.create({
      credentials: new sdk.InMemoryCredentialStore(),
      modelsPath: join(agentDir, 'models.json'),
      allowModelNetwork: false,
      refreshOnCreate: false
    })

    if (provider) {
      const apiKey = await this.configStore.getApiKey(provider)
      // 自定义供应商允许无鉴权的本地服务；其余供应商必须由 Pi 的 auth 流程判定。
      if (apiKey || provider.startsWith('custom-')) {
        await runtime.setRuntimeApiKey(provider, apiKey || 'not-required')
      }
    }
    return { sdk, runtime }
  }

  private async getToolNames(provider: string, modelId?: string): Promise<string[]> {
    if (!provider.startsWith('custom-')) return agentToolNames
    const model = (await this.configStore.getCustomModels()).find(
      (item) => item.providerId === provider && (!modelId || item.modelId === modelId)
    )
    return model?.supportsTools ? agentToolNames : []
  }

  private async getSessionManager(
    sdk: PiSdk,
    taskId: string,
    workspacePath: string,
    sessionDir: string
  ): Promise<ReturnType<PiSdk['SessionManager']['create']>> {
    const existing = (await sdk.SessionManager.listAll(sessionDir)).find(
      (item) => item.id === taskId
    )
    return existing
      ? sdk.SessionManager.open(existing.path, sessionDir, workspacePath)
      : sdk.SessionManager.create(workspacePath, sessionDir, { id: taskId })
  }

  private handleEvent(
    taskId: string,
    session: ActiveSession,
    sink: AgentEventSink,
    event: PiAgentSessionEvent
  ): void {
    if (this.sessions.get(taskId) !== session) return

    switch (event.type) {
      case 'agent_start':
        sink({ kind: 'run-start', taskId })
        return
      case 'message_update': {
        const update = asRecord(event.assistantMessageEvent)
        if (
          (update?.type === 'text_delta' || update?.type === 'thinking_delta') &&
          typeof update.delta === 'string' &&
          update.delta
        ) {
          sink({
            kind: update.type === 'text_delta' ? 'text' : 'thinking',
            taskId,
            delta: update.delta
          })
        }
        return
      }
      case 'tool_execution_start': {
        const toolCallId = String(event.toolCallId ?? '')
        const toolName = String(event.toolName ?? 'tool')
        const tool = session.session.getAllTools().find((item) => item.name === toolName)
        sink({
          kind: 'tool-start',
          taskId,
          toolCallId,
          toolName,
          input: stringify(event.args),
          source: tool?.sourceInfo.source
        })
        return
      }
      case 'tool_execution_end':
        sink({
          kind: 'tool-end',
          taskId,
          toolCallId: String(event.toolCallId ?? ''),
          toolName: String(event.toolName ?? 'tool'),
          output: stringify(event.result),
          isError: event.isError === true
        })
        return
      case 'auto_retry_end':
        if (event.success === false) {
          sink({
            kind: 'error',
            taskId,
            message: String(event.finalError ?? '模型请求失败')
          })
        }
        return
      case 'agent_end': {
        if (event.willRetry === true) return
        const messages = Array.isArray(event.messages) ? event.messages : []
        const lastMessage = asRecord(messages.at(-1))
        if (typeof lastMessage?.errorMessage === 'string' && lastMessage.errorMessage) {
          sink({ kind: 'error', taskId, message: lastMessage.errorMessage })
        }
        return
      }
      case 'agent_settled':
        sink({ kind: 'run-end', taskId })
        return
      default:
        return
    }
  }

  private disposeSession(taskId: string, session: ActiveSession): void {
    if (this.sessions.get(taskId) === session) this.sessions.delete(taskId)
    session.unsubscribe()
    session.session.dispose()
  }

  private getOwnedSession(taskId: string, ownerId: number): ActiveSession {
    const session = this.sessions.get(taskId)
    if (!session || session.ownerId !== ownerId) throw new Error('Agent 会话不存在或窗口无权访问')
    return session
  }

  private async syncPiModels(): Promise<void> {
    const customModels = await this.configStore.getRuntimeCustomModels()
    const providers = new Map<
      string,
      {
        name: string
        baseUrl: string
        apiKey: string
        api: CustomModelConfig['protocol']
        models: Array<Record<string, unknown>>
      }
    >()

    for (const model of customModels) {
      const provider = providers.get(model.providerId) ?? {
        name: model.providerName,
        baseUrl: model.endpoint,
        apiKey: `$${customProviderApiKeyEnv(model.providerId)}`,
        api: model.protocol,
        models: []
      }
      provider.models.push({
        id: model.modelId,
        name: model.modelId,
        api: model.protocol,
        reasoning: false,
        input: model.supportsImages ? ['text', 'image'] : ['text'],
        contextWindow: model.inputContextLength,
        maxTokens: model.outputContextLength
      })
      providers.set(model.providerId, provider)
    }

    const modelsPath = join(app.getPath('userData'), 'pi', 'models.json')
    await mkdir(join(app.getPath('userData'), 'pi'), { recursive: true })
    await writeFile(
      modelsPath,
      JSON.stringify({ providers: Object.fromEntries(providers) }, null, 2),
      'utf8'
    )
  }
}

async function resolveWorkspacePath(workspacePath: string | undefined): Promise<string> {
  const fallback = join(app.getPath('userData'), 'agent-workspace')
  const candidate = workspacePath?.trim() ? resolve(workspacePath) : fallback
  try {
    const info = await stat(candidate)
    if (!info.isDirectory()) throw new Error('工作空间不是目录')
  } catch {
    if (candidate !== fallback) throw new Error('工作空间不存在或不可访问')
    await mkdir(candidate, { recursive: true })
  }
  return candidate
}

function validateTaskId(taskId: string): void {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(taskId)) throw new Error('非法任务标识')
}

function validateAgentStartInput(input: AgentStartInput): void {
  if (!input || typeof input !== 'object') throw new Error('Agent 参数无效')
  if (typeof input.taskId !== 'string') throw new Error('任务标识无效')
  if (typeof input.provider !== 'string') throw new Error('模型提供方无效')
  if (typeof input.modelId !== 'string') throw new Error('模型标识无效')
  if (input.workspacePath !== undefined && typeof input.workspacePath !== 'string') {
    throw new Error('工作空间路径无效')
  }
  if (input.thinkingLevel !== undefined && !thinkingLevels.includes(input.thinkingLevel)) {
    throw new Error('不支持的思考级别')
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
