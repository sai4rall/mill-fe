// Shared Motion presets so the whole UI moves the same way.
export const ease = [0.22, 1, 0.36, 1]

export const page = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease } },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2, ease } },
}

export const stagger = (gap = 0.06, delay = 0.05) => ({ animate: { transition: { staggerChildren: gap, delayChildren: delay } } })

export const rise = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

export const hoverLift = { whileHover: { y: -3, transition: { type: 'spring', stiffness: 400, damping: 22 } } }
