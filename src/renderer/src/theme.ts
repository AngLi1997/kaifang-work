import { ref, watchEffect } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const labels: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色'
}

export const themeOptions = Object.values(labels)

export const theme = ref<ThemeMode>('system')

export function themeLabel(): string {
  return labels[theme.value]
}

export function setThemeByLabel(label: string): void {
  const mode = (Object.keys(labels) as ThemeMode[]).find((key) => labels[key] === label)
  if (mode) theme.value = mode
}

// 主题由 CSS color-scheme + light-dark() 解析；仅在显式选择时写入 data-theme
watchEffect(() => {
  const root = document.documentElement
  if (theme.value === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme.value)
})
