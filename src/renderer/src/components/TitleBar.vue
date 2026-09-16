<script setup lang="ts">
// 浏览器环境下 window.api 不存在，仅用于静态界面预览。
const controls = window.api?.windowControls
const isMac = window.electron?.process?.platform === 'darwin'
</script>

<template>
  <header class="titlebar" :class="{ 'titlebar--mac': isMac }">
    <div v-if="isMac" class="traffic-lights" aria-label="窗口控制">
      <button
        class="traffic-light traffic-light--close"
        aria-label="关闭窗口"
        title="关闭"
        @click="controls?.close()"
      />
      <button
        class="traffic-light traffic-light--minimize"
        aria-label="最小化窗口"
        title="最小化"
        @click="controls?.minimize()"
      />
      <button
        class="traffic-light traffic-light--maximize"
        aria-label="最大化或还原窗口"
        title="最大化 / 还原"
        @click="controls?.toggleMaximize()"
      />
    </div>

    <div v-else class="titlebar__buttons">
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
  height: 48px;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  background: transparent;
  -webkit-app-region: drag;
  user-select: none;
}

.titlebar--mac {
  justify-content: flex-start;
  padding: 0 16px;
}

.traffic-lights {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.traffic-light {
  position: relative;
  width: 13px;
  height: 13px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.traffic-light::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 1px;
  border-radius: 1px;
  background: rgba(45, 45, 45, 0.72);
  content: '';
  opacity: 0;
  transition: opacity 0.12s ease;
}

.traffic-light:hover::after {
  opacity: 1;
}

.traffic-light--close {
  background: #ff5f57;
}

.traffic-light--close::after {
  transform: translate(-50%, -50%) rotate(45deg);
  box-shadow: 0 0 0 0.5px rgba(45, 45, 45, 0.72);
}

.traffic-light--minimize {
  background: #febc2e;
}

.traffic-light--minimize::after {
  transform: translate(-50%, -50%);
}

.traffic-light--maximize {
  background: #28c840;
}

.traffic-light--maximize::after {
  width: 5px;
  height: 5px;
  border: 1px solid rgba(45, 45, 45, 0.72);
  background: transparent;
  transform: translate(-50%, -50%);
}

.titlebar__buttons {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  display: grid;
  width: 36px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.win-btn:hover {
  background: var(--bg-hover);
}

.win-btn--close:hover {
  background: #d94a3d;
  color: #fff;
}
</style>
