<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import TaskEventBlock from './TaskEventBlock.vue'
import type { Task, TaskStatus } from '../data/mock'

const props = defineProps<{ task: Task; asideVisible: boolean; model: string; mode: string }>()

const emit = defineEmits<{
  (e: 'submit', text: string): void
  (e: 'toggle-aside'): void
  (e: 'update:model', value: string): void
  (e: 'update:mode', value: string): void
}>()

const input = ref('')
const composer = ref<HTMLTextAreaElement | null>(null)

const models = ['claude-sonnet-4.5', 'claude-haiku-4', 'gpt-5.1', 'deepseek-v3.2']
const modes = ['Agent 执行', '对话', '只读分析']

const statusTone: Record<TaskStatus, string> = {
  Draft: '',
  Running: 'badge--run',
  WaitingForConfirmation: 'badge--warn',
  Succeeded: 'badge--ok',
  Failed: 'badge--err'
}

const statusText: Record<TaskStatus, string> = {
  Draft: '草稿',
  Running: '执行中',
  WaitingForConfirmation: '等待确认',
  Succeeded: '已完成',
  Failed: '失败'
}

const submitLabel = computed(() =>
  props.task.status === 'Succeeded' || props.task.status === 'Failed' ? '再次运行' : '提交'
)

function submit(): void {
  const text = input.value.trim()
  if (!text) return
  emit('submit', text)
  input.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    submit()
  }
  if (event.key === 'Escape') composer.value?.blur()
}

function focusComposer(): void {
  composer.value?.focus()
}
</script>

<template>
  <section class="pane pane--main">
    <header class="task-head">
      <div class="task-head__title">
        <span class="dim task-head__crumb">{{ task.workspace }} / {{ task.id }}</span>
        <h2>{{ task.title }}</h2>
        <div class="task-head__meta">
          <span class="badge" :class="statusTone[task.status]">
            <span class="dot" />
            {{ statusText[task.status] }}
          </span>
          <span class="dim mono">{{ task.model }} · {{ task.mode }}</span>
          <span class="dim mono">起始 {{ task.startedAt }} · 已运行 {{ task.duration }}</span>
        </div>
      </div>

      <div class="task-head__actions">
        <button v-if="task.status === 'Running'" class="btn btn--sm">
          <AppIcon name="pause" :size="12" />
          暂停
        </button>
        <button v-if="task.status === 'Failed'" class="btn btn--sm">
          <AppIcon name="refresh" :size="12" />
          重试
        </button>
        <button v-if="task.status !== 'Succeeded' && task.status !== 'Failed'" class="btn btn--sm">
          <AppIcon name="stop" :size="12" />
          取消
        </button>
        <button class="btn btn--ghost btn--icon btn--sm" title="查找任务、文件或工作空间">
          <AppIcon name="search" :size="13" />
        </button>
        <button
          class="btn btn--ghost btn--icon btn--sm"
          :class="{ 'is-on': asideVisible }"
          title="显示 / 隐藏状态信息区"
          @click="emit('toggle-aside')"
        >
          <AppIcon name="panel" :size="13" />
        </button>
      </div>
    </header>

    <div class="scroll stream selectable">
      <div v-if="!task.blocks.length" class="stream__empty">
        <AppIcon name="sparkle" :size="15" />
        <p>描述要处理的档案范围与治理目标，Agent 会先给出执行计划再开始处理。</p>
        <span class="dim"
          >例如：对 incoming/ 下的扫描件执行 OCR，并抽取题名、日期、责任者和档号。</span
        >
      </div>
      <TaskEventBlock v-for="block in task.blocks" :key="block.id" :block="block" />
      <div v-if="task.status === 'Running'" class="stream__pending">
        <span class="pulse" />
        基础 Agent 正在处理 incoming/0097_会议记录_2021.pdf
      </div>
    </div>

    <footer class="composer">
      <div class="composer__context">
        <span class="badge">
          <AppIcon name="folder" :size="11" />
          incoming/
        </span>
        <span class="badge">
          <AppIcon name="file" :size="11" />
          附件 3
        </span>
        <span class="badge badge--accent">
          <AppIcon name="shield" :size="11" />
          workspace.write · 需确认
        </span>
      </div>

      <div class="composer__field">
        <textarea
          ref="composer"
          v-model="input"
          class="composer__input"
          rows="1"
          placeholder="描述治理目标，或补充上下文…  Enter 提交，Shift + Enter 换行"
          @keydown="onKeydown"
        />
        <div class="composer__toolbar">
          <button class="btn btn--ghost btn--icon btn--sm" title="添加附件">
            <AppIcon name="clip" :size="13" />
          </button>
          <button class="btn btn--ghost btn--icon btn--sm" title="添加上下文">
            <AppIcon name="plus" :size="13" />
          </button>
          <button class="btn btn--ghost btn--sm">@ 引用文件</button>

          <span class="spacer" />

          <select
            class="select select--bare composer__select"
            :value="model"
            @change="emit('update:model', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="item in models" :key="item" :value="item">{{ item }}</option>
          </select>
          <select
            class="select select--bare composer__select"
            :value="mode"
            @change="emit('update:mode', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="item in modes" :key="item" :value="item">{{ item }}</option>
          </select>

          <button v-if="task.status === 'Running'" class="btn btn--sm" title="暂停任务">
            <AppIcon name="pause" :size="12" />
          </button>
          <button class="btn btn--primary btn--sm" :disabled="!input.trim()" @click="submit">
            <AppIcon name="play" :size="12" />
            {{ submitLabel }}
          </button>
        </div>
      </div>

      <div class="composer__hint dim">
        <button class="link" @click="focusComposer">Enter 提交</button>
        <span>· Shift + Enter 换行 · ⌘/Ctrl + K 命令搜索</span>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.task-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}

.task-head__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.task-head__crumb {
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

.task-head h2 {
  overflow: hidden;
  font-size: 14.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-head__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.task-head__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.btn.is-on {
  background: var(--bg-active);
  color: var(--text);
}

.stream {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 20px 8px;
  user-select: text;
}

.stream__pending {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 20px;
  color: var(--text-2);
  font-size: 12.5px;
}

.stream__empty {
  display: flex;
  max-width: 460px;
  flex-direction: column;
  gap: 6px;
  padding: 28px 0;
  color: var(--text-2);
}

.stream__empty p {
  color: var(--text);
  font-size: 13.5px;
}

.stream__empty span {
  font-size: 11.5px;
}

.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--line);
  background: var(--bg);
}

.composer__context {
  display: flex;
  align-items: center;
  gap: 6px;
}

.composer__field {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--bg-inset);
}

.composer__field:focus-within {
  border-color: rgba(124, 92, 255, 0.5);
}

.composer__input {
  width: 100%;
  max-height: 168px;
  padding: 9px 10px 2px;
  border: 0;
  background: transparent;
  font-size: 13px;
  line-height: 1.55;
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
  height: 24px;
}

.composer__hint {
  display: flex;
  gap: 6px;
  font-size: 11px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-2);
  font-size: 11px;
  text-decoration: underline dotted;
  cursor: pointer;
}

.spacer {
  margin-left: auto;
}
</style>
