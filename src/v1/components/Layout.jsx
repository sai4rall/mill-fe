import { Suspense, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { useFeatures } from '../../shared/features/useFeatures'
import {
  LayoutDashboard, Users, ShoppingCart, Factory,
  Package, Truck, BarChart3, LogOut, Settings, Building2, MapPin, Wrench, Droplets, Menu, X, Sparkles, KeyRound
} from 'lucide-react'
import MillBrand from './MillBrand'
import ChangePasswordModal from './ChangePasswordModal'

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
  const isMillUser = !!user && !isSuperAdmin && !isDevAdmin

  // Mobile: the sidebar is an off-canvas drawer. Desktop (md and up): always visible, as before.
  const [menuOpen, setMenuOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])
  const { pathname } = useLocation()
  useEffect(() => { setMenuOpen(false) }, [pathname]) // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="flex h-dvh bg-slate-50">
      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)}
          onChanged={() => { setChangingPassword(false); setNotice('Password changed') }} />
      )}
      {notice && (
        <div role="status" className="fixed top-4 right-4 z-[60] bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">{notice}</div>
      )}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <aside id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col shadow-sm
          transform transition-transform duration-200 md:static md:translate-x-0 md:max-w-none
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-slate-200 relative">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"
            className="md:hidden absolute top-4 right-3 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <MillBrand isMillUser={isMillUser} />
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
          <a href="/v4" className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 w-full transition-colors">
            <Sparkles className="w-4 h-4" />
            Try the new UI
          </a>
          <button onClick={() => setChangingPassword(true)}
            className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 w-full transition-colors">
            <KeyRound className="w-4 h-4" />
            Change password
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"
            aria-controls="app-sidebar" aria-expanded={menuOpen}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="w-6 h-6" />
          </button>
          <MillBrand isMillUser={isMillUser} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><Suspense fallback={<div className="py-10 text-center text-sm text-slate-400">Loading…</div>}>{children}</Suspense></main>
      </div>
    </div>
  )
}
