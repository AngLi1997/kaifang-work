<script setup lang="ts">
// 界面图标统一来源：Lucide（https://lucide.dev）；本组件是渲染层唯一的图标入口。
import {
  Check,
  ChevronDown,
  Clock,
  CircleQuestionMark,
  Copy,
  FileText,
  Folder,
  History,
  Library,
  Paperclip,
  PanelRight,
  Pause,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareTerminal,
  TriangleAlert,
  User,
  Users,
  X,
  type LucideIcon
} from 'lucide-vue-next'
import { computed } from 'vue'

const icons = {
  plus: Plus,
  search: Search,
  folder: Folder,
  file: FileText,
  history: History,
  sliders: SlidersHorizontal,
  help: CircleQuestionMark,
  user: User,
  users: Users,
  library: Library,
  pause: Pause,
  stop: Square,
  play: Play,
  check: Check,
  alert: TriangleAlert,
  x: X,
  terminal: SquareTerminal,
  copy: Copy,
  clip: Paperclip,
  clock: Clock,
  chevron: ChevronDown,
  panel: PanelRight,
  sparkle: Sparkles,
  shield: Shield,
  plug: Plug,
  refresh: RefreshCw
} satisfies Record<string, LucideIcon>

const props = defineProps<{ name: keyof typeof icons; size?: number }>()

const icon = computed(() => icons[props.name])
</script>

<template>
  <component :is="icon" :size="size ?? 16" :stroke-width="1.75" aria-hidden="true" />
</template>
