<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import DirectoryView from './components/DirectoryView.vue'
import SettingsView from './components/SettingsView.vue'
import TaskView from './components/TaskView.vue'
import type { DirectoryKind, DirectoryRow, Task, WorkspaceFile } from './data/types'
import type {
  AgentEvent,
  AgentModelInfo,
  AgentResources,
  CustomModelConfig,
  ModelConfig
} from '../../shared/agent'
import type { PersistedAppState } from '../../shared/app-state'
import type { WorkspaceSelection } from '../../shared/workspace'
import { defaultModelConfig } from '../../shared/agent'

type ViewId = 'task' | 'settings' | DirectoryKind

const view = ref<ViewId>('task')
const settingsSection = ref('general')
const currentWorkspaceId = ref('')
const taskId = ref<string | null>(null)
const asideVisible = ref(false)
const model = ref(defaultModelConfig.modelId)
const mode = ref('Agent 执行')
const draftInput = ref('')
const modelConfig = ref<ModelConfig>({ ...defaultModelConfig })
const availableModels = ref<AgentModelInfo[]>([])
const customModels = ref<CustomModelConfig[]>([])
const agentResources = ref<AgentResources>({
  prompts: [],
  skills: [],
  contextFiles: [],
  builtinTools: [],
  tools: []
})
const agentResourcesLoading = ref(false)

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
let blockSeq = 0
const toolBlockIds = new Map<string, string>()
const runErrors = new Set<string>()
const workspaceSeq = ref(0)
let appStateReady = false
let appStateSaveTimer: ReturnType<typeof setTimeout> | null = null

type ModelChoice = {
  label: string
  provider: string
  modelId: string
}

const modelChoices = computed<ModelChoice[]>(() => {
  const choices: ModelChoice[] = []
  const usedLabels = new Set<string>()
  const customKeys = new Set(
    customModels.value.map((item) => `${item.providerId}\n${item.modelId}`)
  )

  function addChoice(baseLabel: string, provider: string, modelId: string): void {
    let label = baseLabel || modelId
    if (usedLabels.has(label)) label = `${provider} / ${label}`
    let suffix = 2
    while (usedLabels.has(label)) label = `${provider} / ${baseLabel || modelId} (${suffix++})`
    usedLabels.add(label)
    choices.push({ label, provider, modelId })
  }

  for (const item of availableModels.value) {
    if (!customKeys.has(`${item.provider}\n${item.id}`)) {
      addChoice(item.name || item.id, item.provider, item.id)
    }
  }
  for (const item of customModels.value) {
    addChoice(`${item.providerName} / ${item.modelId}`, item.providerId, item.modelId)
  }

  if (
    model.value &&
    !choices.some(
      (choice) => choice.provider === modelConfig.value.provider && choice.modelId === model.value
    )
  ) {
    addChoice(model.value, modelConfig.value.provider, model.value)
  }

  return choices
})

const modelOptions = computed(() => modelChoices.value.map((choice) => choice.label))
const selectedModelOption = computed(
  () =>
    modelChoices.value.find(
      (choice) => choice.provider === modelConfig.value.provider && choice.modelId === model.value
    )?.label ?? model.value
)
const hasConfiguredModel = computed(() => Boolean(modelConfig.value.modelId.trim()))

function appendNotice(task: Task, text: string): void {
  const last = task.blocks.at(-1)
  if (last?.kind === 'notice' && last.level === 'error' && last.text === text) return
  task.blocks.push({
    id: `notice-${Date.now()}-${++blockSeq}`,
    kind: 'notice',
    level: 'error',
    title: 'Agent 错误',
    text
  })
}

