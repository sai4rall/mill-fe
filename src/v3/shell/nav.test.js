import { describe, it, expect } from 'vitest'
import { visibleNav } from './nav'

const on = () => ({ showInMenu: true, enabled: true })
const labels = (groups) => groups.flatMap(g => g.items.map(i => i.label))

describe('v3 visibleNav', () => {
  it('gives mill admins every mill module', () => {
    expect(labels(visibleNav({ role: 'MILL_ADMIN' }, on))).toEqual([
      'Dashboard', 'Farmers', 'Purchases', 'Moisture Deductions', 'Mill Operations', 'Stock Report', 'Export Orders', 'Shipments', 'Truck Tracking', 'Operators',
    ])
  })
  it('hides admin-only modules from operators', () => {
    const l = labels(visibleNav({ role: 'MILL_OPERATOR' }, on))
    expect(l).not.toContain('Operators')
    expect(l).not.toContain('Truck Tracking')
    expect(l).not.toContain('Moisture Deductions')
  })
  it('respects showInMenu flags and drops empty groups', () => {
    const flag = (k) => ({ showInMenu: k !== 'truck_tracking', enabled: true })
    const groups = visibleNav({ role: 'MILL_ADMIN' }, flag)
    expect(groups.map(g => g.group)).not.toContain('Logistics')
  })
  it('has role-specific menus for super and dev admins', () => {
    expect(labels(visibleNav({ role: 'SUPER_ADMIN' }, on))).toEqual(['Mills', 'Moisture Deductions'])
    expect(labels(visibleNav({ role: 'DEV_ADMIN' }, on))).toEqual(['Dev Console'])
  })
})
