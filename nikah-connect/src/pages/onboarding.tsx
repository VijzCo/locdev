import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Heart, ArrowRight, ArrowLeft, Check, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Account Type', 'Basic Info', 'Background', 'Lifestyle', 'Preferences', 'Privacy'];

export default function OnboardingPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountType: 'individual',
    name: userProfile?.name || '',
    age: '',
    gender: '',
    heightCm: '',
    city: '',
    country: '',
    nationality: '',
    education: '',
    occupation: '',
    religion: '',
    maritalStatus: 'single',
    prayerFrequency: '',
    smokingStatus: 'no',
    bio: '',
    profileStatus: 'looking_for_marriage',
    // Child info (if parent account)
    childName: '',
    childAge: '',
    childGender: '',
    // Preferences
    prefAgeMin: '22',
    prefAgeMax: '35',
    prefLocation: '',
    prefEducation: '',
    prefReligion: '',
    // Privacy
    profileVisibility: 'everyone',
    showPhotosTo: 'matches_only',
    showContactDetails: false,
  });

  const update = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const calcCompletion = () => {
    const required = ['name', 'age', 'gender', 'city', 'religion', 'education', 'occupation', 'bio'];
    const filled = required.filter(k => !!(form as any)[k]);
    return Math.round(20 + (filled.length / required.length) * 70);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profileCompletion = calcCompletion();
      await updateDoc(doc(db, 'users', user.uid), {
        accountType: form.accountType,
        name: form.name,
        age: parseInt(form.age) || null,
        gender: form.gender,
        heightCm: parseInt(form.heightCm) || null,
        city: form.city,
        country: form.country,
        nationality: form.nationality,
        education: form.education,
        occupation: form.occupation,
        religion: form.religion,
        maritalStatus: form.maritalStatus,
        prayerFrequency: form.prayerFrequency,
        smokingStatus: form.smokingStatus,
        bio: form.bio,
        profileStatus: form.profileStatus,
        childName: form.childName,
        childAge: parseInt(form.childAge) || null,
        childGender: form.childGender,
        profileComplete: profileCompletion,
        preferences: {
          ageMin: parseInt(form.prefAgeMin),
          ageMax: parseInt(form.prefAgeMax),
          locations: form.prefLocation ? [form.prefLocation] : [],
          education: form.prefEducation ? [form.prefEducation] : [],
          religion: form.prefReligion ? [form.prefReligion] : [],
        },
        privacy: {
          profileVisibility: form.profileVisibility,
          showPhotosTo: form.showPhotosTo,
          showContactDetails: form.showContactDetails,
          showLastSeen: true,
          allowMessagesFrom: 'matches_only',
        },
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success('Profile created! Welcome to NikahConnect 🌿');
      router.push('/dashboard');
    } catch (e) {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col pattern-bg" style={{ background: 'var(--warm-white)' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
            <Heart size={14} fill="white" color="white" />
          </div>
          <span className="font-display font-semibold" style={{ color: 'var(--charcoal)' }}>NikahConnect</span>
        </div>
        <div className="text-sm text-gray-400">Step {step + 1} of {STEPS.length}</div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-100">
        <div className="h-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #C8956C, #4A9E4A)' }} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all"
                  style={{
                    background: i < step ? '#4A9E4A' : i === step ? 'var(--rose-gold)' : '#E8E8E0',
                    color: i <= step ? 'white' : '#9A9A8E',
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-0.5" style={{ background: i < step ? '#4A9E4A' : '#E8E8E0' }} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="card p-8 animate-fade-up">
            <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--charcoal)' }}>
              {STEPS[step]}
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              {stepSubtitles[step]}
            </p>

            {step === 0 && <Step0 form={form} update={update} />}
            {step === 1 && <Step1 form={form} update={update} />}
            {step === 2 && <Step2 form={form} update={update} />}
            {step === 3 && <Step3 form={form} update={update} />}
            {step === 4 && <Step4 form={form} update={update} />}
            {step === 5 && <Step5 form={form} update={update} />}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <button onClick={handleBack} className="btn-secondary flex items-center gap-2">
                  <ArrowLeft size={16} /> Back
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={handleFinish} disabled={saving} className="btn-sage flex items-center gap-2">
                  {saving ? 'Saving...' : 'Complete Profile'} <Check size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const stepSubtitles = [
  'Choose the account type that best describes your situation',
  'Tell us a bit about yourself',
  'Your educational and professional background',
  'Your lifestyle and values',
  'Describe your ideal partner',
  'Control who can see your profile',
];

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

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input-field">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Step0({ form, update }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {[
          { value: 'individual', icon: User, title: 'Individual Account', desc: 'I am searching for a partner for myself' },
          { value: 'parent', icon: Users, title: 'Parent / Guardian Account', desc: 'I am managing a profile on behalf of my child' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => update('accountType', opt.value)}
            className="text-left p-5 rounded-xl border-2 transition-all"
            style={{
              borderColor: form.accountType === opt.value ? 'var(--rose-gold)' : 'rgba(46,46,36,0.1)',
              background: form.accountType === opt.value ? 'rgba(200,149,108,0.06)' : 'white',
            }}
          >
            <div className="flex items-center gap-3">
              <opt.icon size={22} style={{ color: form.accountType === opt.value ? 'var(--rose-gold)' : '#6E6E62' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--charcoal)' }}>{opt.title}</p>
                <p className="text-sm text-gray-400">{opt.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {form.accountType === 'individual' && (
        <Field label="Profile Status">
          <Select
            value={form.profileStatus}
            onChange={v => update('profileStatus', v)}
            options={[
              { value: 'looking_for_marriage', label: '💍 Looking for Marriage' },
              { value: 'exploring', label: '🔍 Exploring Matches' },
            ]}
          />
        </Field>
      )}

      {form.accountType === 'parent' && (
        <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(74,158,74,0.06)', border: '1px solid rgba(74,158,74,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: '#2E7D32' }}>Child Information</p>
          <Field label="Child's Name" required>
            <input className="input-field" value={form.childName} onChange={e => update('childName', e.target.value)} placeholder="Full name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input type="number" className="input-field" value={form.childAge} onChange={e => update('childAge', e.target.value)} placeholder="Age" />
            </Field>
            <Field label="Gender">
              <Select value={form.childGender} onChange={v => update('childGender', v)} placeholder="Select" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Step1({ form, update }: any) {
  return (
    <div className="space-y-4">
      <Field label="Full Name" required>
        <input className="input-field" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age" required>
          <input type="number" className="input-field" value={form.age} onChange={e => update('age', e.target.value)} placeholder="Your age" min="18" max="70" />
        </Field>
        <Field label="Gender" required>
          <Select value={form.gender} onChange={v => update('gender', v)} placeholder="Select gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Height (cm)">
          <input type="number" className="input-field" value={form.heightCm} onChange={e => update('heightCm', e.target.value)} placeholder="e.g. 170" />
        </Field>
        <Field label="Nationality">
          <input className="input-field" value={form.nationality} onChange={e => update('nationality', e.target.value)} placeholder="e.g. British" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City" required>
          <input className="input-field" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Your city" />
        </Field>
        <Field label="Country">
          <input className="input-field" value={form.country} onChange={e => update('country', e.target.value)} placeholder="Your country" />
        </Field>
      </div>
      <Field label="About Yourself">
        <textarea className="input-field" rows={4} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Write a brief description about yourself, your personality, and what you're looking for..." style={{ resize: 'none' }} />
      </Field>
    </div>
  );
}

function Step2({ form, update }: any) {
  return (
    <div className="space-y-4">
      <Field label="Highest Education">
        <Select value={form.education} onChange={v => update('education', v)} placeholder="Select education level" options={[
          { value: 'high_school', label: 'High School' },
          { value: 'diploma', label: 'Diploma / Certificate' },
          { value: 'bachelors', label: "Bachelor's Degree" },
          { value: 'masters', label: "Master's Degree" },
          { value: 'phd', label: 'PhD / Doctorate' },
          { value: 'islamic_studies', label: 'Islamic Studies' },
          { value: 'other', label: 'Other' },
        ]} />
      </Field>
      <Field label="Occupation">
        <input className="input-field" value={form.occupation} onChange={e => update('occupation', e.target.value)} placeholder="Your profession or field" />
      </Field>
      <Field label="Marital Status">
        <Select value={form.maritalStatus} onChange={v => update('maritalStatus', v)} options={[
          { value: 'single', label: 'Single (Never Married)' },
          { value: 'divorced', label: 'Divorced' },
          { value: 'widowed', label: 'Widowed' },
        ]} />
      </Field>
      <Field label="Religion" required>
        <Select value={form.religion} onChange={v => update('religion', v)} placeholder="Select religion" options={[
          { value: 'muslim_sunni', label: 'Muslim - Sunni' },
          { value: 'muslim_shia', label: 'Muslim - Shia' },
          { value: 'muslim_other', label: 'Muslim - Other' },
          { value: 'christian', label: 'Christian' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ]} />
      </Field>
    </div>
  );
}

function Step3({ form, update }: any) {
  return (
    <div className="space-y-4">
      <Field label="Prayer Frequency">
        <Select value={form.prayerFrequency} onChange={v => update('prayerFrequency', v)} placeholder="Select" options={[
          { value: 'five_daily', label: 'Five times daily (Alhamdulillah)' },
          { value: 'regularly', label: 'Regularly' },
          { value: 'occasionally', label: 'Occasionally' },
          { value: 'jumuah_only', label: 'Jumuah only' },
          { value: 'not_practicing', label: 'Not currently practicing' },
        ]} />
      </Field>
      <Field label="Smoking">
        <Select value={form.smokingStatus} onChange={v => update('smokingStatus', v)} options={[
          { value: 'no', label: 'Non-smoker' },
          { value: 'yes', label: 'Smoker' },
          { value: 'trying_to_quit', label: 'Trying to quit' },
        ]} />
      </Field>
      {form.gender === 'female' && (
        <Field label="Do you wear Hijab?">
          <Select value={form.hijab ? 'yes' : 'no'} onChange={v => update('hijab', v === 'yes')} options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'sometimes', label: 'Sometimes' },
          ]} />
        </Field>
      )}
      {form.gender === 'male' && (
        <Field label="Do you have a beard?">
          <Select value={form.beard ? 'yes' : 'no'} onChange={v => update('beard', v === 'yes')} options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]} />
        </Field>
      )}
    </div>
  );
}

function Step4({ form, update }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Min Age">
          <input type="number" className="input-field" value={form.prefAgeMin} onChange={e => update('prefAgeMin', e.target.value)} min="18" max="70" />
        </Field>
        <Field label="Max Age">
          <input type="number" className="input-field" value={form.prefAgeMax} onChange={e => update('prefAgeMax', e.target.value)} min="18" max="70" />
        </Field>
      </div>
      <Field label="Preferred Location">
        <input className="input-field" value={form.prefLocation} onChange={e => update('prefLocation', e.target.value)} placeholder="City or country" />
      </Field>
      <Field label="Preferred Education Level">
        <Select value={form.prefEducation} onChange={v => update('prefEducation', v)} placeholder="Any education level" options={[
          { value: 'any', label: 'Any' },
          { value: 'bachelors', label: "Bachelor's or higher" },
          { value: 'masters', label: "Master's or higher" },
        ]} />
      </Field>
      <Field label="Preferred Religion">
        <Select value={form.prefReligion} onChange={v => update('prefReligion', v)} placeholder="Any religion" options={[
          { value: 'muslim_sunni', label: 'Muslim - Sunni' },
          { value: 'muslim_shia', label: 'Muslim - Shia' },
          { value: 'muslim', label: 'Muslim (Any)' },
          { value: 'any', label: 'Open to all' },
        ]} />
      </Field>
    </div>
  );
}

function Step5({ form, update }: any) {
  return (
    <div className="space-y-4">
      <Field label="Profile Visibility">
        <Select value={form.profileVisibility} onChange={v => update('profileVisibility', v)} options={[
          { value: 'everyone', label: 'Everyone can view my profile' },
          { value: 'matches_only', label: 'Only matched users can view' },
          { value: 'hidden', label: 'Hidden (pause my profile)' },
        ]} />
      </Field>
      <Field label="Who Can View My Photos">
        <Select value={form.showPhotosTo} onChange={v => update('showPhotosTo', v)} options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'matches_only', label: 'Matched users only' },
          { value: 'none', label: "Don't show photos" },
        ]} />
      </Field>
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(46,46,36,0.03)', border: '1px solid rgba(46,46,36,0.08)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>Show Contact Details</p>
          <p className="text-xs text-gray-400">Email/phone visible to all users</p>
        </div>
        <button
          onClick={() => update('showContactDetails', !form.showContactDetails)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: form.showContactDetails ? '#4A9E4A' : '#D1D5DB' }}
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: form.showContactDetails ? 'translateX(20px)' : 'none' }} />
        </button>
      </div>
      <div className="p-4 rounded-xl text-sm text-green-700" style={{ background: 'rgba(74,158,74,0.08)', border: '1px solid rgba(74,158,74,0.2)' }}>
        💡 You can change these settings at any time from your Privacy Settings page.
      </div>
    </div>
  );
}
