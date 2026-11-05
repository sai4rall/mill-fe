import {
  BarChart3, Building2, Droplets, Factory, LayoutDashboard, MapPin, Package, ShoppingCart, Sprout, Terminal, Truck, UserCog, Users,
} from 'lucide-react'
import { v3 } from '../lib/paths'

// `feature` = key in the backend features table; `adminOnly` = MILL_ADMIN only. Same rules as the other UIs.
export const MILL_NAV = [
  { group: 'Overview', items: [{ to: v3('/dashboard'), label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' }] },
  { group: 'Procurement', items: [
    { to: v3('/farmers'), label: 'Farmers', icon: Users, feature: 'farmers' },
    { to: v3('/purchases'), label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
    { to: v3('/moisture'), label: 'Moisture Deductions', icon: Droplets, feature: 'moisture_deduction', adminOnly: true },
  ] },
  { group: 'Production', items: [
    { to: v3('/mill-ops'), label: 'Mill Operations', icon: Factory, feature: 'mill_operations' },
    { to: v3('/stock'), label: 'Stock Report', icon: BarChart3, feature: 'stock_report' },
  ] },
  { group: 'Sales', items: [
    { to: v3('/orders'), label: 'Export Orders', icon: Package, feature: 'export_orders' },
    { to: v3('/shipments'), label: 'Shipments', icon: Truck, feature: 'shipments' },
  ] },
  { group: 'Logistics', items: [{ to: v3('/truck-tracking'), label: 'Truck Tracking', icon: MapPin, feature: 'truck_tracking', adminOnly: true }] },
  { group: 'Administration', items: [{ to: v3('/operators'), label: 'Operators', icon: UserCog, feature: 'operators', adminOnly: true }] },
]

export const ADMIN_NAV = [
  { group: 'Platform', items: [
    { to: v3('/admin'), label: 'Mills', icon: Building2, end: true },
    { to: v3('/admin/moisture'), label: 'Moisture Deductions', icon: Droplets, feature: 'moisture_deduction' },
  ] },
]

export const DEV_NAV = [{ group: 'Developer', items: [{ to: v3('/dev'), label: 'Dev Console', icon: Terminal }] }]

export const BrandMark = Sprout

/** Nav groups visible to this user, applying role and feature-flag rules. */
export function visibleNav(user, flag) {
  const role = user?.role
  const groups = role === 'DEV_ADMIN' ? DEV_NAV : role === 'SUPER_ADMIN' ? ADMIN_NAV : MILL_NAV
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly || role === 'MILL_ADMIN').filter(i => !i.feature || flag(i.feature).showInMenu) }))
    .filter(g => g.items.length > 0)
}

/** The nav item for a path (for the page title in the header). */
export function navItemFor(groups, pathname) {
  return groups.flatMap(g => g.items).filter(i => (i.end ? pathname === i.to : pathname.startsWith(i.to))).sort((a, b) => b.to.length - a.to.length)[0]
}
