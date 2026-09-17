<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { DirectoryKind, DirectoryRow } from '../data/types'

const props = defineProps<{
  kind: DirectoryKind
  rows: DirectoryRow[]
  activeWorkspaceId: string
}>()

const emit = defineEmits<{
  (e: 'select-workspace', id: string): void
  (e: 'create', kind: DirectoryKind): void
}>()

const titles: Record<DirectoryKind, string> = {
  workspace: '工作空间',
  talent: '专家 / 技能',
  library: '知识库'
}

const metaTitles: Record<DirectoryKind, string> = {
  workspace: '位置',
  talent: '类型',
  library: '来源'
}

const actionLabels: Partial<Record<DirectoryKind, string>> = {
  workspace: '新建',
  talent: '添加',
  library: '新建'
}

function selectRow(row: DirectoryRow): void {
  if (props.kind === 'workspace' && row.workspaceId) emit('select-workspace', row.workspaceId)
}
</script>

<template>
  <section class="pane pane--main directory">
    <header class="directory__head">
      <h2>{{ titles[props.kind] }}</h2>
      <button
        v-if="actionLabels[props.kind]"
        type="button"
        class="btn btn--primary btn--sm"
        @click="emit('create', props.kind)"
      >
        <AppIcon name="plus" :size="13" />
        {{ actionLabels[props.kind] }}
      </button>
    </header>

    <div class="scroll directory__list">
      <div class="directory__table" role="table">
        <div class="directory__table-head" role="row">
          <span role="columnheader">名称</span>
          <span role="columnheader">{{ metaTitles[props.kind] }}</span>
        </div>

        <button
          v-for="row in props.rows"
          :key="row.id"
          type="button"
          class="directory__row"
          :class="{ 'is-active': row.workspaceId === activeWorkspaceId }"
          role="row"
          @click="selectRow(row)"
        >
          <span class="directory__cell directory__cell--name" role="cell">
            <AppIcon :name="row.icon" :size="15" />
            <span>{{ row.name }}</span>
          </span>
          <span class="directory__cell directory__cell--meta" role="cell">{{ row.meta }}</span>
        </button>

        <div v-if="!props.rows.length" class="directory__empty">暂无内容</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.directory__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 120px 12px 22px;
  border-bottom: 1px solid var(--line);
  -webkit-app-region: drag;
}

.directory__head h2 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.directory__head .btn {
  -webkit-app-region: no-drag;
}

.directory__list {
  flex: 1;
  padding: 16px 22px 24px;
}

.directory__table {
  min-width: 520px;
}

.directory__table-head,
.directory__row {
  display: grid;
  align-items: center;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) 240px;
}

.directory__table-head {
  padding: 0 12px 8px;
  border-bottom: 1px solid var(--line-strong);
  color: var(--text-2);
  font-size: 11.5px;
  font-weight: 700;
}

.directory__row {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.directory__row:hover {
  background: var(--bg-hover);
}

.directory__row.is-active {
  background: var(--bg-selected);
}

.directory__cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.directory__cell--name {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory__cell--name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory__cell--meta {
  overflow: hidden;
  color: var(--text-2);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory__empty {
  padding: 24px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--text-2);
  font-size: 12.5px;
}
</style>
