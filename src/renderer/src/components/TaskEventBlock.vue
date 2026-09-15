<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import type { Block } from '../data/mock'

defineProps<{ block: Block }>()

const decision = ref<'approved' | 'rejected' | null>(null)
const copied = ref(false)

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function formatDuration(ms: number): string {
  return ms >= 60000
    ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
    : `${(ms / 1000).toFixed(1)}s`
}

const toolTone = {
  running: 'badge--run',
  succeeded: 'badge--ok',
  'needs-review': 'badge--warn',
  failed: 'badge--err'
} as const

const toolText = {
  running: '执行中',
  succeeded: '成功',
  'needs-review': '待复核',
  failed: '失败'
} as const
</script>

<template>
  <!-- 用户目标 -->
  <article v-if="block.kind === 'user'" class="block block--user selectable">
    <span class="block__label">目标</span>
    <p>{{ block.text }}</p>
  </article>

  <!-- 普通文本 -->
  <article v-else-if="block.kind === 'text'" class="block text-body selectable">
    {{ block.text }}
  </article>

  <!-- 执行计划 -->
  <article v-else-if="block.kind === 'plan'" class="block">
    <header class="block__head">
      <AppIcon name="sparkle" :size="13" />
      <span>{{ block.title }}</span>
    </header>
    <ol class="plan">
      <li
        v-for="step in block.steps"
        :key="step.label"
        class="plan__step"
        :class="`is-${step.state}`"
      >
        <span class="plan__mark">
          <AppIcon
            :name="step.state === 'done' ? 'check' : step.state === 'active' ? 'play' : 'stop'"
            :size="11"
          />
        </span>
        <span>{{ step.label }}</span>
      </li>
    </ol>
  </article>

  <!-- 工具调用 -->
  <article v-else-if="block.kind === 'tool'" class="block block--tool">
    <header class="block__head">
      <AppIcon name="plug" :size="13" />
      <span class="mono">{{ block.tool }}</span>
      <span class="badge" :class="block.source === 'plugin' ? 'badge--accent' : ''">
        {{ block.source === 'plugin' ? `插件 ${block.plugin}` : '内置工具' }}
      </span>
      <span class="spacer" />
      <span v-if="block.durationMs" class="dim mono">{{ formatDuration(block.durationMs) }}</span>
      <span class="badge" :class="toolTone[block.status]">{{ toolText[block.status] }}</span>
    </header>

    <dl class="kv">
      <dt>调用原因</dt>
      <dd class="selectable">{{ block.reason }}</dd>
      <dt>输入</dt>
      <dd class="mono selectable">{{ block.input }}</dd>
      <dt v-if="block.output">输出</dt>
      <dd v-if="block.output" class="mono selectable">{{ block.output }}</dd>
    </dl>

    <div
      v-if="block.progress !== undefined"
      class="progress"
      role="progressbar"
      :aria-valuenow="Math.round(block.progress * 100)"
    >
      <div class="progress__bar" :style="{ width: `${block.progress * 100}%` }" />
      <span class="progress__value mono">{{ Math.round(block.progress * 100) }}%</span>
    </div>
  </article>

  <!-- 终端输出 -->
  <article v-else-if="block.kind === 'terminal'" class="block">
    <header class="block__head">
      <AppIcon name="terminal" :size="13" />
      <span class="mono">{{ block.title }}</span>
      <span class="spacer" />
      <button class="btn btn--ghost btn--sm" @click="copy(block.lines.join('\n'))">
        <AppIcon :name="copied ? 'check' : 'copy'" :size="12" />
        {{ copied ? '已复制' : '复制' }}
      </button>
    </header>
    <pre class="terminal mono selectable">{{ block.lines.join('\n') }}</pre>
  </article>

  <!-- 文件变更 -->
  <article v-else-if="block.kind === 'diff'" class="block">
    <header class="block__head">
      <AppIcon name="file" :size="13" />
      <span class="mono">{{ block.path }}</span>
      <span class="spacer" />
      <span class="badge badge--warn">已修改</span>
    </header>
    <pre class="diff mono selectable"><code><span
      v-for="(hunk, index) in block.hunks"
      :key="index"
      class="diff__line"
      :class="`is-${hunk.type}`"
    >{{ hunk.type === 'add' ? '+' : hunk.type === 'del' ? '-' : ' ' }}{{ hunk.text }}
