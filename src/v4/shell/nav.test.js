import { describe, it, expect } from 'vitest'
import { activeGroup, phoneTabs, visibleNav } from './nav'

const on = () => ({ showInMenu: true, enabled: true })
const groups = (role, flag = on) => visibleNav({ role }, flag)
const names = (gs) => gs.map(g => g.group)
const pages = (gs) => gs.flatMap(g => g.items.map(i => i.to))

describe('v4 grouped navigation', () => {
  it('groups a mill admin menu by the mill day', () => {
    expect(names(groups('MILL_ADMIN'))).toEqual(['today', 'procurement', 'milling', 'sales', 'settings'])
  })
  it('hides admin-only pages and the empty settings group from operators', () => {
    const g = groups('MILL_OPERATOR')
    expect(names(g)).not.toContain('settings')
    expect(pages(g)).not.toContain('/v4/money')
  })
  it('drops pages whose menu flag is off, and groups that become empty', () => {
    const flag = (k) => ({ showInMenu: !['export_orders', 'shipments'].includes(k), enabled: true })
    expect(names(groups('MILL_ADMIN', flag))).not.toContain('sales')
  })
  it('finds the active group from the path', () => {
    expect(activeGroup(groups('MILL_ADMIN'), '/v4/farmers').group).toBe('procurement')
    expect(activeGroup(groups('MILL_ADMIN'), '/v4/stock').group).toBe('milling')
  })
  it('gives each role its own phone tabs', () => {
    const op = phoneTabs({ role: 'MILL_OPERATOR' }, groups('MILL_OPERATOR'))
    expect(op.record).toBe(true)
    expect(op.tabs.map(t => t.to)).toEqual(['/v4/purchases', '/v4/batches', '/v4/farmers'])
    expect(phoneTabs({ role: 'MILL_ADMIN' }, groups('MILL_ADMIN')).tabs.map(t => t.to)).toEqual(['/v4/today', '/v4/purchases', '/v4/batches', '/v4/money'])
  })
  it('keeps super admin and dev menus', () => {
    expect(pages(groups('SUPER_ADMIN'))).toEqual(['/v4/admin', '/v4/admin/moisture'])
    expect(pages(groups('DEV_ADMIN'))).toEqual(['/v4/dev'])
  })
})