function handleAgentEvent(event: AgentEvent): void {
  const current = tasks.find((item) => item.id === event.taskId)
  if (!current) return

  if (event.kind === 'run-start') {
    current.status = 'Running'
    runErrors.delete(event.taskId)
    return
  }

  if (event.kind === 'text') {
    const last = current.blocks.at(-1)
    if (last?.kind === 'text') {
      last.text += event.delta
    } else {
      current.blocks.push({
        id: `assistant-${Date.now()}-${++blockSeq}`,
        kind: 'text',
        text: event.delta
      })
    }
    return
  }

  if (event.kind === 'thinking') {
    const last = current.blocks.at(-1)
    if (last?.kind === 'thinking') {
      last.text += event.delta
    } else {
      current.blocks.push({
        id: `thinking-${Date.now()}-${++blockSeq}`,
        kind: 'thinking',
        text: event.delta
      })
    }
    return
  }

  if (event.kind === 'tool-start') {
    const blockId = `tool-${Date.now()}-${++blockSeq}`
    current.blocks.push({
      id: blockId,
      kind: 'tool',
      tool: event.toolName,
      source: event.source && event.source !== 'builtin' ? 'plugin' : 'builtin',
      plugin: event.source && event.source !== 'builtin' ? event.source : undefined,
      reason: 'Agent 调用工具',
      input: event.input,
      status: 'running'
    })
    toolBlockIds.set(event.toolCallId, blockId)
    return
  }

  if (event.kind === 'tool-end') {
    const block = current.blocks.find(
      (item) => item.id === toolBlockIds.get(event.toolCallId) && item.kind === 'tool'
    )
    if (block?.kind === 'tool') {
      block.output = event.output
      block.status = event.isError ? 'failed' : 'succeeded'
    }
    toolBlockIds.delete(event.toolCallId)
    return
  }

  if (event.kind === 'error') {
    runErrors.add(event.taskId)
    current.status = 'Failed'
    appendNotice(current, event.message)
    return
  }

  if (event.kind === 'run-end') {
    current.status = runErrors.has(event.taskId) ? 'Failed' : 'Succeeded'
    current.lastConversationAt = Date.now()
  }
}

function snapshotAppState(): PersistedAppState {
  return JSON.parse(
    JSON.stringify({
      version: 1,
      tasks,
      workspaces: directory.workspace,
      workspaceFiles,
      currentWorkspaceId: currentWorkspaceId.value,
      taskId: taskId.value
    })
  ) as PersistedAppState
}

async function persistAppState(): Promise<void> {
  if (!appStateReady) return
  try {
    await window.api.appState.save(snapshotAppState())
  } catch (error) {
    console.error('保存任务和工作空间失败', error)
  }
}

function schedulePersistAppState(): void {
  if (!appStateReady) return
  if (appStateSaveTimer !== null) clearTimeout(appStateSaveTimer)
  appStateSaveTimer = setTimeout(() => {
    appStateSaveTimer = null
    void persistAppState()
  }, 120)
}

watch(
  [tasks, () => directory.workspace, workspaceFiles, currentWorkspaceId, taskId],
  schedulePersistAppState,
  { deep: true }
)

async function loadAppState(): Promise<void> {
  try {
    const saved = await window.api.appState.load()
    tasks.splice(0, tasks.length, ...saved.tasks)
    directory.workspace.splice(0, directory.workspace.length, ...saved.workspaces)
    workspaceFiles.splice(0, workspaceFiles.length, ...saved.workspaceFiles)

    const savedWorkspace = directory.workspace.find(
      (workspace) => workspace.id === saved.currentWorkspaceId
    )
    currentWorkspaceId.value = savedWorkspace?.id ?? directory.workspace[0]?.id ?? ''

    const savedTask = saved.taskId ? tasks.find((item) => item.id === saved.taskId) : undefined
    const restoredTask = savedTask ?? tasks[0]
    taskId.value = restoredTask?.id ?? null
    if (restoredTask) {
      currentWorkspaceId.value = restoredTask.workspaceId
      draftInput.value = restoredTask.draftInput
    }
  } catch (error) {
    console.error('加载任务和工作空间失败', error)
  } finally {
    appStateReady = true
  }
}

async function loadAgentResources(): Promise<void> {
  agentResourcesLoading.value = true
  try {
    agentResources.value = await window.api.agent.getResources(
      workspacePathFor(currentWorkspaceId.value)
    )
  } catch (error) {
    console.error('加载 Agent 资源失败', error)
  } finally {
    agentResourcesLoading.value = false
  }
}

