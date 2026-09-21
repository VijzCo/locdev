// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAssets } from '@/services/firebase/assets'
import { fetchInventory } from '@/services/firebase/inventory'
import { fetchIssuances } from '@/services/firebase/issuance'
import { fetchLogs } from '@/services/firebase/logs'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, StatusBadge, ActionBadge, EmptyState } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, isAfter } from 'date-fns'

const COLORS = ['#34d399','#60a5fa','#fbbf24','#9ca3af']

export default function Dashboard() {
  const { user } = useAuth()
  const [assets, setAssets]       = useState([])
  const [inventory, setInventory] = useState([])
  const [issuances, setIssuances] = useState([])
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [a, inv, iss, l] = await Promise.all([
        fetchAssets(user), fetchInventory(user),
        fetchIssuances(user), fetchLogs(10),
      ])
      setAssets(a); setInventory(inv); setIssuances(iss); setLogs(l)
      setLoading(false)
    }
    load()
  }, [user])

  const total     = assets.length
  const available = assets.filter(a => a.status === 'Available').length
  const issued    = assets.filter(a => a.status === 'Issued').length
  const repair    = assets.filter(a => a.status === 'Repair').length

  const overdue   = issuances.filter(i =>
    i.status === 'Active' && i.issuedDate &&
    isAfter(new Date(), new Date(i.issuedDate.seconds * 1000 + 30 * 86400000))
  )

  const lowStock  = inventory.filter(i => i.quantity <= i.minStock)

  // Category breakdown for bar chart
  const catMap = {}
  assets.forEach(a => { catMap[a.category] = (catMap[a.category] || 0) + 1 })
  const catData = Object.entries(catMap).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 6)

  const pieData = [
    { name: 'Available', value: available },
    { name: 'Issued',    value: issued },
    { name: 'Repair',    value: repair },
    { name: 'Retired',  value: total - available - issued - repair },
  ]

  const STATS = [
    { label: 'Total Assets',  value: total,     color: 'text-blue-400',    accent: 'bg-blue-500',     sub: `${catData.length} categories` },
    { label: 'Available',     value: available, color: 'text-emerald-400', accent: 'bg-emerald-500',  sub: `${total ? Math.round(available/total*100) : 0}% of fleet` },
    { label: 'Issued Out',    value: issued,    color: 'text-amber-400',   accent: 'bg-amber-500',    sub: `${overdue.length} overdue` },
    { label: 'In Repair',     value: repair,    color: 'text-red-400',     accent: 'bg-red-500',      sub: 'Requires attention' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name?.split(' ')[0]}. Here's your operations overview.`}
        actions={
          <span className="font-mono text-xs text-dark-500">
            {format(new Date(), 'EEE, MMM d yyyy')}
          </span>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
            <div className="font-mono text-xs text-dark-500 uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`font-display font-bold text-3xl ${s.color} mb-1`}>
              {loading ? '—' : s.value}
            </div>
            <div className="text-xs text-dark-500">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ALERTS */}
      {overdue.length > 0 && (
        <div className="alert alert-danger">
          <span>⚠</span>
          <span>
            <strong>{overdue.length} overdue asset{overdue.length > 1 ? 's' : ''}</strong> — review the{' '}
            <Link to="/issuance" className="underline">issuance records</Link> immediately.
          </span>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="alert alert-warn">
          <span>!</span>
          <span>
            <strong>Low stock alert:</strong> {lowStock.map(i => i.name).join(', ')} — visit{' '}
            <Link to="/inventory" className="underline">Inventory</Link> to restock.
          </span>
        </div>
      )}

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <div className="card-header">Assets by Category</div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-dark-600">Loading…</div>
          ) : catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#73768a', fontFamily: 'IBM Plex Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#73768a', fontFamily: 'IBM Plex Mono' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#252733', border: '1px solid #3a3d4a', borderRadius: 8, fontSize: 12, fontFamily: 'IBM Plex Sans' }}
                  labelStyle={{ color: '#e1e2e5' }}
                  itemStyle={{ color: '#e2520a' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill="#e2520a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No assets yet" description="Add assets to see breakdown" />
          )}
        </div>

        <div className="card p-5">
          <div className="card-header">Status Overview</div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-dark-600">Loading…</div>
          ) : total > 0 ? (
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
              <div className="space-y-3">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2.5 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="text-dark-300">{item.name}</span>
                    <span className="ml-auto font-mono text-dark-400 text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No data yet" />
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="card p-5">
        <div className="card-header flex items-center justify-between">
          Recent Activity
          <Link to="/logs" className="text-brand-400 hover:text-brand-300 text-xs normal-case tracking-normal font-sans font-medium">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-dark-600">Loading…</div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-dark-700">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-4 py-3">
                <ActionBadge action={log.action} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-dark-100 font-mono">{log.target}</span>
                  <span className="text-sm text-dark-400 ml-2">{log.detail}</span>
                </div>
                <div className="text-xs font-mono text-dark-500 whitespace-nowrap">{log.userName}</div>
                <div className="text-xs font-mono text-dark-600 whitespace-nowrap">
                  {log.createdAt?.seconds ? format(new Date(log.createdAt.seconds * 1000), 'MMM d HH:mm') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="≡" title="No activity yet" description="Activity will appear here as you use the system" />
        )}
      </div>
    </div>
  )
}
