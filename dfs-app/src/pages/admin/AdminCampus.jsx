// src/pages/admin/AdminCampus.jsx
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, Plus, Trash2, Upload, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocument } from '../../hooks/useFirestore';
import { overwriteDocument } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';

const DEFAULT_PROGRAMMES = [
  { title: 'Garment Production',         level: 'Certificate',  duration: '6 – 12 months', description: 'Hands-on training in cutting, sewing, and finishing techniques across all garment categories.' },
  { title: 'Quality Assurance & Control', level: 'Certificate',  duration: '6 months',      description: 'ISO-aligned quality management, inspection techniques and defect analysis.' },
  { title: 'Fashion & Garment Design',    level: 'Diploma',      duration: '12 months',     description: 'Pattern making, grading, technical drawing and design fundamentals.' },
  { title: 'Textile Business Management', level: 'Diploma',      duration: '12 months',     description: 'Supply chain management, costing, sourcing and production planning.' },
  { title: 'Factory Supervisory Skills',  level: 'Short Course', duration: '3 months',      description: 'Leadership, team management and production planning for factory supervisors.' },
  { title: 'Machinery Maintenance',       level: 'Short Course', duration: '3 months',      description: 'Preventative and corrective maintenance for industrial sewing and finishing machinery.' },
];

const DEFAULT_HIGHLIGHTS = [
  { title: 'Factory-Integrated',    description: 'Students train inside real DFS production facilities alongside experienced workers.' },
  { title: 'Accredited Programmes', description: 'Industry-recognised certificates and diplomas aligned to national and regional standards.' },
  { title: 'Local Focus',           description: 'Designed specifically for Basotho youth, creating lasting employment in the local economy.' },
  { title: 'Job Placement',         description: 'Top graduates are considered for direct employment within the DFS Group factories.' },
];

