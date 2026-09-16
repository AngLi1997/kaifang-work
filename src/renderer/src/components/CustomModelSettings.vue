<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import AppSelect from './AppSelect.vue'
import type { CustomModelConfig, ModelProtocol, SaveCustomModelInput } from '../../../shared/agent'

const props = defineProps<{
  models: readonly CustomModelConfig[]
}>()

const emit = defineEmits<{
  (e: 'update:models', models: CustomModelConfig[]): void
}>()

type FormState = {
  providerName: string
  endpoint: string
  apiKey: string
  modelId: string
  protocol: ModelProtocol
  supportsTools: boolean
  supportsImages: boolean
  inputContextLength: string
  outputContextLength: string
}

const protocolLabels: Record<ModelProtocol, string> = {
  'openai-completions': 'Completions',
  'openai-responses': 'Responses'
}

function emptyForm(): FormState {
  return {
    providerName: '',
    endpoint: '',
    apiKey: '',
    modelId: '',
    protocol: 'openai-completions',
    supportsTools: false,
    supportsImages: false,
    inputContextLength: '',
    outputContextLength: ''
  }
}

const formVisible = ref(false)
const editingModelId = ref<string | null>(null)
const saving = ref(false)
const error = ref('')
const form = reactive<FormState>(emptyForm())

const protocolValue = computed(() => protocolLabels[form.protocol])
const formTitle = computed(() => (editingModelId.value ? '编辑模型' : '新增模型'))

function optionalContextLength(value: string): boolean {
  if (!value.trim()) return true
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
}

const canSave = computed(() => {
  return (
    Boolean(form.providerName.trim() && form.endpoint.trim() && form.modelId.trim()) &&
    optionalContextLength(form.inputContextLength) &&
    optionalContextLength(form.outputContextLength) &&
    !saving.value
  )
})

function openForm(model?: CustomModelConfig): void {
  Object.assign(form, emptyForm())
  editingModelId.value = model?.id ?? null
  if (model) {
    Object.assign(form, {
      providerName: model.providerName,
      endpoint: model.endpoint,
      modelId: model.modelId,
      protocol: model.protocol,
      supportsTools: model.supportsTools,
      supportsImages: model.supportsImages,
      inputContextLength: String(model.inputContextLength),
      outputContextLength: String(model.outputContextLength)
    })
  }
  error.value = ''
  formVisible.value = true
}

function closeForm(): void {
  if (saving.value) return
  formVisible.value = false
  editingModelId.value = null
}

function selectProtocol(value: string): void {
  const entry = Object.entries(protocolLabels).find(([, label]) => label === value)
  if (entry) form.protocol = entry[0] as ModelProtocol
}

async function save(): Promise<void> {
  if (!canSave.value) return
  error.value = ''
  saving.value = true
  try {
    const input: SaveCustomModelInput = {
      ...(editingModelId.value ? { id: editingModelId.value } : {}),
      providerName: form.providerName,
      endpoint: form.endpoint,
      modelId: form.modelId,
      protocol: form.protocol,
      supportsTools: form.supportsTools,
      supportsImages: form.supportsImages,
      ...(form.apiKey.trim() ? { apiKey: form.apiKey } : {}),
      ...(form.inputContextLength.trim()
        ? { inputContextLength: Number(form.inputContextLength) }
        : {}),
      ...(form.outputContextLength.trim()
        ? { outputContextLength: Number(form.outputContextLength) }
        : {})
    }
    const saved = await window.api.agent.saveCustomModel(input)
    const models = props.models.filter((model) => model.id !== saved.id)
    emit('update:models', [saved, ...models])
    formVisible.value = false
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    saving.value = false
  }
}

async function remove(model: CustomModelConfig): Promise<void> {
  try {
    await window.api.agent.deleteCustomModel(model.id)
    emit(
      'update:models',
      props.models.filter((item) => item.id !== model.id)
    )
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason)
  }
}
</script>

