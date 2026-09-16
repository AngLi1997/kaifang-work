import type { DirectoryRow, Task, WorkspaceFile } from '../renderer/src/data/types'

export type PersistedAppState = {
  version: 1
  tasks: Task[]
  workspaces: DirectoryRow[]
  workspaceFiles: WorkspaceFile[]
  currentWorkspaceId: string
  taskId: string | null
}

export const emptyAppState: PersistedAppState = {
  version: 1,
  tasks: [],
  workspaces: [],
  workspaceFiles: [],
  currentWorkspaceId: '',
  taskId: null
}
