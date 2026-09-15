<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ workspace: string }>()

// 浏览器环境下 window.api 不存在，仅用于静态界面预览
const controls = window.api?.windowControls
const isMac = window.electron?.process?.platform === 'darwin'
</script>

<template>
  <header class="titlebar" :class="{ 'titlebar--mac': isMac }">
    <div class="titlebar__lead">
      <AppIcon name="folder" :size="13" />
      <span class="titlebar__workspace">{{ workspace }}</span>
    </div>

    <div v-if="!isMac" class="titlebar__buttons">
      <button class="win-btn" title="最小化" @click="controls?.minimize()">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" stroke-width="1.1" />
        </svg>
      </button>
      <button class="win-btn" title="最大化 / 还原" @click="controls?.toggleMaximize()">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect
            x="1.6"
            y="1.6"
            width="6.8"
            height="6.8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.1"
          />
        </svg>
      </button>
      <button class="win-btn win-btn--close" title="关闭" @click="controls?.close()">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1.6 1.6l6.8 6.8M8.4 1.6l-6.8 6.8" stroke="currentColor" stroke-width="1.1" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  display: flex;
  height: 34px;
  flex: none;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: var(--bg-panel);
  -webkit-app-region: drag;
  user-select: none;
}

.titlebar--mac {
  padding-left: 84px;
}

.titlebar__lead {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  color: var(--text-3);
}

.titlebar__workspace {
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.titlebar__buttons {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  display: grid;
  width: 44px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.win-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.win-btn--close:hover {
  background: #d94a3d;
  color: #fff;
}
</style>