async function loadAgentData(): Promise<void> {
  const [configResult, modelsResult, customResult, resourcesResult] = await Promise.allSettled([
    window.api.agent.getConfig(),
    window.api.agent.getModels(),
    window.api.agent.getCustomModels(),
    window.api.agent.getResources(workspacePathFor(currentWorkspaceId.value))
  ])
  if (configResult.status === 'fulfilled') {
    modelConfig.value = configResult.value
    model.value = configResult.value.modelId
  }
  if (modelsResult.status === 'fulfilled') availableModels.value = modelsResult.value
  if (customResult.status === 'fulfilled') customModels.value = customResult.value
  if (resourcesResult.status === 'fulfilled') agentResources.value = resourcesResult.value
  if (!modelConfig.value.modelId.trim()) {
    const firstCustomModel = customModels.value[0]
    const firstChoice = firstCustomModel
      ? {
          provider: firstCustomModel.providerId,
          modelId: firstCustomModel.modelId,
          apiKeyConfigured: firstCustomModel.apiKeyConfigured
        }
      : modelConfig.value.apiKeyConfigured && modelChoices.value[0]
        ? { ...modelChoices.value[0], apiKeyConfigured: modelConfig.value.apiKeyConfigured }
        : undefined
    if (firstChoice) {
      modelConfig.value = {
        ...modelConfig.value,
        provider: firstChoice.provider,
        modelId: firstChoice.modelId,
        apiKeyConfigured: firstChoice.apiKeyConfigured
      }
      model.value = firstChoice.modelId
      void window.api.agent
        .saveConfig({
          provider: firstChoice.provider,
          modelId: firstChoice.modelId,
          thinkingLevel: modelConfig.value.thinkingLevel
        })
        .catch((error) => console.error('保存默认模型失败', error))
    }
  }
}

let unsubscribeAgent: (() => void) | undefined

onMounted(async () => {
  unsubscribeAgent = window.api.agent.onEvent(handleAgentEvent)
  await loadAppState()
  void loadAgentData()
})

onBeforeUnmount(() => {
  unsubscribeAgent?.()
  if (appStateSaveTimer !== null) clearTimeout(appStateSaveTimer)
  void persistAppState()
})

function selectTask(id: string): void {
  const selected = tasks.find((item) => item.id === id)
  if (!selected) return
  taskId.value = selected.id
  currentWorkspaceId.value = selected.workspaceId
  draftInput.value = selected.draftInput
  view.value = 'task'
}

function selectWorkspace(id: string): void {
  if (!directory.workspace.some((workspace) => workspace.id === id)) return
  currentWorkspaceId.value = id
  if (view.value === 'task' && task.value?.workspaceId !== id) {
    taskId.value = null
    draftInput.value = ''
  }
  if (view.value === 'settings') void loadAgentResources()
}

function openIdleWorkspace(id: string): void {
  if (!directory.workspace.some((workspace) => workspace.id === id)) return
  currentWorkspaceId.value = id
  taskId.value = null
  draftInput.value = ''
  view.value = 'task'
}

function workspacePathFor(id: string): string | undefined {
  return directory.workspace.find((item) => item.id === id)?.path
}

function workspaceNameFor(id: string): string {
  return directory.workspace.find((item) => item.id === id)?.name ?? '未选择工作空间'
}

function addWorkspaceFiles(workspaceId: string, selection: WorkspaceSelection): void {
  for (const file of selection.files) {
    workspaceFiles.push({
      id: `${workspaceId}:${file.relativePath}`,
      workspaceId,
      name: file.name,
      kind: file.kind,
      meta: file.meta
    })
  }
}

async function addWorkspace(): Promise<void> {
  try {
    const selection = await window.api.workspace.chooseDirectory()
    if (!selection) return

    const existing = directory.workspace.find((item) => item.path === selection.path)
    if (existing) {
      openIdleWorkspace(existing.id)
      return
    }

    const id = `workspace-${Date.now()}-${workspaceSeq.value + 1}`
    workspaceSeq.value += 1
    directory.workspace.unshift({
      id,
      name: selection.name,
      meta: selection.path,
      icon: 'folder',
      workspaceId: id,
      path: selection.path
    })
    addWorkspaceFiles(id, selection)
    openIdleWorkspace(id)
  } catch (error) {
    console.error('添加工作空间失败', error)
  }
}

