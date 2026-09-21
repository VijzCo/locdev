// src/components/admin/AdminSidebar.jsx
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Factory, Package,
  Wrench, Settings, LogOut, ChevronRight, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import './AdminSidebar.css';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/company', icon: Building2, label: 'Company Overview' },
  { to: '/admin/leadership', icon: Users, label: 'Leadership Team' },
  { to: '/admin/factories', icon: Factory, label: 'Factories' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/services', icon: Wrench, label: 'Services' },
  { to: '/admin/settings', icon: Settings, label: 'Settings & Contact' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out.');
    } catch {
      toast.error('Logout failed.');
    }
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo">DFS</div>
        <div>
          <strong>Admin CMS</strong>
          <small>Duty Free Sourcing</small>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        <p className="admin-sidebar__nav-label">Management</p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={14} className="admin-nav-link__arrow" />
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <Link to="/" target="_blank" className="admin-sidebar__view-site">
          <ExternalLink size={14} /> View Website
        </Link>
        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="admin-sidebar__user-info">
            <span>{user?.email}</span>
            <small>Administrator</small>
          </div>
          <button
            className="admin-sidebar__logout"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
