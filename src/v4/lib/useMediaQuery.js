import { useEffect, useState } from 'react'

/** True while the media query matches (re-renders on change). */
export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mql = window.matchMedia?.(query)
    if (!mql) return
    const on = () => setMatches(mql.matches)
    on()
    mql.addEventListener?.('change', on)
    return () => mql.removeEventListener?.('change', on)
  }, [query])
  return matches
}

/** Phones (below Tailwind's `md`). */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)')
