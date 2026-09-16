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
  FolderOpen,
  History,
  Library,
  MoreHorizontal,
  Paperclip,
  PanelRight,
  Pause,
  Pencil,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Share2,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareTerminal,
  TriangleAlert,
  Trash2,
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
  'folder-open': FolderOpen,
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
  refresh: RefreshCw,
  trash: Trash2,
  more: MoreHorizontal,
  pencil: Pencil,
  share: Share2
} satisfies Record<string, LucideIcon>

const props = defineProps<{ name: keyof typeof icons; size?: number }>()

const icon = computed(() => icons[props.name])
</script>

<template>
  <component :is="icon" :size="size ?? 16" :stroke-width="1.75" aria-hidden="true" />
</template>
