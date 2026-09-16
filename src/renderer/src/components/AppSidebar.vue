<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import TitleBar from './TitleBar.vue'
import UserMenu from './UserMenu.vue'
import type { DirectoryKind, Task, WorkspaceFile } from '../data/types'

type ViewId = 'task' | 'settings' | DirectoryKind

const menu: { id: DirectoryKind; label: string; icon: 'folder' | 'users' | 'library' }[] = [
  { id: 'workspace', label: '工作空间', icon: 'folder' },
  { id: 'talent', label: '专家 / 技能', icon: 'users' },
  { id: 'library', label: '知识库', icon: 'library' }
]

const props = defineProps<{
  activeTaskId: string | null
  currentWorkspaceId: string
  view: ViewId
  tasks: Task[]
  workspaceFiles: WorkspaceFile[]
}>()

const emit = defineEmits<{
  (e: 'select-task', id: string): void
  (e: 'open-settings', section: string): void
  (e: 'new-task'): void
  (e: 'open-view', view: DirectoryKind): void
}>()

const search = ref('')
const tasksExpanded = ref(false)
const filesExpanded = ref(false)
const pageSize = 10

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())

const filteredTasks = computed(() => {
  if (!normalizedSearch.value) return props.tasks
  return props.tasks.filter((task) =>
    task.title.toLocaleLowerCase().includes(normalizedSearch.value)
  )
})

const filteredFiles = computed(() => {
  const workspaceFiles = props.currentWorkspaceId
    ? props.workspaceFiles.filter((file) => file.workspaceId === props.currentWorkspaceId)
    : props.workspaceFiles
  if (!normalizedSearch.value) return workspaceFiles
  return workspaceFiles.filter((file) =>
    file.name.toLocaleLowerCase().includes(normalizedSearch.value)
  )
})

const visibleTasks = computed(() =>
  tasksExpanded.value ? filteredTasks.value : filteredTasks.value.slice(0, pageSize)
)

const visibleFiles = computed(() =>
  filesExpanded.value ? filteredFiles.value : filteredFiles.value.slice(0, pageSize)
)

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return '—'
  const elapsed = Math.max(0, Date.now() - timestamp)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (elapsed < hour) return `${Math.max(1, Math.floor(elapsed / minute))}分钟前`
  if (elapsed < day) return `${Math.floor(elapsed / hour)}小时前`
  if (elapsed < 30 * day) return `${Math.floor(elapsed / day)}天前`
  return `${Math.floor(elapsed / (30 * day))}个月前`
}
</script>

<template>
  <aside class="pane pane--side sidebar">
    <TitleBar />

    <div class="sidebar__top">
      <div class="brand">
        <span class="brand__mark">档</span>
        <strong class="brand__name">KaifangWork</strong>
      </div>

      <nav class="menu">
        <button type="button" class="menu-item" @click="emit('new-task')">
          <AppIcon name="plus" :size="15" />
          新建任务
        </button>
        <button
          v-for="item in menu"
          :key="item.id"
          type="button"
          class="menu-item"
          :class="{ 'is-active': view === item.id }"
          @click="emit('open-view', item.id)"
        >
          <AppIcon :name="item.icon" :size="15" />
          {{ item.label }}
        </button>
      </nav>
    </div>

    <nav class="scroll sidebar__body">
      <div class="sidebar__filter">
        <AppIcon name="search" :size="14" />
        <input
          v-model="search"
          type="search"
          aria-label="搜索任务和工作空间文件"
          placeholder="搜索"
        />
        <button
          v-if="search"
          type="button"
          class="sidebar__filter-clear"
          aria-label="清除搜索"
          @click="search = ''"
        >
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <section class="group">
        <header class="group__head">
          <span class="section-label">任务(10)</span>
        </header>
        <div class="group__items" :class="{ 'is-expanded': tasksExpanded }">
          <button
            v-for="task in visibleTasks"
            :key="task.id"
            type="button"
            class="nav-item task-item"
            :class="{ 'is-active': view === 'task' && task.id === activeTaskId }"
            @click="emit('select-task', task.id)"
          >
            <span class="task-item__title">{{ task.title }}</span>
            <time class="task-item__time">{{ formatRelativeTime(task.lastConversationAt) }}</time>
          </button>
          <span v-if="!visibleTasks.length" class="group__empty">暂无任务</span>
        </div>
        <button
          v-if="filteredTasks.length > pageSize"
          type="button"
          class="group__expand"
          @click="tasksExpanded = !tasksExpanded"
        >
          <AppIcon name="chevron" :size="13" :class="{ 'is-rotated': tasksExpanded }" />
          {{ tasksExpanded ? '收起' : '展开' }}
        </button>
      </section>

      <section class="group">
        <header class="group__head">
          <span class="section-label">工作空间(10)</span>
        </header>
        <div class="group__items" :class="{ 'is-expanded': filesExpanded }">
          <button
            v-for="file in visibleFiles"
            :key="file.id"
            type="button"
            class="nav-item file-item"
          >
            <AppIcon :name="file.kind === 'folder' ? 'folder' : 'file'" :size="14" />
            <span class="nav-item__sub">{{ file.name }}</span>
            <span class="nav-item__meta">{{ file.meta }}</span>
          </button>
          <span v-if="!visibleFiles.length" class="group__empty">暂无文件</span>
        </div>
        <button
          v-if="filteredFiles.length > pageSize"
          type="button"
          class="group__expand"
          @click="filesExpanded = !filesExpanded"
        >
          <AppIcon name="chevron" :size="13" :class="{ 'is-rotated': filesExpanded }" />
          {{ filesExpanded ? '收起' : '展开' }}
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
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 2px;
}

.brand__mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: var(--radius);
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.brand__name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item.is-active {
  background: var(--bg-selected);
}

.sidebar__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 10px 8px 12px;
}

.sidebar__filter {
  display: flex;
  height: 28px;
  flex: none;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-inset);
  color: var(--text-2);
}

.sidebar__filter:focus-within {
  border-color: var(--accent);
}

.sidebar__filter input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}

.sidebar__filter input::-webkit-search-cancel-button {
  display: none;
}

.sidebar__filter-clear {
  display: grid;
  width: 18px;
  height: 18px;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.sidebar__filter-clear:hover {
  color: var(--text);
}

.sidebar__foot {
  flex: none;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--line);
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

.group__items {
  display: flex;
  flex-direction: column;
}

.group__items.is-expanded {
  overflow-y: auto;
  max-height: 224px;
  padding-right: 2px;
}

.group__empty {
  padding: 6px 10px;
  color: var(--text-2);
  font-size: 12px;
}

.group__expand {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 4px 10px;
  border: 0;
  background: transparent;
  color: var(--text-2);
  font-size: 11.5px;
  cursor: pointer;
}

.group__expand:hover {
  color: var(--text);
}

.is-rotated {
  transform: rotate(180deg);
}

.task-item__title,
.file-item .nav-item__sub {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-item__time,
.nav-item__meta {
  flex: none;
  color: var(--text-2);
  font-size: 10.5px;
  font-style: normal;
  font-weight: 400;
}
</style>