function createDirectoryItem(kind: DirectoryKind): void {
  if (kind === 'workspace') void addWorkspace()
}

function buildAgentPrompt(text: string, workspaceId: string): string {
  const references = workspaceFiles
    .filter((file) => file.workspaceId === workspaceId && file.kind === 'file')
    .filter((file) => text.includes(`@${file.name}`))
    .sort((left, right) => right.name.length - left.name.length)
    .map((file) => file.name)
  if (!references.length) return text
  const fileList = references.map((file) => `- ${file}`).join('\n')
  return `${text}\n\n请使用 read 工具读取以下用户引用的工作空间文件：\n${fileList}`
}

async function openTaskFolder(id: string): Promise<void> {
  const current = tasks.find((item) => item.id === id)
  const path = current ? workspacePathFor(current.workspaceId) : undefined
  if (!path) return
  try {
    await window.api.workspace.openFolder(path)
  } catch (error) {
    console.error('打开工作空间失败', error)
  }
}

function renameTask(id: string): void {
  const current = tasks.find((item) => item.id === id)
  if (!current) return
  const title = window.prompt('重命名任务', current.title)?.trim()
  if (title) current.title = title.slice(0, 80)
}

async function shareTask(id: string): Promise<void> {
  const current = tasks.find((item) => item.id === id)
  if (!current) return
  const content = current.blocks
    .filter((block) => block.kind === 'user' || block.kind === 'text')
    .map((block) => `${block.kind === 'user' ? '用户' : 'Agent'}：${block.text}`)
    .join('\n\n')
  try {
    await navigator.clipboard.writeText(
      `任务：${current.title}\n工作空间：${workspaceNameFor(current.workspaceId)}\n\n${content}`
    )
  } catch (error) {
    console.error('分享任务失败', error)
  }
}

function deleteTask(id: string): void {
  const index = tasks.findIndex((item) => item.id === id)
  if (index < 0) return
  const current = tasks[index]
  if (!window.confirm(`删除任务“${current.title}”？`)) return
  tasks.splice(index, 1)
  if (taskId.value !== id) return
  const next = tasks.find((item) => item.workspaceId === currentWorkspaceId.value) ?? tasks[0]
  if (next) selectTask(next.id)
  else {
    taskId.value = null
    draftInput.value = ''
  }
}

