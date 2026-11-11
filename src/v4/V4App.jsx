import '@fontsource-variable/plus-jakarta-sans'
import './v4.css'
import { lazy, Suspense, useEffect } from 'react'
import { Toast } from '@heroui/react'
import { MotionConfig } from 'motion/react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../shared/context/AuthContext'
import AppLayout from './shell/AppLayout'
import FeatureGate from './kit/FeatureGate'
import { Loading } from './kit/display'
import { v4, v4HomeFor } from './lib/paths'
import { useApplyTheme } from './lib/theme'
import { CHUNKS } from './shell/routes'
import './i18n'

const Login = lazy(CHUNKS.login)
const Today = lazy(CHUNKS.today)
const Farmers = lazy(CHUNKS.farmers)
const Purchases = lazy(CHUNKS.purchases)
const Money = lazy(CHUNKS.money)
const RejectedLorries = lazy(CHUNKS.rejected)
const Production = lazy(CHUNKS.production)
const Downtime = lazy(CHUNKS.downtime)
const Quality = lazy(CHUNKS.quality)
const QualityStandards = lazy(CHUNKS.qualityStandards)
const ProductionComparison = lazy(CHUNKS.productionComparison)
const MillOperations = lazy(CHUNKS.batches)
const ExportOrders = lazy(CHUNKS.orders)
const TruckTracking = lazy(CHUNKS.truckTracking)
const StockReport = lazy(CHUNKS.stock)
const Shipments = lazy(CHUNKS.shipments)
const MoistureSettings = lazy(CHUNKS.moisture)
const Operators = lazy(CHUNKS.operators)
const Mills = lazy(CHUNKS.mills)
const MillStock = lazy(CHUNKS.millStock)
const GlobalMoisture = lazy(CHUNKS.globalMoisture)
const DevConsole = lazy(CHUNKS.dev)

const MILL = ['MILL_ADMIN', 'MILL_OPERATOR']
const ADMIN = ['MILL_ADMIN']
const SUPER = ['SUPER_ADMIN']
const DEV = ['DEV_ADMIN']

function Guard({ roles, feature, name, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to={v4('/login')} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={v4HomeFor(user.role)} replace />
  const content = feature ? <FeatureGate feature={feature} name={name}>{children}</FeatureGate> : children
  return <AppLayout><Suspense fallback={<Loading />}>{content}</Suspense></AppLayout>
}

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? v4HomeFor(user.role) : v4('/login')} replace />
}

/** Motion + toasts for v4 screens; also used by tests. Animations honour the OS "reduce motion" setting. */
/** Registers the service worker (offline shell + install) in production builds. */
function useServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {})
  }, [])
}

export function V4Providers({ children }) {
  useApplyTheme()
  useServiceWorker()
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toast.Provider placement="top end" />
    </MotionConfig>
  )
}

/** The v4 UI (HeroUI v3 + Motion, top navigation), mounted under /v4/*. Not linked from the other UIs. */
export default function V4App() {
  return (
    <V4Providers>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="today" element={<Guard roles={MILL} feature="dashboard" name="Today"><Today /></Guard>} />
          <Route path="dashboard" element={<Navigate to={v4('/today')} replace />} />
          <Route path="farmers" element={<Guard roles={MILL} feature="farmers" name="Farmers"><Farmers /></Guard>} />
          <Route path="purchases" element={<Guard roles={MILL} feature="purchases" name="Purchases"><Purchases /></Guard>} />
          <Route path="rejected-lorries" element={<Guard roles={MILL} feature="purchases" name="Rejected lorries"><RejectedLorries /></Guard>} />
          <Route path="money" element={<Guard roles={ADMIN} feature="purchases" name="Money"><Money /></Guard>} />
          <Route path="batches" element={<Guard roles={MILL} feature="mill_operations" name="Batches"><MillOperations /></Guard>} />
          <Route path="production" element={<Guard roles={MILL} feature="mill_operations" name="Production"><Production /></Guard>} />
          <Route path="downtime" element={<Guard roles={MILL} feature="mill_operations" name="Machine downtime"><Downtime /></Guard>} />
          <Route path="quality" element={<Guard roles={MILL} feature="quality_control" name="Quality control"><Quality /></Guard>} />
          <Route path="mill-ops" element={<Navigate to={v4('/batches')} replace />} />
          <Route path="orders" element={<Guard roles={MILL} feature="export_orders" name="Export Orders"><ExportOrders /></Guard>} />
          <Route path="shipments" element={<Guard roles={MILL} feature="shipments" name="Shipments"><Shipments /></Guard>} />
          <Route path="stock" element={<Guard roles={MILL} feature="stock_report" name="Stock Report"><StockReport /></Guard>} />
          <Route path="truck-tracking" element={<Guard roles={ADMIN} feature="truck_tracking" name="Truck Tracking"><TruckTracking /></Guard>} />
          <Route path="moisture" element={<Guard roles={ADMIN} feature="moisture_deduction" name="Moisture Deduction"><MoistureSettings /></Guard>} />
          <Route path="operators" element={<Guard roles={ADMIN} feature="operators" name="Operators"><Operators /></Guard>} />
          <Route path="admin" element={<Guard roles={SUPER}><Mills /></Guard>} />
          <Route path="admin/production" element={<Guard roles={SUPER}><ProductionComparison /></Guard>} />
          <Route path="admin/mills/:id/production" element={<Guard roles={SUPER}><Production /></Guard>} />
          <Route path="admin/mills/:id/stock" element={<Guard roles={SUPER}><MillStock /></Guard>} />
          <Route path="admin/quality-standards" element={<Guard roles={SUPER} feature="quality_control" name="Quality standards"><QualityStandards /></Guard>} />
          <Route path="admin/moisture" element={<Guard roles={SUPER} feature="moisture_deduction" name="Moisture Deduction"><GlobalMoisture /></Guard>} />
          <Route path="dev" element={<Guard roles={DEV}><DevConsole /></Guard>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </V4Providers>
  )
}
