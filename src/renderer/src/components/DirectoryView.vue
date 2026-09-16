<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { directory } from '../data/mock'

const props = defineProps<{ kind: 'workspace' | 'talent' | 'library' }>()

const titles = { workspace: '工作空间', talent: '专家 / 技能', library: '资料库' } as const

const rows = computed(() => directory[props.kind])
</script>

<template>
  <section class="pane pane--main directory">
    <header class="directory__head">
      <h2>{{ titles[kind] }}</h2>
    </header>

    <div class="scroll directory__list">
      <div v-for="row in rows" :key="row.id" class="row">
        <AppIcon :name="row.icon" :size="15" />
        <span class="row__name">{{ row.name }}</span>
        <span class="row__meta">{{ row.meta }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.directory__head {
  display: flex;
  align-items: center;
  padding: 14px 22px;
  border-bottom: 1px solid var(--line);
  -webkit-app-region: drag;
}

.directory__head h2 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.directory__list {
  flex: 1;
  padding: 6px 22px 24px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 2px;
  border-bottom: 1px solid var(--line);
}

.row__name {
  flex: none;
  font-size: 13.5px;
  font-weight: 600;
}

.row__meta {
  overflow: hidden;
  margin-left: auto;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
