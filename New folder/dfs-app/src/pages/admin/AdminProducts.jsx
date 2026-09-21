// src/pages/admin/AdminProducts.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCollection } from '../../hooks/useFirestore';
import { addProduct, updateProduct, deleteProduct } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';

const CATEGORIES = [
  'Casual Wear', 'Corporate Wear', 'Workwear', 'Performance Wear',
  'Safety', 'Education', 'Sportswear', 'Other'
];

export default function AdminProducts() {
  const { data: products, loading } = useCollection('products', 'order');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();

  const openAdd = () => { reset({ order: (products?.length || 0) + 1, featured: false }); setModal('add'); };
  const openEdit = (p) => { reset(p); setModal(p); };
  const closeModal = () => { setModal(null); reset(); setUploadPct(null); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'products', pct => setUploadPct(Math.round(pct)));
      setValue('imageUrl', url);
      toast.success('Image uploaded!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploadPct(null); }
  };

  const onSubmit = async (data) => {
    const payload = { ...data, order: Number(data.order), featured: data.featured === true || data.featured === 'true' };
    try {
      if (modal === 'add') { await addProduct(payload); toast.success('Product added!'); }
      else { await updateProduct(modal.id, payload); toast.success('Product updated!'); }
      closeModal();
    } catch { toast.error('Failed to save.'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await deleteProduct(id); toast.success('Deleted.'); }
    catch { toast.error('Delete failed.'); }
  };

  const filtered = (products || []).filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Products</h1>
          <p>Manage the product catalogue shown on the public website.</p>
        </div>
        <button className="btn-admin-primary" onClick={openAdd}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Product Catalogue ({filtered.length})</h2>
            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input
                className="admin-search__input"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <h3>No products found</h3>
              <p>Add your first product using the button above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>MOQ</th>
                    <th>Lead Time</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td>{p.order}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 14, fontWeight: 700 }}>{p.name?.charAt(0)}</div>
                          }
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td><span className="badge">{p.category}</span></td>
                      <td>{p.moq}</td>
                      <td>{p.leadTime}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 100,
                          fontSize: 11, fontWeight: 600,
                          background: p.featured ? '#dcfce7' : 'var(--gray-100)',
                          color: p.featured ? '#166534' : 'var(--gray-400)',
                        }}>
                          {p.featured ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-admin-edit" onClick={() => openEdit(p)}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="btn-admin-danger" onClick={() => handleDelete(p.id, p.name)}>
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
              <h3>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" {...register('name', { required: true })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-select" {...register('category', { required: true })}>
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input className="form-input" type="number" {...register('order')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} {...register('description')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Min. Order Qty (MOQ)</label>
                    <input className="form-input" placeholder="e.g. 500 units" {...register('moq')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Time</label>
                    <input className="form-input" placeholder="e.g. 4–6 weeks" {...register('leadTime')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" {...register('featured')} style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
                    Show as Featured Product on homepage
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Product Image</label>
                  <div className="upload-area">
                    <input type="file" accept="image/*" id="product-img" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <label htmlFor="product-img" style={{ cursor: 'pointer' }}>
                      <Upload size={24} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                      <p>Click to upload product image</p>
                      <small>JPG, PNG, WebP — up to 10MB</small>
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
                  {isSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
