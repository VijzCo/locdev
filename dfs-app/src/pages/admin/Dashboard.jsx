// src/pages/admin/Dashboard.jsx
import { Link } from 'react-router-dom';
import { Building2, Users, Factory, Package, Wrench, Settings, ArrowRight, ExternalLink } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { useAuth } from '../../hooks/useAuth';
import { seedDatabase } from '../../firebase/seedData';
import toast from 'react-hot-toast';
import '../../components/admin/AdminLayout.css';

const QUICK_LINKS = [
  { to: '/admin/company', icon: Building2, label: 'Company Overview', color: '#3b82f6' },
  { to: '/admin/leadership', icon: Users, label: 'Leadership Team', color: '#8b5cf6' },
  { to: '/admin/factories', icon: Factory, label: 'Factories', color: '#f59e0b' },
  { to: '/admin/products', icon: Package, label: 'Products', color: '#10b981' },
  { to: '/admin/services', icon: Wrench, label: 'Services', color: '#ef4444' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', color: '#6b7280' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: leaders } = useCollection('leadership', 'order');
  const { data: factories } = useCollection('factories', 'order');
  const { data: products } = useCollection('products', 'order');
  const { data: services } = useCollection('services', 'order');

  const handleSeed = async () => {
    const confirm = window.confirm('This will populate the database with sample data. Continue?');
    if (!confirm) return;
    const t = toast.loading('Seeding database...');
    const result = await seedDatabase();
    toast.dismiss(t);
    if (result.success) toast.success('Database seeded successfully!');
    else toast.error('Seed failed. Check console.');
  };

  const STATS = [
    { label: 'Leaders', value: leaders?.length ?? '…', icon: Users, color: '#8b5cf6' },
    { label: 'Factories', value: factories?.length ?? '…', icon: Factory, color: '#f59e0b' },
    { label: 'Products', value: products?.length ?? '…', icon: Package, color: '#10b981' },
    { label: 'Services', value: services?.length ?? '…', icon: Wrench, color: '#ef4444' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/" target="_blank" className="btn-admin-secondary">
            <ExternalLink size={14} /> View Site
          </a>
          <button onClick={handleSeed} className="btn-admin-secondary">
            Seed Sample Data
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Stats */}
        <div className="admin-stats">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="admin-stat-card">
              <div className="admin-stat-card__icon" style={{ background: color + '18' }}>
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <div className="admin-stat-card__val">{value}</div>
                <div className="admin-stat-card__label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Quick Access</h2>
          </div>
          <div className="admin-card__body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {QUICK_LINKS.map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
                    border: '1.5px solid var(--gray-100)', borderRadius: 8,
                    transition: 'all .15s', cursor: 'pointer',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + '08'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-100)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 40, height: 40, background: color + '15', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Manage →</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="admin-card" style={{ marginTop: 20 }}>
          <div className="admin-card__header">
            <h2>Getting Started</h2>
          </div>
          <div className="admin-card__body">
            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Click "Seed Sample Data" above to populate the database with initial content.',
                'Go to Company Overview to update the mission, vision, and company description.',
                'Add or edit Leadership Team members with photos and bios.',
                'Manage your Factories — add images, certifications, and specs.',
                'Update Products and Services to match your current offerings.',
                'Go to Settings to update contact info (phone, email, address).',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--gold)' }}>Step {i + 1}:</strong> {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
