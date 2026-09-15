<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { historyTasks, tasks, workspaceFiles, workspaces } from '../data/mock'
import type { TaskStatus } from '../data/mock'

defineProps<{ activeTaskId: string; workspaceId: string; view: 'task' | 'settings' }>()

const emit = defineEmits<{
  (e: 'select-task', id: string): void
  (e: 'select-workspace', id: string): void
  (e: 'open-view', view: 'task' | 'settings'): void
  (e: 'new-task'): void
}>()

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
  WaitingForConfirmation: '待确认',
  Succeeded: '已完成',
  Failed: '失败'
}
</script>

<template>
  <aside class="pane pane--side sidebar">
    <div class="sidebar__top">
      <div class="brand">
        <span class="brand__mark">K</span>
        <span class="brand__text">
          <strong>KaifangWork</strong>
          <small class="dim">档案治理工作台</small>
        </span>
      </div>

      <select
        class="select sidebar__workspace"
        :value="workspaceId"
        @change="emit('select-workspace', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">{{ ws.name }}</option>
      </select>

      <button class="btn btn--primary sidebar__new" @click="emit('new-task')">
        <AppIcon name="plus" :size="14" />
        新任务
      </button>
    </div>

    <nav class="scroll sidebar__body">
      <section class="group">
        <header class="group__head">
          <span class="section-label">最近任务</span>
        </header>
        <button
          v-for="task in tasks"
          :key="task.id"
          class="nav-item task-item"
          :class="{ 'is-active': view === 'task' && task.id === activeTaskId }"
          @click="emit('select-task', task.id)"
        >
          <span class="dot" :class="`dot--${task.status}`" />
          <span class="task-item__main">
            <span class="task-item__title">{{ task.title }}</span>
            <span class="nav-item__sub">{{ task.id }} · {{ task.duration }}</span>
          </span>
          <span class="badge" :class="statusTone[task.status]">{{ statusText[task.status] }}</span>
        </button>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">工作空间文件</span>
        </header>
        <button v-for="file in workspaceFiles" :key="file.name" class="nav-item">
          <AppIcon :name="file.kind === 'folder' ? 'folder' : 'file'" :size="14" />
          <span class="nav-item__sub">{{ file.name }}</span>
          <span class="dim file-item__meta">{{ file.meta }}</span>
        </button>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">历史任务</span>
        </header>
        <button v-for="item in historyTasks" :key="item.id" class="nav-item">
          <AppIcon name="history" :size="14" />
          <span class="nav-item__sub">{{ item.title }}</span>
          <span class="dim file-item__meta">{{ item.time }}</span>
        </button>
      </section>
    </nav>

    <div class="sidebar__foot">
      <div class="divider" />
      <button
        class="nav-item"
        :class="{ 'is-active': view === 'settings' }"
        @click="emit('open-view', 'settings')"
      >
        <AppIcon name="sliders" :size="14" />
        设置
      </button>
      <button class="nav-item">
        <AppIcon name="user" :size="14" />
        账号
        <span class="nav-item__sub">已连接 Anthropic</span>
      </button>
      <button class="nav-item">
        <AppIcon name="help" :size="14" />
        帮助与快捷键
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  gap: 0;
}

.sidebar__top {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 10px 10px;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 6px;
}

.brand__mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 6px;
  background: linear-gradient(150deg, #9a83ff, var(--accent));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand__text strong {
  font-size: 12.5px;
  font-weight: 600;
}

.brand__text small {
  font-size: 10.5px;
}

.sidebar__workspace {
  width: 100%;
}

.sidebar__new {
  justify-content: center;
}

.sidebar__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 12px 8px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 6px;
}

.task-item {
  align-items: flex-start;
  padding: 6px 8px;
}

.dot--Running {
  color: var(--info);
}

.dot--WaitingForConfirmation {
  color: var(--warn);
}

.dot--Succeeded {
  color: var(--ok);
}

.dot--Failed {
  color: var(--err);
}

.task-item .dot {
  margin-top: 6px;
}

.task-item__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.task-item__title {
  overflow: hidden;
  color: inherit;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-item .badge {
  flex: none;
  margin-top: 1px;
}

.file-item__meta {
  flex: none;
  font-size: 10.5px;
}

.sidebar__foot {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px;
}

.sidebar__foot .divider {
  margin: 0 2px 6px;
}

.sidebar__foot .nav-item__sub {
  margin-left: auto;
}
</style>
