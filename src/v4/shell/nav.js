import {
  Ban, BarChart3, Building2, Droplets, Factory, IndianRupee, LayoutDashboard, MapPin, Package, Settings, ShoppingCart, Sprout,
  Terminal, Truck, UserCog, Users, Wheat,
} from 'lucide-react'
import { v4 } from '../lib/paths'

// Navigation grouped around the mill's day (design review): Today, Procurement, Milling, Sales, Settings.
// `feature` = key in the backend features table; `adminOnly` = MILL_ADMIN only. `label` is an i18n key.
export const MILL_NAV = [
  { group: 'today', label: 'nav.today', icon: LayoutDashboard, items: [{ to: v4('/today'), label: 'nav.today', icon: LayoutDashboard, feature: 'dashboard' }] },
  { group: 'procurement', label: 'nav.procurement', icon: Wheat, items: [
    { to: v4('/purchases'), label: 'nav.purchases', icon: ShoppingCart, feature: 'purchases' },
    { to: v4('/farmers'), label: 'nav.farmers', icon: Users, feature: 'farmers' },
    { to: v4('/rejected-lorries'), label: 'nav.rejected', icon: Ban, feature: 'purchases' },
    { to: v4('/money'), label: 'nav.money', icon: IndianRupee, feature: 'purchases', adminOnly: true },
  ] },
  { group: 'milling', label: 'nav.milling', icon: Factory, items: [
    { to: v4('/batches'), label: 'nav.batches', icon: Factory, feature: 'mill_operations' },
    { to: v4('/stock'), label: 'nav.stock', icon: BarChart3, feature: 'stock_report' },
  ] },
  { group: 'sales', label: 'nav.sales', icon: Package, items: [
    { to: v4('/orders'), label: 'nav.orders', icon: Package, feature: 'export_orders' },
    { to: v4('/shipments'), label: 'nav.shipments', icon: Truck, feature: 'shipments' },
  ] },
  { group: 'settings', label: 'nav.settings', icon: Settings, items: [
    { to: v4('/moisture'), label: 'nav.moisture', icon: Droplets, feature: 'moisture_deduction', adminOnly: true },
    { to: v4('/operators'), label: 'nav.operators', icon: UserCog, feature: 'operators', adminOnly: true },
    { to: v4('/truck-tracking'), label: 'nav.trucks', icon: MapPin, feature: 'truck_tracking', adminOnly: true },
  ] },
]

export const ADMIN_NAV = [
  { group: 'mills', label: 'nav.mills', icon: Building2, items: [{ to: v4('/admin'), label: 'nav.mills', icon: Building2, end: true }] },
  { group: 'settings', label: 'nav.settings', icon: Settings, items: [{ to: v4('/admin/moisture'), label: 'nav.moisture', icon: Droplets, feature: 'moisture_deduction' }] },
]

export const DEV_NAV = [{ group: 'dev', label: 'nav.devConsole', icon: Terminal, items: [{ to: v4('/dev'), label: 'nav.devConsole', icon: Terminal }] }]

export const BrandMark = Sprout

/** Nav groups visible to this user, applying role and feature-flag rules (empty groups disappear). */
export function visibleNav(user, flag) {
  const role = user?.role
  const groups = role === 'DEV_ADMIN' ? DEV_NAV : role === 'SUPER_ADMIN' ? ADMIN_NAV : MILL_NAV
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly || role === 'MILL_ADMIN').filter(i => !i.feature || flag(i.feature).showInMenu) }))
    .filter(g => g.items.length > 0)
}

export const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`))

/** The group that contains the current page (falls back to the first group). */
export const activeGroup = (groups, pathname) => groups.find(g => g.items.some(i => isActive(i, pathname))) || groups[0]

/** Phone bottom-bar tabs by role (design review): what each role does most, in reach of the thumb. */
export function phoneTabs(user, groups) {
  const items = groups.flatMap(g => g.items)
  const pick = (paths) => paths.map(p => items.find(i => i.to === v4(p))).filter(Boolean)
  if (user?.role === 'MILL_OPERATOR') return { record: true, tabs: pick(['/purchases', '/batches', '/farmers']) }
  if (user?.role === 'MILL_ADMIN') return { record: false, tabs: pick(['/today', '/purchases', '/batches', '/money']) }
  return { record: false, tabs: items.slice(0, 4) }
}
