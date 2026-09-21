import React, { useState, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { Camera, X, Save, User, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

export default function EditProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: userProfile?.name || '',
    age: userProfile?.age?.toString() || '',
    gender: userProfile?.gender || '',
    heightCm: userProfile?.heightCm?.toString() || '',
    city: userProfile?.city || '',
    country: userProfile?.country || '',
    nationality: userProfile?.nationality || '',
    education: userProfile?.education || '',
    occupation: userProfile?.occupation || '',
    religion: userProfile?.religion || '',
    maritalStatus: userProfile?.maritalStatus || 'single',
    prayerFrequency: userProfile?.prayerFrequency || '',
    smokingStatus: userProfile?.smokingStatus || 'no',
    bio: userProfile?.bio || '',
    profileStatus: userProfile?.profileStatus || 'looking_for_marriage',
    interests: userProfile?.interests?.join(', ') || '',
    languages: userProfile?.languages?.join(', ') || '',
  });

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/photo_${Date.now()}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', (snap) => {
        setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100));
      });
      await task;
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { profilePhoto: url, updatedAt: serverTimestamp() });
      await refreshProfile();
      toast.success('Profile photo updated!');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const calcCompletion = () => {
    const required = ['name', 'age', 'gender', 'city', 'religion', 'education', 'occupation', 'bio'];
    const filled = required.filter(k => !!(form as any)[k]);
    const hasPhoto = !!(userProfile?.profilePhoto);
    return Math.round(10 + (filled.length / required.length) * 70 + (hasPhoto ? 15 : 0));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        age: parseInt(form.age) || null,
        heightCm: parseInt(form.heightCm) || null,
        interests: form.interests.split(',').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        profileComplete: calcCompletion(),
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success('Profile saved!');
      router.push('/profile');
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Edit Profile</h1>
            <p className="text-sm text-gray-400">Update your information</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-sage flex items-center gap-2">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Profile photo */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Profile Photo</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              {userProfile?.profilePhoto ? (
                <img src={userProfile.profilePhoto} className="w-20 h-20 rounded-full object-cover" style={{ border: '3px solid rgba(200,149,108,0.3)' }} />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)', border: '2px dashed rgba(200,149,108,0.3)' }}>
                  <User size={28} style={{ color: 'var(--rose-gold)' }} />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <span className="text-white text-sm font-bold">{uploadProgress}%</span>
                </div>
              )}
            </div>
            <div>
              <label className="btn-secondary text-sm py-2 px-4 cursor-pointer flex items-center gap-2">
                <Upload size={14} /> Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <p className="text-xs text-gray-400 mt-1">Max 5MB · JPG, PNG</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Personal Information</h3>
          <div className="space-y-4">
            <Field label="Full Name" required>
              <input className="input-field" value={form.name} onChange={e => update('name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Age">
                <input type="number" className="input-field" value={form.age} onChange={e => update('age', e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className="input-field" value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Height (cm)">
                <input type="number" className="input-field" value={form.heightCm} onChange={e => update('heightCm', e.target.value)} />
              </Field>
              <Field label="Nationality">
                <input className="input-field" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <input className="input-field" value={form.city} onChange={e => update('city', e.target.value)} />
              </Field>
              <Field label="Country">
                <input className="input-field" value={form.country} onChange={e => update('country', e.target.value)} />
              </Field>
            </div>
            <Field label="About Yourself">
              <textarea className="input-field" rows={4} value={form.bio} onChange={e => update('bio', e.target.value)} style={{ resize: 'none' }} placeholder="Describe yourself, your personality, and what you're looking for..." />
            </Field>
          </div>
        </div>

        {/* Background */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Background</h3>
          <div className="space-y-4">
            <Field label="Education">
              <select className="input-field" value={form.education} onChange={e => update('education', e.target.value)}>
                <option value="">Select</option>
                <option value="high_school">High School</option>
                <option value="diploma">Diploma</option>
                <option value="bachelors">Bachelor's</option>
                <option value="masters">Master's</option>
                <option value="phd">PhD</option>
                <option value="islamic_studies">Islamic Studies</option>
              </select>
            </Field>
            <Field label="Occupation">
              <input className="input-field" value={form.occupation} onChange={e => update('occupation', e.target.value)} />
            </Field>
            <Field label="Religion">
              <select className="input-field" value={form.religion} onChange={e => update('religion', e.target.value)}>
                <option value="">Select</option>
                <option value="muslim_sunni">Muslim - Sunni</option>
                <option value="muslim_shia">Muslim - Shia</option>
                <option value="christian">Christian</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Marital Status">
              <select className="input-field" value={form.maritalStatus} onChange={e => update('maritalStatus', e.target.value)}>
                <option value="single">Single</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Lifestyle */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Lifestyle</h3>
          <div className="space-y-4">
            <Field label="Prayer Frequency">
              <select className="input-field" value={form.prayerFrequency} onChange={e => update('prayerFrequency', e.target.value)}>
                <option value="">Select</option>
                <option value="five_daily">Five times daily</option>
                <option value="regularly">Regularly</option>
                <option value="occasionally">Occasionally</option>
                <option value="jumuah_only">Jumuah only</option>
              </select>
            </Field>
            <Field label="Smoking">
              <select className="input-field" value={form.smokingStatus} onChange={e => update('smokingStatus', e.target.value)}>
                <option value="no">Non-smoker</option>
                <option value="yes">Smoker</option>
                <option value="trying_to_quit">Trying to quit</option>
              </select>
            </Field>
            <Field label="Interests (comma separated)">
              <input className="input-field" value={form.interests} onChange={e => update('interests', e.target.value)} placeholder="e.g. Reading, Cooking, Travel" />
            </Field>
            <Field label="Languages (comma separated)">
              <input className="input-field" value={form.languages} onChange={e => update('languages', e.target.value)} placeholder="e.g. English, Arabic, Urdu" />
            </Field>
          </div>
        </div>

        {/* Status */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Profile Status</h3>
          <select className="input-field" value={form.profileStatus} onChange={e => update('profileStatus', e.target.value)}>
            <option value="looking_for_marriage">💍 Looking for Marriage</option>
            <option value="parents_managing">👨‍👩‍👧 Parents Managing</option>
            <option value="exploring">🔍 Exploring Matches</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push('/profile')} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-sage flex-1 flex items-center justify-center gap-2">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--charcoal)' }}>
        {label} {required && <span style={{ color: 'var(--rose-gold)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}
