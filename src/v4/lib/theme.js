import { useEffect, useSyncExternalStore } from 'react'
import { readPref, writePref } from './prefs'

const query = '(prefers-color-scheme: dark)'
const listeners = new Set()
let current = readPref('theme', 'system')

function setTheme(next) {
  current = next
  writePref('theme', next)
  listeners.forEach(l => l())
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/** Theme preference: 'system' | 'light' | 'dark', shared by every component that reads it. */
export function useThemePreference() {
  return [useSyncExternalStore(subscribe, () => current), setTheme]
}

/**
 * Applies the preference to <html> (class "dark" + data-theme) so HeroUI's portalled popovers, menus and sheets follow
 * it too. Mounted once at the v4 root; removed again when v4 unmounts so the other UIs are unaffected.
 */
export function useApplyTheme() {
  const [pref] = useThemePreference()
  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia?.(query)
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && !!mql?.matches)
      root.classList.toggle('dark', dark)
      root.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
    apply()
    mql?.addEventListener?.('change', apply)
    return () => {
      mql?.removeEventListener?.('change', apply)
      root.classList.remove('dark')
      root.removeAttribute('data-theme')
    }
  }, [pref])
}

/** A colour token's current value, for libraries that need a literal colour (Leaflet paths). */
export function tokenColor(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || fallback
}