function openSettings(section = 'general'): void {
  settingsSection.value = section
  view.value = 'settings'
  void loadAgentResources()
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

async function submitTask(text: string): Promise<void> {
  const current =
    task.value ??
    tasks.find(
      (item) => item.status === 'Draft' && item.workspaceId === currentWorkspaceId.value
    ) ??
    createDraftTask()

  current.status = 'Running'
  if (current.title === '新任务') current.title = taskTitleFromInput(text)
  current.draftInput = ''
  current.lastConversationAt = Date.now()
  current.blocks.push({ id: `user-${Date.now()}`, kind: 'user', text })
  draftInput.value = ''
  selectTask(current.id)

  try {
    await window.api.agent.start({
      taskId: current.id,
      workspacePath: workspacePathFor(current.workspaceId),
      provider: modelConfig.value.provider,
      modelId: model.value,
      thinkingLevel: modelConfig.value.thinkingLevel
    })
    await window.api.agent.prompt(current.id, buildAgentPrompt(text, current.workspaceId))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    runErrors.add(current.id)
    current.status = 'Failed'
    appendNotice(current, message)
  }
}

async function abortTask(): Promise<void> {
  if (!task.value) return
  try {
    await window.api.agent.abort(task.value.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    runErrors.add(task.value.id)
    task.value.status = 'Failed'
    appendNotice(task.value, message)
  }
}

function updateCustomModels(models: CustomModelConfig[]): void {
  const currentProvider = modelConfig.value.provider
  const currentModelId = model.value
  const currentCustomModel = customModels.value.find(
    (item) => item.providerId === currentProvider && item.modelId === currentModelId
  )
  customModels.value = models
  if (!currentModelId.trim() && models[0]) {
    modelConfig.value = {
      ...modelConfig.value,
      provider: models[0].providerId,
      modelId: models[0].modelId,
      apiKeyConfigured: models[0].apiKeyConfigured
    }
    model.value = models[0].modelId
    void window.api.agent
      .saveConfig({
        provider: models[0].providerId,
        modelId: models[0].modelId,
        thinkingLevel: modelConfig.value.thinkingLevel
      })
      .catch((error) => console.error('保存模型选择失败', error))
    return
  }
  const updatedCurrentModel = currentCustomModel
    ? models.find((item) => item.id === currentCustomModel.id)
    : undefined
  if (updatedCurrentModel) {
    modelConfig.value = {
      ...modelConfig.value,
      provider: updatedCurrentModel.providerId,
      modelId: updatedCurrentModel.modelId,
      apiKeyConfigured: updatedCurrentModel.apiKeyConfigured
    }
    model.value = updatedCurrentModel.modelId
    return
  }

  const currentIsCustom = currentProvider !== 'anthropic' && currentProvider !== 'openai'
  const currentModelStillExists = models.some(
    (item) => item.providerId === currentProvider && item.modelId === currentModelId
  )
  if (currentIsCustom && !currentModelStillExists) {
    const fallback: ModelConfig = {
      ...defaultModelConfig,
      thinkingLevel: modelConfig.value.thinkingLevel
    }
    modelConfig.value = fallback
    model.value = ''
  }
}

function selectModel(value: string): void {
  const choice = modelChoices.value.find((item) => item.label === value)
  if (!choice) return

  const customModel = customModels.value.find(
    (item) => item.providerId === choice.provider && item.modelId === choice.modelId
  )
  modelConfig.value = {
    ...modelConfig.value,
    provider: choice.provider,
    modelId: choice.modelId,
    apiKeyConfigured:
      customModel?.apiKeyConfigured ??
      (choice.provider === modelConfig.value.provider ? modelConfig.value.apiKeyConfigured : false)
  }
  model.value = choice.modelId
  void window.api.agent
    .saveConfig({
      provider: choice.provider,
      modelId: choice.modelId,
      thinkingLevel: modelConfig.value.thinkingLevel
    })
    .catch((error) => console.error('保存模型选择失败', error))
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
        :workspaces="directory.workspace"
        @select-task="selectTask"
        @open-settings="openSettings"
        @new-task="newTask"
        @add-workspace="addWorkspace"
        @open-task-folder="openTaskFolder"
        @rename-task="renameTask"
        @share-task="shareTask"
        @delete-task="deleteTask"
        @open-view="view = $event"
      />

      <TaskView
        v-if="view === 'task'"
        :task="task"
        :aside-visible="asideVisible"
        :model="selectedModelOption"
        :model-options="modelOptions"
        :has-model="hasConfiguredModel"
        :mode="mode"
        :current-workspace-id="currentWorkspaceId"
        :draft-input="draftInput"
        :workspace-files="workspaceFiles"
        :workspaces="directory.workspace"
        @submit="submitTask"
        @abort="abortTask"
        @toggle-aside="asideVisible = !asideVisible"
        @update:model="selectModel"
        @update:mode="mode = $event"
        @update:draft-input="updateDraftInput"
        @select-workspace="selectWorkspace"
        @add-workspace="addWorkspace"
        @open-settings="openSettings"
      />

      <SettingsView
        v-else-if="view === 'settings'"
        :initial-section="settingsSection"
        :custom-models="customModels"
        :agent-resources="agentResources"
        :agent-resources-loading="agentResourcesLoading"
        @custom-models="updateCustomModels"
        @refresh-agent-resources="loadAgentResources"
        @close="view = 'task'"
      />

      <DirectoryView
        v-else
        :kind="view"
        :rows="directory[view]"
        :active-workspace-id="currentWorkspaceId"
        @select-workspace="selectWorkspace"
        @create="createDirectoryItem"
      />

      <aside v-if="asideShown" class="pane pane--aside" />
    </div>
  </div>
</template>
