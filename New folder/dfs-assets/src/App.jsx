// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage    from '@/pages/LoginPage'
import SetupPage    from '@/pages/SetupPage'
import Dashboard    from '@/pages/Dashboard'
import AssetsPage   from '@/pages/AssetsPage'
import InventoryPage  from '@/pages/InventoryPage'
import IssuancePage   from '@/pages/IssuancePage'
import QRPage         from '@/pages/QRPage'
import LogsPage       from '@/pages/LogsPage'
import UsersPage      from '@/pages/UsersPage'
import LoadingScreen  from '@/components/ui/LoadingScreen'

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />

      {/* ── First-run admin setup (self-disables once users exist) ── */}
      <Route path="/setup" element={<SetupPage />} />

      {/* ── Protected app ── */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="assets"    element={<AssetsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="issuance"  element={<IssuancePage />} />
        <Route path="qr"        element={<QRPage />} />
        <Route path="logs"      element={<LogsPage />} />
        <Route path="users"     element={
          <PrivateRoute allowedRoles={['admin']}><UsersPage /></PrivateRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
