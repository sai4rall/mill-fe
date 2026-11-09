// Milling shifts, downtime reasons and production helpers. Match backend Shift and MachineDowntime.Reason.

export const SHIFTS = [
  { value: 'MORNING', label: 'Morning', hours: '6 am – 2 pm' },
  { value: 'AFTERNOON', label: 'Afternoon', hours: '2 pm – 10 pm' },
  { value: 'NIGHT', label: 'Night', hours: '10 pm – 6 am' },
]
export const shiftLabel = (v) => SHIFTS.find(s => s.value === v)?.label || 'Not set'

/** The shift running at a given time (for sensible defaults). */
export function currentShift(now = new Date()) {
  const h = now.getHours()
  return h >= 6 && h < 14 ? 'MORNING' : h >= 14 && h < 22 ? 'AFTERNOON' : 'NIGHT'
}

export const DOWNTIME_REASONS = [
  { value: 'BREAKDOWN', label: 'Breakdown' },
  { value: 'POWER_CUT', label: 'Power cut' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'NO_PADDY', label: 'No paddy' },
  { value: 'LABOUR_SHORTAGE', label: 'Labour shortage' },
  { value: 'OTHER', label: 'Other' },
]
export const downtimeReasonLabel = (v) => DOWNTIME_REASONS.find(r => r.value === v)?.label || v || '—'

/** Common machines, offered as suggestions (any name can be typed). */
export const MACHINES = ['Pre-cleaner', 'De-stoner', 'Husker', 'Paddy separator', 'Whitener', 'Polisher', 'Colour sorter', 'Grader', 'Dryer', 'Main line']

/** Minutes from start to end ("HH:mm"); an end before the start runs past midnight. */
export function minutesBetween(start, end) {
  if (!start || !end) return 0
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const d = toMin(end) - toMin(start)
  return d < 0 ? d + 24 * 60 : d
}

/** 135 -> "2 h 15 min", 45 -> "45 min", 0 -> "0 min". */
export function duration(minutes) {
  const m = Math.round(Number(minutes) || 0)
  const h = Math.floor(m / 60), r = m % 60
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`
}

export function validateDowntime(form, isFuture) {
  const e = {}
  if (!form.downtimeDate) e.downtimeDate = 'Date is required'
  else if (isFuture(form.downtimeDate)) e.downtimeDate = 'Date cannot be in the future'
  if (!form.shift) e.shift = 'Shift is required'
  if (!form.machine?.trim()) e.machine = 'Machine is required'
  if (!form.startTime) e.startTime = 'Start time is required'
  if (!form.endTime) e.endTime = 'End time is required'
  else if (form.startTime && form.startTime === form.endTime) e.endTime = 'End time must be different from the start time'
  if (!form.reason) e.reason = 'Reason is required'
  if (form.reason === 'OTHER' && !form.notes?.trim()) e.notes = 'Describe the reason when it is Other'
  return e
}

export const downtimePayload = (f) => ({
  downtimeDate: f.downtimeDate, shift: f.shift, machine: f.machine.trim().replace(/\s+/g, ' '),
  startTime: f.startTime, endTime: f.endTime, reason: f.reason, notes: f.notes?.trim() || null,
})

/** Rice, by-products and what is left unaccounted for a batch being completed (live preview). */
export function batchOutputs(paddyIn, form) {
  const n = (v) => (v === '' || v == null ? 0 : Number(v))
  const paddy = Number(paddyIn) || 0
  const rice = n(form.actualRiceQuintals)
  const out = rice + n(form.brokenRiceQuintals) + n(form.branQuintals) + n(form.huskQuintals)
  return {
    recoveryPct: paddy ? (rice / paddy) * 100 : 0,
    outputs: out,
    unaccounted: paddy - out,
    tooMuch: out > paddy + 1e-9,
  }
}
