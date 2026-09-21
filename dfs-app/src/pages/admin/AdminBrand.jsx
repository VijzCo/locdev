// src/pages/admin/AdminBrand.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocument } from '../../hooks/useFirestore';
import { updateBrandSettings } from '../../services/firestoreService';
import { uploadImage } from '../../services/storageService';
import { DEFAULT_BRAND } from '../../hooks/useBrand';

// Small live colour swatch preview
function ColorInput({ label, name, register, watch, hint }) {
  const value = watch(name) || '#000000';
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          background: value,
          border: '2px solid var(--gray-200)',
          flexShrink: 0,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)',
        }} />
        <input
          className="form-input"
          type="text"
          maxLength={9}
          placeholder="#000000"
          {...register(name)}
          style={{ fontFamily: 'monospace', flex: 1 }}
        />
        <input
          type="color"
          value={value.length === 7 ? value : '#000000'}
          onChange={e => {
            // sync the text field via a hidden trick — we use a ref approach below
          }}
          style={{ width: 36, height: 36, padding: 2, border: '1.5px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
          title="Pick colour"
          id={`picker-${name}`}
        />
      </div>
      {hint && <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>{hint}</span>}
    </div>
  );
}

export default function AdminBrand() {
  const { data: brand, loading } = useDocument('settings', 'brand');
  const [uploadPct, setUploadPct] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, isDirty } } = useForm({
    defaultValues: DEFAULT_BRAND,
  });

  const logoType = watch('logoType');

  useEffect(() => {
    if (brand) {
      reset({ ...DEFAULT_BRAND, ...brand });
      setLogoPreview(brand.logoImageUrl || null);
    }
  }, [brand, reset]);

  // Sync colour picker → text field
  const handleColorPick = (e, fieldName) => {
    setValue(fieldName, e.target.value, { shouldDirty: true });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    setLogoPreview(URL.createObjectURL(file));
    setUploadPct(0);
    try {
      const url = await uploadImage(file, 'brand', pct => setUploadPct(pct));
      setValue('logoImageUrl', url, { shouldDirty: true });
      toast.success('Logo uploaded!');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
      setLogoPreview(null);
    } finally {
      setUploadPct(null);
      e.target.value = '';
    }
  };

  const onSubmit = async (data) => {
    try {
      await updateBrandSettings(data);
      toast.success('Brand settings saved! Changes are live immediately.');
    } catch {
      toast.error('Failed to save.');
    }
  };

  const resetToDefaults = () => {
    reset(DEFAULT_BRAND);
    setLogoPreview(null);
    toast('Reset to default colours. Click Save to apply.');
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const COLOURS = [
    { name: 'colorNavy',      label: 'Primary Dark (Navy)',       hint: 'Main backgrounds, navbar, buttons' },
    { name: 'colorNavyMid',   label: 'Primary Mid',               hint: 'Stats band, footer background' },
    { name: 'colorNavyLight', label: 'Primary Light',             hint: 'Hover states, card backgrounds' },
    { name: 'colorGold',      label: 'Accent (Gold)',             hint: 'Links, highlights, CTA buttons' },
    { name: 'colorGoldLight', label: 'Accent Light',              hint: 'Hover on accent elements' },
    { name: 'colorGoldPale',  label: 'Accent Pale',               hint: 'Badges, background tints' },
    { name: 'colorCream',     label: 'Cream Background',          hint: 'Alternate section backgrounds' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Brand & Theme</h1>
          <p>Change logo, colours, and company name displayed across the website.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-admin-secondary" onClick={resetToDefaults}>
            <RefreshCw size={14} /> Reset Defaults
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="btn-admin-secondary">
            <Eye size={14} /> Preview Site
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Logo ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Logo & Company Name</h2>
              <button type="submit" className="btn-admin-primary" disabled={isSubmitting || !isDirty}>
                <Save size={14} /> {isSubmitting ? 'Saving…' : 'Save All Changes'}
              </button>
            </div>
            <div className="admin-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Logo type toggle */}
              <div className="form-group">
                <label className="form-label">Logo Type</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['text', 'image'].map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `2px solid ${logoType === type ? 'var(--gold)' : 'var(--gray-200)'}`, borderRadius: 8, background: logoType === type ? 'var(--gold-pale)' : 'transparent', transition: 'all .15s' }}>
                      <input type="radio" value={type} {...register('logoType')} style={{ accentColor: 'var(--gold)' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                        {type === 'text' ? '🔤 Text Logo (initials)' : '🖼️ Image Logo (upload)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {logoType === 'text' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Logo Initials</label>
                    <input className="form-input" maxLength={4} placeholder="DFS" {...register('logoText')} />
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>Shown in the logo box (max 4 chars)</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Short Name</label>
                    <input className="form-input" placeholder="Duty Free Sourcing" {...register('companyShort')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Suffix</label>
                    <input className="form-input" placeholder="Inc. (PTY) LTD" {...register('companySuffix')} />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Logo Image</label>
                  {logoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--navy)', borderRadius: 8, marginBottom: 10 }}>
                      <img src={logoPreview} alt="Logo preview" style={{ height: 56, width: 'auto', maxWidth: 200, objectFit: 'contain' }} />
                      <div>
                        <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>Logo preview (on dark background)</p>
                        <label htmlFor="logo-upload" style={{ color: 'var(--gold)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                          Change logo
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-area">
                      <label htmlFor="logo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                        <Upload size={24} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                        <p style={{ marginTop: 8 }}>Click to upload logo</p>
                        <small>PNG with transparent background recommended · max 5 MB</small>
                      </label>
                    </div>
                  )}
                  <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  {uploadPct !== null && (
                    <div className="upload-progress" style={{ marginTop: 8 }}>
                      <div className="upload-progress__bar" style={{ width: `${uploadPct}%` }} />
                    </div>
                  )}
                  <input type="hidden" {...register('logoImageUrl')} />
                </div>
              )}
            </div>
          </div>

          {/* ── Colours ── */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Brand Colours</h2>
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Changes apply live across the entire website</span>
            </div>
            <div className="admin-card__body">

              {/* Live preview strip */}
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', marginBottom: 28, height: 48, border: '1.5px solid var(--gray-200)' }}>
                {COLOURS.map(c => (
                  <div
                    key={c.name}
                    style={{ flex: 1, background: watch(c.name) || '#ccc' }}
                    title={`${c.label}: ${watch(c.name)}`}
                  />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 20px' }}>
                {COLOURS.map(c => (
                  <div key={c.name} style={{ position: 'relative' }}>
                    <ColorInput
                      label={c.label}
                      name={c.name}
                      register={register}
                      watch={watch}
                      hint={c.hint}
                    />
                    {/* Wire up the colour picker to update the text field */}
                    <input
                      type="color"
                      style={{ position: 'absolute', bottom: 28, right: 0, opacity: 0, width: 36, height: 36, cursor: 'pointer' }}
                      onChange={e => handleColorPick(e, c.name)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-600)', border: '1px solid var(--gray-200)' }}>
                💡 <strong>Tip:</strong> Click the colour square to open a colour picker, or type a HEX code directly (e.g. <code style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 3 }}>#1a3a6b</code>). Changes are applied to the live website the moment you click Save.
              </div>
            </div>
          </div>

          {/* Live site preview */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Colour Preview</h2>
            </div>
            <div className="admin-card__body">
              <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                {/* Mock navbar */}
                <div style={{ background: watch('colorNavy'), padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: watch('colorGold'), borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: watch('colorNavy') }}>
                    {watch('logoText') || 'DFS'}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>Navbar preview</span>
                  <div style={{ marginLeft: 'auto', background: watch('colorGold'), color: watch('colorNavy'), padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                    Button
                  </div>
                </div>
                {/* Mock section */}
                <div style={{ padding: 24, background: watch('colorCream') }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: watch('colorGold'), fontWeight: 700, marginBottom: 8 }}>Eyebrow Text</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: watch('colorNavy'), fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Section Heading</div>
                  <div style={{ display: 'inline-block', background: watch('colorGoldPale'), color: watch('colorNavy'), padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Badge</div>
                </div>
                {/* Mock dark section */}
                <div style={{ padding: 24, background: watch('colorNavyMid') }}>
                  <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>Dark section text — services, stats, footer areas</span>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    {[watch('colorGold'), watch('colorGoldLight'), watch('colorGoldPale')].map((c, i) => (
                      <div key={i} style={{ width: 32, height: 32, borderRadius: 6, background: c }} title={c} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 32 }}>
            <button type="button" className="btn-admin-secondary" onClick={resetToDefaults}>
              <RefreshCw size={14} /> Reset to Defaults
            </button>
            <button type="submit" className="btn-admin-primary" disabled={isSubmitting || !isDirty}>
              <Save size={14} /> {isSubmitting ? 'Saving…' : 'Save Brand Settings'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
