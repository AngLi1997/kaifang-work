<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import UserMenu from './UserMenu.vue'
import { historyTasks, tasks, workspaceFiles } from '../data/mock'
import type { TaskStatus } from '../data/mock'

defineProps<{ activeTaskId: string; view: 'task' | 'settings' }>()

const emit = defineEmits<{
  (e: 'select-task', id: string): void
  (e: 'open-settings', section: string): void
  (e: 'new-task'): void
}>()

const statusText: Record<TaskStatus, string> = {
  Draft: '草稿',
  Running: '执行中',
  WaitingForConfirmation: '待确认',
  Succeeded: '已完成',
  Failed: '失败'
}

const statusTone: Record<TaskStatus, string> = {
  Draft: 'is-draft',
  Running: 'is-run',
  WaitingForConfirmation: 'is-warn',
  Succeeded: 'is-ok',
  Failed: 'is-err'
}
</script>

<template>
  <aside class="pane pane--side sidebar">
    <div class="sidebar__top">
      <div class="brand">
        <span class="brand__mark">K</span>
        <strong class="brand__name">KaifangWork</strong>
      </div>

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
          :title="statusText[task.status]"
          @click="emit('select-task', task.id)"
        >
          <span class="status" :class="statusTone[task.status]"><span class="status-dot" /></span>
          <span class="task-item__title">{{ task.title }}</span>
        </button>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">工作空间文件</span>
        </header>
        <button v-for="file in workspaceFiles" :key="file.name" class="nav-item">
          <AppIcon :name="file.kind === 'folder' ? 'folder' : 'file'" :size="14" />
          <span class="nav-item__sub">{{ file.name }}</span>
          <span class="nav-item__meta">{{ file.meta }}</span>
        </button>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">历史任务</span>
        </header>
        <button v-for="item in historyTasks" :key="item.id" class="nav-item">
          <AppIcon name="history" :size="14" />
          <span class="nav-item__sub">{{ item.title }}</span>
          <span class="nav-item__meta">{{ item.time }}</span>
        </button>
      </section>
    </nav>

    <footer class="sidebar__foot">
      <UserMenu @open-settings="emit('open-settings', $event)" />
    </footer>
  </aside>
</template>

<style scoped>
.sidebar {
  gap: 0;
}

.sidebar__top {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px;
}

.brand__mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 5px;
  background: linear-gradient(150deg, #9a83ff, var(--accent));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.brand__name {
  font-size: 12.5px;
  font-weight: 600;
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

.task-item__title {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-item__meta {
  flex: none;
  color: var(--text-2);
  font-size: 10.5px;
}
</style>
