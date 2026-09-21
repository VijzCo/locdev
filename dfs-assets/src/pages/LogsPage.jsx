// src/pages/LogsPage.jsx
import { useEffect, useState, useMemo } from 'react'
import { fetchLogs } from '@/services/firebase/logs'
import { PageHeader, ActionBadge, EmptyState, LoadingSpinner } from '@/components/ui'
import { format } from 'date-fns'
import { exportToCSV } from '@/utils/export'

const ACTIONS = ['Asset Created','Asset Updated','Asset Issued','Asset Returned','Asset Deleted','Stock In','Stock Out','User Updated','User Deleted','Item Created']

export default function LogsPage() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterAction, setFA]   = useState('')
  const [filterUser, setFU]     = useState('')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetchLogs(500).then(l => { setLogs(l); setLoading(false) })
  }, [])

  const users = [...new Set(logs.map(l => l.userName))]

  const filtered = useMemo(() => logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false
    if (filterUser   && l.userName !== filterUser)  return false
    if (search) {
      const q = search.toLowerCase()
      return [l.action, l.target, l.detail, l.userName].some(v => v?.toLowerCase().includes(q))
    }
    return true
  }), [logs, filterAction, filterUser, search])

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle={`${filtered.length} entries`}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV(filtered, 'dfs-audit-logs')}>⬇ Export</button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input w-52" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select w-auto" value={filterAction} onChange={e => setFA(e.target.value)}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
        <select className="select w-auto" value={filterUser} onChange={e => setFU(e.target.value)}>
          <option value="">All Users</option>
          {users.map(u => <option key={u}>{u}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th><th>User</th><th>Dept</th>
              <th>Action</th><th>Target</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><LoadingSpinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="≡" title="No logs found" /></td></tr>
            ) : filtered.map(l => (
              <tr key={l.id}>
                <td className="font-mono text-xs whitespace-nowrap">
                  {l.createdAt?.seconds ? format(new Date(l.createdAt.seconds*1000),'MMM d yyyy HH:mm') : '—'}
                </td>
                <td className="font-medium text-dark-100">{l.userName}</td>
                <td className="text-xs text-dark-400">{l.userDept}</td>
                <td><ActionBadge action={l.action} /></td>
                <td><span className="font-mono text-xs text-brand-400">{l.target}</span></td>
                <td className="text-xs text-dark-400">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
