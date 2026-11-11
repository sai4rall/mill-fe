import { describe, expect, it } from 'vitest'
import {
  EMPTY_TEST, PARAMETERS, effectiveLimit, gradeLabel, limitText, paramGrade, paramOk, pctError, previewResult, qualitySummary, qualityTestPayload,
  sampleSource, standardPayload, standardToForm, testToForm, validateQualityTest, validateStandard, verdictLabel,
} from './quality'
import { buildQualityCertificate } from './qualityCertificate'

const never = () => false
const P = Object.fromEntries(PARAMETERS.map(p => [p.key, p]))
const row = (grade, maxMoisturePct, maxBrokenPct, minHeadRicePct = null) => ({ grade, maxMoisturePct, maxBrokenPct, maxForeignMatterPct: null, maxDamagedPct: null, maxChalkyPct: null, minHeadRicePct })
const RICE = { product: 'RICE', grades: [row('A_PLUS', 13, 5, 70), row('A', 13.5, 10), row('B_PLUS', 13.5, 15), row('B', 14, 20), row('C', 14, 25)] }

describe('quality test form', () => {
  it('needs a date, moisture always and broken % for rice only', () => {
    const e = validateQualityTest({ ...EMPTY_TEST }, never)
    expect(e.testDate).toBeTruthy()
    expect(e.moisturePct).toMatch(/Moisture/)
    expect(e.brokenPct).toMatch(/for rice/)
    expect(validateQualityTest({ ...EMPTY_TEST, testDate: '2026-11-01', product: 'PADDY', moisturePct: '16' }, never)).toEqual({})
  })

  it('rejects future dates and bad percentages', () => {
    const e = validateQualityTest({ ...EMPTY_TEST, testDate: '2099-01-01', moisturePct: '101', brokenPct: '1.234', chalkyPct: 'x' }, () => true)
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['testDate', 'moisturePct', 'brokenPct', 'chalkyPct']))
    expect(pctError('100')).toBeUndefined()
    expect(pctError('', true)).toBe('Required')
  })

  it('builds the payload and round-trips a saved test', () => {
    const p = qualityTestPayload({ ...EMPTY_TEST, testDate: '2026-11-01', batchId: '7', moisturePct: '13.5', brokenPct: '20', testedBy: '  Lab   One ' })
    expect(p).toMatchObject({ batchId: 7, moisturePct: 13.5, brokenPct: 20, chalkyPct: null, testedBy: 'Lab One', remarks: null })
    expect(testToForm({ id: 3, testDate: '2026-11-01', product: 'RICE', batchId: 7, moisturePct: 13.5, brokenPct: null }))
      .toMatchObject({ id: 3, batchId: '7', moisturePct: '13.5', brokenPct: '' })
  })
})

describe('grading (mirrors the server)', () => {
  it('gives the best grade every parameter meets; the worst parameter decides', () => {
    expect(previewResult({ moisturePct: '12', brokenPct: '5' }, RICE)).toEqual({ result: 'PASS', grade: 'A_PLUS', failed: [] })
    expect(previewResult({ moisturePct: '13.5', brokenPct: '4' }, RICE).grade).toBe('A')
    expect(previewResult({ moisturePct: '12', brokenPct: '19' }, RICE).grade).toBe('B')
    expect(previewResult({ moisturePct: '12', brokenPct: '4', headRicePct: '60' }, RICE).grade).toBe('A') // head rice is a minimum for A+
  })

  it('fails below C, with no grade', () => {
    expect(previewResult({ moisturePct: '14.5', brokenPct: '26' }, RICE)).toEqual({ result: 'FAIL', grade: null, failed: ['moisturePct', 'brokenPct'] })
    expect(paramOk(P.moisturePct, '14.5', RICE)).toBe(false)
    expect(paramGrade(P.brokenPct, '26', RICE)).toBe('FAIL')
    expect(paramGrade(P.brokenPct, '12', RICE)).toBe('B_PLUS')
    expect(paramGrade(P.chalkyPct, '3', RICE)).toBeNull() // no limit
  })

  it('a blank limit at a higher grade still respects the lower grades', () => {
    expect(effectiveLimit(P.headRicePct, 'A_PLUS', RICE)).toBe(70)
    expect(effectiveLimit(P.headRicePct, 'A', RICE)).toBeNull()
    const std = { grades: [row('A_PLUS', null, null), row('A', null, null), row('B_PLUS', null, null), row('B', null, null), row('C', 14, null)] }
    expect(effectiveLimit(P.moisturePct, 'A_PLUS', std)).toBe(14)
    expect(previewResult({ moisturePct: '15' }, std).result).toBe('FAIL')
    expect(limitText(P.moisturePct, RICE)).toBe('≤ 14%')
    expect(limitText(P.brokenPct, RICE, 'A')).toBe('≤ 10%')
    expect(limitText(P.chalkyPct, RICE)).toBe('Not checked')
  })

  it('labels verdicts', () => {
    expect(gradeLabel('B_PLUS')).toBe('B+')
    expect(verdictLabel('PASS', 'A_PLUS')).toBe('Grade A+')
    expect(verdictLabel('FAIL', null)).toBe('Failed')
    expect(verdictLabel(null, null)).toBe('Not tested')
  })
})

