import { describe, it, expect } from 'vitest'
import { visibleNav } from './nav'

const allOn = () => ({ showInMenu: true, enabled: true })
const labels = (groups) => groups.flatMap(g => g.items.map(i => i.label))

describe('v2 navigation', () => {
  it('mill admin sees every mill module grouped by area', () => {
    const groups = visibleNav({ role: 'MILL_ADMIN' }, allOn)
    expect(groups.map(g => g.group)).toEqual(['Overview', 'Procurement', 'Production', 'Sales', 'Logistics', 'Administration'])
    expect(labels(groups)).toEqual(['Dashboard', 'Farmers', 'Purchases', 'Moisture Deductions', 'Mill Operations', 'Stock Report',
      'Export Orders', 'Shipments', 'Truck Tracking', 'Operators'])
  })

  it('operators do not see admin-only modules, and empty groups disappear', () => {
    const groups = visibleNav({ role: 'MILL_OPERATOR' }, allOn)
    expect(labels(groups)).not.toEqual(expect.arrayContaining(['Moisture Deductions', 'Truck Tracking', 'Operators']))
    expect(groups.map(g => g.group)).not.toContain('Logistics')
    expect(groups.map(g => g.group)).not.toContain('Administration')
  })

  it('hides modules whose showInMenu flag is off', () => {
    const flag = (k) => ({ showInMenu: k !== 'farmers' && k !== 'moisture_deduction', enabled: true })
    const l = labels(visibleNav({ role: 'MILL_ADMIN' }, flag))
    expect(l).not.toContain('Farmers')
    expect(l).not.toContain('Moisture Deductions')
    expect(l).toContain('Purchases')
  })

  it('super admin and dev admin get their own menus', () => {
    expect(labels(visibleNav({ role: 'SUPER_ADMIN' }, allOn))).toEqual(['Mills', 'Moisture Deductions'])
    expect(labels(visibleNav({ role: 'SUPER_ADMIN' }, () => ({ showInMenu: false, enabled: false })))).toEqual(['Mills'])
    expect(labels(visibleNav({ role: 'DEV_ADMIN' }, allOn))).toEqual(['Dev Console'])
  })

  it('all v2 links live under /v2', () => {
    for (const role of ['MILL_ADMIN', 'SUPER_ADMIN', 'DEV_ADMIN']) {
      visibleNav({ role }, allOn).flatMap(g => g.items).forEach(i => expect(i.to.startsWith('/v2/')).toBe(true))
    }
  })
})
