// src/pages/DepartmentsPage.jsx
// Manage departments — add, edit, delete.
// All changes call reload() which updates the global DepartmentsContext,
// so every dropdown in the app reflects the change instantly.

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/services/firebase/departments'
import { useAuth } from '@/context/AuthContext'
import { useDepartments } from '@/context/DepartmentsContext'
import { canDelete } from '@/utils/accessControl'
import { PageHeader, Modal, FormGroup, EmptyState, LoadingSpinner } from '@/components/ui'
import { format } from 'date-fns'

const EMPTY_FORM = { name: '', description: '' }

export default function DepartmentsPage() {
  const { user }                              = useAuth()
  const { departmentDocs, loading, reload }   = useDepartments()

  const [saving, setSaving]     = useState(false)
  const [modal, setModal]       = useState(null)    // null | 'add' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')

  // ── Helpers ──────────────────────────────────────────────────────
  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  function openAdd()  {
    setForm(EMPTY_FORM)
    setSelected(null)
    setModal('add')
  }

  function openEdit(doc) {
    setForm({ name: doc.name, description: doc.description || '' })
    setSelected(doc)
    setModal('edit')
  }

  // ── Save (add or edit) ───────────────────────────────────────────
  async function handleSave() {
    const trimmed = form.name.trim()
    if (!trimmed) return toast.error('Department name is required.')

    // Duplicate check (case-insensitive, exclude self when editing)
    const duplicate = departmentDocs.find(d =>
      d.name.toLowerCase() === trimmed.toLowerCase() &&
      d.id !== selected?.id
    )
    if (duplicate) return toast.error(`"${trimmed}" already exists.`)

    setSaving(true)
    try {
      if (modal === 'add') {
        await createDepartment({ name: trimmed, description: form.description }, user)
        toast.success(`Department "${trimmed}" created`)
      } else {
        await updateDepartment(selected.id, { name: trimmed, description: form.description }, user)
        toast.success(`Department "${trimmed}" updated`)
      }
      setModal(null)
      reload()   // ← refreshes context → all dropdowns update instantly
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
  async function handleDelete(doc) {
    if (!window.confirm(
      `Delete "${doc.name}"?\n\nExisting records assigned to this department are kept, but it will no longer appear in dropdowns.`
    )) return

    try {
      await deleteDepartment(doc.id, doc.name, user)
      toast.success(`"${doc.name}" deleted`)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // ── Filter ───────────────────────────────────────────────────────
  const filtered = departmentDocs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${departmentDocs.length} department${departmentDocs.length !== 1 ? 's' : ''} · changes apply instantly across the app`}
        actions={
          canDelete(user) && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              ＋ Add Department
            </button>
          )
        }
      />

      {/* Info */}
      <div className="alert alert-info mb-5">
        <span>ℹ</span>
        <span>
          Departments added here instantly appear in all dropdowns — Assets, Inventory, Issuance, and Users.
          {departmentDocs.length === 0 && (
            <strong> No departments in Firestore yet — defaults are shown until you add your first one.</strong>
          )}
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <input
          className="input w-64"
          placeholder="Search departments…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-xs font-mono text-dark-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={search ? 'No departments match your search' : 'No departments yet'}
          description={!search ? 'Click "+ Add Department" to create your first one' : ''}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(d => (
            <DeptCard
              key={d.id}
              doc={d}
              isAdmin={canDelete(user)}
              onEdit={() => openEdit(d)}
              onDelete={() => handleDelete(d)}
            />
          ))}

          {/* Quick-add card (admin only) */}
          {canDelete(user) && !search && (
            <button
              onClick={openAdd}
              className="card p-5 flex flex-col items-center justify-center gap-2 border-dashed
                         text-dark-500 hover:text-dark-200 hover:border-dark-500 transition-colors
                         cursor-pointer min-h-[140px]"
            >
              <span className="text-3xl">＋</span>
              <span className="text-sm font-medium">Add Department</span>
            </button>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? '＋ Add Department' : `Edit — ${selected?.name}`}
      >
        <FormGroup label="Department Name *">
          <input
            className="input"
            value={form.name}
            onChange={f('name')}
            placeholder="e.g. Logistics, Marketing, Security…"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </FormGroup>

        <FormGroup label="Description (optional)">
          <input
            className="input"
            value={form.description}
            onChange={f('description')}
            placeholder="Brief description of this department"
          />
        </FormGroup>

        {/* Preview */}
        {form.name.trim() && (
          <div className="mb-4 p-3 bg-dark-900 border border-dark-700 rounded-lg flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm flex-shrink-0 ${avatarColor(form.name)}`}>
              {form.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-dark-100">{form.name.trim()}</div>
              {form.description && <div className="text-xs text-dark-400">{form.description}</div>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-dark-700">
          <button className="btn" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <LoadingSpinner size="sm" />
              : modal === 'add' ? '＋ Add Department' : 'Save Changes'
            }
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Department Card ────────────────────────────────────────────────
function DeptCard({ doc, isAdmin, onEdit, onDelete }) {
  return (
    <div className="card p-5 flex flex-col gap-3 group">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-base text-white ${avatarColor(doc.name)}`}>
          {doc.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-dark-100 truncate">{doc.name}</div>
          {doc.description
            ? <div className="text-xs text-dark-400 mt-0.5 line-clamp-2">{doc.description}</div>
            : <div className="text-xs text-dark-600 mt-0.5 italic">No description</div>
          }
        </div>
      </div>

      {doc.createdAt?.seconds && (
        <div className="text-xs font-mono text-dark-600">
          Added {format(new Date(doc.createdAt.seconds * 1000), 'MMM d, yyyy')}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2 pt-2 border-t border-dark-700 mt-auto">
          <button
            className="btn btn-sm flex-1 justify-center"
            onClick={onEdit}
          >
            ✎ Edit
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Deterministic avatar colour from first character ──────────────
function avatarColor(name) {
  const palette = [
    'bg-blue-600',   'bg-violet-600', 'bg-emerald-600',
    'bg-rose-600',   'bg-amber-600',  'bg-teal-600',
    'bg-indigo-600', 'bg-pink-600',   'bg-cyan-600',
    'bg-orange-600', 'bg-lime-600',   'bg-sky-600',
  ]
  return palette[(name.charCodeAt(0) || 0) % palette.length]
}
