<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { settingsSections } from '../data/mock'
import type { SettingItem } from '../data/mock'

const emit = defineEmits<{ (e: 'close'): void }>()

const activeSection = ref(settingsSections[0].id)

const values = reactive<Record<string, boolean | string>>({})
for (const section of settingsSections) {
  for (const item of section.items) {
    if (item.type !== 'action') values[item.id] = item.value
  }
}

function toggle(item: SettingItem): void {
  values[item.id] = !values[item.id]
}

function sectionCount(): number {
  return settingsSections.length
}
</script>

<template>
  <section class="pane pane--main settings">
    <header class="settings__head">
      <div>
        <h2>设置</h2>
        <span class="dim">{{ sectionCount() }} 个分类 · 修改立即生效并写入本地配置</span>
      </div>
      <button class="btn btn--sm" @click="emit('close')">
        <AppIcon name="x" :size="12" />
        返回工作区
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
            <header class="settings__section-head">
              <h3>{{ section.label }}</h3>
              <p class="dim">{{ section.description }}</p>
            </header>

            <div
              v-for="item in section.items"
              :key="item.id"
              class="row"
              :class="{ 'row--danger': item.type === 'action' && item.danger }"
            >
              <label class="row__label" :for="item.id">
                <span>{{ item.label }}</span>
                <span v-if="item.type !== 'action' && item.hint" class="dim row__hint">{{
                  item.hint
                }}</span>
                <span v-else-if="item.type === 'action' && item.hint" class="dim row__hint">{{
                  item.hint
                }}</span>
              </label>

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

                <select
                  v-else-if="item.type === 'select'"
                  :id="item.id"
                  class="select row__select"
                  :value="values[item.id]"
                  @change="values[item.id] = ($event.target as HTMLSelectElement).value"
                >
                  <option v-for="option in item.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>

                <input
                  v-else-if="item.type === 'text'"
                  :id="item.id"
                  class="input row__input"
                  :value="values[item.id]"
                  @input="values[item.id] = ($event.target as HTMLInputElement).value"
                />

                <input
                  v-else-if="item.type === 'keybinding'"
                  :id="item.id"
                  class="input row__input mono"
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
}

.settings__head h2 {
  font-size: 14px;
  font-weight: 600;
}

.settings__head span {
  font-size: 11px;
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
  padding: 18px 22px 40px;
}

.settings__section {
  display: flex;
  flex-direction: column;
  max-width: 680px;
}

.settings__section-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line);
}

.settings__section-head h3 {
  font-size: 13px;
  font-weight: 600;
}

.settings__section-head p {
  font-size: 11.5px;
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
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
}

.row__hint {
  font-size: 11px;
  line-height: 1.45;
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
