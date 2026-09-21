import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Heart, X, Check, MessageCircle, User } from 'lucide-react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function MatchesPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [tab, setTab] = useState<'requests' | 'matches'>('requests');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const allMatches = await Promise.all(snap.docs.map(async d => {
        const data = { id: d.id, ...d.data() } as any;
        const otherUid = data.users.find((u: string) => u !== user.uid);
        try {
          const profDoc = await getDoc(doc(db, 'users', otherUid));
          data.otherProfile = profDoc.exists() ? profDoc.data() : null;
        } catch {}
        return data;
      }));
      setPending(allMatches.filter(m => m.status === 'pending' && m.receiverId === user.uid));
      setAccepted(allMatches.filter(m => m.status === 'accepted'));
    });
    return unsub;
  }, [user]);

  const acceptMatch = async (matchId: string, fromUid: string) => {
    await updateDoc(doc(db, 'matches', matchId), { status: 'accepted', updatedAt: serverTimestamp() });
    await addDoc(collection(db, 'notifications'), {
      userId: fromUid,
      type: 'match_accepted',
      fromUserId: user?.uid,
      message: `${userProfile?.name || 'Someone'} accepted your match request!`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    toast.success('Match accepted! 🎉 You can now message each other.');
  };

  const rejectMatch = async (matchId: string) => {
    await updateDoc(doc(db, 'matches', matchId), { status: 'rejected', updatedAt: serverTimestamp() });
    toast('Match request declined.');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Matches</h1>
          <p className="text-sm text-gray-400">Manage your match requests and connections</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(46,46,36,0.06)' }}>
          {(['requests', 'matches'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize flex items-center justify-center gap-2"
              style={{
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--charcoal)' : '#6E6E62',
                boxShadow: tab === t ? '0 1px 4px rgba(15,15,10,0.1)' : 'none',
              }}
            >
              {t === 'requests' ? <Heart size={14} /> : <MessageCircle size={14} />}
              {t === 'requests' ? 'Requests' : 'My Matches'}
              {t === 'requests' && pending.length > 0 && (
                <span className="text-xs text-white rounded-full w-5 h-5 flex items-center justify-center" style={{ background: 'var(--rose-gold)' }}>
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pending Requests */}
        {tab === 'requests' && (
          <div>
            {pending.length === 0 ? (
              <div className="card p-16 text-center">
                <Heart size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
                <p className="font-display text-lg mb-2" style={{ color: 'var(--charcoal)' }}>No pending requests</p>
                <p className="text-sm text-gray-400">When someone sends you a match request, it will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map(match => (
                  <MatchRequestCard
                    key={match.id}
                    match={match}
                    onAccept={() => acceptMatch(match.id, match.initiatorId)}
                    onReject={() => rejectMatch(match.id)}
                    onView={() => router.push(`/profiles/${match.otherProfile?.uid}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Accepted Matches */}
        {tab === 'matches' && (
          <div>
            {accepted.length === 0 ? (
              <div className="card p-16 text-center">
                <Heart size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
                <p className="font-display text-lg mb-2" style={{ color: 'var(--charcoal)' }}>No matches yet</p>
                <p className="text-sm text-gray-400">Accept a match request or wait for someone to accept yours.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accepted.map(match => (
                  <AcceptedMatchCard
                    key={match.id}
                    match={match}
                    onMessage={() => router.push('/messages')}
                    onView={() => router.push(`/profiles/${match.otherProfile?.uid}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function MatchRequestCard({ match, onAccept, onReject, onView }: any) {
  const profile = match.otherProfile;
  return (
    <div className="card p-5 flex gap-4">
      <div className="flex-shrink-0 cursor-pointer" onClick={onView}>
        {profile?.profilePhoto ? (
          <img src={profile.profilePhoto} className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid rgba(200,149,108,0.3)' }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)' }}>
            <User size={24} style={{ color: 'var(--rose-gold)' }} />
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold" style={{ color: 'var(--charcoal)' }}>{profile?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-400">{profile?.age ? `${profile.age} years` : ''}{profile?.city ? ` · ${profile.city}` : ''}</p>
          </div>
        </div>
        {profile?.bio && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{profile.bio}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={onReject} className="flex-1 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center gap-1">
            <X size={13} /> Decline
          </button>
          <button onClick={onAccept} className="flex-1 py-2 rounded-xl text-sm text-white flex items-center justify-center gap-1 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #C8956C, #A0714E)' }}>
            <Check size={13} /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}

function AcceptedMatchCard({ match, onMessage, onView }: any) {
  const profile = match.otherProfile;
  return (
    <div className="profile-card" style={{ background: 'white' }}>
      <div className="relative h-40 overflow-hidden cursor-pointer" onClick={onView}>
        {profile?.profilePhoto ? (
          <img src={profile.profilePhoto} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.08), rgba(74,158,74,0.08))' }}>
            <User size={40} style={{ color: 'rgba(46,46,36,0.15)' }} />
          </div>
        )}
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <p className="absolute bottom-2 left-3 text-white font-semibold text-sm">
          {profile?.name}{profile?.age ? `, ${profile.age}` : ''}
        </p>
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-3">{profile?.city || 'Location not set'}</p>
        <div className="flex gap-2">
          <button onClick={onView} className="btn-secondary flex-1 py-2 text-sm">Profile</button>
          <button onClick={onMessage} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1">
            <MessageCircle size={13} /> Chat
          </button>
        </div>
      </div>
    </div>
  );
}
