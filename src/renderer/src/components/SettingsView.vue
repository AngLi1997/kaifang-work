<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import AppSelect from './AppSelect.vue'
import { setThemeByLabel, themeLabel, themeOptions } from '../theme'
import { settingsSections } from '../data/settings'
import type { SettingItem } from '../data/types'

const props = defineProps<{ initialSection: string }>()

const emit = defineEmits<{ (e: 'close'): void }>()

const activeSection = ref(props.initialSection)

const values = reactive<Record<string, boolean | string>>({})
for (const section of settingsSections) {
  for (const item of section.items) {
    if (item.type !== 'action') values[item.id] = item.value
  }
}
values['appearance.theme'] = themeLabel()

function selectValue(item: SettingItem, value: string): void {
  values[item.id] = value
  if (item.id === 'appearance.theme') setThemeByLabel(value)
}

function toggle(item: SettingItem): void {
  values[item.id] = !values[item.id]
}
</script>

<template>
  <section class="pane pane--main settings">
    <header class="settings__head">
      <h2>设置</h2>
      <button class="btn btn--sm" @click="emit('close')">
        <AppIcon name="x" :size="12" />
        返回
      </button>
    </header>

    <div class="settings__body">
      <nav class="settings__nav">
        <button
          v-for="section in settingsSections"
          :key="section.id"
          class="nav-item"
          :class="{ 'is-active': section.id === activeSection }"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </button>
      </nav>

      <div class="scroll settings__content">
        <template v-for="section in settingsSections" :key="section.id">
          <section v-show="section.id === activeSection" class="settings__section">
            <h3 class="settings__section-title">{{ section.label }}</h3>

            <div
              v-for="item in section.items"
              :key="item.id"
              class="row"
              :class="{ 'row--danger': item.type === 'action' && item.danger }"
            >
              <label class="row__label" :for="item.id">{{ item.label }}</label>

              <div class="row__control">
                <button
                  v-if="item.type === 'switch'"
                  :id="item.id"
                  class="switch"
                  :class="{ 'is-on': values[item.id] }"
                  role="switch"
                  :aria-checked="!!values[item.id]"
                  @click="toggle(item)"
                />

                <AppSelect
                  v-else-if="item.type === 'select'"
                  class="row__select"
                  :label="item.label"
                  :model-value="String(values[item.id])"
                  :options="item.id === 'appearance.theme' ? themeOptions : item.options"
                  @update:model-value="selectValue(item, $event)"
                />

                <input
                  v-else-if="item.type === 'text'"
                  :id="item.id"
                  :aria-label="item.label"
                  class="input row__input"
                  :value="values[item.id]"
                  @input="values[item.id] = ($event.target as HTMLInputElement).value"
                />

                <input
                  v-else-if="item.type === 'keybinding'"
                  :id="item.id"
                  class="input row__input mono"
                  :aria-label="item.label"
                  :value="values[item.id]"
                  readonly
                />

                <button v-else class="btn btn--sm" :class="{ 'row__danger-btn': item.danger }">
                  {{ item.button }}
                </button>
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  -webkit-app-region: drag;
}

.settings__head h2 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.settings__head .btn {
  -webkit-app-region: no-drag;
}

.settings__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 168px minmax(0, 1fr);
}

.settings__nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 12px 8px;
  border-right: 1px solid var(--line);
}

.settings__content {
  padding: 18px 22px 32px;
}

.settings__section {
  display: flex;
  flex-direction: column;
  max-width: 680px;
}

.settings__section-title {
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line-strong);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.row {
  display: grid;
  align-items: center;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 260px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.row--danger {
  border-bottom-color: rgba(224, 112, 95, 0.22);
}

.row__label {
  font-size: 13.5px;
}

.row__control {
  display: flex;
  justify-content: flex-end;
}

.row__select,
.row__input {
  width: 100%;
}

.row__danger-btn {
  border-color: rgba(224, 112, 95, 0.4);
  color: var(--err);
}
</style>
