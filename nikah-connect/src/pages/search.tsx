import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Search, Filter, Heart, X, User, MapPin, BookOpen, Briefcase } from 'lucide-react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { doc, addDoc, serverTimestamp } from 'firebase/firestore';

export default function SearchPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    ageMin: '18', ageMax: '60',
    gender: userProfile?.gender === 'male' ? 'female' : 'male',
    location: '',
    education: '',
    religion: '',
    maritalStatus: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [filters, profiles]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('isActive', '==', true),
        where('isPaused', '==', false),
      );
      const snap = await getDocs(q);
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.uid !== user?.uid);
      setProfiles(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...profiles];
    if (filters.gender) result = result.filter((p: any) => p.gender === filters.gender);
    if (filters.ageMin) result = result.filter((p: any) => !p.age || p.age >= parseInt(filters.ageMin));
    if (filters.ageMax) result = result.filter((p: any) => !p.age || p.age <= parseInt(filters.ageMax));
    if (filters.location) result = result.filter((p: any) => p.city?.toLowerCase().includes(filters.location.toLowerCase()) || p.country?.toLowerCase().includes(filters.location.toLowerCase()));
    if (filters.education) result = result.filter((p: any) => p.education === filters.education);
    if (filters.religion) result = result.filter((p: any) => p.religion?.includes(filters.religion));
    if (filters.maritalStatus) result = result.filter((p: any) => p.maritalStatus === filters.maritalStatus);
    setFiltered(result);
  };

  const sendMatchRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      // Check if match already exists
      const existing = await getDocs(query(
        collection(db, 'matches'),
        where('users', 'array-contains', user.uid)
      ));
      const alreadyExists = existing.docs.some(d => {
        const data = d.data();
        return data.users.includes(targetUid);
      });
      if (alreadyExists) { toast('Match request already sent!'); return; }

      await addDoc(collection(db, 'matches'), {
        users: [user.uid, targetUid],
        initiatorId: user.uid,
        receiverId: targetUid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        type: 'match_request',
        fromUserId: user.uid,
        message: `${userProfile?.name || 'Someone'} sent you a match request`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      toast.success('Match request sent! 💌');
    } catch (e) {
      toast.error('Failed to send request');
    }
  };

  const updateFilter = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Find Profiles</h1>
            <p className="text-sm text-gray-400">{filtered.length} profiles found</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Filter size={15} /> Filters
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Filter Profiles</h3>
              <button onClick={() => setShowFilters(false)}><X size={16} style={{ color: '#6E6E62' }} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gender</label>
                <select className="input-field text-sm" value={filters.gender} onChange={e => updateFilter('gender', e.target.value)}>
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Age Min</label>
                <input type="number" className="input-field text-sm" value={filters.ageMin} onChange={e => updateFilter('ageMin', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Age Max</label>
                <input type="number" className="input-field text-sm" value={filters.ageMax} onChange={e => updateFilter('ageMax', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
                <input className="input-field text-sm" value={filters.location} onChange={e => updateFilter('location', e.target.value)} placeholder="City or country" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Education</label>
                <select className="input-field text-sm" value={filters.education} onChange={e => updateFilter('education', e.target.value)}>
                  <option value="">Any</option>
                  <option value="bachelors">Bachelor's+</option>
                  <option value="masters">Master's+</option>
                  <option value="phd">PhD</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Religion</label>
                <select className="input-field text-sm" value={filters.religion} onChange={e => updateFilter('religion', e.target.value)}>
                  <option value="">Any</option>
                  <option value="muslim">Muslim</option>
                  <option value="christian">Christian</option>
                </select>
              </div>
            </div>
            <button onClick={() => setFilters({ ageMin: '18', ageMax: '60', gender: '', location: '', education: '', religion: '', maritalStatus: '' })} className="mt-4 text-sm text-gray-400 hover:text-rose-gold transition-colors">
              Reset Filters
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="h-56 shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-4 shimmer rounded w-2/3" />
                  <div className="h-3 shimmer rounded w-1/2" />
                  <div className="h-3 shimmer rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <Search size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
            <h3 className="font-display text-xl mb-2" style={{ color: 'var(--charcoal)' }}>No profiles found</h3>
            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((profile: any) => (
              <SearchProfileCard
                key={profile.id}
                profile={profile}
                onView={() => router.push(`/profiles/${profile.uid}`)}
                onMatch={() => sendMatchRequest(profile.uid)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function SearchProfileCard({ profile, onView, onMatch }: { profile: any; onView: () => void; onMatch: () => void }) {
  return (
    <div className="profile-card" style={{ background: 'white' }}>
      {/* Photo */}
      <div className="relative h-56 overflow-hidden bg-gray-100 cursor-pointer" onClick={onView}>
        {profile.profilePhoto ? (
          <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.08), rgba(74,158,74,0.08))' }}>
            <User size={48} style={{ color: 'rgba(46,46,36,0.2)' }} />
          </div>
        )}
        {profile.isVerified && (
          <div className="absolute top-3 left-3 badge-verified text-xs">✓ Verified</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <p className="text-white font-semibold">{profile.name}{profile.age ? `, ${profile.age}` : ''}</p>
          {profile.city && (
            <p className="text-white/70 text-xs flex items-center gap-1">
              <MapPin size={10} /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="space-y-1.5 mb-4">
          {profile.education && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <BookOpen size={12} style={{ color: 'var(--rose-gold)' }} />
              <span className="capitalize">{profile.education.replace('_', ' ')}</span>
            </div>
          )}
          {profile.occupation && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Briefcase size={12} style={{ color: 'var(--rose-gold)' }} />
              {profile.occupation}
            </div>
          )}
          {profile.religion && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span style={{ color: 'var(--rose-gold)' }}>☾</span>
              <span className="capitalize">{profile.religion.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-4">{profile.bio}</p>
        )}

        {/* Account type tag */}
        {profile.accountType === 'parent' && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mb-3">
            👨‍👩‍👧 Parent Managed
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onView} className="btn-secondary flex-1 py-2 text-sm">View Profile</button>
          <button onClick={onMatch} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
            <Heart size={13} fill="white" /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}
