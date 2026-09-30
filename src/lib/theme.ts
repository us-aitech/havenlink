import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'havenlink-theme'
const listeners = new Set<() => void>()

function read(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    document.documentElement.dataset.themePersist = 'off'
  }
  listeners.forEach((l) => l())
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'light' as Theme,
  )
  return [theme, setTheme]
}
