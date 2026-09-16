import { ElectronAPI } from '@electron-toolkit/preload'
import type { PersistedAppState } from '../shared/app-state'
import type {
  AgentResources,
  AgentEvent,
  AgentModelInfo,
  AgentStartInput,
  CustomModelConfig,
  ModelConfig,
  SaveCustomModelInput,
  SaveModelConfigInput
} from '../shared/agent'
import type { WorkspaceSelection } from '../shared/workspace'

export interface WindowControls {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
}

export interface AgentApi {
  getConfig: () => Promise<ModelConfig>
  saveConfig: (input: SaveModelConfigInput) => Promise<ModelConfig>
  getModels: () => Promise<AgentModelInfo[]>
  getResources: (workspacePath?: string) => Promise<AgentResources>
  getCustomModels: () => Promise<CustomModelConfig[]>
  saveCustomModel: (input: SaveCustomModelInput) => Promise<CustomModelConfig>
  deleteCustomModel: (id: string) => Promise<void>
  start: (input: AgentStartInput) => Promise<void>
  prompt: (taskId: string, message: string) => Promise<void>
  abort: (taskId: string) => Promise<void>
  onEvent: (listener: (event: AgentEvent) => void) => () => void
}

export interface WorkspaceApi {
  chooseDirectory: () => Promise<WorkspaceSelection | null>
  openFolder: (path: string) => Promise<void>
}

export interface AppStateApi {
  load: () => Promise<PersistedAppState>
  save: (state: PersistedAppState) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      appState: AppStateApi
      agent: AgentApi
      workspace: WorkspaceApi
    }
  }
}
