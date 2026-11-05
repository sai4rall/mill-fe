// Moisture deduction rules. Mirrors backend MoistureDeductionService / PurchaseService.netAmount.
// Bands: from ≤ moisture < to (empty "to" = no upper limit). No matching band → no deduction.

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

/** Deduction % for a moisture reading (0 when no band matches or moisture is empty). */
export function lookupDeduction(ranges = [], moisture) {
  const m = num(moisture)
  if (m === null || Number.isNaN(m)) return 0
  const band = ranges.find(r => m >= Number(r.fromPct) && (r.toPct === null || r.toPct === undefined || m < Number(r.toPct)))
  return band ? Number(band.deductionPct) : 0
}

/** { gross, deduction, net } in rupees, rounded to paise. */
export function priceBreakdown(weight, price, deductionPct) {
  const w = Number(weight) || 0
  const p = Number(price) || 0
  const gross = Math.round(w * p * 100) / 100
  const net = Math.round(w * p * (100 - deductionPct)) / 100
  return { gross, deduction: Math.round((gross - net) * 100) / 100, net }
}

const DECIMALS_2 = /^\d+(\.\d{1,2})?$/

function percentError(value, label, { required = true } = {}) {
  if (value === '' || value === null || value === undefined) return required ? `${label} is required` : null
  if (!DECIMALS_2.test(String(value))) return `${label} must be a number with at most 2 decimals`
  if (Number(value) > 100) return `${label} must be between 0 and 100`
  return null
}

/**
 * Validates editor rows ({ fromPct, toPct, deductionPct } as strings). Returns { rows: {index: message}, table: message|null }.
 * Overlaps are reported on the later row (in from-order), like the backend.
 */
export function validateRanges(rows) {
  const errors = { rows: {}, table: null }
  if (rows.length > 20) errors.table = 'At most 20 ranges are allowed'
  rows.forEach((r, i) => {
    const msg = percentError(r.fromPct, 'From') || percentError(r.toPct, 'To', { required: false })
      || percentError(r.deductionPct, 'Deduction')
      || (r.toPct !== '' && r.toPct !== null && Number(r.toPct) <= Number(r.fromPct) ? "'To' must be greater than 'From'" : null)
    if (msg) errors.rows[i] = msg
  })
  if (Object.keys(errors.rows).length) return errors

  const order = rows.map((r, i) => ({ ...r, i })).sort((a, b) => Number(a.fromPct) - Number(b.fromPct))
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1]
    const cur = order[k]
    if (prev.toPct === '' || prev.toPct === null || Number(prev.toPct) > Number(cur.fromPct)) {
      errors.rows[cur.i] = 'Overlaps another range'
    }
  }
  return errors
}

export const hasRangeErrors = (e) => !!e.table || Object.keys(e.rows).length > 0

/** Editor rows → API payload, sorted by from. */
export const toPayload = (rows) => rows
  .map(r => ({ fromPct: Number(r.fromPct), toPct: r.toPct === '' || r.toPct === null ? null : Number(r.toPct), deductionPct: Number(r.deductionPct) }))
  .sort((a, b) => a.fromPct - b.fromPct)

/** API ranges → editor rows (strings). */
export const toRows = (ranges = []) => ranges.map(r => ({
  fromPct: String(Number(r.fromPct)), toPct: r.toPct === null || r.toPct === undefined ? '' : String(Number(r.toPct)),
  deductionPct: String(Number(r.deductionPct)),
}))

/** "15% – 17%" / "19% and above" */
export const formatBand = (r) => (r.toPct === null || r.toPct === undefined || r.toPct === ''
  ? `${Number(r.fromPct)}% and above` : `${Number(r.fromPct)}% – below ${Number(r.toPct)}%`)
