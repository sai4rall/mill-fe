import { useEffect, useState } from 'react'

// Per-browser preferences (remembered list views, theme, language). Storage can be missing (private mode), so every
// access is guarded and the UI works without it.
export function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(`v4.${key}`)
    return raw == null ? fallback : JSON.parse(raw)
  } catch { return fallback }
}

export function writePref(key, value) {
  try { localStorage.setItem(`v4.${key}`, JSON.stringify(value)) } catch { /* ignore */ }
}

/** useState that remembers its value in this browser under `key`. */
export function usePref(key, initial) {
  const [value, setValue] = useState(() => readPref(key, initial))
  useEffect(() => { writePref(key, value) }, [key, value])
  return [value, setValue]
}
