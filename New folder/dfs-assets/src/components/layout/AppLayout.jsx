// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { logout } from '@/services/firebase/auth'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/',          label: 'Dashboard',   icon: '⊞', section: 'Overview',  end: true },
  { to: '/assets',    label: 'IT Assets',   icon: '◈', section: 'Modules' },
  { to: '/inventory', label: 'Inventory',   icon: '▥', section: 'Modules' },
  { to: '/issuance',  label: 'Issuance',    icon: '⇗', section: 'Modules' },
  { to: '/qr',        label: 'QR Labels',   icon: '⊡', section: 'Modules' },
  { to: '/logs',      label: 'Audit Logs',  icon: '≡', section: 'System' },
  { to: '/users',     label: 'Users & Roles',icon:'⊙', section: 'System', adminOnly: true },
]

export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function handleLogout() {
    await logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const sections = [...new Set(NAV.map(n => n.section))]

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className={`
        ${sidebarOpen ? 'w-[230px]' : 'w-[60px]'}
        flex-shrink-0 bg-dark-850 border-r border-dark-700
        flex flex-col transition-all duration-200 overflow-hidden
      `}>

        {/* Logo */}
        <div className="px-4 py-5 border-b border-dark-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold text-sm">D</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-display font-bold text-sm text-dark-100 whitespace-nowrap">DutyFreeSourcing</div>
              <div className="font-mono text-[10px] text-dark-500 tracking-widest uppercase">Asset Management</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-5">
          {sections.map(section => {
            const items = NAV.filter(n =>
              n.section === section && (!n.adminOnly || user?.role === 'admin')
            )
            return (
              <div key={section}>
                {sidebarOpen && (
                  <div className="sidebar-section-label">{section}</div>
                )}
                <div className="space-y-0.5">
                  {items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `nav-item ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-dark-700">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-display font-bold text-xs">
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-dark-100 truncate">{user?.name}</div>
                <div className="text-xs font-mono text-brand-400 capitalize">{user?.role} · {user?.department}</div>
              </div>
              <button onClick={handleLogout} className="text-dark-500 hover:text-dark-200 text-sm transition-colors" title="Sign out">⏻</button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center py-1 text-dark-500 hover:text-dark-200 transition-colors" title="Sign out">⏻</button>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-dark-850 border-b border-dark-700 flex items-center px-5 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-dark-400 hover:text-dark-200 transition-colors text-lg"
          >
            ☰
          </button>

          {/* Breadcrumb filled by page title via context or just route */}
          <div className="flex-1" />

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="text-xs font-mono text-dark-400">Live</span>
          </div>

          {/* User chip */}
          <div className="flex items-center gap-2 pl-4 border-l border-dark-700">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs font-display">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2)}
              </span>
            </div>
            <span className="text-sm text-dark-200 font-medium hidden sm:block">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-dark-900">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
