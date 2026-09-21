// src/components/ui/index.jsx
// Reusable primitive UI components

export function Badge({ variant = 'gray', children }) {
  const variants = {
    green:  'badge-green',
    blue:   'badge-blue',
    amber:  'badge-amber',
    red:    'badge-red',
    purple: 'badge-purple',
    teal:   'badge-teal',
    gray:   'badge-gray',
  }
  return <span className={`badge ${variants[variant] || 'badge-gray'}`}>{children}</span>
}

export function StatusBadge({ status }) {
  const map = { Available: 'green', Issued: 'blue', Repair: 'amber', Retired: 'gray' }
  return <Badge variant={map[status] || 'gray'}>{status}</Badge>
}

export function RoleBadge({ role }) {
  const map = { admin: 'red', staff: 'blue', viewer: 'teal' }
  return <Badge variant={map[role] || 'gray'} className="capitalize">{role}</Badge>
}

export function ActionBadge({ action }) {
  const map = {
    'Asset Created':  'green',
    'Asset Updated':  'blue',
    'Asset Issued':   'amber',
    'Asset Returned': 'teal',
    'Stock In':       'purple',
    'Stock Out':      'amber',
    'Asset Deleted':  'red',
    'User Updated':   'blue',
    'User Deleted':   'red',
    'Item Created':   'green',
  }
  return <Badge variant={map[action] || 'gray'}>{action}</Badge>
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${maxWidth}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-dark-100">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-dark-400">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormGroup({ label, children }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'
  return (
    <div className={`${s} border-dark-600 border-t-brand-500 rounded-full animate-spin`} />
  )
}

export function EmptyState({ icon = 'diamond', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3 opacity-30">{icon}</div>
      <div className="font-display font-semibold text-dark-300 mb-1">{title}</div>
      {description && <div className="text-sm text-dark-500">{description}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-dark-100">{title}</h1>
        {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-dark-800 border border-dark-700 rounded-lg w-fit mb-5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
            active === tab.id
              ? 'bg-dark-700 text-dark-100 border border-dark-600'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, colorClass = 'bg-brand-600' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Checkbox ─────────────────────────────────────────────────────────────────
// Fixed: proper click handler on the whole label, valid Tailwind border class,
// real SVG checkmark instead of text character.
export function Checkbox({ checked, onChange, label }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onChange()}
      className="flex items-center gap-2.5 cursor-pointer group select-none outline-none"
    >
      <div
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-100 border ${
          checked
            ? 'bg-brand-600 border-brand-600'
            : 'border-dark-500 bg-dark-800 group-hover:border-dark-300'
        }`}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path
              d="M1 3.5L3.5 6L8 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-dark-300 group-hover:text-dark-100 transition-colors">
        {label}
      </span>
    </div>
  )
}
