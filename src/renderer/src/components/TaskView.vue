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
  Draft: 'is-draft',
  Running: 'is-run',
  WaitingForConfirmation: 'is-warn',
  Succeeded: 'is-ok',
  Failed: 'is-err'
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
</script>

<template>
  <section class="pane pane--main">
    <header class="task-head">
      <div class="task-head__title">
        <h2>{{ task.title }}</h2>
        <div class="task-head__meta">
          <span class="status" :class="statusTone[task.status]">
            <span class="status-dot" />
            {{ statusText[task.status] }}
          </span>
          <span class="mono">{{ task.model }}</span>
          <span class="mono">{{ task.duration }}</span>
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
      <TaskEventBlock v-for="block in task.blocks" :key="block.id" :block="block" />
      <div v-if="task.status === 'Running'" class="stream__pending">
        <span class="pulse" />
        基础 Agent 正在处理 incoming/0097_会议记录_2021.pdf
      </div>
    </div>

    <footer class="composer">
      <div class="composer__context">
        <span class="ctx">
          <AppIcon name="folder" :size="12" />
          incoming/
        </span>
        <span class="ctx"> <AppIcon name="clip" :size="12" />3 </span>
        <span class="ctx status is-warn" title="workspace.write · 执行前确认">
          <AppIcon name="shield" :size="13" />
        </span>
      </div>

      <div class="composer__field">
        <textarea
          ref="composer"
          v-model="input"
          class="composer__input"
          rows="1"
          placeholder="描述治理目标，或补充上下文…"
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
  -webkit-app-region: drag;
}

.task-head__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.task-head h2 {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-head__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
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
  gap: 12px;
}

.ctx {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-2);
  font-size: 11.5px;
}

.composer__field {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-inset);
}

.composer__field:focus-within {
  border-color: var(--accent);
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
  height: 24px;
}

.spacer {
  margin-left: auto;
}
</style>
