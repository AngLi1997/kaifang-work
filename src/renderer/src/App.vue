<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import DirectoryView from './components/DirectoryView.vue'
import SettingsView from './components/SettingsView.vue'
import TaskView from './components/TaskView.vue'
import type { DirectoryKind, DirectoryRow, Task, WorkspaceFile } from './data/types'

type ViewId = 'task' | 'settings' | DirectoryKind

const view = ref<ViewId>('task')
const settingsSection = ref('general')
const currentWorkspaceId = ref('')
const taskId = ref<string | null>(null)
const asideVisible = ref(true)
const model = ref('claude-sonnet-4.5')
const mode = ref('Agent 执行')
const draftInput = ref('')

const tasks = reactive<Task[]>([])
const workspaceFiles = reactive<WorkspaceFile[]>([])
const directory = reactive<Record<DirectoryKind, DirectoryRow[]>>({
  workspace: [],
  talent: [],
  library: []
})

const asideShown = computed(() => view.value === 'task' && asideVisible.value)
const task = computed(() => tasks.find((item) => item.id === taskId.value) ?? null)

let taskSeq = 0

function selectTask(id: string): void {
  const selected = tasks.find((item) => item.id === id)
  if (!selected) return
  taskId.value = selected.id
  currentWorkspaceId.value = selected.workspaceId
  draftInput.value = selected.draftInput
  view.value = 'task'
}

function selectWorkspace(id: string): void {
  currentWorkspaceId.value = id
}

function openSettings(section = 'general'): void {
  settingsSection.value = section
  view.value = 'settings'
}

function createDraftTask(): Task {
  taskSeq += 1
  const created: Task = {
    id: `task-${Date.now()}-${taskSeq}`,
    title: '新任务',
    workspaceId: currentWorkspaceId.value,
    status: 'Draft',
    draftInput: '',
    lastConversationAt: null,
    blocks: []
  }
  tasks.unshift(created)
  return created
}

function newTask(): void {
  const existing = tasks.find(
    (item) => item.status === 'Draft' && item.workspaceId === currentWorkspaceId.value
  )
  const next = existing ?? createDraftTask()
  selectTask(next.id)
}

function updateDraftInput(value: string): void {
  draftInput.value = value
  if (task.value?.status === 'Draft') task.value.draftInput = value
}

function taskTitleFromInput(text: string): string {
  const firstLine = text.split('\n')[0].trim()
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine
}

function submitTask(text: string): void {
  const current =
    task.value ??
    tasks.find(
      (item) => item.status === 'Draft' && item.workspaceId === currentWorkspaceId.value
    ) ??
    createDraftTask()

  if (current.status === 'Draft') current.status = 'Running'
  if (current.title === '新任务') current.title = taskTitleFromInput(text)
  current.draftInput = ''
  current.lastConversationAt = Date.now()
  current.blocks.push({ id: `user-${Date.now()}`, kind: 'user', text })
  draftInput.value = ''
  selectTask(current.id)
}
</script>

<template>
  <div class="app-root">
    <div class="app-layout" :class="{ 'is-aside-hidden': !asideShown }">
      <AppSidebar
        :active-task-id="taskId"
        :current-workspace-id="currentWorkspaceId"
        :view="view"
        :tasks="tasks"
        :workspace-files="workspaceFiles"
        @select-task="selectTask"
        @open-settings="openSettings"
        @new-task="newTask"
        @open-view="view = $event"
      />

      <TaskView
        v-if="view === 'task'"
        :task="task"
        :aside-visible="asideVisible"
        :model="model"
        :mode="mode"
        :draft-input="draftInput"
        @submit="submitTask"
        @toggle-aside="asideVisible = !asideVisible"
        @update:model="model = $event"
        @update:mode="mode = $event"
        @update:draft-input="updateDraftInput"
      />

      <SettingsView
        v-else-if="view === 'settings'"
        :initial-section="settingsSection"
        @close="view = 'task'"
      />

      <DirectoryView
        v-else
        :kind="view"
        :rows="directory[view]"
        :active-workspace-id="currentWorkspaceId"
        @select-workspace="selectWorkspace"
      />

      <aside v-if="asideShown" class="pane pane--aside" />
    </div>
  </div>
</template>
