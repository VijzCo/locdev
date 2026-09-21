// src/pages/admin/AdminLeadership.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollection } from '../../hooks/useFirestore';
import { addLeader, updateLeader, deleteLeader } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';
import StorageDiagnostic from './StorageDiagnostic';

export default function AdminLeadership() {
  const { data: allPeople, loading } = useCollection('leadership', 'order');
  const [search, setSearch]   = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [modal, setModal]     = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const [showDiag, setShowDiag]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();
  const modalTier = watch('tier');

  const openAdd = () => {
    reset({ order: (allPeople?.length || 0) + 1, tier: 'senior', imageUrl: '' });
    setPreviewUrl(null);
    setModal('add');
  };
  const openEdit = (p) => {
    reset(p);
    setPreviewUrl(p.imageUrl || null);
    setModal(p);
  };
  const closeModal = () => { setModal(null); reset(); setUploadPct(null); setPreviewUrl(null); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    setPreviewUrl(URL.createObjectURL(file));
    setUploadPct(0);
    try {
      const url = await uploadImage(file, 'leadership', pct => setUploadPct(pct));
      setValue('imageUrl', url);
      toast.success('Photo uploaded!');
    } catch (err) {
      setPreviewUrl(null);
      toast.error(err.message || 'Upload failed.');
      if (err.message?.toLowerCase().includes('storage') || err.message?.toLowerCase().includes('permission')) {
        setTimeout(() => setShowDiag(true), 600);
      }
    } finally {
      setUploadPct(null);
      e.target.value = '';
    }
  };

  const onSubmit = async (data) => {
    // Always coerce order to a real number
    data.order = Number(data.order) || 1;
    try {
      if (modal === 'add') { await addLeader(data); toast.success('Person added!'); }
      else { await updateLeader(modal.id, data); toast.success('Updated!'); }
      closeModal();
    } catch { toast.error('Failed to save.'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await deleteLeader(id); toast.success('Deleted.'); }
    catch { toast.error('Delete failed.'); }
  };

  const filtered = (allPeople || []).filter(p => {
    const matchTier   = tierFilter === 'all' || p.tier === tierFilter || (!p.tier && tierFilter === 'senior');
    const q           = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q);
    return matchTier && matchSearch;
  });

  const seniorCount = (allPeople || []).filter(p => !p.tier || p.tier === 'senior').length;
  const middleCount = (allPeople || []).filter(p => p.tier === 'middle').length;

  return (
    <div>
      {showDiag && <StorageDiagnostic onClose={() => setShowDiag(false)} />}

      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Leadership & Management</h1>
          <p>Manage senior leadership and middle management team members.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-admin-secondary" onClick={() => setShowDiag(true)}>
            <AlertTriangle size={14} /> Storage
          </button>
          <button className="btn-admin-primary" onClick={openAdd}>
            <Plus size={15} /> Add Person
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total People',        value: allPeople?.length || 0, color: '#6b7280' },
            { label: 'Senior Leadership',   value: seniorCount,            color: '#1d4ed8' },
            { label: 'Middle Management',   value: middleCount,            color: '#7e22ce' },
          ].map(({ label, value, color }) => (
            <div key={label} className="admin-stat-card">
              <div className="admin-stat-card__icon" style={{ background: color + '18' }}>
                <Plus size={20} style={{ color }} />
              </div>
              <div>
                <div className="admin-stat-card__val">{value}</div>
                <div className="admin-stat-card__label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card">
          <div className="admin-card__header">
            {/* Tier filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { val: 'all',    label: `All (${allPeople?.length || 0})` },
                { val: 'senior', label: `Senior (${seniorCount})` },
                { val: 'middle', label: `Middle (${middleCount})` },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setTierFilter(val)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                  background: tierFilter === val ? 'var(--navy)' : 'var(--gray-100)',
                  color:      tierFilter === val ? '#fff'        : 'var(--gray-600)',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input
                className="admin-search__input"
                placeholder="Search name, role, department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <h3>No people found</h3>
              <p>Click "Add Person" to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Photo</th><th>Name</th><th>Role</th><th>Tier</th><th>Department</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--gray-400)', width: 40 }}>{p.order}</td>
                      <td style={{ width: 52 }}>
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: 12 }}>
                              {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                        }
                      </td>
                      <td><strong>{p.name}</strong></td>
                      <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{p.role}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 100,
                          fontSize: 11, fontWeight: 600,
                          background: (!p.tier || p.tier === 'senior') ? '#eff6ff' : '#faf5ff',
                          color:      (!p.tier || p.tier === 'senior') ? '#1d4ed8' : '#7e22ce',
                        }}>
                          {(!p.tier || p.tier === 'senior') ? 'Senior' : 'Middle'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>{p.department || '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-admin-edit" onClick={() => openEdit(p)}><Pencil size={12} /> Edit</button>
                          <button className="btn-admin-danger" onClick={() => handleDelete(p.id, p.name)}><Trash2 size={12} /> Delete</button>
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

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modal === 'add' ? 'Add Person' : `Edit — ${modal.name}`}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Tier selector */}
                <div className="form-group">
                  <label className="form-label">Team Tier *</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { val: 'senior', label: '⭐ Senior Leadership', desc: 'Displayed prominently with full bio' },
                      { val: 'middle', label: '👥 Middle Management', desc: 'Displayed as a compact team grid' },
                    ].map(({ val, label, desc }) => (
                      <label key={val} style={{
                        flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
                        padding: 14, border: `2px solid ${modalTier === val ? 'var(--gold)' : 'var(--gray-200)'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: modalTier === val ? 'var(--gold-pale)' : 'transparent',
                        transition: 'all .15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" value={val} {...register('tier')} style={{ accentColor: 'var(--gold)' }} />
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--gray-400)', paddingLeft: 20 }}>{desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" placeholder="e.g. Thabo Mokoena" {...register('name', { required: true })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Order</label>
                    <input className="form-input" type="number" min="1" {...register('order')} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Role / Title *</label>
                  <input className="form-input" placeholder="e.g. Factory Manager" {...register('role', { required: true })} />
                </div>

                {modalTier === 'middle' && (
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="e.g. Factory 2 · Production" {...register('department')} />
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>
                      Shown as a small tag on the public card (e.g. "Factory 1 · QC")
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Bio {modalTier === 'middle' ? '(optional)' : '*'}</label>
                  <textarea className="form-textarea" rows={modalTier === 'middle' ? 3 : 4} placeholder="Brief professional bio…" {...register('bio')} />
                </div>

                {/* Photo */}
                <div className="form-group">
                  <label className="form-label">Photo</label>
                  {previewUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, border: '1.5px solid var(--gray-200)' }}>
                      <img src={previewUrl} alt="Preview" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)' }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Photo ready</p>
                        <label htmlFor="person-img" style={{ fontSize: 12, color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Change photo</label>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-area">
                      <label htmlFor="person-img" style={{ cursor: 'pointer', display: 'block' }}>
                        <Upload size={22} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                        <p style={{ marginTop: 8 }}>Click to upload photo</p>
                        <small>JPG, PNG · max 10 MB</small>
                      </label>
                    </div>
                  )}
                  <input type="file" accept="image/*" id="person-img" style={{ display: 'none' }} onChange={handleImageUpload} />
                  {uploadPct !== null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>
                        <span>Uploading…</span><span>{uploadPct}%</span>
                      </div>
                      <div className="upload-progress">
                        <div className="upload-progress__bar" style={{ width: `${uploadPct}%` }} />
                      </div>
                    </div>
                  )}
                  <input type="hidden" {...register('imageUrl')} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn-admin-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-admin-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : modal === 'add' ? 'Add Person' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
