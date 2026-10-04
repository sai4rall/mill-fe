import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, ShoppingCart, Factory,
  Package, Truck, BarChart3, LogOut, Settings, Building2, MapPin
} from 'lucide-react'

const millNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/farmers', label: 'Farmers', icon: Users },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/mill-ops', label: 'Mill Operations', icon: Factory },
  { to: '/orders', label: 'Export Orders', icon: Package },
  { to: '/shipments', label: 'Shipments', icon: Truck },
  { to: '/truck-tracking', label: 'Truck Tracking', icon: MapPin, adminOnly: true },
  { to: '/stock', label: 'Stock Report', icon: BarChart3 },
  { to: '/operators', label: 'Operators', icon: Settings, adminOnly: true },
]

const adminNav = [
  { to: '/admin', label: 'Mills', icon: Building2 },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const nav = isSuperAdmin ? adminNav : millNav.filter(n => !n.adminOnly || user?.role === 'MILL_ADMIN')

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Factory className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-slate-800 text-lg">Mill System</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{user?.fullName || user?.username}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isSuperAdmin ? 'bg-purple-100 text-purple-700' :
            user?.role === 'MILL_ADMIN' ? 'bg-emerald-100 text-emerald-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }>
              <Icon className="w-4 h-4" />
              {label}
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
