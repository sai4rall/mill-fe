import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
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

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            <Route path="/admin" element={
              <PrivateRoute roles={['SUPER_ADMIN']}>
                <Layout><AdminDashboard /></Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/mills/:id/stock" element={
              <PrivateRoute roles={['SUPER_ADMIN']}>
                <Layout><MillStockStatement /></Layout>
              </PrivateRoute>
            } />

            <Route path="/dashboard" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><Dashboard /></Layout>
              </PrivateRoute>
            } />
            <Route path="/farmers" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><Farmers /></Layout>
              </PrivateRoute>
            } />
            <Route path="/purchases" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><Purchases /></Layout>
              </PrivateRoute>
            } />
            <Route path="/mill-ops" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><MillOperations /></Layout>
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><ExportOrders /></Layout>
              </PrivateRoute>
            } />
            <Route path="/shipments" element={
              <PrivateRoute roles={['MILL_ADMIN', 'MILL_OPERATOR']}>
                <Layout><ExportOrders /></Layout>
              </PrivateRoute>
            } />
            <Route path="/truck-tracking" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><TruckTracking /></Layout>
              </PrivateRoute>
            } />
            <Route path="/stock" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><StockReport /></Layout>
              </PrivateRoute>
            } />
            <Route path="/operators" element={
              <PrivateRoute roles={['MILL_ADMIN']}>
                <Layout><Operators /></Layout>
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