</span></code></pre>
  </article>

  <!-- 需要确认 -->
  <article v-else-if="block.kind === 'confirm'" class="block block--confirm selectable">
    <header class="block__head">
      <AppIcon name="alert" :size="13" />
      <span>需要确认</span>
      <span class="spacer" />
      <span
        v-if="decision"
        class="badge"
        :class="decision === 'approved' ? 'badge--ok' : 'badge--err'"
      >
        {{ decision === 'approved' ? '已批准' : '已拒绝' }}
      </span>
      <span v-else class="badge badge--warn">等待处理</span>
    </header>
    <dl class="kv">
      <dt>原因</dt>
      <dd>{{ block.reason }}</dd>
      <dt>操作</dt>
      <dd class="mono">{{ block.action }}</dd>
      <dt>影响范围</dt>
      <dd>{{ block.impact }}</dd>
    </dl>
    <footer v-if="!decision" class="actions">
      <button class="btn btn--primary btn--sm" @click="decision = 'approved'">
        <AppIcon name="check" :size="12" />
        批准并继续
      </button>
      <button class="btn btn--sm" @click="decision = 'rejected'">
        <AppIcon name="x" :size="12" />
        拒绝
      </button>
      <span class="dim">决策会写入执行记录</span>
    </footer>
  </article>

  <!-- 状态提示 -->
  <article
    v-else-if="block.kind === 'notice'"
    class="block block--notice"
    :class="`is-${block.level}`"
  >
    <header class="block__head">
      <AppIcon
        :name="block.level === 'error' || block.level === 'warn' ? 'alert' : 'check'"
        :size="13"
      />
      <span>{{ block.title }}</span>
    </header>
    <p class="selectable">{{ block.text }}</p>
  </article>

  <!-- 代码 -->
  <article v-else-if="block.kind === 'code'" class="block">
    <header class="block__head">
      <span class="dim mono">{{ block.lang }}</span>
      <span class="spacer" />
      <button class="btn btn--ghost btn--sm" @click="copy(block.code)">
        <AppIcon :name="copied ? 'check' : 'copy'" :size="12" />
        {{ copied ? '已复制' : '复制' }}
      </button>
    </header>
    <pre class="code mono selectable">{{ block.code }}</pre>
  </article>

  <!-- 阶段小结 -->
  <article v-else-if="block.kind === 'summary'" class="block block--summary">
    <header class="block__head">
      <AppIcon name="check" :size="13" />
      <span>{{ block.title }}</span>
    </header>
    <div class="stats">
      <div v-for="stat in block.stats" :key="stat.label" class="stat">
        <span class="stat__label dim">{{ stat.label }}</span>
        <span class="stat__value">{{ stat.value }}</span>
      </div>
    </div>
    <div v-if="block.next.length" class="next">
      <span class="dim">下一步</span>
      <ul>
        <li v-for="item in block.next" :key="item">{{ item }}</li>
      </ul>
    </div>
  </article>
</template>

<style scoped>
.block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0 14px;
}

.block__head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-2);
  font-size: 12px;
}

.spacer {
  margin-left: auto;
}

.block__label,
.block--user .block__label {
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.block--user p {
  font-size: 13.5px;
  color: var(--text);
}

.text-body {
  color: var(--text);
  white-space: pre-wrap;
}

.block--tool,
.block--confirm,
.block--notice,
.block--summary {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.018);
}

.block--confirm {
  border-color: rgba(216, 166, 87, 0.32);
  background: rgba(216, 166, 87, 0.07);
}

.block--notice.is-warn {
  border-color: rgba(216, 166, 87, 0.3);
  color: var(--warn);
}

.block--notice.is-error {
  border-color: rgba(224, 112, 95, 0.32);
  color: var(--err);
}

.block--notice.is-ok {
  border-color: rgba(93, 189, 139, 0.28);
  color: var(--ok);
}

.block--notice p {
  color: var(--text-2);
  font-size: 12.5px;
}

.block--notice .block__head {
  color: inherit;
  font-weight: 600;
}

.plan {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.plan__step {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-2);
  font-size: 12.5px;
}

.plan__step.is-active {
  color: var(--text);
}

.plan__step.is-todo {
  color: var(--text-3);
}

.plan__mark {
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
  border-radius: 3px;
  background: var(--bg-active);
  color: var(--text-3);
}

.plan__step.is-done .plan__mark {
  color: var(--ok);
}

.plan__step.is-active .plan__mark {
  color: var(--accent);
}

.kv {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 3px 10px;
  font-size: 12.5px;
}

.kv dt {
  color: var(--text-3);
}

.kv dd {
  overflow-wrap: anywhere;
}

.progress {
  position: relative;
  display: flex;
  height: 16px;
  align-items: center;
  gap: 8px;
}

.progress__bar {
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.2s ease;
}

.progress__value {
  color: var(--text-2);
}

.progress::before {
  position: absolute;
  inset: 50% 0 auto 0;
  height: 3px;
  border-radius: 2px;
  background: var(--bg-active);
  content: '';
}

.progress__bar,
.progress__value {
  position: relative;
}

.terminal,
.code,
.diff {
  max-height: 260px;
  overflow: auto;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-inset);
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}

.diff {
  max-height: 200px;
  overflow-x: hidden;
}

.diff__line {
  display: block;
}

.diff__line.is-add {
  color: var(--ok);
  background: rgba(93, 189, 139, 0.08);
}

.diff__line.is-del {
  color: var(--err);
  background: rgba(224, 112, 95, 0.08);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}

.stats {
  display: flex;
  gap: 22px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat__label {
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.stat__value {
  font-family: var(--mono);
  font-size: 15px;
}

.next {
  display: flex;
  gap: 10px;
  font-size: 12.5px;
}

.next ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--text-2);
}

.next li::before {
  margin-right: 6px;
  color: var(--text-3);
  content: '→';
}
</style>
