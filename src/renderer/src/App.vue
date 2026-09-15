<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import ContextPanel from './components/ContextPanel.vue'
import SettingsView from './components/SettingsView.vue'
import TaskView from './components/TaskView.vue'
import TitleBar from './components/TitleBar.vue'
import { tasks, workspaces } from './data/mock'

const view = ref<'task' | 'settings'>('task')
const settingsSection = ref('general')
const workspaceId = ref(workspaces[0].id)
const taskId = ref(tasks[0].id)
const asideVisible = ref(true)
const model = ref(tasks[0].model)
const mode = ref(tasks[0].mode)

const task = computed(() => tasks.find((item) => item.id === taskId.value) ?? tasks[0])
const workspaceName = computed(
  () => workspaces.find((item) => item.id === workspaceId.value)?.name ?? workspaces[0].name
)

let draftSeq = 0

function selectTask(id: string): void {
  taskId.value = id
  view.value = 'task'
}

function openSettings(section = 'general'): void {
  settingsSection.value = section
  view.value = 'settings'
}

function newTask(): void {
  draftSeq += 1
  const created = {
    id: `task-draft-${draftSeq}`,
    title: '新任务 · 等待描述治理目标',
    workspace: workspaceName.value,
    status: 'Draft' as const,
    startedAt: '—',
    duration: '0s',
    model: model.value,
    mode: mode.value,
    blocks: []
  }
  tasks.unshift(created)
  selectTask(created.id)
}

let demoNoticeShown = false

// 静态页面演示：提交只追加展示内容，不调用基础 Agent
function submitTask(text: string): void {
  const current = task.value
  if (current.status === 'Draft') current.status = 'Running'
  current.blocks.push({ id: `user-${current.blocks.length}-${Date.now()}`, kind: 'user', text })
  if (!demoNoticeShown) {
    demoNoticeShown = true
    current.blocks.push({
      id: 'demo-notice',
      kind: 'notice',
      level: 'info',
      title: '静态页面演示',
      text: '当前未接入 Pi Agent SDK，提交内容仅用于展示任务交互与状态呈现。'
    })
  }
}
</script>

<template>
  <div class="app-root">
    <TitleBar :workspace="workspaceName" />

    <div class="app-layout" :class="{ 'is-aside-hidden': view === 'settings' || !asideVisible }">
      <AppSidebar
        :active-task-id="taskId"
        :view="view"
        @select-task="selectTask"
        @open-settings="openSettings"
        @new-task="newTask"
      />

      <TaskView
        v-if="view === 'task'"
        :task="task"
        :aside-visible="asideVisible"
        :model="model"
        :mode="mode"
        @submit="submitTask"
        @toggle-aside="asideVisible = !asideVisible"
        @update:model="model = $event"
        @update:mode="mode = $event"
      />

      <SettingsView v-else :initial-section="settingsSection" @close="view = 'task'" />

      <ContextPanel
        v-if="view === 'task' && asideVisible"
        :task="task"
        :model="model"
        :mode="mode"
      />
    </div>
  </div>
</template>
