// src/pages/AssetsPage.jsx
import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { fetchAssets, createAsset, updateAsset, deleteAsset } from '@/services/firebase/assets'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, StatusBadge, Badge, Modal, FormGroup, EmptyState, LoadingSpinner } from '@/components/ui'
import { exportToCSV } from '@/utils/export'
import { format } from 'date-fns'

const CATEGORIES  = ['Laptop','Tablet','Router','Access Point','Monitor','Phone','Printer','Server','Switch','UPS','Other']
const DEPARTMENTS = ['IT','HR','Finance','Operations','Management']
const STATUSES    = ['Available','Issued','Repair','Retired']

const EMPTY_FORM = { name:'', category:'Laptop', brand:'', model:'', serialNumber:'', department:'IT', status:'Available', notes:'' }

export default function AssetsPage() {
  const { user } = useAuth()
  const [assets, setAssets]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept]     = useState('')
  const [modal, setModal]       = useState(null) // null | 'add' | 'edit'
  const [selected, setSelected] = useState(null) // asset being edited
  const [form, setForm]         = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    try { setAssets(await fetchAssets(user)) }
    catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => assets.filter(a => {
    if (filterCat    && a.category   !== filterCat)    return false
    if (filterStatus && a.status     !== filterStatus)  return false
    if (filterDept   && a.department !== filterDept)    return false
    if (search) {
      const q = search.toLowerCase()
      return [a.assetId, a.name, a.brand, a.model, a.serialNumber].some(v => v?.toLowerCase().includes(q))
    }
    return true
  }), [assets, search, filterCat, filterStatus, filterDept])

  function openAdd()  { setForm(EMPTY_FORM); setSelected(null); setModal('add') }
  function openEdit(a){ setForm({ name: a.name, category: a.category, brand: a.brand, model: a.model, serialNumber: a.serialNumber, department: a.department, status: a.status, notes: a.notes||'' }); setSelected(a); setModal('edit') }

  async function handleSave() {
    if (!form.name || !form.brand || !form.model || !form.serialNumber) return toast.error('Please fill in all required fields.')
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await createAsset(form, user)
        setAssets(prev => [created, ...prev])
        toast.success('Asset created successfully')
      } else {
        await updateAsset(selected.id, { ...form, assetId: selected.assetId }, user)
        setAssets(prev => prev.map(a => a.id === selected.id ? { ...a, ...form } : a))
        toast.success('Asset updated')
      }
      setModal(null)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(a) {
    if (!window.confirm(`Delete ${a.assetId} — ${a.name}? This cannot be undone.`)) return
    try {
      await deleteAsset(a.id, a.assetId, user)
      setAssets(prev => prev.filter(x => x.id !== a.id))
      toast.success('Asset deleted')
    } catch (e) { toast.error(e.message) }
  }

  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  return (
    <div>
      <PageHeader
        title="IT Assets"
        subtitle={`${filtered.length} of ${assets.length} assets`}
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV(assets, 'dfs-assets')}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add Asset</button>
        </>}
      />

      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="input w-56"
          placeholder="Search ID, name, serial…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="select w-auto" value={filterCat}    onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {user.role === 'admin' && (
          <select className="select w-auto" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset ID</th><th>Name</th><th>Category</th><th>Brand</th>
              <th>Model</th><th>Serial No.</th><th>Dept</th><th>Status</th>
              {user.role !== 'viewer' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center"><LoadingSpinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}><EmptyState icon="◈" title="No assets found" description="Try adjusting your filters" /></td></tr>
            ) : filtered.map(a => (
              <tr key={a.id}>
                <td><span className="font-mono text-brand-400 font-semibold text-xs">{a.assetId}</span></td>
                <td className="font-medium text-dark-100">{a.name}</td>
                <td><Badge variant="purple">{a.category}</Badge></td>
                <td className="font-mono text-xs">{a.brand}</td>
                <td className="font-mono text-xs">{a.model}</td>
                <td className="font-mono text-xs text-dark-400">{a.serialNumber}</td>
                <td className="text-xs text-dark-400">{a.department}</td>
                <td><StatusBadge status={a.status} /></td>
                {user.role !== 'viewer' && (
                  <td>
                    <div className="flex gap-1">
                      <button className="abtn primary" onClick={() => openEdit(a)}>Edit</button>
                      {user.role === 'admin' && (
                        <button className="abtn danger" onClick={() => handleDelete(a)}>Delete</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Asset' : 'Edit Asset'}
      >
        <div className="form-grid-2">
          <FormGroup label="Asset Name *"><input className="input" value={form.name} onChange={f('name')} placeholder="e.g. MacBook Air M2" /></FormGroup>
          <FormGroup label="Category *">
            <select className="select" value={form.category} onChange={f('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Brand *"><input className="input" value={form.brand} onChange={f('brand')} placeholder="Apple, Dell, Cisco…" /></FormGroup>
          <FormGroup label="Model *"><input className="input" value={form.model} onChange={f('model')} placeholder="Model number/name" /></FormGroup>
          <FormGroup label="Serial Number *"><input className="input" value={form.serialNumber} onChange={f('serialNumber')} placeholder="SN-XXXXXXXXXX" /></FormGroup>
          <FormGroup label="Department">
            <select className="select" value={form.department} onChange={f('department')}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </FormGroup>
        </div>
        <FormGroup label="Status">
          <select className="select" value={form.status} onChange={f('status')}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Notes (optional)"><input className="input" value={form.notes} onChange={f('notes')} placeholder="Condition, warranty, purchase info…" /></FormGroup>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-dark-700">
          <button className="btn" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : modal === 'add' ? '＋ Add Asset' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
