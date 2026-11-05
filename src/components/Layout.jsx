import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFeatures } from '../features/useFeatures'
import {
  LayoutDashboard, Users, ShoppingCart, Factory,
  Package, Truck, BarChart3, LogOut, Settings, Building2, MapPin, Wrench, Droplets
} from 'lucide-react'
import MillBrand from './MillBrand'

// `feature` is the key in the backend's features table (GET /api/features).
const millNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { to: '/farmers', label: 'Farmers', icon: Users, feature: 'farmers' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart, feature: 'purchases' },
  { to: '/mill-ops', label: 'Mill Operations', icon: Factory, feature: 'mill_operations' },
  { to: '/orders', label: 'Export Orders', icon: Package, feature: 'export_orders' },
  { to: '/shipments', label: 'Shipments', icon: Truck, feature: 'shipments' },
  { to: '/truck-tracking', label: 'Truck Tracking', icon: MapPin, adminOnly: true, feature: 'truck_tracking' },
  { to: '/stock', label: 'Stock Report', icon: BarChart3, feature: 'stock_report' },
  { to: '/moisture', label: 'Moisture Deductions', icon: Droplets, adminOnly: true, feature: 'moisture_deduction' },
  { to: '/operators', label: 'Operators', icon: Settings, adminOnly: true, feature: 'operators' },
]

const adminNav = [
  { to: '/admin', label: 'Mills', icon: Building2, end: true },
  // Super admin sees global flags, so this follows the global moisture_deduction setting.
  { to: '/admin/moisture', label: 'Moisture Deductions', icon: Droplets, feature: 'moisture_deduction' },
]

const devNav = [
  { to: '/dev', label: 'Dev Console', icon: Wrench },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { flag } = useFeatures()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isDevAdmin = user?.role === 'DEV_ADMIN'
  const nav = (isDevAdmin ? devNav : isSuperAdmin ? adminNav : millNav)
    .filter(n => isSuperAdmin || isDevAdmin || !n.adminOnly || user?.role === 'MILL_ADMIN')
    .filter(n => !n.feature || flag(n.feature).showInMenu)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <MillBrand isMillUser={!!user && !isSuperAdmin && !isDevAdmin} />
          <p className="text-xs text-slate-500 mt-1 truncate">{user?.fullName || user?.username}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isDevAdmin ? 'bg-amber-100 text-amber-800' :
            isSuperAdmin ? 'bg-purple-100 text-purple-700' :
            user?.role === 'MILL_ADMIN' ? 'bg-emerald-100 text-emerald-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {user?.role?.replaceAll('_', ' ')}
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, feature, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }>
              <Icon className="w-4 h-4" />
              {label}
              {feature && !flag(feature).enabled && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Soon</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-200">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
