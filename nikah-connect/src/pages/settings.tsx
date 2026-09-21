import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Shield, Eye, Bell, User, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: value ? '#4A9E4A' : '#D1D5DB' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: value ? 'translateX(20px)' : 'none' }} />
    </button>
  );
}

export default function SettingsPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState({
    profileVisibility: userProfile?.privacy?.profileVisibility || 'everyone',
    showPhotosTo: userProfile?.privacy?.showPhotosTo || 'matches_only',
    showContactDetails: userProfile?.privacy?.showContactDetails || false,
    showLastSeen: userProfile?.privacy?.showLastSeen !== false,
    allowMessagesFrom: userProfile?.privacy?.allowMessagesFrom || 'matches_only',
  });
  const [isPaused, setIsPaused] = useState(userProfile?.isPaused || false);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        privacy, isPaused, updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Settings</h1>
            <p className="text-sm text-gray-400">Manage your account and privacy</p>
          </div>
          <button onClick={saveSettings} disabled={saving} className="btn-sage flex items-center gap-2 text-sm py-2">
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Profile Status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} style={{ color: 'var(--rose-gold)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Profile Status</h3>
          </div>
          <SettingRow
            label="Pause My Profile"
            description="Your profile will be hidden from searches and suggestions"
          >
            <Toggle value={isPaused} onChange={setIsPaused} />
          </SettingRow>
          {isPaused && (
            <div className="mt-3 p-3 rounded-lg text-sm text-amber-700" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
              ⏸ Your profile is currently paused and not visible to other users.
            </div>
          )}
        </div>

        {/* Privacy */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} style={{ color: 'var(--rose-gold)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Privacy</h3>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--charcoal)' }}>Profile Visibility</label>
              <select
                className="input-field text-sm"
                value={privacy.profileVisibility}
                onChange={e => setPrivacy(p => ({ ...p, profileVisibility: e.target.value as any }))}
              >
                <option value="everyone">Everyone</option>
                <option value="matches_only">Matched users only</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--charcoal)' }}>Show Photos To</label>
              <select
                className="input-field text-sm"
                value={privacy.showPhotosTo}
                onChange={e => setPrivacy(p => ({ ...p, showPhotosTo: e.target.value as any }))}
              >
                <option value="everyone">Everyone</option>
                <option value="matches_only">Matched users only</option>
                <option value="none">Nobody</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--charcoal)' }}>Allow Messages From</label>
              <select
                className="input-field text-sm"
                value={privacy.allowMessagesFrom}
                onChange={e => setPrivacy(p => ({ ...p, allowMessagesFrom: e.target.value as any }))}
              >
                <option value="matches_only">Matched users only</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>

            <SettingRow label="Show Contact Details" description="Allow other users to see your email/phone">
              <Toggle value={privacy.showContactDetails} onChange={v => setPrivacy(p => ({ ...p, showContactDetails: v }))} />
            </SettingRow>

            <SettingRow label="Show Last Seen" description="Let others know when you were last active">
              <Toggle value={privacy.showLastSeen} onChange={v => setPrivacy(p => ({ ...p, showLastSeen: v }))} />
            </SettingRow>
          </div>
        </div>

        {/* Security */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} style={{ color: '#4A9E4A' }} />
            <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Account</h3>
          </div>
          <div className="space-y-1 text-sm text-gray-500">
            <p>Signed in as <strong style={{ color: 'var(--charcoal)' }}>{userProfile?.email}</strong></p>
            <p>Account type: <strong style={{ color: 'var(--charcoal)' }} className="capitalize">{userProfile?.accountType}</strong></p>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(74,158,74,0.06)', border: '1px solid rgba(74,158,74,0.15)' }}>
          <p className="font-medium mb-1" style={{ color: '#2E7D32' }}>🌿 Community Guidelines</p>
          <p className="text-gray-500 text-xs leading-relaxed">
            NikahConnect is built on values of respect, honesty, and modesty. 
            We have a zero-tolerance policy for inappropriate behavior, fake profiles, or harassment. 
            Please report any violations using the report button on any profile.
          </p>
        </div>

        {/* Danger zone */}
        <div className="card p-6" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
          <h3 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
            <Trash2 size={15} /> Danger Zone
          </h3>
          <button className="text-sm text-red-500 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">
            Delete My Account
          </button>
          <p className="text-xs text-gray-400 mt-2">This action cannot be undone. All your data will be permanently removed.</p>
        </div>
      </div>
    </Layout>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
