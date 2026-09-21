// src/pages/admin/AdminLeadership.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollection } from '../../hooks/useFirestore';
import { addLeader, updateLeader, deleteLeader } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';

export default function AdminLeadership() {
  const { data: leaders, loading } = useCollection('leadership', 'order');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | leader object
  const [uploadPct, setUploadPct] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting, errors } } = useForm();

  const openAdd = () => { reset({ order: (leaders?.length || 0) + 1 }); setModal('add'); };
  const openEdit = (leader) => { reset(leader); setModal(leader); };
  const closeModal = () => { setModal(null); reset(); setUploadPct(null); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'leadership', pct => setUploadPct(Math.round(pct)));
      setValue('imageUrl', url);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploadPct(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (modal === 'add') {
        await addLeader(data);
        toast.success('Team member added!');
      } else {
        await updateLeader(modal.id, data);
        toast.success('Team member updated!');
      }
      closeModal();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteLeader(id);
      toast.success('Deleted.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  const filtered = (leaders || []).filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Leadership Team</h1>
          <p>Add, edit, or remove leadership team members.</p>
        </div>
        <button className="btn-admin-primary" onClick={openAdd}>
          <Plus size={15} /> Add Member
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Team Members ({filtered.length})</h2>
            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input
                className="admin-search__input"
                placeholder="Search by name or role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <Users size={36} />
              <h3>No team members yet</h3>
              <p>Click "Add Member" to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Photo</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((leader) => (
                    <tr key={leader.id}>
                      <td>{leader.order}</td>
                      <td><strong>{leader.name}</strong></td>
                      <td>{leader.role}</td>
                      <td>
                        {leader.imageUrl
                          ? <img src={leader.imageUrl} alt={leader.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>No photo</span>
                        }
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-admin-edit" onClick={() => openEdit(leader)}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="btn-admin-danger" onClick={() => handleDelete(leader.id, leader.name)}>
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

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modal === 'add' ? 'Add Team Member' : 'Edit Team Member'}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" {...register('name', { required: true })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input className="form-input" type="number" {...register('order')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Title *</label>
                  <input className="form-input" {...register('role', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Biography</label>
                  <textarea className="form-textarea" rows={4} {...register('bio')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  <div className="upload-area">
                    <input type="file" accept="image/*" id="leader-img" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <label htmlFor="leader-img" style={{ cursor: 'pointer' }}>
                      <Upload size={24} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                      <p>Click to upload photo</p>
                      <small>JPG, PNG up to 5MB</small>
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
                  {isSubmitting ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