export default function AdminCampus() {
  const { data: campus, loading } = useDocument('settings', 'campus');
  const [saving, setSaving]           = useState(false);
  const [heroUploadPct, setHeroUploadPct] = useState(null);
  const [heroPreview,   setHeroPreview]   = useState(null);

  // ── NOTE: isDirty removed — we always allow saving manually ──────────────
  const {
    register, handleSubmit, reset, control, setValue, getValues,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      tagline:         '',
      about:           '',
      mission:         '',
      established:     2023,
      studentsPerYear: 200,
      heroImageUrl:    '',
      programmes:      DEFAULT_PROGRAMMES,
      highlights:      DEFAULT_HIGHLIGHTS,
    },
  });

  const { fields: progFields, append: appendProg, remove: removeProg } = useFieldArray({ control, name: 'programmes' });
  const { fields: highFields, append: appendHigh, remove: removeHigh } = useFieldArray({ control, name: 'highlights' });

  useEffect(() => {
    if (!campus) return;
    // Use defaultValues so form is populated but still considered saveable
    reset({
      tagline:         campus.tagline         ?? '',
      about:           campus.about           ?? '',
      mission:         campus.mission         ?? '',
      established:     campus.established     ?? 2023,
      studentsPerYear: campus.studentsPerYear ?? 200,
      heroImageUrl:    campus.heroImageUrl    ?? '',
      programmes:      campus.programmes?.length ? campus.programmes : DEFAULT_PROGRAMMES,
      highlights:      campus.highlights?.length ? campus.highlights : DEFAULT_HIGHLIGHTS,
    });
    setHeroPreview(campus.heroImageUrl || null);
  }, [campus]);  // intentionally omit reset from deps

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroPreview(URL.createObjectURL(file));
    setHeroUploadPct(0);
    try {
      const url = await uploadImage(file, 'campus', pct => setHeroUploadPct(pct));
      setValue('heroImageUrl', url);
      toast.success('Hero image uploaded!');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
      setHeroPreview(null);
    } finally {
      setHeroUploadPct(null);
      e.target.value = '';
    }
  };

  // Manual save — never gated by isDirty
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await overwriteDocument('settings', 'campus', {
        tagline:         data.tagline         || '',
        about:           data.about           || '',
        mission:         data.mission         || '',
        established:     Number(data.established)     || 2023,
        studentsPerYear: Number(data.studentsPerYear) || 200,
        heroImageUrl:    data.heroImageUrl    || '',
        programmes:      data.programmes      || [],
        highlights:      data.highlights      || [],
      });
      toast.success('Campus page saved successfully!');
    } catch (err) {
      console.error('[AdminCampus] save error:', err);
      toast.error('Failed to save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const SaveBtn = ({ style = {} }) => (
    <button
      type="submit"
      className="btn-admin-primary"
      disabled={saving}
      style={style}
    >
      <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
    </button>
  );

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GraduationCap size={24} style={{ color: 'var(--gold)' }} />
            QIOTAA Campus
          </h1>
          <p>Manage the Quantum Institute of Textile and Apparel public page.</p>
        </div>
        <a href="/campus" target="_blank" rel="noreferrer" className="btn-admin-secondary">
          Preview Page ↗
        </a>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Overview ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Campus Overview</h2>
              <SaveBtn />
            </div>
            <div className="admin-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              <div className="form-group">
                <label className="form-label">Hero Tagline</label>
                <input
                  className="form-input"
                  placeholder="Where industry meets education — training the next generation…"
                  {...register('tagline')}
                />
                <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>
                  Shown below the QIOTAA heading on the hero section.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Year Established</label>
                  <input className="form-input" type="number" {...register('established')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Students per Year</label>
                  <input className="form-input" type="number" {...register('studentsPerYear')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">About QIOTAA</label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  placeholder="Describe what QIOTAA is, its purpose, location and what makes it unique…"
                  {...register('about')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mission Statement</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="QIOTAA exists to close the skills gap in Lesotho's textile and apparel sector…"
                  {...register('mission')}
                />
              </div>
            </div>
          </div>

          {/* ── Hero Image ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Hero / Banner Image</h2>
            </div>
            <div className="admin-card__body">
              {heroPreview ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', maxHeight: 260 }}>
                  <img src={heroPreview} alt="Campus hero" style={{ width: '100%', height: 260, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                    <label htmlFor="campus-hero-img" style={{
                      background: 'rgba(0,0,0,.7)', color: '#fff', padding: '8px 14px',
                      borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      <Upload size={13} /> Change Image
                    </label>
                  </div>
                </div>
              ) : (
                <div className="upload-area">
                  <label htmlFor="campus-hero-img" style={{ cursor: 'pointer', display: 'block' }}>
                    <Upload size={24} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                    <p style={{ marginTop: 8 }}>Upload campus hero image</p>
                    <small>Wide landscape photo recommended (1600×900px) · max 10 MB</small>
                  </label>
                </div>
              )}
              <input
                type="file"
                id="campus-hero-img"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleHeroUpload}
              />
              {heroUploadPct !== null && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>
                    <span>Uploading…</span><span>{heroUploadPct}%</span>
                  </div>
                  <div className="upload-progress">
                    <div className="upload-progress__bar" style={{ width: `${heroUploadPct}%` }} />
                  </div>
                </div>
              )}
              <input type="hidden" {...register('heroImageUrl')} />
            </div>
          </div>

          {/* ── Programmes ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Programmes & Courses ({progFields.length})</h2>
              <button
                type="button"
                className="btn-admin-primary"
                onClick={() => appendProg({ title: '', level: 'Certificate', duration: '', description: '' })}
              >
                <Plus size={14} /> Add Programme
              </button>
            </div>
            <div className="admin-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {progFields.length === 0 ? (
                <div className="admin-empty">
                  <h3>No programmes yet</h3>
                  <p>Click "Add Programme" to add your first course.</p>
                </div>
              ) : progFields.map((field, index) => (
                <div key={field.id} style={{ border: '1.5px solid var(--gray-200)', borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'start' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Programme Title</label>
                      <input className="form-input" placeholder="e.g. Garment Production" {...register(`programmes.${index}.title`)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Level</label>
                      <select className="form-select" {...register(`programmes.${index}.level`)}>
                        <option>Certificate</option>
                        <option>Diploma</option>
                        <option>Short Course</option>
                        <option>Degree</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Duration</label>
                      <input className="form-input" placeholder="e.g. 6 months" {...register(`programmes.${index}.duration`)} />
                    </div>
                    <button
                      type="button"
                      className="btn-admin-danger"
                      onClick={() => removeProg(index)}
                      style={{ marginTop: 22 }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" rows={2} {...register(`programmes.${index}.description`)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Highlights ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Key Highlights ({highFields.length})</h2>
              <button
                type="button"
                className="btn-admin-primary"
                onClick={() => appendHigh({ title: '', description: '' })}
              >
                <Plus size={14} /> Add Highlight
              </button>
            </div>
            <div className="admin-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                These appear in the "About QIOTAA" section as feature cards.
              </p>
              {highFields.map((field, index) => (
                <div key={field.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 2fr auto',
                  gap: 12, alignItems: 'start',
                  padding: 16, border: '1.5px solid var(--gray-200)', borderRadius: 8,
                }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Title</label>
                    <input className="form-input" placeholder="e.g. Factory-Integrated" {...register(`highlights.${index}.title`)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Description</label>
                    <input className="form-input" placeholder="Brief description…" {...register(`highlights.${index}.description`)} />
                  </div>
                  <button
                    type="button"
                    className="btn-admin-danger"
                    onClick={() => removeHigh(index)}
                    style={{ marginTop: 22 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom save ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 32 }}>
            <SaveBtn />
          </div>

        </div>
      </form>
    </div>
  );
}
