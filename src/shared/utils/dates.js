/** Local calendar date as YYYY-MM-DD (not UTC, so it is right just after midnight in India). */
export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** True when a YYYY-MM-DD value is after today (local). Empty values are not future. */
export const isFutureDate = (value, now = new Date()) => !!value && value > todayISO(now)
