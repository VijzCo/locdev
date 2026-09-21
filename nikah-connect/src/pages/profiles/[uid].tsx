import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { MapPin, BookOpen, Briefcase, Heart, Check, User, ArrowLeft, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicProfilePage() {
  const router = useRouter();
  const { uid } = router.query;
  const { user, userProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', uid as string));
      if (docSnap.exists()) setProfile(docSnap.data());
      setLoading(false);
    };
    fetchProfile();
  }, [uid]);

  useEffect(() => {
    if (!user || !uid) return;
    const checkMatch = async () => {
      const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
      const snap = await getDocs(q);
      const match = snap.docs.find(d => d.data().users.includes(uid));
      if (match) setMatchStatus(match.data().status);
    };
    checkMatch();
  }, [user, uid]);

  const sendMatchRequest = async () => {
    if (!user || !uid) return;
    try {
      await addDoc(collection(db, 'matches'), {
        users: [user.uid, uid],
        initiatorId: user.uid,
        receiverId: uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        userId: uid,
        type: 'match_request',
        fromUserId: user.uid,
        message: `${userProfile?.name} sent you a match request`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      setMatchStatus('pending');
      toast.success('Match request sent! 💌');
    } catch {
      toast.error('Failed to send request');
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--rose-gold)', borderTopColor: 'transparent' }} />
      </div>
    </Layout>
  );

  if (!profile) return (
    <Layout>
      <div className="text-center py-20">
        <p className="font-display text-xl" style={{ color: 'var(--charcoal)' }}>Profile not found</p>
      </div>
    </Layout>
  );

  const isOwnProfile = user?.uid === profile.uid;

  return (
    <Layout>
      <div className="max-w-2xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-rose-gold transition-colors mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile header */}
        <div className="card overflow-hidden mb-6">
          <div className="h-32" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.15), rgba(74,158,74,0.1))' }} />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} className="w-24 h-24 rounded-full object-cover" style={{ border: '4px solid white', boxShadow: '0 4px 16px rgba(15,15,10,0.1)' }} />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)', border: '4px solid white' }}>
                    <User size={36} style={{ color: 'rgba(46,46,36,0.3)' }} />
                  </div>
                )}
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                    <Check size={12} color="white" />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  {!matchStatus && (
                    <button onClick={sendMatchRequest} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
                      <Heart size={14} fill="white" /> Send Request
                    </button>
                  )}
                  {matchStatus === 'pending' && (
                    <span className="text-sm text-gray-400 bg-gray-100 px-4 py-2 rounded-full">Request Sent</span>
                  )}
                  {matchStatus === 'accepted' && (
                    <button onClick={() => router.push('/messages')} className="btn-sage text-sm py-2 px-4">💬 Message</button>
                  )}
                </div>
              )}
            </div>

            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>
              {profile.name}{profile.age ? `, ${profile.age}` : ''}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {profile.city && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <MapPin size={12} /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
                </span>
              )}
              {profile.profileStatus && (
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(200,149,108,0.1)', color: 'var(--rose-gold)' }}>
                  {profile.profileStatus.replace(/_/g, ' ')}
                </span>
              )}
              {profile.accountType === 'parent' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">👨‍👩‍👧 Parent Managed</span>
              )}
            </div>

            {profile.bio && <p className="text-sm text-gray-600 mt-4 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>

        {/* Details */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>About</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Education', value: profile.education?.replace('_', ' '), icon: BookOpen },
              { label: 'Occupation', value: profile.occupation, icon: Briefcase },
              { label: 'Religion', value: profile.religion?.replace('_', ' '), icon: null },
              { label: 'Marital Status', value: profile.maritalStatus, icon: Heart },
              { label: 'Height', value: profile.heightCm ? `${profile.heightCm} cm` : null, icon: null },
              { label: 'Nationality', value: profile.nationality, icon: null },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: 'rgba(46,46,36,0.02)' }}>
                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                <p className="text-sm font-medium capitalize" style={{ color: 'var(--charcoal)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <div className="card p-6 mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i: string) => (
                <span key={i} className="text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(200,149,108,0.08)', color: 'var(--rose-gold)', border: '1px solid rgba(200,149,108,0.2)' }}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {!isOwnProfile && (
          <button className="text-sm text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Flag size={13} /> Report this profile
          </button>
        )}
      </div>
    </Layout>
  );
}
