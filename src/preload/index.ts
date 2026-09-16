import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
import type { PersistedAppState } from '../shared/app-state'
import type { WorkspaceSelection } from '../shared/workspace'

// Custom APIs for renderer
const api = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  appState: {
    load: (): Promise<PersistedAppState> => ipcRenderer.invoke('app-state:load'),
    save: (state: PersistedAppState): Promise<void> => ipcRenderer.invoke('app-state:save', state)
  },
  agent: {
    getConfig: (): Promise<ModelConfig> => ipcRenderer.invoke('agent:get-config'),
    saveConfig: (input: SaveModelConfigInput): Promise<ModelConfig> =>
      ipcRenderer.invoke('agent:save-config', input),
    getModels: (): Promise<AgentModelInfo[]> => ipcRenderer.invoke('agent:get-models'),
    getResources: (workspacePath?: string): Promise<AgentResources> =>
      ipcRenderer.invoke('agent:get-resources', workspacePath),
    getCustomModels: (): Promise<CustomModelConfig[]> =>
      ipcRenderer.invoke('agent:get-custom-models'),
    saveCustomModel: (input: SaveCustomModelInput): Promise<CustomModelConfig> =>
      ipcRenderer.invoke('agent:save-custom-model', input),
    deleteCustomModel: (id: string): Promise<void> =>
      ipcRenderer.invoke('agent:delete-custom-model', id),
    start: (input: AgentStartInput): Promise<void> => ipcRenderer.invoke('agent:start', input),
    prompt: (taskId: string, message: string): Promise<void> =>
      ipcRenderer.invoke('agent:prompt', taskId, message),
    abort: (taskId: string): Promise<void> => ipcRenderer.invoke('agent:abort', taskId),
    onEvent: (listener: (event: AgentEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, value: AgentEvent): void =>
        listener(value)
      ipcRenderer.on('agent:event', handler)
      return () => ipcRenderer.removeListener('agent:event', handler)
    }
  },
  workspace: {
    chooseDirectory: (): Promise<WorkspaceSelection | null> =>
      ipcRenderer.invoke('workspace:choose-directory'),
    openFolder: (path: string): Promise<void> => ipcRenderer.invoke('workspace:open-folder', path)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
