<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const emit = defineEmits<{ (e: 'open-settings', section: string): void }>()

const user = { name: '梁一鸣', role: '档案治理专员', initials: '梁' }

const open = ref(false)
const about = ref(false)
const root = ref<HTMLElement | null>(null)

const versions = window.electron?.process?.versions
const version = computed(() => `KaifangWork 1.0.0 · Electron ${versions?.electron ?? '—'}`)

function toggle(): void {
  open.value = !open.value
  about.value = false
}

function pick(section: string): void {
  open.value = false
  emit('open-settings', section)
}

function onPointerDown(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="user">
    <div v-if="open" class="user__menu" role="menu">
      <template v-if="!about">
        <div class="user__head">
          <span class="user__avatar user__avatar--sm">{{ user.initials }}</span>
          <span class="user__head-text">
            <strong>{{ user.name }}</strong>
            <small>{{ user.role }}</small>
          </span>
        </div>
        <div class="divider" />
        <button class="user__item" role="menuitem" @click="pick('general')">
          <AppIcon name="sliders" :size="14" />
          设置
        </button>
        <button class="user__item" role="menuitem" @click="pick('models')">
          <AppIcon name="user" :size="14" />
          账号
        </button>
        <button class="user__item" role="menuitem" @click="about = true">
          <AppIcon name="help" :size="14" />
          关于
        </button>
      </template>

      <template v-else>
        <button class="user__item" role="menuitem" @click="about = false">
          <AppIcon name="chevron" :size="14" style="transform: rotate(90deg)" />
          关于 KaifangWork
        </button>
        <p class="user__about">{{ version }}</p>
      </template>
    </div>

    <button class="user__entry" :aria-expanded="open" aria-haspopup="menu" @click="toggle">
      <span class="user__avatar">{{ user.initials }}</span>
      <span class="user__name">{{ user.name }}</span>
      <span class="spacer" />
      <AppIcon name="chevron" :size="13" :style="{ transform: open ? 'rotate(180deg)' : 'none' }" />
    </button>
  </div>
</template>

<style scoped>
.user {
  position: relative;
}

.user__entry {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.user__entry:hover {
  background: var(--bg-hover);
}

.user__avatar {
  display: grid;
  width: 24px;
  height: 24px;
  flex: none;
  place-items: center;
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 700;
}

.user__avatar--sm {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.spacer {
  margin-left: auto;
}

.user__name {
  font-size: 13px;
  font-weight: 600;
}

.user__menu {
  position: absolute;
  left: -2px;
  bottom: calc(100% + 6px);
  display: flex;
  width: 208px;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-panel);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.user__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 8px;
}

.user__head-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user__head-text strong {
  font-size: 13px;
  font-weight: 700;
}

.user__head-text small {
  color: var(--text-2);
  font-size: 11.5px;
}

.user__menu .divider {
  margin-bottom: 5px;
}

.user__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.user__item:hover {
  background: var(--bg-hover);
}

.user__about {
  padding: 2px 8px 6px;
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.5;
}
</style>
