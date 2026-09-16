<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import AppSelect from './AppSelect.vue'
import TaskEventBlock from './TaskEventBlock.vue'
import type { Task } from '../data/types'

const props = defineProps<{
  task: Task | null
  asideVisible: boolean
  model: string
  mode: string
  draftInput: string
}>()

const emit = defineEmits<{
  (e: 'submit', text: string): void
  (e: 'toggle-aside'): void
  (e: 'update:model', value: string): void
  (e: 'update:mode', value: string): void
  (e: 'update:draft-input', value: string): void
}>()

const input = ref(props.draftInput)
const composer = ref<HTMLTextAreaElement | null>(null)

const models = ['claude-sonnet-4.5', 'claude-haiku-4', 'gpt-5.1', 'deepseek-v3.2']
const modes = ['Agent 执行', '对话', '只读分析']

const submitLabel = computed(() =>
  props.task?.status === 'Succeeded' || props.task?.status === 'Failed' ? '再次运行' : '提交'
)

watch(
  () => [props.task?.id, props.draftInput] as const,
  ([, draft]) => {
    if (draft !== input.value) input.value = draft
  }
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
        <h2>{{ task?.title || '新任务' }}</h2>
      </div>

      <div class="task-head__actions">
        <button v-if="task?.status === 'Running'" type="button" class="btn btn--sm">
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

    <div class="scroll stream selectable">
      <TaskEventBlock v-for="block in task?.blocks ?? []" :key="block.id" :block="block" />
    </div>

    <footer class="composer">
      <div class="composer__field">
        <textarea
          ref="composer"
          v-model="input"
          class="composer__input"
          rows="1"
          placeholder="描述治理目标，或补充上下文…"
          @input="emit('update:draft-input', input)"
          @keydown="onKeydown"
        />
        <div class="composer__toolbar">
          <button type="button" class="btn btn--ghost btn--icon btn--sm" title="添加附件">
            <AppIcon name="clip" :size="13" />
          </button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm" title="添加上下文">
            <AppIcon name="plus" :size="13" />
          </button>
          <button type="button" class="btn btn--ghost btn--sm">@ 引用文件</button>

          <span class="spacer" />

          <AppSelect
            class="composer__select"
            variant="bare"
            size="sm"
            label="模型"
            :model-value="model"
            :options="models"
            @update:model-value="emit('update:model', $event)"
          />
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
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 20px 8px;
  user-select: text;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--line);
  background: var(--bg);
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
}

.spacer {
  margin-left: auto;
}
</style>
