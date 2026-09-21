// src/components/admin/AdminLayout.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBrand } from '../../hooks/useBrand';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  useBrand(); // keep admin panel colours in sync too

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh', background: 'var(--navy)' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main"><Outlet /></div>
    </div>
  );
}
