// Quality control helpers shared by every UI. Match backend QualityTest / QualityGrade / QualityEvaluator.

export const PRODUCTS = [
  { value: 'PADDY', label: 'Paddy' },
  { value: 'RICE', label: 'Rice' },
]
export const productLabel = (v) => PRODUCTS.find(p => p.value === v)?.label || v || '—'

/** Grades, best first. C is the lowest grade that still passes; below C the sample fails. */
export const GRADES = [
  { value: 'A_PLUS', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B_PLUS', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]
export const gradeLabel = (v) => GRADES.find(g => g.value === v)?.label || null
const PASS_GRADE = 'C'

/** Lab parameters, the grade-limit field for each, and whether the limit is a maximum or a minimum. */
export const PARAMETERS = [
  { key: 'moisturePct', limit: 'maxMoisturePct', label: 'Moisture', kind: 'max' },
  { key: 'brokenPct', limit: 'maxBrokenPct', label: 'Broken', kind: 'max' },
  { key: 'foreignMatterPct', limit: 'maxForeignMatterPct', label: 'Foreign matter', kind: 'max' },
  { key: 'damagedPct', limit: 'maxDamagedPct', label: 'Damaged / discoloured', kind: 'max' },
  { key: 'chalkyPct', limit: 'maxChalkyPct', label: 'Chalky', kind: 'max' },
  { key: 'headRicePct', limit: 'minHeadRicePct', label: 'Head rice', kind: 'min' },
]

export const RESULTS = [
  { value: 'PASS', label: 'Passed' },
  { value: 'FAIL', label: 'Failed' },
]
export const resultLabel = (v) => RESULTS.find(r => r.value === v)?.label || 'Not tested'

/** "Grade A+" / "Failed" / "Not tested" for a test or batch summary. */
export const verdictLabel = (result, grade) => (result === 'FAIL' ? 'Failed' : result === 'PASS' ? (gradeLabel(grade) ? `Grade ${gradeLabel(grade)}` : 'Passed') : 'Not tested')

const blank = (v) => v === '' || v == null
const PCT = /^\d{1,3}(\.\d{1,2})?$/

/** Error message for a percentage field, or undefined when it is fine. */
export function pctError(v, required = false) {
  if (blank(v)) return required ? 'Required' : undefined
  const s = String(v).trim()
  if (!PCT.test(s) || Number(s) > 100) return 'Enter a % between 0 and 100 (up to 2 decimals)'
  return undefined
}

// ---- Lab test form ----

export const EMPTY_TEST = {
  testDate: '', product: 'RICE', batchId: '', lotReference: '', variety: '',
  moisturePct: '', brokenPct: '', foreignMatterPct: '', damagedPct: '', chalkyPct: '', headRicePct: '', testedBy: '', remarks: '',
}

/** Form values for editing an existing test. */
export const testToForm = (t) => ({
  id: t.id, testDate: t.testDate, product: t.product, batchId: t.batchId ? String(t.batchId) : '',
  lotReference: t.lotReference || '', variety: t.variety || '', testedBy: t.testedBy || '', remarks: t.remarks || '',
  ...Object.fromEntries(PARAMETERS.map(p => [p.key, t[p.key] == null ? '' : String(t[p.key])])),
})

export function validateQualityTest(form, isFuture) {
  const e = {}
  if (!form.testDate) e.testDate = 'Test date is required'
  else if (isFuture(form.testDate)) e.testDate = 'Test date cannot be in the future'
  if (!form.product) e.product = 'Product is required'
  for (const p of PARAMETERS) {
    const required = p.key === 'moisturePct' || (p.key === 'brokenPct' && form.product === 'RICE')
    const err = pctError(form[p.key], required)
    if (err) e[p.key] = err === 'Required' ? `${p.label} % is required${p.key === 'brokenPct' ? ' for rice' : ''}` : err
  }
  if ((form.lotReference || '').trim().length > 50) e.lotReference = 'At most 50 characters'
  if ((form.variety || '').trim().length > 50) e.variety = 'At most 50 characters'
  if ((form.testedBy || '').trim().length > 100) e.testedBy = 'At most 100 characters'
  return e
}

const numOrNull = (v) => (blank(v) ? null : Number(v))
const textOrNull = (v) => (v && v.trim() ? v.trim().replace(/\s+/g, ' ') : null)

export const qualityTestPayload = (f) => ({
  testDate: f.testDate, product: f.product,
  batchId: f.batchId ? Number(f.batchId) : null,
  lotReference: textOrNull(f.lotReference), variety: textOrNull(f.variety), testedBy: textOrNull(f.testedBy),
  remarks: f.remarks?.trim() || null,
  ...Object.fromEntries(PARAMETERS.map(p => [p.key, numOrNull(f[p.key])])),
})

// ---- Grading (mirrors QualityEvaluator) ----

/** The strictest limit set at this grade or any lower grade (a blank at A+ never lets a sample past C). */
export function effectiveLimit(param, grade, standard) {
  const from = GRADES.findIndex(g => g.value === grade)
  let strictest = null
  for (const g of GRADES.slice(from)) {
    const v = standard?.grades?.find(x => x.grade === g.value)?.[param.limit]
    if (blank(v)) continue
    const n = Number(v)
    if (strictest == null || (param.kind === 'min' ? n > strictest : n < strictest)) strictest = n
  }
  return strictest
}

const within = (param, value, limit) => (param.kind === 'min' ? Number(value) >= limit : Number(value) <= limit)

/** Is one reading within the pass (grade C) limit? null when there is no reading or no limit. */
export function paramOk(param, value, standard) {
  const limit = effectiveLimit(param, PASS_GRADE, standard)
  if (blank(value) || limit == null) return null
  return within(param, value, limit)
}

/** The best grade one reading reaches on its own (null if no reading/limit, 'FAIL' below C). */
export function paramGrade(param, value, standard) {
  if (blank(value) || effectiveLimit(param, PASS_GRADE, standard) == null) return null
  const g = GRADES.find(x => { const l = effectiveLimit(param, x.value, standard); return l == null || within(param, value, l) })
  return g ? g.value : 'FAIL'
}

/** Live preview of the server's verdict: result, grade (null when failed) and the parameters out of the pass limit. */
export function previewResult(form, standard) {
  const failed = PARAMETERS.filter(p => paramOk(p, form[p.key], standard) === false).map(p => p.key)
  if (failed.length) return { result: 'FAIL', grade: null, failed }
  const grade = GRADES.find(g => PARAMETERS.every(p => {
    const l = effectiveLimit(p, g.value, standard)
    return blank(form[p.key]) || l == null || within(p, form[p.key], l)
  }))?.value || PASS_GRADE
  return { result: 'PASS', grade, failed }
}

/** "≤ 14%" / "≥ 60%" / "Not checked" — the limit at a grade (default: the pass limit, grade C). */
export function limitText(param, standard, grade = PASS_GRADE) {
  const limit = effectiveLimit(param, grade, standard)
  return limit == null ? 'Not checked' : `${param.kind === 'min' ? '≥' : '≤'} ${limit}%`
}

/** Where the sample came from, for tables and the certificate. */
export function sampleSource(t) {
  const parts = []
  if (t.batchId) parts.push(`Batch #${t.batchId}${t.batchDate ? ` (${t.batchDate})` : ''}`)
  if (t.lotReference) parts.push(`Lot ${t.lotReference}`)
  return parts.join(' · ') || '—'
}

// ---- Standard (grade table) form, super admin ----

/** { A_PLUS: { maxMoisturePct: '13', … }, A: {…}, … } as strings for inputs. */
export const standardToForm = (s) => Object.fromEntries(GRADES.map(g => {
  const row = s?.grades?.find(x => x.grade === g.value)
  return [g.value, Object.fromEntries(PARAMETERS.map(p => [p.limit, row?.[p.limit] == null ? '' : String(Number(row[p.limit]))]))]
}))

export const standardPayload = (f) => ({
  grades: GRADES.map(g => ({ grade: g.value, ...Object.fromEntries(PARAMETERS.map(p => [p.limit, numOrNull(f[g.value][p.limit])])) })),
})

/** Errors keyed "GRADE.limitField". Also: a better grade can never be looser than a worse one. */
export function validateStandard(form) {
  const e = {}
  for (const g of GRADES) for (const p of PARAMETERS) {
    const err = pctError(form[g.value][p.limit])
    if (err) e[`${g.value}.${p.limit}`] = err
  }
  if (Object.keys(e).length) return e
  for (const p of PARAMETERS) {
    let looser = null
    for (const g of [...GRADES].reverse()) { // C first, up to A+
      const v = form[g.value][p.limit]
      if (blank(v)) continue
      const n = Number(v)
      if (looser && (p.kind === 'min' ? n < looser.n : n > looser.n)) {
        e[`${g.value}.${p.limit}`] = `Cannot be looser than ${looser.label} (${looser.n}%)`
      }
      looser = { n, label: g.label }
    }
  }
  return e
}

// ---- Summaries ----

const avg = (vals) => {
  const xs = vals.filter(v => v != null).map(Number)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/** Headline figures for a list of tests, including how many reached each grade. */
export function qualitySummary(tests) {
  const failed = tests.filter(t => t.result === 'FAIL').length
  return {
    total: tests.length,
    failed,
    passed: tests.length - failed,
    passRate: tests.length ? ((tests.length - failed) / tests.length) * 100 : null,
    avgMoisture: avg(tests.map(t => t.moisturePct)),
    avgBroken: avg(tests.filter(t => t.product === 'RICE').map(t => t.brokenPct)),
    certificates: tests.filter(t => t.certificateNumber).length,
    byGrade: Object.fromEntries(GRADES.map(g => [g.value, tests.filter(t => t.result === 'PASS' && t.grade === g.value).length])),
  }
}
