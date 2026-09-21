// src/pages/InventoryPage.jsx
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  recordStockMovement, fetchStockLogs,
  issueInventoryItems, fetchInventoryIssuances, updateInventoryIssuance,
} from '@/services/firebase/inventory'
import { useAuth } from '@/context/AuthContext'
import { useDepartments } from '@/context/DepartmentsContext'
import { canSeeAll, canWrite, canDelete } from '@/utils/accessControl'
import {
  PageHeader, Tabs, Badge, Modal, FormGroup,
  EmptyState, LoadingSpinner, ProgressBar,
} from '@/components/ui'
import { format } from 'date-fns'
import { exportToCSV } from '@/utils/export'

const TABS = [
  { id: 'overview',  label: 'Stock Overview' },
  { id: 'issue',     label: 'Issue Items'    },
  { id: 'movement',  label: 'Stock In / Out' },
  { id: 'log',       label: 'Transaction Log'},
]

const EMPTY_NEW_ITEM = { name: '', category: '', quantity: 0, minStock: 5, department: '' }

export default function InventoryPage() {
  const { user }          = useAuth()
  const { departments }   = useDepartments()

  const [tab, setTab]             = useState('overview')
  const [items, setItems]         = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [issuances, setIssuances] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  // Modals
  const [addModal, setAddModal]   = useState(false)
  const [editModal, setEditModal] = useState(null)  // item being edited
  const [viewModal, setViewModal] = useState(null)  // issuance record to view

  // Add/Edit item form
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM)

  // Stock movement form
  const [mvForm, setMvForm] = useState({
    itemId: '', type: 'in', quantity: 1,
    department: user.department || '', reference: '',
  })

  // Issue form — multiple items in one issuance
  const [issueForm, setIssueForm] = useState({
    recipientName:  '',
    recipientEmpNo: '',
    recipientEmail: '',
    recipientDept:  user.department || '',
    issuedDate:     format(new Date(), 'yyyy-MM-dd'),
    notes:          '',
  })
  // Cart: [{ itemId, itemName, quantity }]
  const [cart, setCart] = useState([])
  const [cartItemId, setCartItemId]   = useState('')
  const [cartQty, setCartQty]         = useState(1)

  // ── Load ──────────────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const [inv, logs, iss] = await Promise.all([
        fetchInventory(user),
        fetchStockLogs(),
        fetchInventoryIssuances(user),
      ])
      setItems(inv)
      setStockLogs(logs)
      setIssuances(iss)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ── Add item ──────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!newItem.name.trim()) return toast.error('Item name is required.')
    setSaving(true)
    try {
      const created = await createInventoryItem(
        { ...newItem, department: newItem.department || departments[0] || 'IT' },
        user
      )
      setItems(p => [...p, created].sort((a, b) => a.name.localeCompare(b.name)))
      setAddModal(false)
      setNewItem(EMPTY_NEW_ITEM)
      toast.success('Item added to inventory')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // ── Edit item ─────────────────────────────────────────────────────
  async function handleEditItem() {
    if (!editModal?.name?.trim()) return toast.error('Item name is required.')
    setSaving(true)
    try {
      await updateInventoryItem(editModal.id, editModal, user)
      setItems(p => p.map(i => i.id === editModal.id ? { ...i, ...editModal } : i))
      setEditModal(null)
      toast.success('Item updated')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // ── Delete item ───────────────────────────────────────────────────
  async function handleDeleteItem(item) {
    if (!window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return
    try {
      await deleteInventoryItem(item.id, item.name, user)
      setItems(p => p.filter(i => i.id !== item.id))
      toast.success('Item deleted')
    } catch (e) { toast.error(e.message) }
  }

  // ── Stock movement ────────────────────────────────────────────────
  async function handleMovement() {
    if (!mvForm.itemId) return toast.error('Select an item.')
    if (!mvForm.quantity || mvForm.quantity < 1) return toast.error('Quantity must be at least 1.')
    const item = items.find(i => i.id === mvForm.itemId)
    if (mvForm.type === 'out' && item.quantity < mvForm.quantity)
      return toast.error(`Only ${item.quantity} units available.`)
    setSaving(true)
    try {
      await recordStockMovement({ ...mvForm, itemName: item.name }, user)
      await load()
      toast.success('Stock movement recorded')
      setMvForm(p => ({ ...p, itemId: '', quantity: 1, reference: '' }))
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // ── Issue cart ────────────────────────────────────────────────────
  function addToCart() {
    if (!cartItemId) return toast.error('Select an item.')
    if (!cartQty || cartQty < 1) return toast.error('Quantity must be at least 1.')
    const item = items.find(i => i.id === cartItemId)
    if (item.quantity < cartQty) return toast.error(`Only ${item.quantity} in stock.`)
    if (cart.find(c => c.itemId === cartItemId))
      return toast.error('Item already in list. Edit the quantity below.')
    setCart(p => [...p, { itemId: cartItemId, itemName: item.name, quantity: Number(cartQty) }])
    setCartItemId('')
    setCartQty(1)
  }

  function removeFromCart(itemId) {
    setCart(p => p.filter(c => c.itemId !== itemId))
  }

  async function handleIssue() {
    if (cart.length === 0) return toast.error('Add at least one item to the list.')
    const { recipientName, recipientEmpNo, recipientEmail, recipientDept } = issueForm
    if (!recipientName || !recipientEmpNo || !recipientEmail)
      return toast.error('Please fill in all recipient fields.')
    setSaving(true)
    try {
      await issueInventoryItems(
        { items: cart, ...issueForm, recipientDept: recipientDept || departments[0] },
        user
      )
      toast.success('Items issued successfully')
      setCart([])
      setIssueForm({
        recipientName: '', recipientEmpNo: '', recipientEmail: '',
        recipientDept: user.department || '',
        issuedDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      })
      await load()
      setTab('log')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  const lowStock    = items.filter(i => i.quantity <= i.minStock)
  const availItems  = items.filter(i => i.quantity > 0)

  const ni = k => e => setNewItem(p => ({ ...p, [k]: e.target.value }))
  const ei = k => e => setEditModal(p => ({ ...p, [k]: e.target.value }))
  const mf = k => e => setMvForm(p => ({ ...p, [k]: e.target.value }))
  const isf= k => e => setIssueForm(p => ({ ...p, [k]: e.target.value }))

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Inventory & Stock"
        subtitle={`${items.length} items · ${lowStock.length} low stock · ${issuances.length} issuances`}
        actions={
          canWrite(user) && (
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => exportToCSV(items, 'dfs-inventory')}>⬇ CSV</button>
              <button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>＋ Add Item</button>
            </div>
          )
        }
      />

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="alert alert-warn mb-4">
          <span>!</span>
          <span>
            <strong>Low stock:</strong>{' '}
            {lowStock.map(i => (
              <span key={i.id} className="inline-flex items-center gap-1 mr-2">
                {i.name}
                <span className={`badge ${i.quantity === 0 ? 'badge-red' : 'badge-amber'} text-xs`}>
                  {i.quantity === 0 ? 'Out' : `${i.quantity} left`}
                </span>
              </span>
            ))}
          </span>
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — STOCK OVERVIEW
      ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Items',    value: items.length,                                    color: 'text-blue-400'   },
              { label: 'Total Qty',      value: items.reduce((s, i) => s + (i.quantity||0), 0),  color: 'text-emerald-400'},
              { label: 'Low Stock',      value: lowStock.length,                                  color: 'text-amber-400'  },
              { label: 'Out of Stock',   value: items.filter(i => i.quantity === 0).length,       color: 'text-red-400'    },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <div className="font-mono text-xs text-dark-500 mb-1">{s.label}</div>
                <div className={`font-display font-bold text-3xl ${s.color}`}>{loading ? '—' : s.value}</div>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Department</th>
                  <th>In Stock</th><th>Min Stock</th><th>Status</th>
                  {canWrite(user) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><LoadingSpinner /></td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="▥" title="No items yet" description='Click "+ Add Item" to get started' /></td></tr>
                ) : items.map(item => {
                  const low = item.quantity <= item.minStock
                  const out = item.quantity === 0
                  const pct = item.minStock > 0 ? Math.min(100, Math.round((item.quantity / (item.minStock * 2)) * 100)) : 100
                  const barColor = out ? 'bg-red-500' : low ? 'bg-amber-500' : 'bg-emerald-500'
                  return (
                    <tr key={item.id}>
                      <td className="font-medium text-dark-100">{item.name}</td>
                      <td className="text-xs text-dark-400">{item.category || '—'}</td>
                      <td className="text-xs text-dark-400">{item.department || '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-dark-100 w-8">{item.quantity}</span>
                          <div className="w-20 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-dark-400">{item.minStock}</td>
                      <td>
                        {out ? <Badge variant="red">Out of Stock</Badge>
                          : low ? <Badge variant="amber">Low Stock</Badge>
                          : <Badge variant="green">In Stock</Badge>}
                      </td>
                      {canWrite(user) && (
                        <td>
                          <div className="flex gap-1">
                            <button className="abtn primary" onClick={() => setEditModal({ ...item })}>Edit</button>
                            <button className="abtn primary" onClick={() => { setCartItemId(item.id); setTab('issue') }}>Issue</button>
                            {canDelete(user) && (
                              <button className="abtn danger" onClick={() => handleDeleteItem(item)}>Del</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — ISSUE ITEMS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'issue' && (
        !canWrite(user) ? (
          <div className="alert alert-info">
            <span>ℹ</span><span>You have read-only access. Contact a staff member to issue items.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

            {/* Left — recipient + cart */}
            <div className="space-y-4">

              {/* Recipient details */}
              <div className="card p-5">
                <div className="card-header">Recipient Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Employee Name *">
                    <input className="input" value={issueForm.recipientName} onChange={isf('recipientName')} placeholder="Full name" />
                  </FormGroup>
                  <FormGroup label="Employee No. *">
                    <input className="input" value={issueForm.recipientEmpNo} onChange={isf('recipientEmpNo')} placeholder="EMP-XXX" />
                  </FormGroup>
                  <FormGroup label="Email *">
                    <input type="email" className="input" value={issueForm.recipientEmail} onChange={isf('recipientEmail')} placeholder="name@dfs.io" />
                  </FormGroup>
                  <FormGroup label="Department">
                    <select className="select" value={issueForm.recipientDept} onChange={isf('recipientDept')}>
                      {departments.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Issue Date">
                    <input type="date" className="input" value={issueForm.issuedDate} onChange={isf('issuedDate')} />
                  </FormGroup>
                  <FormGroup label="Notes (optional)">
                    <input className="input" value={issueForm.notes} onChange={isf('notes')} placeholder="Purpose, project, etc." />
                  </FormGroup>
                </div>
              </div>

              {/* Add items to cart */}
              <div className="card p-5">
                <div className="card-header">Add Items</div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="label">Item</label>
                    <select className="select" value={cartItemId} onChange={e => setCartItemId(e.target.value)}>
                      <option value="">Select item…</option>
                      {availItems.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} — {i.quantity} in stock
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 90 }}>
                    <label className="label">Qty</label>
                    <input
                      type="number" className="input" min="1"
                      value={cartQty}
                      onChange={e => setCartQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={addToCart}>Add →</button>
                </div>

                {/* Cart list */}
                {cart.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="font-mono text-xs text-dark-500 uppercase tracking-widest mb-2">Items to Issue</div>
                    {cart.map(c => (
                      <div key={c.itemId} className="flex items-center justify-between bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-dark-100">{c.itemName}</span>
                          <span className="font-mono text-xs text-dark-400 ml-2">×{c.quantity}</span>
                        </div>
                        <button
                          className="text-dark-500 hover:text-red-400 transition-colors text-sm"
                          onClick={() => removeFromCart(c.itemId)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-dark-700 text-xs font-mono text-dark-400">
                      {cart.length} item type{cart.length !== 1 ? 's' : ''} ·{' '}
                      {cart.reduce((s, c) => s + c.quantity, 0)} units total
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-center py-6 text-sm text-dark-500 border border-dashed border-dark-700 rounded-lg">
                    No items added yet — select an item above
                  </div>
                )}
              </div>
            </div>

            {/* Right — summary & confirm */}
            <div className="card p-5 self-start sticky top-0">
              <div className="card-header">Issuance Summary</div>

              {issueForm.recipientName ? (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Recipient</span>
                    <span className="text-dark-100 font-medium">{issueForm.recipientName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Emp No.</span>
                    <span className="font-mono text-dark-100">{issueForm.recipientEmpNo || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Department</span>
                    <span className="text-dark-100">{issueForm.recipientDept}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Date</span>
                    <span className="font-mono text-dark-100">{issueForm.issuedDate}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-dark-500 mb-4">Fill in recipient details on the left.</p>
              )}

              {cart.length > 0 && (
                <div className="border-t border-dark-700 pt-4 mb-4 space-y-1.5">
                  {cart.map(c => (
                    <div key={c.itemId} className="flex justify-between text-sm">
                      <span className="text-dark-300">{c.itemName}</span>
                      <span className="font-mono text-dark-400">×{c.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary w-full justify-center py-2.5"
                onClick={handleIssue}
                disabled={saving || cart.length === 0}
              >
                {saving ? <LoadingSpinner size="sm" /> : `Issue ${cart.reduce((s,c)=>s+c.quantity,0)} Unit${cart.reduce((s,c)=>s+c.quantity,0)!==1?'s':''} →`}
              </button>

              {cart.length === 0 && (
                <p className="text-xs text-dark-600 text-center mt-2">Add items to enable issuance</p>
              )}
            </div>
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — STOCK IN / OUT
      ══════════════════════════════════════════════════════════ */}
      {tab === 'movement' && (
        !canWrite(user) ? (
          <div className="alert alert-info"><span>ℹ</span><span>Read-only access.</span></div>
        ) : (
          <div className="card p-5 max-w-lg">
            <div className="card-header">Record Stock Movement</div>
            <FormGroup label="Item *">
              <select className="select" value={mvForm.itemId} onChange={mf('itemId')}>
                <option value="">Select item…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} (stock: {i.quantity})</option>)}
              </select>
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Type">
                <select className="select" value={mvForm.type} onChange={mf('type')}>
                  <option value="in">Stock In (received)</option>
                  <option value="out">Stock Out (disposed)</option>
                </select>
              </FormGroup>
              <FormGroup label="Quantity *">
                <input type="number" className="input" min="1" value={mvForm.quantity}
                  onChange={e => setMvForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
              </FormGroup>
              <FormGroup label="Department">
                <select className="select" value={mvForm.department} onChange={mf('department')}>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Reference / PO#">
                <input className="input" value={mvForm.reference} placeholder="PO#, reason…" onChange={mf('reference')} />
              </FormGroup>
            </div>
            <button className="btn btn-primary w-full justify-center mt-2" onClick={handleMovement} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : 'Record Movement'}
            </button>
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — TRANSACTION LOG (stock movements + issuances)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'log' && (
        <div className="space-y-6">

          {/* Inventory Issuances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs text-dark-500 uppercase tracking-widest">Inventory Issuances</div>
              <span className="text-xs text-dark-500">{issuances.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Recipient</th><th>Dept</th><th>Items Issued</th><th>By</th><th>View</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-8 text-center"><LoadingSpinner /></td></tr>
                  ) : issuances.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState icon="⇗" title="No issuances yet" description='Use the "Issue Items" tab' /></td></tr>
                  ) : issuances.map(iss => (
                    <tr key={iss.id}>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {iss.createdAt?.seconds ? format(new Date(iss.createdAt.seconds * 1000), 'MMM d yyyy HH:mm') : iss.issuedDate}
                      </td>
                      <td>
                        <div className="font-medium text-dark-100">{iss.recipientName}</div>
                        <div className="font-mono text-xs text-dark-400">{iss.recipientEmpNo}</div>
                      </td>
                      <td className="text-xs">{iss.recipientDept}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {iss.items?.map(i => (
                            <span key={i.itemId} className="badge badge-blue text-xs">
                              {i.itemName} ×{i.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs text-dark-400">{iss.issuedByName}</td>
                      <td>
                        <button className="abtn primary" onClick={() => setViewModal(iss)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock movements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs text-dark-500 uppercase tracking-widest">Stock Movements</div>
              <span className="text-xs text-dark-500">{stockLogs.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Dept</th><th>Reference</th><th>By</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center"><LoadingSpinner /></td></tr>
                  ) : stockLogs.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon="≡" title="No stock movements yet" /></td></tr>
                  ) : stockLogs.map(l => (
                    <tr key={l.id}>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {l.createdAt?.seconds ? format(new Date(l.createdAt.seconds * 1000), 'MMM d HH:mm') : '—'}
                      </td>
                      <td className="font-medium text-dark-100">{l.itemName}</td>
                      <td>
                        <Badge variant={l.type === 'in' ? 'green' : l.type === 'issue' ? 'blue' : 'amber'}>
                          {l.type === 'in' ? 'Stock In' : l.type === 'issue' ? 'Issued' : 'Stock Out'}
                        </Badge>
                      </td>
                      <td className={`font-mono text-xs font-semibold ${l.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                      </td>
                      <td className="text-xs">{l.department}</td>
                      <td className="text-xs text-dark-400">{l.reference || '—'}</td>
                      <td className="text-xs">{l.recordedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL — Add Item
      ══════════════════════════════════════════════════════════ */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Inventory Item">
        <FormGroup label="Item Name *">
          <input className="input" value={newItem.name} onChange={ni('name')} placeholder="e.g. USB-C Hubs" autoFocus />
        </FormGroup>
        <FormGroup label="Category">
          <input className="input" value={newItem.category} onChange={ni('category')} placeholder="e.g. Accessories, Cables, Consumables…" />
        </FormGroup>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Initial Quantity">
            <input type="number" className="input" min="0" value={newItem.quantity}
              onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
          </FormGroup>
          <FormGroup label="Minimum Stock">
            <input type="number" className="input" min="1" value={newItem.minStock}
              onChange={e => setNewItem(p => ({ ...p, minStock: parseInt(e.target.value) || 1 }))} />
          </FormGroup>
        </div>
        <FormGroup label="Department">
          <select className="select" value={newItem.department} onChange={ni('department')}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
        </FormGroup>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dark-700">
          <button className="btn" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddItem} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : '＋ Add Item'}
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MODAL — Edit Item
      ══════════════════════════════════════════════════════════ */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Inventory Item">
        {editModal && (
          <>
            <FormGroup label="Item Name *">
              <input className="input" value={editModal.name} onChange={ei('name')} />
            </FormGroup>
            <FormGroup label="Category">
              <input className="input" value={editModal.category || ''} onChange={ei('category')} />
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Current Quantity">
                <input type="number" className="input" min="0" value={editModal.quantity}
                  onChange={e => setEditModal(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
              </FormGroup>
              <FormGroup label="Minimum Stock">
                <input type="number" className="input" min="1" value={editModal.minStock}
                  onChange={e => setEditModal(p => ({ ...p, minStock: parseInt(e.target.value) || 1 }))} />
              </FormGroup>
            </div>
            <FormGroup label="Department">
              <select className="select" value={editModal.department || ''} onChange={ei('department')}>
                <option value="">All departments</option>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormGroup>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dark-700">
              <button className="btn" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditItem} disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MODAL — View Issuance
      ══════════════════════════════════════════════════════════ */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Issuance Details">
        {viewModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Recipient',   viewModal.recipientName],
                ['Emp No.',     viewModal.recipientEmpNo],
                ['Email',       viewModal.recipientEmail],
                ['Department',  viewModal.recipientDept],
                ['Date',        viewModal.issuedDate],
                ['Issued By',   viewModal.issuedByName],
              ].map(([k, v]) => (
                <div key={k} className="bg-dark-900 rounded-lg p-3 border border-dark-700">
                  <div className="font-mono text-xs text-dark-500 mb-0.5">{k}</div>
                  <div className="text-dark-100 font-medium">{v || '—'}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="font-mono text-xs text-dark-500 uppercase tracking-widest mb-2">Items Issued</div>
              <div className="space-y-2">
                {viewModal.items?.map(i => (
                  <div key={i.itemId} className="flex justify-between items-center bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5">
                    <span className="text-sm text-dark-100">{i.itemName}</span>
                    <span className="badge badge-blue">×{i.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {viewModal.notes && (
              <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
                <div className="font-mono text-xs text-dark-500 mb-1">Notes</div>
                <div className="text-sm text-dark-300">{viewModal.notes}</div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-dark-700">
              <button className="btn" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
