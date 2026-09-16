<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import AppSelect from './AppSelect.vue'
import TaskEventBlock from './TaskEventBlock.vue'
import type { DirectoryRow, Task, WorkspaceFile } from '../data/types'

const props = defineProps<{
  task: Task | null
  asideVisible: boolean
  model: string
  modelOptions: readonly string[]
  hasModel: boolean
  mode: string
  currentWorkspaceId: string
  draftInput: string
  workspaceFiles: WorkspaceFile[]
  workspaces: DirectoryRow[]
}>()

const emit = defineEmits<{
  (e: 'submit', text: string): void
  (e: 'abort'): void
  (e: 'toggle-aside'): void
  (e: 'update:model', value: string): void
  (e: 'update:mode', value: string): void
  (e: 'update:draft-input', value: string): void
  (e: 'select-workspace', id: string): void
  (e: 'add-workspace'): void
  (e: 'open-settings', section: string): void
}>()

const input = ref(props.draftInput)
const composer = ref<HTMLTextAreaElement | null>(null)
const stream = ref<HTMLElement | null>(null)
const autoScrollEnabled = ref(true)
let scrollFrame: number | null = null

const modes = ['Agent 执行', '对话', '只读分析']

const submitLabel = computed(() =>
  props.task?.status === 'Succeeded' || props.task?.status === 'Failed' ? '再次运行' : '提交'
)
const isEmptyTask = computed(() => !props.task || props.task.blocks.length === 0)

const taskWorkspaceId = computed(() => props.task?.workspaceId || props.currentWorkspaceId)
const workspaceOptions = computed(() => {
  const nameCounts = new Map<string, number>()
  for (const workspace of props.workspaces) {
    nameCounts.set(workspace.name, (nameCounts.get(workspace.name) ?? 0) + 1)
  }
  return props.workspaces.map((workspace) =>
    (nameCounts.get(workspace.name) ?? 0) > 1
      ? `${workspace.name} · ${workspace.meta}`
      : workspace.name
  )
})
const selectedWorkspaceOption = computed(() => {
  const index = props.workspaces.findIndex((workspace) => workspace.id === taskWorkspaceId.value)
  return index >= 0 ? workspaceOptions.value[index] : '选择工作空间'
})

const quickTools: { label: string; icon: 'file' | 'check' | 'sparkle'; prompt: string }[] = [
  { label: 'OCR 工具', icon: 'file', prompt: '使用 OCR 工具处理当前工作空间中的文档' },
  { label: '错别字检测', icon: 'check', prompt: '检查当前工作空间中的文档是否存在错别字' },
  { label: '元数据抽取', icon: 'sparkle', prompt: '从当前工作空间中的文档抽取档案元数据' }
]

const currentWorkspaceFiles = computed(() =>
  props.task?.workspaceId || props.currentWorkspaceId
    ? props.workspaceFiles.filter(
        (file) => file.workspaceId === (props.task?.workspaceId || props.currentWorkspaceId)
      )
    : []
)

const mentionQuery = computed(() => {
  const match = input.value.match(/(?:^|\s)@([^\s]*)$/)
  return match ? match[1].toLocaleLowerCase() : null
})

const mentionOptions = computed(() => {
  if (mentionQuery.value === null) return []
  return currentWorkspaceFiles.value
    .filter((file) => file.kind === 'file')
    .filter((file) => file.name.toLocaleLowerCase().includes(mentionQuery.value ?? ''))
    .slice(0, 8)
})

const showMentionPicker = computed(() => mentionOptions.value.length > 0)

watch(
  () => [props.task?.id, props.draftInput] as const,
  ([, draft]) => {
    if (draft !== input.value) input.value = draft
  }
)

function isAtBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 24
}

function scheduleScrollToBottom(): void {
  if (!autoScrollEnabled.value) return
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null
    const element = stream.value
    if (element && autoScrollEnabled.value) element.scrollTop = element.scrollHeight
  })
}

function handleStreamScroll(): void {
  const element = stream.value
  if (!element) return
  autoScrollEnabled.value = isAtBottom(element)
}

function scrollToLatest(): void {
  autoScrollEnabled.value = true
  scheduleScrollToBottom()
}

