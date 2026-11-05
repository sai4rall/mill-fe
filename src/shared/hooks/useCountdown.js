import { useEffect, useState } from 'react'

/** Seconds countdown: [secondsLeft, start(seconds)]. */
export function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, setLeft]
}
