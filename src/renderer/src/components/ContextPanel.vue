<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { fileStats, lastToolCall, pendingConfirmation, permissions, steps } from '../data/mock'
import type { Task } from '../data/mock'

defineProps<{ task: Task; model: string; mode: string }>()

const permissionTone: Record<string, string> = {
  allowed: 'is-ok',
  ask: 'is-warn',
  denied: 'is-err'
}

const permissionText: Record<string, string> = {
  allowed: '已授权',
  ask: '执行前确认',
  denied: '未授权'
}
</script>

<template>
  <aside class="pane pane--aside aside">
    <div class="scroll aside__body">
      <section class="group">
        <header class="group__head">
          <span class="section-label">当前步骤</span>
          <span class="group__meta mono">2 / 5</span>
        </header>
        <ol class="steps">
          <li v-for="step in steps" :key="step.label" class="step" :class="`is-${step.state}`">
            <span class="step__mark" />
            <span>{{ step.label }}</span>
          </li>
        </ol>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">文件统计</span>
        </header>
        <div class="stats">
          <div v-for="stat in fileStats" :key="stat.label" class="stat">
            <span class="stat__value" :class="`is-${stat.tone}`">{{ stat.value }}</span>
            <span class="stat__label">{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">运行环境</span>
        </header>
        <dl class="kv">
          <dt>模型</dt>
          <dd class="mono">{{ model }}</dd>
          <dt>模式</dt>
          <dd class="mono">{{ mode }}</dd>
          <dt>任务</dt>
          <dd class="mono">{{ task.id }}</dd>
        </dl>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">工具权限</span>
        </header>
        <ul class="perms">
          <li v-for="perm in permissions" :key="perm.name" class="perm">
            <span
              class="status"
              :class="permissionTone[perm.state]"
              :title="permissionText[perm.state]"
            >
              <span class="status-dot" />
            </span>
            <span class="mono perm__name">{{ perm.name }}</span>
            <span class="perm__scope">{{ perm.scope }}</span>
          </li>
        </ul>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">最近工具调用</span>
        </header>
        <div class="last-tool">
          <div class="last-tool__row">
            <span class="mono">{{ lastToolCall.tool }}</span>
            <span class="mono">{{ lastToolCall.plugin }}</span>
          </div>
          <div class="last-tool__row">
            <AppIcon name="clock" :size="12" />
            <span class="mono">612.4s</span>
            <span class="spacer" />
            <span class="status is-run"><span class="status-dot" />执行中</span>
          </div>
        </div>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">待确认操作</span>
        </header>
        <div class="pending">
          <div class="pending__head">
            <AppIcon name="alert" :size="12" />
            <span>{{ pendingConfirmation.reason }}</span>
          </div>
          <dl class="kv">
            <dt>任务</dt>
            <dd class="mono">{{ pendingConfirmation.taskId }}</dd>
            <dt>影响</dt>
            <dd>{{ pendingConfirmation.impact }}</dd>
          </dl>
        </div>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">执行摘要</span>
        </header>
        <p class="summary-text">
          已识别 96 / 128 个扫描件，93 个成功生成文本层，3
          个存在低置信页面待复核。原始文件未被修改。
        </p>
        <button class="btn btn--sm">
          <AppIcon name="terminal" :size="12" />
          查看执行日志
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.aside__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 14px 12px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.group__meta {
  color: var(--text-2);
  font-size: 11px;
}

.group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 12.5px;
}

.step__mark {
  width: 6px;
  height: 6px;
  flex: none;
  border: 1px solid currentColor;
  border-radius: 50%;
}

.step.is-done {
  color: var(--text-2);
}

.step.is-done .step__mark {
  border-color: var(--ok);
  background: var(--ok);
}

.step.is-active {
  color: var(--text);
}

.step.is-active .step__mark {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.stats {
  display: flex;
  gap: 18px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat__value {
  font-family: var(--mono);
  font-size: 16px;
}

.stat__value.is-ok {
  color: var(--ok);
}

.stat__value.is-warn {
  color: var(--warn);
}

.stat__value.is-dim {
  color: var(--text-2);
}

.stat__label {
  color: var(--text-2);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.kv {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 3px 10px;
  font-size: 12px;
}

.kv dt {
  color: var(--text-2);
}

.kv dd {
  overflow-wrap: anywhere;
}

.perms {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.perm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}

.spacer {
  margin-left: auto;
}

.perm__name {
  flex: none;
}

.perm__scope {
  overflow: hidden;
  flex: 1;
  color: var(--text-2);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-tool {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 11.5px;
}

.last-tool__row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}

.pending {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid rgba(216, 166, 87, 0.32);
  border-radius: var(--radius);
  background: rgba(216, 166, 87, 0.07);
}

.pending__head {
  display: flex;
  gap: 6px;
  color: var(--warn);
  font-size: 12px;
}

.summary-text {
  color: var(--text-2);
  font-size: 12.5px;
}
</style>
