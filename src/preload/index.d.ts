import { ElectronAPI } from '@electron-toolkit/preload'

export interface WindowControls {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
    }
  }
}
