import {
  LayoutDashboard, Users, ShoppingCart, Droplets, Factory, BarChart3, Package, Truck, MapPin, Settings,
  Building2, Wrench,
} from 'lucide-react'
import { v2 } from '../lib/paths'

// `feature` = key in the backend features table; `adminOnly` = MILL_ADMIN only.
export const MILL_NAV = [
  { group: 'Overview', items: [
    { to: v2('/dashboard'), label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  ] },
  { group: 'Procurement', items: [
    { to: v2('/farmers'), label: 'Farmers', icon: Users, feature: 'farmers' },
    { to: v2('/purchases'), label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
    { to: v2('/moisture'), label: 'Moisture Deductions', icon: Droplets, feature: 'moisture_deduction', adminOnly: true },
  ] },
  { group: 'Production', items: [
    { to: v2('/mill-ops'), label: 'Mill Operations', icon: Factory, feature: 'mill_operations' },
    { to: v2('/stock'), label: 'Stock Report', icon: BarChart3, feature: 'stock_report' },
  ] },
  { group: 'Sales', items: [
    { to: v2('/orders'), label: 'Export Orders', icon: Package, feature: 'export_orders' },
    { to: v2('/shipments'), label: 'Shipments', icon: Truck, feature: 'shipments' },
  ] },
  { group: 'Logistics', items: [
    { to: v2('/truck-tracking'), label: 'Truck Tracking', icon: MapPin, feature: 'truck_tracking', adminOnly: true },
  ] },
  { group: 'Administration', items: [
    { to: v2('/operators'), label: 'Operators', icon: Settings, feature: 'operators', adminOnly: true },
  ] },
]

export const ADMIN_NAV = [
  { group: 'Platform', items: [
    { to: v2('/admin'), label: 'Mills', icon: Building2, end: true },
    { to: v2('/admin/moisture'), label: 'Moisture Deductions', icon: Droplets, feature: 'moisture_deduction' },
  ] },
]

export const DEV_NAV = [
  { group: 'Developer', items: [{ to: v2('/dev'), label: 'Dev Console', icon: Wrench }] },
]

/** Nav groups visible to this user, applying role and feature-flag rules (same as the classic UI). */
export function visibleNav(user, flag) {
  const role = user?.role
  const groups = role === 'DEV_ADMIN' ? DEV_NAV : role === 'SUPER_ADMIN' ? ADMIN_NAV : MILL_NAV
  return groups
    .map(g => ({
      ...g,
      items: g.items
        .filter(i => !i.adminOnly || role === 'MILL_ADMIN')
        .filter(i => !i.feature || flag(i.feature).showInMenu),
    }))
    .filter(g => g.items.length > 0)
}
