import {
  BarChart3, Building2, Droplets, Factory, LayoutDashboard, MapPin, Package, ShoppingCart, Sprout, Terminal, Truck, UserCog, Users,
} from 'lucide-react'
import { v4 } from '../lib/paths'

// `feature` = key in the backend features table; `adminOnly` = MILL_ADMIN only. Same rules as the other UIs.
export const MILL_NAV = [
  { group: 'Overview', items: [{ to: v4('/dashboard'), label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' }] },
  { group: 'Procurement', items: [
    { to: v4('/farmers'), label: 'Farmers', icon: Users, feature: 'farmers' },
    { to: v4('/purchases'), label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
    { to: v4('/moisture'), label: 'Moisture', icon: Droplets, feature: 'moisture_deduction', adminOnly: true },
  ] },
  { group: 'Production', items: [
    { to: v4('/mill-ops'), label: 'Mill Operations', icon: Factory, feature: 'mill_operations' },
    { to: v4('/stock'), label: 'Stock', icon: BarChart3, feature: 'stock_report' },
  ] },
  { group: 'Sales', items: [
    { to: v4('/orders'), label: 'Orders', icon: Package, feature: 'export_orders' },
    { to: v4('/shipments'), label: 'Shipments', icon: Truck, feature: 'shipments' },
  ] },
  { group: 'Logistics', items: [{ to: v4('/truck-tracking'), label: 'Trucks', icon: MapPin, feature: 'truck_tracking', adminOnly: true }] },
  { group: 'Administration', items: [{ to: v4('/operators'), label: 'Operators', icon: UserCog, feature: 'operators', adminOnly: true }] },
]

export const ADMIN_NAV = [
  { group: 'Platform', items: [
    { to: v4('/admin'), label: 'Mills', icon: Building2, end: true },
    { to: v4('/admin/moisture'), label: 'Moisture', icon: Droplets, feature: 'moisture_deduction' },
  ] },
]

export const DEV_NAV = [{ group: 'Developer', items: [{ to: v4('/dev'), label: 'Dev Console', icon: Terminal }] }]

export const BrandMark = Sprout

/** Nav groups visible to this user, applying role and feature-flag rules. */
export function visibleNav(user, flag) {
  const role = user?.role
  const groups = role === 'DEV_ADMIN' ? DEV_NAV : role === 'SUPER_ADMIN' ? ADMIN_NAV : MILL_NAV
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly || role === 'MILL_ADMIN').filter(i => !i.feature || flag(i.feature).showInMenu) }))
    .filter(g => g.items.length > 0)
}

export const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname.startsWith(item.to))
