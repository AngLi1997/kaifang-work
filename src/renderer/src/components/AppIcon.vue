<script setup lang="ts">
const paths: Record<string, string> = {
  plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  search: '<circle cx="7.2" cy="7.2" r="4"/><path d="M10.2 10.2l3.3 3.3"/>',
  folder:
    '<path d="M2 4.6A1.6 1.6 0 0 1 3.6 3h2.1l1.3 1.6h5.4A1.6 1.6 0 0 1 14 6.2v5.2A1.6 1.6 0 0 1 12.4 13H3.6A1.6 1.6 0 0 1 2 11.4z"/>',
  file: '<path d="M9 2.2H4.7A1.5 1.5 0 0 0 3.2 3.7v8.6a1.5 1.5 0 0 0 1.5 1.5h6.6a1.5 1.5 0 0 0 1.5-1.5V5.4z"/><path d="M9 2.2v3.2h3.3"/>',
  history:
    '<path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5"/><path d="M3 3.4v2.4h2.4"/><path d="M8 5.6V8l1.9 1.2"/>',
  sliders:
    '<path d="M3 4.6h10M3 8h10M3 11.4h10"/><circle cx="6" cy="4.6" r="1.3"/><circle cx="10.4" cy="8" r="1.3"/><circle cx="5.2" cy="11.4" r="1.3"/>',
  help: '<circle cx="8" cy="8" r="5.8"/><path d="M6.5 6.5a1.6 1.6 0 1 1 2.2 1.5c-.5.2-.7.6-.7 1.1v.3"/><path d="M8 11.6h.01"/>',
  user: '<circle cx="8" cy="6" r="2.5"/><path d="M3.6 13.3a4.8 4.8 0 0 1 8.8 0"/>',
  pause: '<path d="M6.2 3.6v8.8M9.8 3.6v8.8"/>',
  stop: '<rect x="4.6" y="4.6" width="6.8" height="6.8" rx="1.2"/>',
  play: '<path d="M5.2 3.6l7.2 4.4-7.2 4.4z"/>',
  check: '<path d="M3.6 8.4l3 3 6-6.6"/>',
  alert: '<path d="M8 2.9l5.4 9.3H2.6z"/><path d="M8 6.7v2.9"/><path d="M8 11.4h.01"/>',
  x: '<path d="M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8"/>',
  terminal:
    '<rect x="2" y="3.2" width="12" height="9.6" rx="1.6"/><path d="M4.6 6.6l2 1.8-2 1.8M8.6 10.4h3"/>',
  copy: '<rect x="5.6" y="5.6" width="7.8" height="7.8" rx="1.4"/><path d="M10.4 5.6V3.9a1.4 1.4 0 0 0-1.4-1.4H4A1.4 1.4 0 0 0 2.6 3.9v5a1.4 1.4 0 0 0 1.4 1.4h1.6"/>',
  clip: '<path d="M11.4 7.5l-4 4a2.3 2.3 0 0 1-3.2-3.2l4.6-4.6a1.6 1.6 0 0 1 2.2 2.2l-4.3 4.3a.8.8 0 0 1-1.1-1.1l3.8-3.8"/>',
  chevron: '<path d="M4.6 6.6L8 10l3.4-3.4"/>',
  panel: '<rect x="2.4" y="3" width="11.2" height="10" rx="1.6"/><path d="M10 3v10"/>',
  sparkle:
    '<path d="M8 2.6l1.2 3 3 1.2-3 1.2L8 11l-1.2-3-3-1.2 3-1.2z"/><path d="M12.4 11.4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z"/>',
  shield: '<path d="M8 2.4l4.4 1.6v3.6c0 2.6-1.8 4.7-4.4 5.8-2.6-1.1-4.4-3.2-4.4-5.8V4z"/>',
  plug: '<path d="M6.2 2.6v3M9.8 2.6v3"/><path d="M4.2 5.6h7.6v1.6a3.8 3.8 0 0 1-3.8 3.8 3.8 3.8 0 0 1-3.8-3.8z"/><path d="M8 11v2.4"/>',
  refresh: '<path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 2.6v2.6h-2.6"/>'
}

defineProps<{ name: string; size?: number }>()
</script>

<!-- eslint-disable vue/no-v-html -- 图标路径为内置静态字符串，不来自外部输入 -->
<template>
  <svg
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.3"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="paths[name] ?? ''"
  />
</template>
