import { describe, it, expect } from 'vitest'
import { lookupDeduction, priceBreakdown, validateRanges, hasRangeErrors, toPayload, toRows, formatBand } from './moisture'

const EXAMPLE = [
  { fromPct: 0, toPct: 15, deductionPct: 0 },
  { fromPct: 15, toPct: 17, deductionPct: 5 },
  { fromPct: 17, toPct: 19, deductionPct: 20 },
  { fromPct: 19, toPct: null, deductionPct: 25 },
]

describe('lookupDeduction', () => {
  it.each([
    ['0', 0], ['14.99', 0], ['15', 5], ['16.99', 5], ['17', 20], ['18.99', 20], ['19', 25], ['40', 25],
  ])('%s%% moisture → %s%%', (m, d) => expect(lookupDeduction(EXAMPLE, m)).toBe(d))

  it('returns 0 for gaps, empty tables and empty input', () => {
    const gap = [{ fromPct: 15, toPct: 17, deductionPct: 5 }, { fromPct: 20, toPct: null, deductionPct: 25 }]
    expect(lookupDeduction(gap, '18')).toBe(0)
    expect(lookupDeduction([], '18')).toBe(0)
    expect(lookupDeduction(undefined, '18')).toBe(0)
    expect(lookupDeduction(EXAMPLE, '')).toBe(0)
    expect(lookupDeduction(EXAMPLE, 'abc')).toBe(0)
  })
})

describe('priceBreakdown', () => {
  it.each([
    [100, 2000, 0, { gross: 200000, deduction: 0, net: 200000 }],
    [100, 2000, 5, { gross: 200000, deduction: 10000, net: 190000 }],
    [12.5, 2150.75, 20, { gross: 26884.38, deduction: 5376.88, net: 21507.5 }],
    ['', '', 5, { gross: 0, deduction: 0, net: 0 }],
  ])('%s q × %s less %s%%', (w, p, d, expected) => expect(priceBreakdown(w, p, d)).toEqual(expected))
})

const row = (fromPct, toPct, deductionPct) => ({ fromPct, toPct, deductionPct })

describe('validateRanges', () => {
  it('accepts the example table, an empty table and touching bands', () => {
    expect(hasRangeErrors(validateRanges(toRows(EXAMPLE)))).toBe(false)
    expect(hasRangeErrors(validateRanges([]))).toBe(false)
    expect(hasRangeErrors(validateRanges([row('0', '15', '0'), row('15', '', '5')]))).toBe(false)
  })

  it.each([
    [[row('', '15', '0')], 0, 'From is required'],
    [[row('0', '15', '')], 0, 'Deduction is required'],
    [[row('abc', '15', '0')], 0, 'From must be a number with at most 2 decimals'],
    [[row('-1', '15', '0')], 0, 'From must be a number with at most 2 decimals'],
    [[row('15.123', '17', '5')], 0, 'From must be a number with at most 2 decimals'],
    [[row('15', '101', '5')], 0, 'To must be between 0 and 100'],
    [[row('15', '17', '101')], 0, 'Deduction must be between 0 and 100'],
    [[row('15', '15', '5')], 0, "'To' must be greater than 'From'"],
    [[row('0', '16', '0'), row('15', '', '5')], 1, 'Overlaps another range'],
    [[row('15', '', '5'), row('20', '25', '10')], 1, 'Overlaps another range'],
    [[row('15', '', '5'), row('0', '16', '0')], 0, 'Overlaps another range'],
  ])('%j → row %s: %s', (rows, index, message) => {
    expect(validateRanges(rows).rows[index]).toBe(message)
  })

  it('limits the table to 20 ranges', () => {
    const many = Array.from({ length: 21 }, (_, i) => row(String(i), String(i + 1), '1'))
    expect(validateRanges(many).table).toBe('At most 20 ranges are allowed')
  })
})

describe('conversions', () => {
  it('toPayload converts to numbers, sorts by from and maps empty "to" to null', () => {
    expect(toPayload([row('15', '', '5'), row('0', '15', '0')])).toEqual([
      { fromPct: 0, toPct: 15, deductionPct: 0 }, { fromPct: 15, toPct: null, deductionPct: 5 },
    ])
  })
  it('toRows converts API values (incl. "15.00") to editable strings', () => {
    expect(toRows([{ fromPct: '15.00', toPct: null, deductionPct: '5.50' }])).toEqual([row('15', '', '5.5')])
  })
  it('formatBand describes bands', () => {
    expect(formatBand({ fromPct: 15, toPct: 17 })).toBe('15% – below 17%')
    expect(formatBand({ fromPct: 19, toPct: null })).toBe('19% and above')
  })
})
