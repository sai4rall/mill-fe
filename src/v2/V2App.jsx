import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'
import '@mantine/charts/styles.layer.css'
import '@fontsource-variable/inter'
import './v2.css'
import { lazy, Suspense } from 'react'
import { Center, Loader, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../shared/context/AuthContext'
import { theme } from './theme'
import AppLayout from './shell/AppLayout'
import FeatureGate from './components/FeatureGate'
import { v2, v2HomeFor } from './lib/paths'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Farmers = lazy(() => import('./pages/Farmers'))
const Purchases = lazy(() => import('./pages/Purchases'))
const MillOperations = lazy(() => import('./pages/MillOperations'))
const ExportOrders = lazy(() => import('./pages/ExportOrders'))
const TruckTracking = lazy(() => import('./pages/TruckTracking'))
const StockReport = lazy(() => import('./pages/StockReport'))
const MoistureSettings = lazy(() => import('./pages/MoistureSettings'))
const Operators = lazy(() => import('./pages/Operators'))
const Mills = lazy(() => import('./pages/admin/Mills'))
const MillStock = lazy(() => import('./pages/admin/MillStock'))
const GlobalMoisture = lazy(() => import('./pages/admin/GlobalMoisture'))
const DevConsole = lazy(() => import('./pages/dev/DevConsole'))

const MILL = ['MILL_ADMIN', 'MILL_OPERATOR']
const ADMIN = ['MILL_ADMIN']
const SUPER = ['SUPER_ADMIN']
const DEV = ['DEV_ADMIN']
const loading = <Center h="60vh"><Loader /></Center>

function Guard({ roles, feature, name, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to={v2('/login')} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={v2HomeFor(user.role)} replace />
  const page = feature ? <FeatureGate feature={feature} name={name}>{children}</FeatureGate> : children
  return <AppLayout><Suspense fallback={loading}>{page}</Suspense></AppLayout>
}

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? v2HomeFor(user.role) : v2('/login')} replace />
}

/** The v2 UI, mounted under /v2/*. */
export default function V2App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <Suspense fallback={loading}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="dashboard" element={<Guard roles={MILL} feature="dashboard" name="Dashboard"><Dashboard /></Guard>} />
          <Route path="farmers" element={<Guard roles={MILL} feature="farmers" name="Farmers"><Farmers /></Guard>} />
          <Route path="purchases" element={<Guard roles={MILL} feature="purchases" name="Purchases"><Purchases /></Guard>} />
          <Route path="mill-ops" element={<Guard roles={MILL} feature="mill_operations" name="Mill Operations"><MillOperations /></Guard>} />
          <Route path="orders" element={<Guard roles={MILL} feature="export_orders" name="Export Orders"><ExportOrders /></Guard>} />
          <Route path="shipments" element={<Guard roles={MILL} feature="shipments" name="Shipments"><ExportOrders title="Shipments" /></Guard>} />
          <Route path="stock" element={<Guard roles={MILL} feature="stock_report" name="Stock Report"><StockReport /></Guard>} />
          <Route path="truck-tracking" element={<Guard roles={ADMIN} feature="truck_tracking" name="Truck Tracking"><TruckTracking /></Guard>} />
          <Route path="moisture" element={<Guard roles={ADMIN} feature="moisture_deduction" name="Moisture Deduction"><MoistureSettings /></Guard>} />
          <Route path="operators" element={<Guard roles={ADMIN} feature="operators" name="Operators"><Operators /></Guard>} />
          <Route path="admin" element={<Guard roles={SUPER}><Mills /></Guard>} />
          <Route path="admin/mills/:id/stock" element={<Guard roles={SUPER}><MillStock /></Guard>} />
          <Route path="admin/moisture" element={<Guard roles={SUPER} feature="moisture_deduction" name="Moisture Deduction"><GlobalMoisture /></Guard>} />
          <Route path="dev" element={<Guard roles={DEV}><DevConsole /></Guard>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </MantineProvider>
  )
}
