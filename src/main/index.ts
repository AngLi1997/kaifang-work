import { app, dialog, shell, BrowserWindow, ipcMain } from 'electron'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { AgentStartInput, SaveCustomModelInput, SaveModelConfigInput } from '../shared/agent'
import type { WorkspaceFileEntry, WorkspaceSelection } from '../shared/workspace'
import { AppStateStore } from './app-state-store'
import { AgentService } from './agent-service'

const agentService = new AgentService()
const appStateStore = new AppStateStore()
const selectedWorkspacePaths = new Set<string>()

// 无边框窗口的窗口控制由渲染层通过 preload 暴露的 IPC 调用。
function registerWindowControls(): void {
  const windowOf = (event: Electron.IpcMainEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.on('window:minimize', (event) => windowOf(event)?.minimize())
  ipcMain.on('window:toggle-maximize', (event) => {
    const win = windowOf(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', (event) => windowOf(event)?.close())
}

function registerAppStateIpc(): void {
  const windowOf = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.handle('app-state:load', (event) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return appStateStore.load()
  })
  ipcMain.handle('app-state:save', (event, state: unknown) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return appStateStore.save(state)
  })
}

function registerAgentIpc(): void {
  const windowOf = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.handle('agent:get-config', (event) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return agentService.getConfig()
  })
  ipcMain.handle('agent:save-config', (event, input: SaveModelConfigInput) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return agentService.saveConfig(input)
  })
  ipcMain.handle('agent:get-models', (event) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return agentService.getModels()
  })
  ipcMain.handle('agent:get-resources', async (event, workspacePath?: unknown) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    if (workspacePath !== undefined && typeof workspacePath !== 'string') {
      throw new Error('工作空间路径无效')
    }
    const path = workspacePath?.trim()
    if (path && !(await isAuthorizedWorkspacePath(path, selectedWorkspacePaths))) {
      throw new Error('工作空间路径未经授权')
    }
    return agentService.getResources(path)
  })
  ipcMain.handle('agent:get-custom-models', (event) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    return agentService.getCustomModels()
  })
  ipcMain.handle('agent:save-custom-model', (event, input: SaveCustomModelInput) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    assertSaveCustomModelInput(input)
    return agentService.saveCustomModel(input)
  })
  ipcMain.handle('agent:delete-custom-model', (event, id: string) => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    if (typeof id !== 'string') throw new Error('非法模型标识')
    return agentService.deleteCustomModel(id)
  })
  ipcMain.handle('agent:start', async (event, input: AgentStartInput) => {
    const win = windowOf(event)
    if (!win) throw new Error('窗口不存在')
    if (!input || typeof input !== 'object') throw new Error('Agent 参数无效')
    if (typeof input.workspacePath !== 'undefined' && typeof input.workspacePath !== 'string') {
      throw new Error('工作空间路径无效')
    }
    const workspacePath = input.workspacePath?.trim()
    if (
      workspacePath &&
      !(await isAuthorizedWorkspacePath(workspacePath, selectedWorkspacePaths))
    ) {
      throw new Error('工作空间路径未经授权')
    }
    await agentService.start({ ...input, workspacePath }, event.sender.id, (agentEvent) => {
      if (!win.isDestroyed()) win.webContents.send('agent:event', agentEvent)
    })
  })
  ipcMain.handle('agent:prompt', (event, taskId: string, message: string) =>
    agentService.prompt(taskId, event.sender.id, message)
  )
  ipcMain.handle('agent:abort', (event, taskId: string) =>
    agentService.abort(taskId, event.sender.id)
  )
}

