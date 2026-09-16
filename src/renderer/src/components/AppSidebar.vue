<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import TitleBar from './TitleBar.vue'
import UserMenu from './UserMenu.vue'
import type { DirectoryKind, DirectoryRow, Task } from '../data/types'

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
  workspaces: DirectoryRow[]
}>()

const emit = defineEmits<{
  (e: 'select-task', id: string): void
  (e: 'open-settings', section: string): void
  (e: 'new-task'): void
  (e: 'add-workspace'): void
  (e: 'open-task-folder', id: string): void
  (e: 'rename-task', id: string): void
  (e: 'share-task', id: string): void
  (e: 'delete-task', id: string): void
  (e: 'select-workspace', id: string): void
  (e: 'open-view', view: DirectoryKind): void
}>()

const search = ref('')
const tasksExpanded = ref(false)
const pageSize = 10
const taskMenu = ref<{ taskId: string; top: number; left: number } | null>(null)
const taskMenuElement = ref<HTMLElement | null>(null)

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const taskCount = computed(() => props.tasks.length)

const filteredTasks = computed(() => {
  if (!normalizedSearch.value) return props.tasks
  return props.tasks.filter((task) =>
    task.title.toLocaleLowerCase().includes(normalizedSearch.value)
  )
})

const filteredWorkspaces = computed(() => {
  if (!normalizedSearch.value) return props.workspaces
  return props.workspaces.filter((workspace) =>
    `${workspace.name} ${workspace.meta}`.toLocaleLowerCase().includes(normalizedSearch.value)
  )
})

const visibleWorkspaces = computed(() => filteredWorkspaces.value.slice(0, pageSize))
const workspaceCount = computed(() => props.workspaces.length)

const visibleTasks = computed(() =>
  tasksExpanded.value ? filteredTasks.value : filteredTasks.value.slice(0, pageSize)
)

const taskMenuTask = computed(() =>
  taskMenu.value ? props.tasks.find((task) => task.id === taskMenu.value?.taskId) : null
)

const taskMenuStyle = computed(() => {
  if (!taskMenu.value) return undefined
  return { top: `${taskMenu.value.top}px`, left: `${taskMenu.value.left}px` }
})

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

function selectTask(id: string): void {
  taskMenu.value = null
  emit('select-task', id)
}

function selectWorkspace(id: string): void {
  emit('select-workspace', id)
}

function openTaskMenu(event: MouseEvent, task: Task): void {
  const menuWidth = 164
  const menuHeight = 172
  taskMenu.value = {
    taskId: task.id,
    top: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    left: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))
  }
}

function runTaskAction(
  action: 'open-task-folder' | 'rename-task' | 'share-task' | 'delete-task'
): void {
  const id = taskMenu.value?.taskId
  taskMenu.value = null
  if (!id) return
  if (action === 'open-task-folder') emit('open-task-folder', id)
  if (action === 'rename-task') emit('rename-task', id)
  if (action === 'share-task') emit('share-task', id)
  if (action === 'delete-task') emit('delete-task', id)
}

function closeTaskMenu(event: Event): void {
  const target = event.target
  if (target instanceof Node && taskMenuElement.value?.contains(target)) return
  taskMenu.value = null
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape') {
    event.preventDefault()
    taskMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', closeTaskMenu)
  document.addEventListener('click', closeTaskMenu)
  document.addEventListener('keydown', onKeydown, true)
  window.addEventListener('keyup', onKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeTaskMenu)
  document.removeEventListener('click', closeTaskMenu)
  document.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('keyup', onKeydown, true)
})

watch(taskMenu, (value) => {
  if (value) void nextTick(() => taskMenuElement.value?.focus())
})
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
        <input v-model="search" type="search" aria-label="搜索任务和工作空间" placeholder="搜索" />
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
          <span class="section-label">任务({{ taskCount }})</span>
        </header>
        <div class="group__items" :class="{ 'is-expanded': tasksExpanded }">
          <div
            v-for="task in visibleTasks"
            :key="task.id"
            class="nav-item task-item"
            :class="{ 'is-active': view === 'task' && task.id === activeTaskId }"
            @contextmenu.prevent="openTaskMenu($event, task)"
          >
            <button type="button" class="task-item__main" @click="selectTask(task.id)">
              <span class="task-item__title">{{ task.title }}</span>
              <time class="task-item__time">{{ formatRelativeTime(task.lastConversationAt) }}</time>
            </button>
            <button
              type="button"
              class="task-item__menu btn btn--ghost btn--icon btn--sm"
              :class="{ 'is-visible': taskMenu?.taskId === task.id }"
              title="任务菜单"
              @click.stop="openTaskMenu($event, task)"
            >
              <AppIcon name="more" :size="14" />
            </button>
          </div>
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
          <span class="section-label">工作空间({{ workspaceCount }})</span>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            title="添加工作空间"
            @click="emit('add-workspace')"
          >
            <AppIcon name="plus" :size="14" />
          </button>
        </header>
        <div class="group__items">
          <button
            v-for="workspace in visibleWorkspaces"
            :key="workspace.id"
            type="button"
            class="nav-item file-item workspace-item"
            :class="{ 'is-active': workspace.id === currentWorkspaceId }"
            @click="selectWorkspace(workspace.id)"
          >
            <AppIcon name="folder" :size="14" />
            <span class="nav-item__sub">{{ workspace.name }}</span>
          </button>
          <span v-if="!visibleWorkspaces.length" class="group__empty">暂无工作空间</span>
        </div>
      </section>
    </nav>

    <footer class="sidebar__foot">
      <UserMenu @open-settings="emit('open-settings', $event)" />
    </footer>
  </aside>

  <Teleport to="body">
    <button
      v-if="taskMenu"
      type="button"
      class="task-menu-backdrop"
      aria-label="关闭任务菜单"
      @click="taskMenu = null"
    />
    <div
      v-if="taskMenu && taskMenuTask"
      ref="taskMenuElement"
      class="task-menu"
      role="menu"
      tabindex="-1"
      :style="taskMenuStyle"
      @keydown.esc="taskMenu = null"
    >
      <button type="button" role="menuitem" @click="runTaskAction('open-task-folder')">
        <AppIcon name="folder-open" :size="14" />
        打开文件夹
      </button>
      <button type="button" role="menuitem" @click="runTaskAction('rename-task')">
        <AppIcon name="pencil" :size="14" />
        重命名
      </button>
      <button type="button" role="menuitem" @click="runTaskAction('share-task')">
        <AppIcon name="share" :size="14" />
        分享任务
      </button>
      <button type="button" role="menuitem" class="is-danger" @click="runTaskAction('delete-task')">
        <AppIcon name="trash" :size="14" />
        删除任务
      </button>
    </div>
  </Teleport>
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

.group__head .btn {
  margin-right: 2px;
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

.task-item {
  gap: 0;
  padding: 0;
}

.task-item__main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.task-item__main:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.task-item__menu {
  width: 26px;
  height: 26px;
  margin-right: 2px;
  opacity: 0;
}

.task-item:hover .task-item__menu,
.task-item__menu.is-visible,
.task-item:focus-within .task-item__menu {
  opacity: 1;
}

.task-menu {
  position: fixed;
  z-index: 20;
  display: flex;
  width: 164px;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-inset);
  box-shadow: 0 8px 24px var(--shadow);
}

.task-menu-backdrop {
  position: fixed;
  z-index: 19;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
}

.task-menu button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.task-menu button:hover {
  background: var(--bg-hover);
}

.task-menu button.is-danger {
  color: var(--err);
}
</style>
