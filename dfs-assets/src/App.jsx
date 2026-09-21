// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DepartmentsProvider } from '@/context/DepartmentsContext'
import AppLayout       from '@/components/layout/AppLayout'
import LoginPage       from '@/pages/LoginPage'
import SetupPage       from '@/pages/SetupPage'
import Dashboard       from '@/pages/Dashboard'
import AssetsPage      from '@/pages/AssetsPage'
import InventoryPage   from '@/pages/InventoryPage'
import IssuancePage    from '@/pages/IssuancePage'
import QRPage          from '@/pages/QRPage'
import LogsPage        from '@/pages/LogsPage'
import UsersPage       from '@/pages/UsersPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import LoadingScreen   from '@/components/ui/LoadingScreen'

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected */}
      <Route path="/" element={
        <RequireAuth>
          <DepartmentsProvider>
            <AppLayout />
          </DepartmentsProvider>
        </RequireAuth>
      }>
        <Route index element={<Dashboard />} />

        {/* All authenticated users */}
        <Route path="assets"    element={<AssetsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="qr"        element={<QRPage />} />
        <Route path="logs"      element={<LogsPage />} />

        {/* super_admin + IT staff only */}
        <Route path="issuance" element={
          <RequireAuth roles={['super_admin', 'staff']}>
            <IssuancePage />
          </RequireAuth>
        } />

        {/* super_admin only */}
        <Route path="users" element={
          <RequireAuth roles={['super_admin']}>
            <UsersPage />
          </RequireAuth>
        } />
        <Route path="departments" element={
          <RequireAuth roles={['super_admin']}>
            <DepartmentsPage />
          </RequireAuth>
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