<template>
  <section class="custom-models">
    <div class="custom-models__head">
      <h4>自定义</h4>
      <button class="btn btn--sm" type="button" @click="openForm()">
        <AppIcon name="plus" :size="12" />
        新增
      </button>
    </div>

    <div v-if="models.length" class="custom-models__list">
      <div v-for="model in models" :key="model.id" class="custom-model">
        <div class="custom-model__main">
          <div class="custom-model__title">
            <span>{{ model.providerName }}</span>
            <span class="custom-model__separator">/</span>
            <span class="mono">{{ model.modelId }}</span>
          </div>
          <div class="custom-model__meta">
            <span>{{ protocolLabels[model.protocol] }}</span>
            <span>{{ model.inputContextLength }} 输入 / {{ model.outputContextLength }} 输出</span>
            <span v-if="model.supportsTools">工具</span>
            <span v-if="model.supportsImages">图片</span>
          </div>
        </div>
        <div class="custom-model__actions">
          <button
            class="btn btn--icon btn--sm"
            type="button"
            aria-label="编辑自定义模型"
            title="编辑自定义模型"
            @click="openForm(model)"
          >
            <AppIcon name="pencil" :size="13" />
          </button>
          <button
            class="btn btn--icon btn--sm"
            type="button"
            aria-label="删除自定义模型"
            @click="remove(model)"
          >
            <AppIcon name="trash" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="custom-models__empty">暂无自定义模型</div>

    <div v-if="formVisible" class="custom-models__form">
      <div class="custom-models__form-head">
        <h4>{{ formTitle }}</h4>
        <button class="btn btn--icon btn--sm" type="button" aria-label="关闭" @click="closeForm">
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <label class="custom-field">
        <span>供应商名称</span>
        <input v-model="form.providerName" class="input" type="text" autocomplete="off" />
      </label>
      <label class="custom-field custom-field--wide">
        <span>接口地址</span>
        <input v-model="form.endpoint" class="input mono" type="url" autocomplete="off" />
      </label>
      <label class="custom-field">
        <span>API Key</span>
        <input v-model="form.apiKey" class="input" type="password" autocomplete="off" />
      </label>
      <label class="custom-field">
        <span>模型名称</span>
        <input v-model="form.modelId" class="input mono" type="text" autocomplete="off" />
      </label>
      <label class="custom-field">
        <span>接口形式</span>
        <AppSelect
          :model-value="protocolValue"
          :options="Object.values(protocolLabels)"
          label="接口形式"
          @update:model-value="selectProtocol"
        />
      </label>
      <label class="custom-field">
        <span>输入上下文长度</span>
        <input
          v-model="form.inputContextLength"
          class="input"
          type="number"
          min="1"
          inputmode="numeric"
        />
      </label>
      <label class="custom-field">
        <span>输出上下文长度</span>
        <input
          v-model="form.outputContextLength"
          class="input"
          type="number"
          min="1"
          inputmode="numeric"
        />
      </label>
      <div class="custom-options">
        <button
          class="custom-option"
          :class="{ 'is-on': form.supportsTools }"
          type="button"
          role="switch"
          :aria-checked="form.supportsTools"
          @click="form.supportsTools = !form.supportsTools"
        >
          <span>支持工具调用</span>
          <span class="switch" :class="{ 'is-on': form.supportsTools }" aria-hidden="true" />
        </button>
        <button
          class="custom-option"
          :class="{ 'is-on': form.supportsImages }"
          type="button"
          role="switch"
          :aria-checked="form.supportsImages"
          @click="form.supportsImages = !form.supportsImages"
        >
          <span>支持图片输入</span>
          <span class="switch" :class="{ 'is-on': form.supportsImages }" aria-hidden="true" />
        </button>
      </div>

      <p v-if="error" class="custom-models__error" aria-live="polite">{{ error }}</p>
      <div class="custom-models__form-actions">
        <button class="btn btn--sm" type="button" @click="closeForm">取消</button>
        <button class="btn btn--primary btn--sm" type="button" :disabled="!canSave" @click="save">
          {{ saving ? '保存中' : '保存' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.custom-models {
  padding-top: 18px;
}

.custom-models__head,
.custom-models__form-head,
.custom-model,
.custom-models__form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-models__head {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-strong);
}

.custom-models h4 {
  font-size: 13px;
  font-weight: 700;
}

.custom-models__list {
  border-bottom: 1px solid var(--line);
}

.custom-model {
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.custom-model:last-child {
  border-bottom: 0;
}

.custom-model__main {
  min-width: 0;
}

.custom-model__title,
.custom-model__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.custom-model__title {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-model__separator {
  color: var(--text-2);
}

.custom-model__meta {
  padding-top: 4px;
  color: var(--text-2);
  font-size: 11px;
}

.custom-model__actions {
  display: flex;
  flex: none;
  gap: 5px;
}

.custom-models__empty {
  padding: 12px 0;
  color: var(--text-2);
  font-size: 12px;
}

.custom-models__form {
  display: grid;
  gap: 10px 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 14px 0 4px;
}

.custom-models__form-head,
.custom-models__form-actions,
.custom-models__error {
  grid-column: 1 / -1;
}

.custom-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11.5px;
}

.custom-field--wide {
  grid-column: 1 / -1;
}

.custom-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-inset);
  color: var(--text);
  font-size: 11.5px;
  text-align: left;
  cursor: pointer;
}

.custom-options {
  display: grid;
  grid-column: 1 / -1;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.custom-option:hover,
.custom-option.is-on {
  border-color: var(--accent);
}

.custom-option .switch {
  transform: scale(0.86);
  transform-origin: right center;
}

.custom-models__error {
  margin: 0;
  color: var(--err);
  font-size: 11.5px;
}

.custom-models__form-actions {
  justify-content: flex-end;
  gap: 6px;
  padding-top: 2px;
}

@media (max-width: 720px) {
  .custom-models__form {
    grid-template-columns: 1fr;
  }

  .custom-field--wide,
  .custom-options,
  .custom-models__form-head,
  .custom-models__form-actions,
  .custom-models__error {
    grid-column: auto;
  }

  .custom-options {
    grid-template-columns: 1fr;
  }
}
</style>
