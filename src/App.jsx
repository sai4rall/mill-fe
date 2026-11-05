import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import FeatureGate from './components/FeatureGate'
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import MillStockStatement from './pages/admin/MillStockStatement'
import Dashboard from './pages/mill/Dashboard'
import Farmers from './pages/mill/Farmers'
import Purchases from './pages/mill/Purchases'
import MillOperations from './pages/mill/MillOperations'
import ExportOrders from './pages/mill/ExportOrders'
import StockReport from './pages/mill/StockReport'
import Operators from './pages/mill/Operators'
import TruckTracking from './pages/mill/TruckTracking'
import DevConsole from './pages/dev/DevConsole'
import MoistureSettings from './pages/mill/MoistureSettings'
import GlobalMoisture from './pages/admin/GlobalMoisture'
import { homePathFor } from './utils/roles'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(user.role)} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
                <Layout><FeatureGate feature="shipments" name="Shipments"><ExportOrders /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/truck-tracking" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><FeatureGate feature="truck_tracking" name="Truck Tracking"><TruckTracking /></FeatureGate></Layout>
              </PrivateRoute>
            } />
            <Route path="/stock" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
