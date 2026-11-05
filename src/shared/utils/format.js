export const qtl = (v) => Number(v || 0).toFixed(2)
export const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// Local date as YYYY-MM-DD (not UTC).
import { todayISO } from './dates'
export const today = todayISO
export const greeting = (d = new Date()) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 17 ? 'Good afternoon' : 'Good evening')