function updateInput(value: string): void {
  input.value = value
  emit('update:draft-input', value)
}

function selectQuickTool(tool: (typeof quickTools)[number]): void {
  updateInput(tool.prompt)
  nextTick(() => composer.value?.focus())
}

function selectWorkspaceOption(value: string): void {
  const index = workspaceOptions.value.indexOf(value)
  const workspace = index >= 0 ? props.workspaces[index] : undefined
  if (workspace) emit('select-workspace', workspace.id)
}

function insertAtReference(): void {
  input.value = `${input.value}${input.value && !/\s$/.test(input.value) ? ' ' : ''}@`
  emit('update:draft-input', input.value)
  nextTick(() => composer.value?.focus())
}

function insertMention(file: WorkspaceFile): void {
  const atIndex = input.value.lastIndexOf('@')
  if (atIndex < 0) return
  input.value = `${input.value.slice(0, atIndex)}@${file.name} `
  emit('update:draft-input', input.value)
  nextTick(() => composer.value?.focus())
}

function submit(): void {
  const text = input.value.trim()
  if (!text) return
  emit('submit', text)
  input.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && showMentionPicker.value) {
    event.preventDefault()
    insertMention(mentionOptions.value[0])
    return
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    submit()
  }
  if (event.key === 'Escape') composer.value?.blur()
}

watch(
  () => props.task?.blocks,
  () => scheduleScrollToBottom(),
  { deep: true, flush: 'post' }
)

watch(
  () => props.task?.id,
  () => {
    autoScrollEnabled.value = true
    void nextTick(scheduleScrollToBottom)
  }
)

onMounted(() => scheduleScrollToBottom())

