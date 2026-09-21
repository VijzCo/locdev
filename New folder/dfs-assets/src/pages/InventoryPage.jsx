// src/pages/InventoryPage.jsx
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchInventory, createInventoryItem, recordStockMovement, fetchStockLogs } from '@/services/firebase/inventory'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, Tabs, Badge, Modal, FormGroup, EmptyState, LoadingSpinner, ProgressBar } from '@/components/ui'
import { format } from 'date-fns'

const DEPARTMENTS = ['IT','HR','Finance','Operations','Management']
const TABS = [{ id:'overview', label:'Stock Overview' }, { id:'movement', label:'Record Movement' }, { id:'log', label:'Transaction Log' }]

export default function InventoryPage() {
  const { user } = useAuth()
  const [tab, setTab]           = useState('overview')
  const [items, setItems]       = useState([])
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [addModal, setAddModal] = useState(false)

  const [newItem, setNewItem] = useState({ name:'', category:'', quantity:0, minStock:5, department:'IT' })
  const [mvForm, setMvForm]   = useState({ itemId:'', type:'in', quantity:1, department: user.department||'IT', reference:'' })

  async function load() {
    setLoading(true)
    const [inv, l] = await Promise.all([fetchInventory(user), fetchStockLogs()])
    setItems(inv); setLogs(l); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAddItem() {
    if (!newItem.name) return toast.error('Item name required.')
    setSaving(true)
    try {
      const created = await createInventoryItem(newItem, user)
      setItems(p => [...p, created]); setAddModal(false)
      toast.success('Inventory item added')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleMovement() {
    if (!mvForm.itemId || !mvForm.quantity) return toast.error('Select item and quantity.')
    const item = items.find(i => i.id === mvForm.itemId)
    if (mvForm.type === 'out' && item.quantity < mvForm.quantity) return toast.error('Insufficient stock.')
    setSaving(true)
    try {
      await recordStockMovement({ ...mvForm, itemName: item.name }, user)
      await load(); toast.success('Stock movement recorded')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const lowStock = items.filter(i => i.quantity <= i.minStock)

  return (
    <div>
      <PageHeader
        title="Inventory & Stock"
        subtitle={`${items.length} items · ${lowStock.length} low stock alerts`}
        actions={user.role !== 'viewer' && (
          <button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>＋ Add Item</button>
        )}
      />

      {lowStock.length > 0 && (
        <div className="alert alert-warn">
          <span>!</span>
          <span><strong>Low stock:</strong> {lowStock.map(i => `${i.name} (${i.quantity} left)`).join(' · ')}</span>
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <div className="card-header">Stock Levels</div>
            {loading ? <LoadingSpinner /> : items.length === 0 ? (
              <EmptyState icon="▥" title="No items yet" />
            ) : (
              <div className="space-y-4">
                {items.map(item => {
                  const pct = item.minStock > 0 ? item.quantity / (item.minStock * 2) : 1
                  const color = item.quantity === 0 ? 'bg-red-500' : item.quantity <= item.minStock ? 'bg-amber-500' : 'bg-emerald-500'
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-100">{item.name}</span>
                          {item.quantity <= item.minStock && (
                            <Badge variant={item.quantity === 0 ? 'red' : 'amber'}>
                              {item.quantity === 0 ? 'Out' : 'Low'}
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs text-dark-400">{item.quantity} / min {item.minStock}</span>
                      </div>
                      <ProgressBar value={item.quantity} max={item.minStock * 2} colorClass={color} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="card p-5">
            <div className="card-header">Summary</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Total Items',    value: items.length,    color:'text-blue-400' },
                { label:'Low Stock',      value: lowStock.length, color:'text-amber-400' },
                { label:'Out of Stock',   value: items.filter(i=>i.quantity===0).length, color:'text-red-400' },
                { label:'Total Quantity', value: items.reduce((s,i)=>s+i.quantity,0), color:'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                  <div className="font-mono text-xs text-dark-500 mb-1">{s.label}</div>
                  <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOVEMENT ── */}
      {tab === 'movement' && user.role !== 'viewer' && (
        <div className="card p-5 max-w-lg">
          <div className="card-header">Record Stock Movement</div>
          <FormGroup label="Item">
            <select className="select" value={mvForm.itemId} onChange={e => setMvForm(p=>({...p,itemId:e.target.value}))}>
              <option value="">Select item…</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} (stock: {i.quantity})</option>)}
            </select>
          </FormGroup>
          <div className="form-grid-2">
            <FormGroup label="Movement Type">
              <select className="select" value={mvForm.type} onChange={e => setMvForm(p=>({...p,type:e.target.value}))}>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
              </select>
            </FormGroup>
            <FormGroup label="Quantity">
              <input type="number" className="input" min="1" value={mvForm.quantity}
                onChange={e => setMvForm(p=>({...p,quantity:parseInt(e.target.value)||0}))} />
            </FormGroup>
            <FormGroup label="Department">
              <select className="select" value={mvForm.department} onChange={e => setMvForm(p=>({...p,department:e.target.value}))}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Reference">
              <input className="input" value={mvForm.reference} placeholder="PO#, reason…"
                onChange={e => setMvForm(p=>({...p,reference:e.target.value}))} />
            </FormGroup>
          </div>
          <button className="btn btn-primary w-full justify-center mt-1" onClick={handleMovement} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : 'Record Movement'}
          </button>
        </div>
      )}

      {/* ── LOG ── */}
      {tab === 'log' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Dept</th><th>Ref</th><th>By</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center"><LoadingSpinner /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon="≡" title="No movements yet" /></td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.createdAt?.seconds ? format(new Date(l.createdAt.seconds*1000),'MMM d HH:mm') : '—'}</td>
                  <td className="font-medium text-dark-100">{l.itemName}</td>
                  <td><Badge variant={l.type==='in'?'green':'amber'}>{l.type==='in'?'Stock In':'Stock Out'}</Badge></td>
                  <td className="font-mono text-xs">{l.quantity > 0 ? `+${l.quantity}` : l.quantity}</td>
                  <td className="text-xs">{l.department}</td>
                  <td className="font-mono text-xs text-dark-400">{l.reference||'—'}</td>
                  <td className="text-xs">{l.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Inventory Item">
        <FormGroup label="Item Name *"><input className="input" value={newItem.name} onChange={e => setNewItem(p=>({...p,name:e.target.value}))} placeholder="e.g. USB-C Hubs" /></FormGroup>
        <FormGroup label="Category"><input className="input" value={newItem.category} onChange={e => setNewItem(p=>({...p,category:e.target.value}))} placeholder="e.g. Accessories" /></FormGroup>
        <div className="form-grid-2">
          <FormGroup label="Initial Quantity"><input type="number" className="input" min="0" value={newItem.quantity} onChange={e => setNewItem(p=>({...p,quantity:parseInt(e.target.value)||0}))} /></FormGroup>
          <FormGroup label="Minimum Stock"><input type="number" className="input" min="1" value={newItem.minStock} onChange={e => setNewItem(p=>({...p,minStock:parseInt(e.target.value)||1}))} /></FormGroup>
        </div>
        <FormGroup label="Department">
          <select className="select" value={newItem.department} onChange={e => setNewItem(p=>({...p,department:e.target.value}))}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </FormGroup>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dark-700">
          <button className="btn" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddItem} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : '＋ Add Item'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
