// src/pages/admin/AdminCompany.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocument } from '../../hooks/useFirestore';
import { updateCompanyOverview } from '../../services/firestoreService';

export default function AdminCompany() {
  const { data: company, loading } = useDocument('company', 'overview');
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (company) reset(company);
  }, [company, reset]);

  const onSubmit = async (data) => {
    try {
      await updateCompanyOverview(data);
      toast.success('Company overview updated!');
    } catch {
      toast.error('Failed to save changes.');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Company Overview</h1>
          <p>Edit the main company information shown across the website.</p>
        </div>
      </div>

      <div className="admin-content">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Basic Information</h2>
              <button
                type="submit"
                className="btn-admin-primary"
                disabled={isSubmitting || !isDirty}
              >
                <Save size={14} /> {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <div className="admin-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-input" {...register('name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Tagline</label>
                <input className="form-input" {...register('tagline')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Founded Year</label>
                  <input className="form-input" type="number" {...register('founded')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Count</label>
                  <input className="form-input" type="number" {...register('employees')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Factories</label>
                  <input className="form-input" type="number" {...register('factories')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <input className="form-input" {...register('industry')} />
              </div>
              <div className="form-group">
                <label className="form-label">Headquarters</label>
                <input className="form-input" {...register('headquarters')} />
              </div>
              <div className="form-group">
                <label className="form-label">Markets</label>
                <input className="form-input" {...register('markets')} />
              </div>
              <div className="form-group">
                <label className="form-label">Company Description</label>
                <textarea className="form-textarea" rows={5} {...register('description')} />
              </div>
              <div className="form-group">
                <label className="form-label">Vision Statement</label>
                <textarea className="form-textarea" rows={3} {...register('vision')} />
              </div>
              <div className="form-group">
                <label className="form-label">Mission Statement</label>
                <textarea className="form-textarea" rows={3} {...register('mission')} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
