export type WorkspaceFileEntry = {
  relativePath: string
  name: string
  kind: 'folder' | 'file'
  meta: string
}

export type WorkspaceSelection = {
  path: string
  name: string
  files: WorkspaceFileEntry[]
}