describe('grade table form (super admin)', () => {
  it('maps to and from the API', () => {
    const f = standardToForm(RICE)
    expect(f.A_PLUS.minHeadRicePct).toBe('70')
    expect(f.C.maxChalkyPct).toBe('')
    expect(standardPayload(f).grades).toEqual(RICE.grades)
    expect(validateStandard(f)).toEqual({})
  })

  it('rejects bad numbers and a better grade looser than a worse one', () => {
    const f = standardToForm(RICE)
    f.C.maxMoisturePct = '120'
    expect(validateStandard(f)['C.maxMoisturePct']).toBeTruthy()
    f.C.maxMoisturePct = '14'
    f.A_PLUS.maxBrokenPct = '12' // A allows 10
    expect(validateStandard(f)).toEqual({ 'A_PLUS.maxBrokenPct': 'Cannot be looser than A (10%)' })
    f.A_PLUS.maxBrokenPct = '5'
    f.A.minHeadRicePct = '75' // A+ needs 70: A cannot demand more
    expect(validateStandard(f)).toEqual({ 'A_PLUS.minHeadRicePct': 'Cannot be looser than A (75%)' })
  })
})

describe('summaries and certificates', () => {
  const tests = [
    { product: 'RICE', result: 'PASS', grade: 'A', moisturePct: 13, brokenPct: 20, certificateNumber: 'QC-2026-0001' },
    { product: 'RICE', result: 'FAIL', grade: null, moisturePct: 15, brokenPct: 30 },
    { product: 'PADDY', result: 'PASS', grade: 'C', moisturePct: 17, brokenPct: null },
  ]

  it('summarises pass rate, averages and grades', () => {
    const s = qualitySummary(tests)
    expect(s).toMatchObject({ total: 3, failed: 1, passed: 2, avgMoisture: 15, avgBroken: 25, certificates: 1 })
    expect(s.byGrade).toEqual({ A_PLUS: 0, A: 1, B_PLUS: 0, B: 0, C: 1 })
    expect(qualitySummary([]).passRate).toBeNull()
  })

  it('describes the sample source', () => {
    expect(sampleSource({ batchId: 4, batchDate: '2026-11-01', lotReference: 'Stack 2' })).toBe('Batch #4 (2026-11-01) · Lot Stack 2')
    expect(sampleSource({})).toBe('—')
  })

  it('only builds a certificate once one has been issued, and prints the grade', () => {
    expect(() => buildQualityCertificate({ result: 'PASS' })).toThrow()
    const doc = buildQualityCertificate({ ...tests[0], sampleCode: 'LAB-1', testDate: '2026-11-01', standard: RICE }, 'Sri Mill')
    expect(doc.getNumberOfPages()).toBe(1)
    // Text drawn on the page: grade, and limits without ≤/≥ (the PDF fonts cannot draw them).
    const text = doc.internal.pages[1].join('\n')
    expect(text).toContain('Grade A')
    expect(text).toContain('max 10%')
    expect(text).not.toMatch(/[≤≥]/)
  })
})
