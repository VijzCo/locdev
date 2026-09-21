// src/pages/admin/AdminFactories.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollection } from '../../hooks/useFirestore';
import { addFactory, updateFactory, deleteFactory } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';

export default function AdminFactories() {
  const { data: factories, loading } = useCollection('factories', 'order');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();

  const openAdd = () => { reset({ order: (factories?.length || 0) + 1 }); setModal('add'); };
  const openEdit = (f) => {
    reset({ ...f, certifications: (f.certifications || []).join(', ') });
    setModal(f);
  };
  const closeModal = () => { setModal(null); reset(); setUploadPct(null); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'factories', pct => setUploadPct(Math.round(pct)));
      setValue('imageUrl', url);
      toast.success('Image uploaded!');
    } catch { toast.error(err.message || 'Upload failed. Check Storage rules and .env config.'); }
    finally { setUploadPct(null); }
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      employees: Number(data.employees),
      established: Number(data.established),
      order: Number(data.order),
      certifications: data.certifications
        ? data.certifications.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (modal === 'add') { await addFactory(payload); toast.success('Factory added!'); }
      else { await updateFactory(modal.id, payload); toast.success('Factory updated!'); }
      closeModal();
    } catch { toast.error('Failed to save.'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete factory "${name}"?`)) return;
    try { await deleteFactory(id); toast.success('Deleted.'); }
    catch { toast.error('Delete failed.'); }
  };

  const filtered = (factories || []).filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Factories</h1>
          <p>Manage factory details, certifications, and images.</p>
        </div>
        <button className="btn-admin-primary" onClick={openAdd}>
          <Plus size={15} /> Add Factory
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Production Facilities ({filtered.length})</h2>
            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input className="admin-search__input" placeholder="Search factories..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Factory Name</th><th>Location</th><th>Employees</th><th>Capacity</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id}>
                      <td>{f.order}</td>
                      <td><strong>{f.name}</strong></td>
                      <td>{f.location}</td>
                      <td>{f.employees?.toLocaleString()}</td>
                      <td>{f.capacity}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-admin-edit" onClick={() => openEdit(f)}><Pencil size={12} /> Edit</button>
                          <button className="btn-admin-danger" onClick={() => handleDelete(f.id, f.name)}><Trash2 size={12} /> Delete</button>
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
              <h3>{modal === 'add' ? 'Add Factory' : 'Edit Factory'}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="form-group">
                  <label className="form-label">Factory Name *</label>
                  <input className="form-input" {...register('name', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-input" {...register('location', { required: true })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Est. Year</label>
                    <input className="form-input" type="number" {...register('established')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employees</label>
                    <input className="form-input" type="number" {...register('employees')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Order</label>
                    <input className="form-input" type="number" {...register('order')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Capacity</label>
                  <input className="form-input" placeholder="e.g. 50,000 units/month" {...register('capacity')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-input" {...register('specialization')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} {...register('description')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Certifications (comma separated)</label>
                  <input className="form-input" placeholder="WRAP Certified, ISO 9001:2015" {...register('certifications')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Factory Image</label>
                  <div className="upload-area">
                    <input type="file" accept="image/*" id="factory-img" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <label htmlFor="factory-img" style={{ cursor: 'pointer' }}>
                      <Upload size={24} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                      <p>Click to upload image</p>
                    </label>
                  </div>
                  {uploadPct !== null && (
                    <div className="upload-progress">
                      <div className="upload-progress__bar" style={{ width: `${uploadPct}%` }} />
                    </div>
                  )}
                  <input type="hidden" {...register('imageUrl')} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn-admin-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-admin-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Factory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
