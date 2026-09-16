<script setup lang="ts">
// 自绘下拉列表：不使用系统原生 select 弹层，弹层挂在 body 上以避开滚动容器裁剪。
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly string[]
    label?: string
    variant?: 'field' | 'bare'
    size?: 'sm' | 'md'
  }>(),
  { variant: 'field', size: 'md' }
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const id = useId()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLElement | null>(null)
const open = ref(false)
const active = ref(0)
const popStyle = ref<Record<string, string>>({})

async function toggle(): Promise<void> {
  if (open.value) {
    open.value = false
    return
  }
  open.value = true
  active.value = Math.max(0, props.options.indexOf(props.modelValue))
  await nextTick()
  place()
}

// 弹层位置按触发器测量，空间不足时上翻并右对齐。
function place(): void {
  const t = trigger.value
  const l = list.value
  if (!t || !l) return
  const r = t.getBoundingClientRect()
  const width = l.offsetWidth
  const height = l.offsetHeight
  const up = r.bottom + height + 8 > window.innerHeight && r.top > height + 8
  const left = r.left + width + 8 > window.innerWidth ? Math.max(8, r.right - width) : r.left
  popStyle.value = {
    left: `${left}px`,
    top: `${up ? r.top - height - 4 : r.bottom + 4}px`,
    minWidth: `${r.width}px`
  }
}

function pick(option: string): void {
  open.value = false
  if (option !== props.modelValue) emit('update:modelValue', option)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (!open.value) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
      event.preventDefault()
      void toggle()
    }
    return
  }
  const last = props.options.length - 1
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.min(last, Math.max(0, active.value + (event.key === 'ArrowDown' ? 1 : -1)))
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    pick(props.options[active.value])
  } else if (event.key === 'Tab') {
    open.value = false
  }
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target as Node
  if (root.value?.contains(target) || list.value?.contains(target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
})
</script>

<template>
  <div
    ref="root"
    class="selectbox"
    :class="[`selectbox--${variant}`, `selectbox--${size}`, { 'is-open': open }]"
  >
    <button
      ref="trigger"
      type="button"
      class="selectbox__trigger"
      :aria-label="label"
      :aria-expanded="open"
      :aria-activedescendant="open ? `${id}-${active}` : undefined"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="selectbox__value">{{ modelValue }}</span>
      <AppIcon name="chevron" :size="13" class="selectbox__caret" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="list"
        class="selectbox__pop"
        :style="popStyle"
        role="listbox"
        :aria-label="label"
      >
        <div
          v-for="(option, index) in options"
          :id="`${id}-${index}`"
          :key="option"
          class="selectbox__option"
          :class="{ 'is-active': index === active, 'is-selected': option === modelValue }"
          role="option"
          :aria-selected="option === modelValue"
          @mouseenter="active = index"
          @click="pick(option)"
        >
          <span class="selectbox__option-text">{{ option }}</span>
          <AppIcon v-if="option === modelValue" name="check" :size="12" class="selectbox__check" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.selectbox {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.selectbox--field {
  width: 100%;
}

.selectbox__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-inset);
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.selectbox--md .selectbox__trigger {
  height: 28px;
}

.selectbox--sm .selectbox__trigger {
  height: 24px;
  font-size: 11.5px;
}

.selectbox--field .selectbox__trigger:hover {
  border-color: var(--line-strong);
}

.selectbox--bare .selectbox__trigger {
  border-color: transparent;
  background: transparent;
}

.selectbox--bare .selectbox__trigger:hover,
.selectbox.is-open .selectbox__trigger {
  background: var(--bg-hover);
}

.selectbox__value {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selectbox__caret {
  flex: none;
  color: var(--text-2);
  transition: transform 0.12s ease;
}

.selectbox.is-open .selectbox__caret {
  transform: rotate(180deg);
}

.selectbox__pop {
  position: fixed;
  z-index: 40;
  display: flex;
  overflow-y: auto;
  max-height: 264px;
  flex-direction: column;
  gap: 1px;
  padding: 4px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-panel);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  overscroll-behavior: contain;
}

.selectbox__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius);
  font-size: 12.5px;
  cursor: pointer;
}

.selectbox__option.is-active {
  background: var(--bg-hover);
}

.selectbox__option.is-selected {
  font-weight: 600;
}

.selectbox__option-text {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selectbox__check {
  flex: none;
  color: var(--accent);
}
</style>
