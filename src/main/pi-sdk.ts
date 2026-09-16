import { app } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ThinkingLevel } from '../shared/agent'

export type PiAssistantMessageEvent = {
  type: string
  delta?: unknown
}

export type PiAgentSessionEvent = {
  type: string
  [key: string]: unknown
}

export type PiModel = {
  id: string
  provider: string
  name: string
  reasoning: boolean
  contextWindow: number
  [key: string]: unknown
}

export type PiToolInfo = {
  name: string
  description: string
  sourceInfo: {
    path: string
    source: string
  }
}

export type PiResourceLoader = {
  getAgentsFiles(): { agentsFiles: Array<{ path: string; content: string }> }
  getPrompts(): {
    prompts: Array<{ name: string; description: string; filePath: string }>
  }
  getSkills(): {
    skills: Array<{ name: string; description: string; filePath: string }>
  }
  reload(): Promise<void>
}

export type PiSessionManagerInfo = {
  id: string
  path: string
}

export type PiSessionManager = {
  getSessionId(): string
}

export type PiAgentSession = {
  prompt(text: string, options?: { source?: 'interactive' | 'rpc' | 'extension' }): Promise<void>
  abort(): Promise<void>
  dispose(): void
  subscribe(listener: (event: PiAgentSessionEvent) => void): () => void
  getAllTools(): PiToolInfo[]
  getActiveToolNames(): string[]
  resourceLoader: PiResourceLoader
  promptTemplates: ReadonlyArray<{ name: string; description: string; filePath: string }>
}

export type PiSettingsManager = Record<string, unknown>

export type PiCredentialStore = Record<string, unknown>

export type PiModelRuntime = {
  getModels(): readonly PiModel[]
  getModel(provider: string, modelId: string): PiModel | undefined
  setRuntimeApiKey(provider: string, apiKey: string): Promise<void>
}

export type PiSdk = {
  createAgentSession(options: {
    cwd: string
    agentDir: string
    modelRuntime: PiModelRuntime
    model?: PiModel
    thinkingLevel?: ThinkingLevel
    sessionManager: PiSessionManager
    settingsManager: PiSettingsManager
    resourceLoader: PiResourceLoader
    tools?: string[]
  }): Promise<{ session: PiAgentSession }>
  DefaultResourceLoader: new (options: {
    cwd: string
    agentDir: string
    settingsManager: PiSettingsManager
    appendSystemPrompt?: string[]
  }) => PiResourceLoader
  ModelRuntime: {
    create(options: {
      credentials: PiCredentialStore
      modelsPath: string
      allowModelNetwork: boolean
      refreshOnCreate: boolean
    }): Promise<PiModelRuntime>
  }
  SessionManager: {
    list(cwd: string, sessionDir: string): Promise<PiSessionManagerInfo[]>
    listAll(sessionDir: string): Promise<PiSessionManagerInfo[]>
    open(path: string, sessionDir: string, cwdOverride?: string): PiSessionManager
    create(cwd: string, sessionDir: string, options?: { id?: string }): PiSessionManager
    inMemory(cwd: string): PiSessionManager
  }
  SettingsManager: {
    create(cwd: string, agentDir: string): PiSettingsManager
  }
  InMemoryCredentialStore: new () => PiCredentialStore
}

let sdkPromise: Promise<PiSdk> | undefined

export function preparePiEnvironment(): void {
  process.env.PI_OFFLINE = '1'
  process.env.PI_CODING_AGENT_DIR = join(app.getPath('userData'), 'pi')
  process.env.PI_PACKAGE_DIR = app.isPackaged
    ? join(process.resourcesPath, 'pi')
    : join(app.getAppPath(), 'resources', 'pi')
}

export function loadPiSdk(): Promise<PiSdk> {
  if (!sdkPromise) {
    preparePiEnvironment()
    const sdkPath = join(
      app.isPackaged
        ? join(process.resourcesPath, 'pi')
        : join(app.getAppPath(), 'resources', 'pi'),
      'sdk.js'
    )
    sdkPromise = import(pathToFileURL(sdkPath).href) as Promise<PiSdk>
  }
  return sdkPromise
}