function registerWorkspaceIpc(): void {
  const windowOf = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender)

  ipcMain.handle(
    'workspace:choose-directory',
    async (event): Promise<WorkspaceSelection | null> => {
      const win = windowOf(event)
      if (!win) throw new Error('窗口不存在')
      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null

      const path = resolve(result.filePaths[0])
      const info = await stat(path)
      if (!info.isDirectory()) throw new Error('选择的路径不是目录')
      selectedWorkspacePaths.add(path)
      return { path, name: basename(path), files: await listWorkspaceFiles(path) }
    }
  )

  ipcMain.handle('workspace:open-folder', async (event, path: string): Promise<void> => {
    if (!windowOf(event)) throw new Error('窗口不存在')
    if (
      typeof path !== 'string' ||
      !(await isAuthorizedWorkspacePath(path, selectedWorkspacePaths))
    ) {
      throw new Error('工作空间路径未经授权')
    }
    const error = await shell.openPath(resolve(path))
    if (error) throw new Error(error)
  })
}

async function isAuthorizedWorkspacePath(
  path: string,
  selectedPaths: Set<string>
): Promise<boolean> {
  const resolvedPath = resolve(path)
  if (selectedPaths.has(resolvedPath)) return true
  const state = await appStateStore.load()
  const persisted = state.workspaces.some(
    (workspace) => workspace.path !== undefined && resolve(workspace.path) === resolvedPath
  )
  if (persisted) selectedPaths.add(resolvedPath)
  return persisted
}

async function listWorkspaceFiles(rootPath: string): Promise<WorkspaceFileEntry[]> {
  const files: WorkspaceFileEntry[] = []
  const pending = [{ absolutePath: rootPath, relativePath: '', depth: 0 }]
  const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'out'])
  const maxFiles = 240
  const maxDepth = 5

  while (pending.length && files.length < maxFiles) {
    const current = pending.shift()
    if (!current) break
    let entries
    try {
      entries = await readdir(current.absolutePath, { withFileTypes: true })
    } catch {
      continue
    }
    entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))

    for (const entry of entries) {
      if (files.length >= maxFiles || entry.name.startsWith('.')) continue
      const entryRelativePath = current.relativePath
        ? `${current.relativePath}/${entry.name}`
        : entry.name
      const entryAbsolutePath = join(current.absolutePath, entry.name)

      if (entry.isDirectory()) {
        files.push({
          relativePath: entryRelativePath,
          name: entryRelativePath,
          kind: 'folder',
          meta: '文件夹'
        })
        if (current.depth < maxDepth && !ignoredDirectories.has(entry.name)) {
          pending.push({
            absolutePath: entryAbsolutePath,
            relativePath: entryRelativePath,
            depth: current.depth + 1
          })
        }
        continue
      }

      if (!entry.isFile()) continue
      let size = 0
      try {
        size = (await stat(entryAbsolutePath)).size
      } catch {
        // 文件可能在扫描过程中被移除，仍然跳过该条目。
        continue
      }
      files.push({
        relativePath: entryRelativePath,
        name: entryRelativePath,
        kind: 'file',
        meta: `${extname(entry.name).slice(1).toUpperCase() || '文件'} · ${formatFileSize(size)}`
      })
    }
  }
  return files
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function assertSaveCustomModelInput(input: SaveCustomModelInput): void {
  if (!input || typeof input !== 'object') throw new Error('模型配置格式无效')
  if (
    [input.providerName, input.endpoint, input.modelId].some((value) => typeof value !== 'string')
  ) {
    throw new Error('模型配置文本字段无效')
  }
  if (input.apiKey !== undefined && typeof input.apiKey !== 'string') {
    throw new Error('API Key 格式无效')
  }
  if (input.protocol !== 'openai-completions' && input.protocol !== 'openai-responses') {
    throw new Error('不支持的接口形式')
  }
  if (
    typeof input.supportsTools !== 'boolean' ||
    typeof input.supportsImages !== 'boolean' ||
    typeof input.inputContextLength !== 'number' ||
    typeof input.outputContextLength !== 'number'
  ) {
    throw new Error('模型配置字段无效')
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.kaifangwork.app')

  registerWindowControls()
  registerAppStateIpc()
  registerAgentIpc()
  registerWorkspaceIpc()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  agentService.dispose()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
