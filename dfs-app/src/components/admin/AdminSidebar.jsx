// src/components/admin/AdminSidebar.jsx
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Factory, Package,
  Wrench, Settings, LogOut, ChevronRight, ExternalLink,
  Inbox, Palette, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBrand } from '../../hooks/useBrand';
import toast from 'react-hot-toast';
import './AdminSidebar.css';

const NAV = [
  { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/inquiries',  icon: Inbox,           label: 'Inquiries' },
  { divider: 'Content' },
  { to: '/admin/brand',      icon: Palette,         label: 'Brand & Theme' },
  { to: '/admin/company',    icon: Building2,       label: 'Company Overview' },
  { to: '/admin/leadership', icon: Users,           label: 'Leadership & Mgmt' },
  { to: '/admin/factories',  icon: Factory,         label: 'Factories' },
  { to: '/admin/products',   icon: Package,         label: 'Products' },
  { to: '/admin/services',   icon: Wrench,          label: 'Services' },
  { to: '/admin/campus',     icon: GraduationCap,   label: 'QIOTAA Campus' },
  { divider: 'System' },
  { to: '/admin/settings',   icon: Settings,        label: 'Settings & Contact' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();

  const handleLogout = async () => {
    try { await logout(); toast.success('Logged out.'); }
    catch { toast.error('Logout failed.'); }
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        {brand.logoType === 'image' && brand.logoImageUrl ? (
          <img
            src={brand.logoImageUrl}
            alt="Logo"
            style={{ height: 36, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <div className="admin-sidebar__logo">{brand.logoText || 'DFS'}</div>
        )}
        <div>
          <strong>Admin CMS</strong>
          <small>{brand.companyShort || 'Duty Free Sourcing'}</small>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV.map((item, i) => {
          if (item.divider) {
            return <p key={`div-${i}`} className="admin-sidebar__nav-label">{item.divider}</p>;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="admin-nav-link__arrow" />
            </NavLink>
          );
        })}
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
