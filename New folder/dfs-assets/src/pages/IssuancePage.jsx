// src/pages/IssuancePage.jsx
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchAssets } from '@/services/firebase/assets'
import { fetchIssuances, issueAsset, returnAsset } from '@/services/firebase/issuance'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, Badge, EmptyState, LoadingSpinner, Checkbox } from '@/components/ui'
import { format, isAfter } from 'date-fns'

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Management']

// Smart checklist items per asset category
const CHECKLIST_BY_CATEGORY = {
  Laptop:       ['Power charger', 'Laptop bag', 'USB Hub', 'Wireless mouse', 'Docking station', 'Manuals / box'],
  Tablet:       ['Power charger', 'Tablet case', 'Stylus / pen', 'USB cable', 'Keyboard cover', 'Manuals / box'],
  Phone:        ['Power charger', 'USB cable', 'Phone case', 'Screen protector', 'Earphones', 'Manuals / box'],
  Monitor:      ['Power cable', 'HDMI / DisplayPort cable', 'Stand / mount', 'Manuals / box'],
  Router:       ['Power adapter', 'Ethernet cables', 'Mounting screws', 'Manuals / box'],
  'Access Point':['Power adapter', 'PoE injector', 'Mounting screws', 'Ethernet cable', 'Manuals / box'],
  Printer:      ['Power cable', 'USB / network cable', 'Ink / toner cartridges', 'Paper tray', 'Manuals / box'],
  Server:       ['Power cables', 'Rack mount rails', 'Network cables', 'Manuals / box'],
  Switch:       ['Power adapter', 'Rack mount ears', 'Ethernet cables', 'Manuals / box'],
  UPS:          ['Power cables', 'Battery backup verified', 'Manuals / box'],
  Other:        ['Power cable', 'Accessories', 'Manuals / box'],
}

const DEFAULT_CHECKLIST = CHECKLIST_BY_CATEGORY['Laptop']

