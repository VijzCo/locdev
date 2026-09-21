import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
  Heart, Search, MessageCircle, User, Settings, Bell,
  LogOut, Shield, BarChart2, Menu, X, Home, Users
} from 'lucide-react';

interface LayoutProps { children: React.ReactNode; }

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/matches', icon: Heart, label: 'My Matches' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'My Profile' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { href: '/admin', icon: BarChart2, label: 'Admin Panel' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/reports', icon: Shield, label: 'Reports' },
];

export default function Layout({ children }: LayoutProps) {
  const { userProfile, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const completionColor = userProfile?.profileComplete && userProfile.profileComplete >= 80
    ? '#4A9E4A'
    : userProfile?.profileComplete && userProfile.profileComplete >= 50
    ? '#C8956C'
    : '#E57373';

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--warm-white)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 flex flex-col w-64 bg-white border-r border-gray-100 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ boxShadow: '2px 0 16px rgba(15,15,10,0.06)' }}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
              <Heart size={14} fill="white" color="white" />
            </div>
            <span className="font-display font-semibold" style={{ color: 'var(--charcoal)' }}>NikahConnect</span>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} style={{ color: '#6E6E62' }} />
          </button>
        </div>

        {/* Profile summary */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={userProfile?.profilePhoto || userProfile?.photoURL || '/default-avatar.png'}
                alt={userProfile?.name}
                className="w-12 h-12 rounded-full object-cover"
                style={{ border: '2px solid rgba(200,149,108,0.3)' }}
              />
              {userProfile?.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--charcoal)' }}>
                {userProfile?.name || 'Complete Profile'}
              </p>
              <p className="text-xs text-gray-400 capitalize">{userProfile?.accountType || 'individual'}</p>
            </div>
          </div>

          {/* Profile completion */}
          {userProfile && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#6E6E62' }}>Profile Complete</span>
                <span style={{ color: completionColor, fontWeight: 600 }}>{userProfile.profileComplete}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${userProfile.profileComplete}%`, background: `linear-gradient(90deg, ${completionColor}, ${completionColor}aa)` }} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 px-2 mb-2">Menu</p>
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.label === 'Messages' && (
                    <span className="ml-auto text-xs bg-rose-gold text-white rounded-full w-5 h-5 flex items-center justify-center" style={{ background: 'var(--rose-gold)' }}>
                      3
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Admin section */}
          {userProfile?.isAdmin && (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400 px-2 mt-6 mb-2">Admin</p>
              {adminItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className={`nav-item ${isActive ? 'active' : ''}`}>
                      <item.icon size={17} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={handleLogout} className="nav-item w-full hover:text-red-500 hover:bg-red-50">
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={20} style={{ color: 'var(--charcoal)' }} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
              <Heart size={10} fill="white" color="white" />
            </div>
            <span className="font-display font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>NikahConnect</span>
          </div>
          <Link href="/notifications">
            <Bell size={20} style={{ color: 'var(--charcoal)' }} />
          </Link>
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
