// src/pages/admin/AdminServices.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollection } from '../../hooks/useFirestore';
import { addService, updateService, deleteService } from '../../services/firestoreService';

export default function AdminServices() {
  const { data: services, loading } = useCollection('services', 'order');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const openAdd = () => { reset({ order: (services?.length || 0) + 1 }); setModal('add'); };
  const openEdit = (s) => { reset(s); setModal(s); };
  const closeModal = () => { setModal(null); reset(); };

  const onSubmit = async (data) => {
    const payload = { ...data, order: Number(data.order) };
    try {
      if (modal === 'add') { await addService(payload); toast.success('Service added!'); }
      else { await updateService(modal.id, payload); toast.success('Service updated!'); }
      closeModal();
    } catch { toast.error('Failed to save.'); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete service "${title}"?`)) return;
    try { await deleteService(id); toast.success('Deleted.'); }
    catch { toast.error('Delete failed.'); }
  };

  const filtered = (services || []).filter(s =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Services</h1>
          <p>Manage the manufacturing services shown on the public website.</p>
        </div>
        <button className="btn-admin-primary" onClick={openAdd}>
          <Plus size={15} /> Add Service
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Services ({filtered.length})</h2>
            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input
                className="admin-search__input"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <h3>No services yet</h3>
              <p>Add your first service using the button above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service Title</th>
                    <th>Description Preview</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>{s.order}</td>
                      <td><strong>{s.title}</strong></td>
                      <td style={{ maxWidth: 340 }}>
                        <span style={{ color: 'var(--gray-600)', fontSize: 13 }}>
                          {s.description?.substring(0, 80)}{s.description?.length > 80 ? '…' : ''}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-admin-edit" onClick={() => openEdit(s)}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="btn-admin-danger" onClick={() => handleDelete(s.id, s.title)}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modal === 'add' ? 'Add Service' : 'Edit Service'}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
                  <div className="form-group">
                    <label className="form-label">Service Title *</label>
                    <input className="form-input" {...register('title', { required: true })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Order</label>
                    <input className="form-input" type="number" style={{ width: 80 }} {...register('order')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={4} {...register('description')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Icon Name (optional)</label>
                  <input className="form-input" placeholder="e.g. scissors, package, tag..." {...register('icon')} />
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>
                    Reference name for icon display (for future use).
                  </span>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn-admin-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-admin-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
