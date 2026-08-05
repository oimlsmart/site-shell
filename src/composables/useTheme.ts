/**
 * useTheme — shared reactive dark mode state.
 *
 * Single source of truth: reads from localStorage + DOM class on mount,
 * updates both when toggled. Used by ThemeToggle.vue. The FOUC
 * prevention script in Base.astro sets the initial class before
 * Vue hydrates; this composable reads that state on mount.
 */
import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

const STORAGE_KEY = 'oiml-theme'

export function isDarkPreferred(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme(): {
  isDark: Ref<boolean>
  toggle: () => void
} {
  const isDark = ref(false)

  function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    apply()
  }

  onMounted(() => {
    isDark.value = isDarkPreferred()
    apply()
  })

  return { isDark, toggle }
}