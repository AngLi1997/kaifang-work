<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { AgentResources } from '../../../shared/agent'

defineProps<{
  resources: AgentResources
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

function fileName(path: string): string {
  return path.split(/[\\/]/).at(-1) || path
}
</script>

<template>
  <section class="agent-resources">
    <div class="agent-resources__head">
      <h4>已加载资源</h4>
      <button
        class="btn btn--ghost btn--icon btn--sm"
        type="button"
        title="刷新 Agent 资源"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <AppIcon name="refresh" :size="13" />
      </button>
    </div>

    <section class="resource-group">
      <header class="resource-group__head">
        <AppIcon name="file" :size="14" />
        <h5>AGENTS.md</h5>
        <span class="resource-group__count">{{ resources.contextFiles.length }}</span>
      </header>
      <div v-if="loading" class="resource-group__empty">加载中</div>
      <div v-else-if="!resources.contextFiles.length" class="resource-group__empty">暂无</div>
      <div v-else class="resource-list selectable">
        <div v-for="path in resources.contextFiles" :key="path" class="resource-item">
          <strong>{{ fileName(path) }}</strong>
          <span class="resource-item__path mono" :title="path">{{ path }}</span>
        </div>
      </div>
    </section>

    <section class="resource-group">
      <header class="resource-group__head">
        <AppIcon name="file" :size="14" />
        <h5>prompts</h5>
        <span class="resource-group__count">{{ resources.prompts.length }}</span>
      </header>
      <div v-if="loading" class="resource-group__empty">加载中</div>
      <div v-else-if="!resources.prompts.length" class="resource-group__empty">暂无</div>
      <div v-else class="resource-list selectable">
        <div v-for="prompt in resources.prompts" :key="prompt.path" class="resource-item">
          <strong>{{ prompt.name }}</strong>
          <span class="resource-item__path mono" :title="prompt.path">{{ prompt.path }}</span>
          <span v-if="prompt.description" class="resource-item__description">{{
            prompt.description
          }}</span>
        </div>
      </div>
    </section>

    <section class="resource-group">
      <header class="resource-group__head">
        <AppIcon name="sparkle" :size="14" />
        <h5>skills</h5>
        <span class="resource-group__count">{{ resources.skills.length }}</span>
      </header>
      <div v-if="loading" class="resource-group__empty">加载中</div>
      <div v-else-if="!resources.skills.length" class="resource-group__empty">暂无</div>
      <div v-else class="resource-list selectable">
        <div v-for="skill in resources.skills" :key="skill.path" class="resource-item">
          <strong>{{ skill.name }}</strong>
          <span class="resource-item__path mono" :title="skill.path">{{ skill.path }}</span>
          <span v-if="skill.description" class="resource-item__description">{{
            skill.description
          }}</span>
        </div>
      </div>
    </section>

    <section class="resource-group">
      <header class="resource-group__head">
        <AppIcon name="sliders" :size="14" />
        <h5>Pi 内置工具</h5>
        <span class="resource-group__count">{{ resources.builtinTools.length }}</span>
      </header>
      <div v-if="loading" class="resource-group__empty">加载中</div>
      <div v-else-if="!resources.builtinTools.length" class="resource-group__empty">暂无</div>
      <div v-else class="resource-list selectable">
        <div v-for="tool in resources.builtinTools" :key="tool.name" class="resource-item">
          <strong>{{ tool.name }}</strong>
          <span v-if="tool.description" class="resource-item__description">{{
            tool.description
          }}</span>
        </div>
      </div>
    </section>

    <section class="resource-group">
      <header class="resource-group__head">
        <AppIcon name="plug" :size="14" />
        <h5>扩展工具</h5>
        <span class="resource-group__count">{{ resources.tools.length }}</span>
      </header>
      <div v-if="loading" class="resource-group__empty">加载中</div>
      <div v-else-if="!resources.tools.length" class="resource-group__empty">暂无</div>
      <div v-else class="resource-list selectable">
        <div
          v-for="tool in resources.tools"
          :key="tool.source + ':' + tool.name + ':' + tool.path"
          class="resource-item"
        >
          <strong>{{ tool.name }}</strong>
          <span class="resource-item__path mono" :title="tool.path"
            >{{ tool.source }} · {{ tool.path }}</span
          >
          <span v-if="tool.description" class="resource-item__description">{{
            tool.description
          }}</span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.agent-resources {
  padding-top: 20px;
  border-top: 1px solid var(--line-strong);
}

.agent-resources__head,
.resource-group__head {
  display: flex;
  align-items: center;
}

.agent-resources__head {
  justify-content: space-between;
  padding-bottom: 8px;
}

.agent-resources h4,
.resource-group h5 {
  font-size: 13px;
  font-weight: 700;
}

.resource-group {
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.resource-group:last-child {
  border-bottom: 0;
}

.resource-group__head {
  gap: 7px;
  padding-bottom: 7px;
}

.resource-group__count {
  margin-left: auto;
  font-size: 11px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  padding-left: 21px;
}

.resource-item strong {
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 600;
}

.resource-item__path,
.resource-item__description {
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.5;
}

.resource-item__description {
  font-family: var(--font-ui);
}

.resource-group__empty {
  padding: 4px 0 4px 21px;
  font-size: 11.5px;
}
</style>
