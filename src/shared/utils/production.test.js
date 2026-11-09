import { describe, it, expect } from 'vitest'
import { batchOutputs, currentShift, downtimePayload, duration, minutesBetween, validateDowntime } from './production'

describe('production helpers', () => {
  it('works out stoppage minutes, including past midnight', () => {
    expect(minutesBetween('09:15', '10:00')).toBe(45)
    expect(minutesBetween('23:30', '01:00')).toBe(90)
  })
  it('formats durations', () => {
    expect(duration(135)).toBe('2 h 15 min')
    expect(duration(45)).toBe('45 min')
    expect(duration(120)).toBe('2 h')
  })
  it('picks the running shift', () => {
    expect(currentShift(new Date(2026, 0, 1, 7))).toBe('MORNING')
    expect(currentShift(new Date(2026, 0, 1, 15))).toBe('AFTERNOON')
    expect(currentShift(new Date(2026, 0, 1, 23))).toBe('NIGHT')
    expect(currentShift(new Date(2026, 0, 1, 3))).toBe('NIGHT')
  })
  it('previews recovery and unaccounted weight for a batch', () => {
    const r = batchOutputs(100, { actualRiceQuintals: '65', brokenRiceQuintals: '5', branQuintals: '8', huskQuintals: '20' })
    expect(r.recoveryPct).toBe(65)
    expect(r.unaccounted).toBe(2)
    expect(r.tooMuch).toBe(false)
    expect(batchOutputs(100, { actualRiceQuintals: '90', huskQuintals: '20' }).tooMuch).toBe(true)
  })
  it('validates a downtime entry', () => {
    const ok = { downtimeDate: '2026-11-08', shift: 'MORNING', machine: 'Husker', startTime: '09:00', endTime: '09:30', reason: 'BREAKDOWN', notes: '' }
    const future = (d) => d > '2026-11-08'
    expect(validateDowntime(ok, future)).toEqual({})
    expect(validateDowntime({ ...ok, endTime: '09:00' }, future).endTime).toBeTruthy()
    expect(validateDowntime({ ...ok, reason: 'OTHER' }, future).notes).toBeTruthy()
    expect(validateDowntime({ ...ok, machine: ' ' }, future).machine).toBe('Machine is required')
    expect(downtimePayload({ ...ok, machine: '  Colour   sorter ' }).machine).toBe('Colour sorter')
  })
})
