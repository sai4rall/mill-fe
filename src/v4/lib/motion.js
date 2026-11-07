// Motion budget (design review): motion explains change and nothing else. Pages fade in briefly; data does not
// stagger or slide; nothing loops; static tiles do not lift. Kept elsewhere: the nav pill, sheets, a batch moving
// between columns, and the highlight on a value that changed.
export const ease = [0.22, 1, 0.36, 1]

export const page = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, ease } },
  exit: { opacity: 0, transition: { duration: 0.1, ease } },
}

/** Layout spring for elements that move between places (nav pill, batch cards). */
export const move = { type: 'spring', stiffness: 420, damping: 36 }

/** Used by layout animations only; kept for components that still pass variants (no visual effect). */
export const rise = {}
export const stagger = () => ({})
export const hoverLift = {}
