export type Block =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'thinking'; text: string }
  | { id: string; kind: 'plan'; title: string; steps: { label: string; state: StepState }[] }
  | {
      id: string
      kind: 'tool'
      tool: string
      source: 'builtin' | 'plugin'
      plugin?: string
      reason: string
      input: string
      output?: string
      status: 'running' | 'succeeded' | 'failed' | 'needs-review'
      durationMs?: number
      progress?: number
    }
  | { id: string; kind: 'terminal'; title: string; lines: string[] }
  | {
      id: string
      kind: 'diff'
      path: string
      hunks: { type: 'add' | 'del' | 'ctx'; text: string }[]
    }
  | { id: string; kind: 'confirm'; reason: string; action: string; impact: string }
  | {
      id: string
      kind: 'notice'
      level: 'info' | 'ok' | 'warn' | 'error'
      title: string
      text: string
    }
  | { id: string; kind: 'code'; lang: string; code: string }
  | {
      id: string
      kind: 'summary'
      title: string
      stats: { label: string; value: string }[]
      next: string[]
    }

export type StepState = 'done' | 'active' | 'todo'

export type TaskStatus = 'Draft' | 'Running' | 'Succeeded' | 'Failed' | 'WaitingForConfirmation'

export type Task = {
  id: string
  title: string
  workspaceId: string
  status: TaskStatus
  draftInput: string
  lastConversationAt: number | null
  blocks: Block[]
}

export type WorkspaceFile = {
  id: string
  workspaceId: string
  name: string
  kind: 'folder' | 'file'
  meta: string
}

export type DirectoryKind = 'workspace' | 'talent' | 'library'

export type DirectoryRow = {
  id: string
  name: string
  meta: string
  icon: 'folder' | 'users' | 'sparkle' | 'library'
  workspaceId?: string
  path?: string
}

export type SettingItem =
  | { id: string; type: 'switch'; label: string; value: boolean }
  | { id: string; type: 'select'; label: string; value: string; options: string[] }
  | { id: string; type: 'text'; label: string; value: string }
  | { id: string; type: 'keybinding'; label: string; value: string }
  | { id: string; type: 'action'; label: string; button: string; danger?: boolean }

export type SettingsSection = {
  id: string
  label: string
  items: SettingItem[]
}
