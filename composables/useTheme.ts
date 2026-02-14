import { ref, watch } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const theme = ref<Theme>('system')
const isDark = ref(false)

export function useTheme() {
  function getSystemTheme(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function applyTheme(dark: boolean) {
    isDark.value = dark
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark)
      // Arco Design dark mode
      if (dark) {
        document.body.setAttribute('arco-theme', 'dark')
      } else {
        document.body.removeAttribute('arco-theme')
      }
    }
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)

    if (newTheme === 'system') {
      applyTheme(getSystemTheme())
    } else {
      applyTheme(newTheme === 'dark')
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('theme') as Theme | null
    theme.value = saved || 'system'

    if (theme.value === 'system') {
      applyTheme(getSystemTheme())
    } else {
      applyTheme(theme.value === 'dark')
    }

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (theme.value === 'system') {
          applyTheme(e.matches)
        }
      })
    }
  }

  function toggleTheme() {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return {
    theme,
    isDark,
    setTheme,
    initTheme,
    toggleTheme,
  }
}
