// src/pages/UsersPage.jsx
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchUsers, updateUser, deleteUser } from '@/services/firebase/users'
import { createUser } from '@/services/firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, RoleBadge, Modal, FormGroup, EmptyState, LoadingSpinner } from '@/components/ui'

const ROLES       = ['admin','staff','viewer']
const DEPARTMENTS = ['IT','HR','Finance','Operations','Management']

const EMPTY = { name:'', email:'', password:'', employeeNumber:'', department:'IT', role:'staff' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [modal, setModal]     = useState(null)   // null | 'add' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')

  async function load() { setUsers(await fetchUsers()); setLoading(false) }
  useEffect(() => { load() }, [])

  function openAdd()  { setForm(EMPTY); setSelected(null); setModal('add') }
  function openEdit(u){ setForm({ name:u.name, email:u.email, password:'', employeeNumber:u.employeeNumber, department:u.department, role:u.role }); setSelected(u); setModal('edit') }

  async function handleSave() {
    if (!form.name || !form.email || !form.employeeNumber) return toast.error('Name, email, and employee number are required.')
    if (modal === 'add' && !form.password) return toast.error('Password is required for new users.')
    setSaving(true)
    try {
      if (modal === 'add') {
        await createUser(form)
        toast.success('User created successfully')
      } else {
        await updateUser(selected.uid || selected.id, form, me)
        toast.success('User updated')
      }
      setModal(null); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Remove user ${u.name}? This cannot be undone.`)) return
    try { await deleteUser(u.uid || u.id, u.name, me); load(); toast.success('User removed') }
    catch (e) { toast.error(e.message) }
  }

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (filterDept && u.department !== filterDept) return false
    return true
  })

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle={`${users.length} system users`}
        actions={<button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add User</button>}
      />

      <div className="flex gap-2 mb-4">
        <select className="select w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} className="capitalize">{r}</option>)}
        </select>
        <select className="select w-auto" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Emp No.</th><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><LoadingSpinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="⊙" title="No users found" /></td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td className="font-mono text-xs">{u.employeeNumber}</td>
                <td className="font-medium text-dark-100">{u.name}</td>
                <td className="text-xs text-dark-400">{u.email}</td>
                <td className="text-xs">{u.department}</td>
                <td><RoleBadge role={u.role} /></td>
                <td>
                  <div className="flex gap-1">
                    <button className="abtn primary" onClick={() => openEdit(u)}>Edit</button>
                    {u.uid !== me.uid && (
                      <button className="abtn danger" onClick={() => handleDelete(u)}>Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add New User' : 'Edit User'}>
        <div className="form-grid-2">
          <FormGroup label="Full Name *"><input className="input" value={form.name} onChange={f('name')} placeholder="Full name" /></FormGroup>
          <FormGroup label="Employee No. *"><input className="input" value={form.employeeNumber} onChange={f('employeeNumber')} placeholder="EMP-XXX" /></FormGroup>
          <FormGroup label="Email *"><input type="email" className="input" value={form.email} onChange={f('email')} placeholder="name@dfs.io" /></FormGroup>
          {modal === 'add' && (
            <FormGroup label="Password *"><input type="password" className="input" value={form.password} onChange={f('password')} placeholder="Min 8 characters" /></FormGroup>
          )}
          <FormGroup label="Department">
            <select className="select" value={form.department} onChange={f('department')}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Role">
            <select className="select" value={form.role} onChange={f('role')}>
              {ROLES.map(r => <option key={r} className="capitalize">{r}</option>)}
            </select>
          </FormGroup>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 mt-1 mb-2">
          <div className="text-xs font-mono text-dark-500 mb-1.5">Role Permissions</div>
          <div className="text-xs text-dark-400 space-y-0.5">
            <div><span className="text-red-400">Admin</span> — Full access: create, read, update, delete</div>
            <div><span className="text-blue-400">Staff</span> — Create, read, update (no delete)</div>
            <div><span className="text-teal-400">Viewer</span> — Read-only access</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dark-700">
          <button className="btn" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : modal === 'add' ? '＋ Add User' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
