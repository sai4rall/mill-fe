import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../shared/context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import FeatureGate from './components/FeatureGate'
import Login from './pages/auth/Login'
import { homePathFor } from '../shared/utils/roles'

// Pages load on demand, so the first screen does not download every page and the PDF/Excel export libraries.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const MillStockStatement = lazy(() => import('./pages/admin/MillStockStatement'))
const Dashboard = lazy(() => import('./pages/mill/Dashboard'))
const Farmers = lazy(() => import('./pages/mill/Farmers'))
const Purchases = lazy(() => import('./pages/mill/Purchases'))
const MillOperations = lazy(() => import('./pages/mill/MillOperations'))
const ExportOrders = lazy(() => import('./pages/mill/ExportOrders'))
const Shipments = lazy(() => import('./pages/mill/Shipments'))
const StockReport = lazy(() => import('./pages/mill/StockReport'))
const Operators = lazy(() => import('./pages/mill/Operators'))
const TruckTracking = lazy(() => import('./pages/mill/TruckTracking'))
const DevConsole = lazy(() => import('./pages/dev/DevConsole'))
const MoistureSettings = lazy(() => import('./pages/mill/MoistureSettings'))
const GlobalMoisture = lazy(() => import('./pages/admin/GlobalMoisture'))

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(user.role)} replace />
}

/** The classic UI (v1, Tailwind), served from the site root. */
export default function V1App() {
  return (
          <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            <Route path="/dev" element={
              <PrivateRoute roles={['DEV_ADMIN']}>
                <Layout><DevConsole /></Layout>
              </PrivateRoute>
            } />

            <Route path="/admin" element={
              <PrivateRoute roles={['SUPER_ADMIN']}>
                <Layout><AdminDashboard /></Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/moisture" element={
              <PrivateRoute roles={['SUPER_ADMIN']}>
                <Layout><FeatureGate feature="moisture_deduction" name="Moisture Deduction"><GlobalMoisture /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/mills/:id/stock" element={
              <PrivateRoute roles={['SUPER_ADMIN']}>
                <Layout><MillStockStatement /></Layout>
              </PrivateRoute>
            } />

            <Route path="/dashboard" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="dashboard" name="Dashboard"><Dashboard /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/farmers" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="farmers" name="Farmers"><Farmers /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/purchases" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="purchases" name="Purchases"><Purchases /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/mill-ops" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="mill_operations" name="Mill Operations"><MillOperations /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="export_orders" name="Export Orders"><ExportOrders /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/shipments" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="shipments" name="Shipments"><Shipments /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/truck-tracking" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><FeatureGate feature="truck_tracking" name="Truck Tracking"><TruckTracking /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/stock" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><FeatureGate feature="stock_report" name="Stock Report"><StockReport /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/moisture" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><FeatureGate feature="moisture_deduction" name="Moisture Deduction"><MoistureSettings /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/operators" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><FeatureGate feature="operators" name="Operators"><Operators /></FeatureGate></Layout>
              </PrivateRoute>
            } />
          </Routes>
          </Suspense>
  )
}
