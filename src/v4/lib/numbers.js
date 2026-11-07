// One formatting module for v4 (design review: "exact numbers, instantly"). Indian digit grouping everywhere,
// tabular figures in the UI, dates people read ("8 Nov 2026"), never truncated values.

const IN = 'en-IN'
const toNum = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))

/** 1234567.5 -> "12,34,567.50" (2 decimals unless told otherwise). Blank for missing values. */
export function num(v, decimals = 2) {
  const n = toNum(v)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString(IN, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Quantity in quintals: "1,240.50 Qtl". */
export const qty = (v, decimals = 2) => (Number.isNaN(toNum(v)) ? '—' : `${num(v, decimals)} Qtl`)

/** Money: "₹1,84,300.00". */
export const money = (v, decimals = 2) => {
  const n = toNum(v)
  if (Number.isNaN(n)) return '—'
  return `${n < 0 ? '−' : ''}₹${num(Math.abs(n), decimals)}`
}

/** Compact Indian form for tight spaces: 1,67,000 -> "1.67 L", 2,50,00,000 -> "2.5 Cr". Exact value goes in a tooltip. */
export function compact(v) {
  const n = toNum(v)
  if (Number.isNaN(n)) return '—'
  const a = Math.abs(n), sign = n < 0 ? '−' : ''
  const fmt = (x, unit) => `${sign}${Number(x.toFixed(2)).toLocaleString(IN)} ${unit}`
  if (a >= 1e7) return fmt(a / 1e7, 'Cr')
  if (a >= 1e5) return fmt(a / 1e5, 'L')
  if (a >= 1e3) return fmt(a / 1e3, 'K')
  return `${sign}${Number(a.toFixed(2)).toLocaleString(IN)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parseIso = (iso) => {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}

/** "2026-11-08" -> "8 Nov 2026". */
export function date(iso) {
  const d = parseIso(iso)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—'
}

/** "Today", "Yesterday", or "8 Nov" (this year) / "8 Nov 2025" (other years). */
export function day(iso, now = new Date()) {
  const d = parseIso(iso)
  if (!d) return '—'
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((t - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.getFullYear() === now.getFullYear() ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : date(iso)
}

/** Whole days between an ISO date and today (positive = in the past). */
export function daysAgo(iso, now = new Date()) {
  const d = parseIso(iso)
  if (!d) return 0
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((t - d) / 86400000)
}

/** "09:42" from an ISO date-time. */
export function time(isoDateTime) {
  if (!isoDateTime) return ''
  const d = new Date(isoDateTime)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(IN, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Status label in sentence case: "IN_PROGRESS" -> "In progress". */
export const statusLabel = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replaceAll('_', ' ') : '')

/** "1 purchase", "3 purchases" (count in Indian grouping). */
export const plural = (n, one, many = `${one}s`) => `${num(n, 0)} ${Number(n) === 1 ? one : many}`
