import { app } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PersistedAppState } from '../shared/app-state'
import { emptyAppState } from '../shared/app-state'

const stateVersion = 1
const maxStateBytes = 8 * 1024 * 1024
const idPattern = /^[a-zA-Z0-9_-]{1,160}$/

export class AppStateStore {
  private writeChain = Promise.resolve()

  async load(): Promise<PersistedAppState> {
    try {
      const content = await readFile(this.filePath(), 'utf8')
      return parseState(content)
    } catch {
      return cloneEmptyState()
    }
  }

  async save(value: unknown): Promise<void> {
    const state = assertState(value)
    const content = JSON.stringify(state)
    if (Buffer.byteLength(content, 'utf8') > maxStateBytes) {
      throw new Error('应用状态过大，无法保存')
    }

    const save = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        const filePath = this.filePath()
        const directory = join(app.getPath('userData'), 'state')
        const temporaryPath = `${filePath}.tmp`
        await mkdir(directory, { recursive: true })
        await writeFile(temporaryPath, content, 'utf8')
        await rename(temporaryPath, filePath)
      })
    this.writeChain = save
    await save
  }

  private filePath(): string {
    return join(app.getPath('userData'), 'state', 'app-state.json')
  }
}

function parseState(content: string): PersistedAppState {
  if (Buffer.byteLength(content, 'utf8') > maxStateBytes) return cloneEmptyState()
  try {
    return assertState(JSON.parse(content))
  } catch {
    return cloneEmptyState()
  }
}

function assertState(value: unknown): PersistedAppState {
  if (!value || typeof value !== 'object') throw new Error('应用状态格式无效')
  const candidate = value as Partial<PersistedAppState>
  if (
    candidate.version !== stateVersion ||
    !Array.isArray(candidate.tasks) ||
    !Array.isArray(candidate.workspaces) ||
    !Array.isArray(candidate.workspaceFiles) ||
    typeof candidate.currentWorkspaceId !== 'string' ||
    (candidate.taskId !== null &&
      (typeof candidate.taskId !== 'string' || !idPattern.test(candidate.taskId)))
  ) {
    throw new Error('应用状态格式无效')
  }

  if (
    candidate.tasks.length > 200 ||
    candidate.workspaces.length > 100 ||
    candidate.workspaceFiles.length > 5000
  ) {
    throw new Error('应用状态条目数量超出限制')
  }
  for (const task of candidate.tasks) {
    if (
      !task ||
      typeof task !== 'object' ||
      !idPattern.test(task.id) ||
      typeof task.title !== 'string' ||
      typeof task.workspaceId !== 'string' ||
      typeof task.status !== 'string' ||
      typeof task.draftInput !== 'string' ||
      (task.lastConversationAt !== null && typeof task.lastConversationAt !== 'number') ||
      !Array.isArray(task.blocks) ||
      task.blocks.length > 5000
    ) {
      throw new Error('任务状态格式无效')
    }
    for (const block of task.blocks) {
      if (
        !block ||
        typeof block !== 'object' ||
        typeof block.id !== 'string' ||
        typeof block.kind !== 'string'
      ) {
        throw new Error('任务事件格式无效')
      }
    }
  }

  for (const workspace of candidate.workspaces) {
    if (
      !workspace ||
      typeof workspace !== 'object' ||
      !idPattern.test(workspace.id) ||
      typeof workspace.name !== 'string' ||
      typeof workspace.meta !== 'string' ||
      (workspace.path !== undefined && typeof workspace.path !== 'string')
    ) {
      throw new Error('工作空间状态格式无效')
    }
  }

  for (const file of candidate.workspaceFiles) {
    if (
      !file ||
      typeof file !== 'object' ||
      typeof file.id !== 'string' ||
      file.id.length < 1 ||
      file.id.length > 320 ||
      typeof file.workspaceId !== 'string' ||
      typeof file.name !== 'string' ||
      (file.kind !== 'file' && file.kind !== 'folder') ||
      typeof file.meta !== 'string'
    ) {
      throw new Error('工作空间文件状态格式无效')
    }
  }

  return JSON.parse(JSON.stringify(candidate)) as PersistedAppState
}

function cloneEmptyState(): PersistedAppState {
  return { ...emptyAppState, tasks: [], workspaces: [], workspaceFiles: [] }
}
