// src/pages/admin/AdminSettings.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, FileText, Key, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocument } from '../../hooks/useFirestore';
import { updateContactSettings } from '../../services/firestoreService';
import { uploadPDF, uploadImage, deleteFile } from '../../services/storageService';
import { useAuth } from '../../hooks/useAuth';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';

export default function AdminSettings() {
  const { data: contact, loading } = useDocument('settings', 'contact');
  const { user } = useAuth();

  const { register: regContact, handleSubmit: hsContact, reset: resetContact, formState: { isSubmitting: cSub, isDirty: cDirty } } = useForm();
  const { register: regPwd, handleSubmit: hsPwd, reset: resetPwd, formState: { isSubmitting: pSub } } = useForm();

  const [docs, setDocs] = useState({ companyProfile: null, certDoc: null });
  const [uploads, setUploads] = useState({});

  useEffect(() => {
    if (contact) {
      resetContact(contact);
      setDocs({ companyProfile: contact.companyProfileUrl || null, certDoc: contact.certDocUrl || null });
    }
  }, [contact, resetContact]);

  const onContactSubmit = async (data) => {
    try {
      await updateContactSettings({ ...data, companyProfileUrl: docs.companyProfile, certDocUrl: docs.certDoc });
      toast.success('Contact settings saved!');
    } catch { toast.error('Failed to save settings.'); }
  };

  const handlePDFUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.'); return;
    }
    setUploads(u => ({ ...u, [key]: 0 }));
    try {
      const url = await uploadPDF(file, pct => setUploads(u => ({ ...u, [key]: Math.round(pct) })));
      setDocs(d => ({ ...d, [key]: url }));
      toast.success('PDF uploaded successfully!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploads(u => ({ ...u, [key]: null })); }
  };

  const handleDeleteDoc = async (key) => {
    if (!window.confirm('Remove this document?')) return;
    if (docs[key]) { try { await deleteFile(docs[key]); } catch {} }
    setDocs(d => ({ ...d, [key]: null }));
    toast.success('Document removed.');
  };

  const onPasswordChange = async ({ currentPassword, newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      toast.success('Password changed successfully!');
      resetPwd();
    } catch (err) {
      toast.error(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to change password.');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Settings</h1>
          <p>Manage contact information, document uploads, and account settings.</p>
        </div>
      </div>

      <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Contact Information */}
        <form onSubmit={hsContact(onContactSubmit)}>
          <div className="admin-card">
            <div className="admin-card__header">
              <h2>Contact Information</h2>
              <button type="submit" className="btn-admin-primary" disabled={cSub || !cDirty}>
                <Save size={14} /> {cSub ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <div className="admin-card__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Office Address</label>
                <textarea className="form-textarea" rows={3} {...regContact('address')} />
              </div>
              <div className="form-group">
                <label className="form-label">Office Hours</label>
                <input className="form-input" {...regContact('officeHours')} />
              </div>
              <div className="form-group">
                <label className="form-label">Main Phone</label>
                <input className="form-input" type="tel" {...regContact('phone')} />
              </div>
              <div className="form-group">
                <label className="form-label">General Email</label>
                <input className="form-input" type="email" {...regContact('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Sales Email</label>
                <input className="form-input" type="email" {...regContact('salesEmail')} />
              </div>
              <div className="form-group">
                <label className="form-label">Website URL</label>
                <input className="form-input" {...regContact('website')} />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input className="form-input" {...regContact('linkedIn')} />
              </div>
              <div className="form-group">
                <label className="form-label">Facebook URL</label>
                <input className="form-input" {...regContact('facebook')} />
              </div>
            </div>
          </div>
        </form>

        {/* Document Uploads */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Document Uploads</h2>
          </div>
          <div className="admin-card__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { key: 'companyProfile', label: 'Company Profile PDF', desc: 'Downloadable company profile document.' },
              { key: 'certDoc', label: 'Certifications Document', desc: 'Combined certifications PDF for clients.' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ border: '1.5px solid var(--gray-200)', borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <FileText size={20} style={{ color: 'var(--gold)' }} />
                  <div>
                    <strong style={{ fontSize: 14 }}>{label}</strong>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{desc}</p>
                  </div>
                </div>

                {docs[key] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    <FileText size={16} style={{ color: '#166534' }} />
                    <a href={docs[key]} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#166534', flex: 1, fontWeight: 500 }}>
                      View uploaded PDF ↗
                    </a>
                    <button onClick={() => handleDeleteDoc(key)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-area" style={{ margin: 0 }}>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      id={`pdf-${key}`}
                      style={{ display: 'none' }}
                      onChange={e => handlePDFUpload(e, key)}
                    />
                    <label htmlFor={`pdf-${key}`} style={{ cursor: 'pointer' }}>
                      <Upload size={20} style={{ margin: '0 auto', color: 'var(--gold)' }} />
                      <p style={{ fontSize: 13, marginTop: 6 }}>Click to upload PDF</p>
                      <small>PDF files only, max 20MB</small>
                    </label>
                  </div>
                )}

                {uploads[key] !== null && uploads[key] !== undefined && (
                  <div className="upload-progress" style={{ marginTop: 8 }}>
                    <div className="upload-progress__bar" style={{ width: `${uploads[key]}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Change Password</h2>
          </div>
          <form onSubmit={hsPwd(onPasswordChange)}>
            <div className="admin-card__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" {...regPwd('currentPassword', { required: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" {...regPwd('newPassword', { required: true, minLength: 8 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" {...regPwd('confirmPassword', { required: true })} />
              </div>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <button type="submit" className="btn-admin-primary" disabled={pSub}>
                <Key size={14} /> {pSub ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Account Information</h2>
          </div>
          <div className="admin-card__body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8 }}>
                <div style={{ width: 40, height: 40, background: 'var(--navy)', color: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>{user?.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Administrator · UID: {user?.uid?.substring(0, 12)}...</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray-400)', padding: '0 4px' }}>
                To add additional admin users, go to your Firebase Console → Authentication → Add User.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