export default function IssuancePage() {
  const { user } = useAuth()
  const [assets, setAssets]       = useState([])
  const [issuances, setIssuances] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  // checklist state: { item: bool }
  const [checklist, setChecklist] = useState({})
  const [customItem, setCustomItem] = useState('')

  const [form, setForm] = useState({
    assetDocId:    '',
    recipientName: '',
    recipientEmpNo:'',
    recipientEmail:'',
    recipientDept: 'IT',
    issuedDate:    format(new Date(), 'yyyy-MM-dd'),
  })

  async function load() {
    setLoading(true)
    const [a, iss] = await Promise.all([fetchAssets(user), fetchIssuances(user)])
    setAssets(a.filter(x => x.status === 'Available'))
    setIssuances(iss.filter(i => i.status === 'Active'))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // When asset changes, reset checklist to category-appropriate defaults (all checked)
  function handleAssetChange(e) {
    const docId = e.target.value
    setForm(p => ({ ...p, assetDocId: docId }))
    const asset = assets.find(a => a.id === docId)
    const items = CHECKLIST_BY_CATEGORY[asset?.category] || DEFAULT_CHECKLIST
    const initial = {}
    items.forEach(i => { initial[i] = true })
    setChecklist(initial)
    setCustomItem('')
  }

  function toggleItem(item) {
    setChecklist(p => ({ ...p, [item]: !p[item] }))
  }

  function addCustomItem() {
    const trimmed = customItem.trim()
    if (!trimmed) return
    setChecklist(p => ({ ...p, [trimmed]: true }))
    setCustomItem('')
  }

  function removeCustomItem(item) {
    setChecklist(p => {
      const next = { ...p }
      delete next[item]
      return next
    })
  }

  // Items from the standard list for this category
  const selectedAsset = assets.find(a => a.id === form.assetDocId)
  const standardItems = CHECKLIST_BY_CATEGORY[selectedAsset?.category] || DEFAULT_CHECKLIST
  // Extra items the user added (not in standard list)
  const extraItems = Object.keys(checklist).filter(k => !standardItems.includes(k))
  // Checked items to save
  const checkedItems = Object.entries(checklist).filter(([, v]) => v).map(([k]) => k)

  async function handleIssue() {
    const { assetDocId, recipientName, recipientEmpNo, recipientEmail, recipientDept, issuedDate } = form
    if (!assetDocId || !recipientName || !recipientEmpNo || !recipientEmail)
      return toast.error('Please fill in all required fields.')
    const asset = assets.find(a => a.id === assetDocId)
    setSaving(true)
    try {
      await issueAsset({
        assetDocId,
        assetId:       asset.assetId,
        assetName:     asset.name,
        recipientName,
        recipientEmpNo,
        recipientEmail,
        recipientDept,
        issuedDate,
        checklist:     checkedItems,
      }, user)
      toast.success('Asset issued successfully')
      setForm({
        assetDocId: '', recipientName: '', recipientEmpNo: '',
        recipientEmail: '', recipientDept: 'IT',
        issuedDate: format(new Date(), 'yyyy-MM-dd'),
      })
      setChecklist({})
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleReturn(iss) {
    if (!window.confirm(`Confirm return of ${iss.assetName}?`)) return
    try {
      await returnAsset(iss.id, iss.assetDocId, iss.assetId, iss.assetName, user)
      toast.success('Asset returned and marked Available')
      load()
    } catch (e) { toast.error(e.message) }
  }

  function isOverdue(iss) {
    if (!iss.issuedDate?.seconds) return false
    const issDate    = new Date(iss.issuedDate.seconds * 1000)
    const overdueAt  = new Date(issDate.getTime() + 30 * 86400000)
    return isAfter(new Date(), overdueAt)
  }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div>
      <PageHeader
        title="Asset Issuance"
        subtitle={`${issuances.length} active issuance${issuances.length !== 1 ? 's' : ''}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6">

        {/* ── ISSUE FORM ── */}
        {user.role !== 'viewer' && (
          <div className="card p-5 self-start">
            <div className="card-header">Issue an Asset</div>

            {/* Asset selector */}
            <div className="mb-4">
              <label className="label">Asset *</label>
              <select className="select" value={form.assetDocId} onChange={handleAssetChange}>
                <option value="">Select available asset…</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.assetId} [{a.category}]
                  </option>
                ))}
              </select>
              {selectedAsset && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="badge badge-purple text-xs">{selectedAsset.category}</span>
                  <span className="font-mono text-xs text-dark-500">{selectedAsset.brand} {selectedAsset.model}</span>
                </div>
              )}
            </div>

            {/* Recipient */}
            <div className="mb-4">
              <label className="label">Employee Name *</label>
              <input className="input" value={form.recipientName} onChange={f('recipientName')} placeholder="Full name" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Employee No. *</label>
                <input className="input" value={form.recipientEmpNo} onChange={f('recipientEmpNo')} placeholder="EMP-XXX" />
              </div>
              <div>
                <label className="label">Department</label>
                <select className="select" value={form.recipientDept} onChange={f('recipientDept')}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.recipientEmail} onChange={f('recipientEmail')} placeholder="employee@dfs.io" />
            </div>

            <div className="mb-5">
              <label className="label">Issue Date</label>
              <input type="date" className="input" value={form.issuedDate} onChange={f('issuedDate')} />
            </div>

            {/* ── ACCESSORIES CHECKLIST ── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="label mb-0">
                  Accessories Checklist
                  {selectedAsset && (
                    <span className="text-dark-500 font-normal ml-1">
                      ({selectedAsset.category})
                    </span>
                  )}
                </span>
                <span className="text-xs font-mono text-dark-500">
                  {checkedItems.length} selected
                </span>
              </div>

              {form.assetDocId ? (
                <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 space-y-1">
                  {/* Standard items for this category */}
                  {standardItems.map(item => (
                    <div key={item} className="py-1">
                      <Checkbox
                        checked={checklist[item] === true}
                        onChange={() => toggleItem(item)}
                        label={item}
                      />
                    </div>
                  ))}

                  {/* Extra custom items */}
                  {extraItems.length > 0 && (
                    <>
                      <div className="border-t border-dark-700 my-2" />
                      {extraItems.map(item => (
                        <div key={item} className="py-1 flex items-center justify-between">
                          <Checkbox
                            checked={checklist[item] === true}
                            onChange={() => toggleItem(item)}
                            label={item}
                          />
                          <button
                            onClick={() => removeCustomItem(item)}
                            className="text-dark-600 hover:text-red-400 text-xs ml-2 transition-colors"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Add custom item */}
                  <div className="border-t border-dark-700 mt-2 pt-2 flex gap-2">
                    <input
                      className="input text-xs py-1.5 flex-1"
                      placeholder="Add custom item…"
                      value={customItem}
                      onChange={e => setCustomItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                    />
                    <button
                      className="btn btn-sm btn-ghost px-2"
                      onClick={addCustomItem}
                      title="Add item"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 text-center text-xs text-dark-500">
                  Select an asset above to see its accessories checklist
                </div>
              )}
            </div>

            <button
              className="btn btn-primary w-full justify-center"
              onClick={handleIssue}
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Issue Asset →'}
            </button>
          </div>
        )}

        {/* ── ACTIVE ISSUANCES ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-dark-500 uppercase tracking-widest">
              Active Issuances
            </span>
            {issuances.filter(isOverdue).length > 0 && (
              <Badge variant="red">{issuances.filter(isOverdue).length} overdue</Badge>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : issuances.length === 0 ? (
            <EmptyState icon="⇗" title="No active issuances" description="Issued assets will appear here" />
          ) : (
            <div className="space-y-3">
              {issuances.map(iss => {
                const overdue = isOverdue(iss)
                return (
                  <div
                    key={iss.id}
                    className={`card p-4 ${overdue ? 'border-red-800/50 bg-red-950/10' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-display font-semibold text-dark-100">{iss.assetName}</span>
                          <span className="font-mono text-xs text-brand-400">{iss.assetId}</span>
                        </div>
                        <div className="text-sm text-dark-300">
                          {iss.recipientName}
                          {' · '}
                          <span className="font-mono text-xs">{iss.recipientEmpNo}</span>
                          {' · '}
                          {iss.recipientDept}
                        </div>
                        <div className="text-xs font-mono text-dark-500 mt-1.5">
                          Issued:{' '}
                          {iss.issuedDate?.seconds
                            ? format(new Date(iss.issuedDate.seconds * 1000), 'MMM d yyyy')
                            : iss.issuedDate}
                          {overdue && (
                            <span className="text-red-400 ml-2">⚠ OVERDUE</span>
                          )}
                        </div>

                        {/* Checklist pills */}
                        {iss.checklist?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {iss.checklist.map(c => (
                              <span key={c} className="badge badge-gray text-xs">✓ {c}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge variant={overdue ? 'red' : 'green'}>
                          {overdue ? 'Overdue' : 'Active'}
                        </Badge>
                        {user.role !== 'viewer' && (
                          <button className="btn btn-sm" onClick={() => handleReturn(iss)}>
                            Return
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