onBeforeUnmount(() => {
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <section class="pane pane--main" :class="{ 'is-empty': isEmptyTask }">
    <header class="task-head">
      <div class="task-head__title">
        <h2>{{ task?.title || '新任务' }}</h2>
      </div>

      <div class="task-head__actions">
        <button
          v-if="task?.status === 'Running'"
          type="button"
          class="btn btn--sm"
          @click="emit('abort')"
        >
          <AppIcon name="pause" :size="12" />
          暂停
        </button>
        <button v-if="task?.status === 'Failed'" type="button" class="btn btn--sm">
          <AppIcon name="refresh" :size="12" />
          重试
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--icon btn--sm"
          title="查找任务、文件或工作空间"
        >
          <AppIcon name="search" :size="13" />
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--icon btn--sm"
          :class="{ 'is-on': asideVisible }"
          title="显示 / 隐藏状态信息区"
          @click="emit('toggle-aside')"
        >
          <AppIcon name="panel" :size="13" />
        </button>
      </div>
    </header>

    <div ref="stream" class="scroll stream selectable" @scroll="handleStreamScroll">
      <div v-if="isEmptyTask" class="workspace-welcome">
        <h1 class="workspace-welcome__logo">KaifangWork</h1>
        <div class="workspace-welcome__tools">
          <button
            v-for="tool in quickTools"
            :key="tool.label"
            type="button"
            class="workspace-tool"
            @click="selectQuickTool(tool)"
          >
            <AppIcon :name="tool.icon" :size="14" />
            {{ tool.label }}
          </button>
        </div>
      </div>
      <TaskEventBlock v-for="block in task?.blocks ?? []" :key="block.id" :block="block" />
      <button
        v-if="!autoScrollEnabled"
        type="button"
        class="stream__to-bottom btn btn--ghost btn--icon"
        title="滚动到底部"
        @click="scrollToLatest"
      >
        <AppIcon name="chevron" :size="14" />
      </button>
    </div>

    <footer class="composer">
      <div class="composer__field">
        <textarea
          ref="composer"
          v-model="input"
          class="composer__input"
          rows="1"
          placeholder="描述治理目标，或补充上下文…"
          @input="updateInput(input)"
          @keydown="onKeydown"
        />
        <div v-if="showMentionPicker" class="composer__mentions">
          <button
            v-for="file in mentionOptions"
            :key="file.id"
            type="button"
            class="composer__mention"
            @click="insertMention(file)"
          >
            <AppIcon name="file" :size="13" />
            <span>{{ file.name }}</span>
            <small>{{ file.meta }}</small>
          </button>
        </div>
        <div class="composer__toolbar">
          <AppSelect
            v-if="workspaces.length"
            class="composer__workspace"
            variant="bare"
            size="sm"
            label="工作空间"
            :model-value="selectedWorkspaceOption"
            :options="workspaceOptions"
            @update:model-value="selectWorkspaceOption"
          />
          <button
            v-else
            type="button"
            class="btn btn--ghost btn--sm"
            @click="emit('add-workspace')"
          >
            <AppIcon name="folder" :size="13" />
            新建工作空间
          </button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" title="添加附件">
            <AppIcon name="clip" :size="13" />
          </button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" title="添加上下文">
            <AppIcon name="plus" :size="13" />
          </button>
          <button type="button" class="btn btn--ghost btn--sm" @click="insertAtReference">
            @ 引用文件
          </button>

          <span class="spacer" />

          <AppSelect
            v-if="hasModel"
            class="composer__select"
            variant="bare"
            size="sm"
            label="模型"
            :model-value="model"
            :options="modelOptions"
            @update:model-value="emit('update:model', $event)"
          />
          <button
            v-else
            type="button"
            class="btn btn--ghost btn--sm composer__model-config"
            @click="emit('open-settings', 'models')"
          >
            <AppIcon name="sliders" :size="13" />
            配置模型
          </button>
          <AppSelect
            class="composer__select"
            variant="bare"
            size="sm"
            label="模式"
            :model-value="mode"
            :options="modes"
            @update:model-value="emit('update:mode', $event)"
          />

          <button
            v-if="task?.status === 'Running'"
            type="button"
            class="btn btn--sm"
            title="暂停任务"
            @click="emit('abort')"
          >
            <AppIcon name="pause" :size="12" />
          </button>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            :disabled="!input.trim()"
            @click="submit"
          >
            <AppIcon name="play" :size="12" />
            {{ submitLabel }}
          </button>
        </div>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.task-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  -webkit-app-region: drag;
}

.task-head__title {
  min-width: 0;
}

.task-head h2 {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-head__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.btn.is-on {
  background: var(--bg-active);
  color: var(--text);
}

.stream {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 20px 8px;
  user-select: text;
}

.pane--main.is-empty {
  position: relative;
}

.pane--main.is-empty .stream {
  align-items: center;
  justify-content: flex-end;
  padding-bottom: clamp(150px, 18vh, 224px);
}

.workspace-welcome {
  display: flex;
  width: min(100%, 820px);
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 0 16px;
}

.workspace-welcome__logo {
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.workspace-welcome__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.workspace-tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--bg-inset);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}

.workspace-tool:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.stream__to-bottom {
  position: absolute;
  right: 20px;
  bottom: 12px;
  border-color: var(--line-strong);
  background: var(--bg-elevated);
}

.stream__to-bottom :deep(svg) {
  transform: rotate(180deg);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--line);
  background: var(--bg);
}

.pane--main.is-empty .composer {
  position: absolute;
  right: 16px;
  bottom: clamp(24px, 5vh, 56px);
  left: 16px;
  z-index: 1;
  width: min(calc(100% - 32px), 980px);
  padding: 0;
  margin: 0 auto;
  border-top: 0;
  background: transparent;
}

.composer__field {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-inset);
}

.composer__field:focus-within {
  border-color: var(--accent);
}

.composer__mentions {
  display: flex;
  max-height: 176px;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  padding: 4px;
  border-top: 1px solid var(--line);
}

.composer__mention {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 7px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.composer__mention:hover {
  background: var(--bg-hover);
}

.composer__mention span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer__mention small {
  flex: none;
  color: var(--text-2);
  font-size: 10.5px;
}

.composer__input {
  width: 100%;
  max-height: 168px;
  padding: 9px 10px 2px;
  border: 0;
  background: transparent;
  font-size: 13.5px;
  line-height: 1.7;
  resize: none;
  field-sizing: content;
}

.composer__input:focus {
  outline: none;
}

.composer__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 6px;
}

.composer__select {
  max-width: 160px;
}

.composer__workspace {
  width: min(180px, 22vw);
  flex: none;
}

.composer__model-config {
  color: var(--accent);
}

.spacer {
  margin-left: auto;
}
</style>
