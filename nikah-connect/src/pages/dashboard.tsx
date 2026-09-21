import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Heart, MessageCircle, Eye, User, ArrowRight, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  matchRequests: number;
  newMessages: number;
  profileViews: number;
  totalMatches: number;
}

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ matchRequests: 0, newMessages: 0, profileViews: 0, totalMatches: 0 });
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && userProfile && userProfile.profileComplete < 50) router.push('/onboarding');
  }, [user, userProfile, loading]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Fetch some recent profiles for suggestions
        const q = query(
          collection(db, 'users'),
          where('isActive', '==', true),
          where('isPaused', '==', false),
          limit(6)
        );
        const snap = await getDocs(q);
        const profiles = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p: any) => p.uid !== user.uid);
        setRecentProfiles(profiles.slice(0, 4));

        // Fetch match stats
        const matchQ = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
        const matchSnap = await getDocs(matchQ);
        const matches = matchSnap.docs.map(d => d.data());
        setStats({
          matchRequests: matches.filter((m: any) => m.status === 'pending' && m.receiverId === user.uid).length,
          newMessages: 0,
          profileViews: Math.floor(Math.random() * 20),
          totalMatches: matches.filter((m: any) => m.status === 'accepted').length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading || !userProfile) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--rose-gold)', borderTopColor: 'transparent' }} />
      </div>
    </Layout>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <p className="text-gray-400 text-sm mb-1">{greeting},</p>
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--charcoal)' }}>
            {userProfile.name || 'Welcome'}
          </h1>
          {userProfile.profileComplete < 80 && (
            <div className="mt-4 p-4 rounded-xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.1), rgba(200,149,108,0.05))', border: '1px solid rgba(200,149,108,0.2)' }}>
              <Star size={20} style={{ color: 'var(--rose-gold)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>Your profile is {userProfile.profileComplete}% complete</p>
                <p className="text-xs text-gray-400">Complete your profile to get more matches</p>
              </div>
              <Link href="/profile/edit">
                <button className="btn-primary text-sm py-2 px-4">Complete Profile</button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Match Requests', value: stats.matchRequests, icon: Heart, color: '#C8956C', bg: 'rgba(200,149,108,0.1)' },
            { label: 'New Messages', value: stats.newMessages, icon: MessageCircle, color: '#4A9E4A', bg: 'rgba(74,158,74,0.1)' },
            { label: 'Profile Views', value: stats.profileViews, icon: Eye, color: '#C8956C', bg: 'rgba(200,149,108,0.1)' },
            { label: 'Total Matches', value: stats.totalMatches, icon: TrendingUp, color: '#4A9E4A', bg: 'rgba(74,158,74,0.1)' },
          ].map((stat, i) => (
            <div key={i} className="card p-5" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold font-display" style={{ color: 'var(--charcoal)' }}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Profiles */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--charcoal)' }}>Suggested Profiles</h2>
            <Link href="/search" className="text-sm flex items-center gap-1 hover:gap-2 transition-all" style={{ color: 'var(--rose-gold)' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="h-48 shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 shimmer rounded w-3/4" />
                    <div className="h-3 shimmer rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProfiles.map((profile: any) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <User size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
              <p className="font-display text-lg mb-2" style={{ color: 'var(--charcoal)' }}>No profiles yet</p>
              <p className="text-sm text-gray-400">Be the first to join! Invite friends to grow the community.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/search">
            <div className="card p-6 cursor-pointer hover:border-rose-gold/30 transition-colors" style={{ borderColor: 'rgba(200,149,108,0.1)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)' }}>
                  <Heart size={18} style={{ color: 'var(--rose-gold)' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Find Matches</h3>
              </div>
              <p className="text-sm text-gray-400">Search profiles by your preferences</p>
            </div>
          </Link>
          <Link href="/profile/edit">
            <div className="card p-6 cursor-pointer hover:border-sage-200 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,158,74,0.1)' }}>
                  <User size={18} style={{ color: '#4A9E4A' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Edit Profile</h3>
              </div>
              <p className="text-sm text-gray-400">Update your details and photos</p>
            </div>
          </Link>
          <Link href="/settings">
            <div className="card p-6 cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)' }}>
                  <Eye size={18} style={{ color: 'var(--rose-gold)' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--charcoal)' }}>Privacy Settings</h3>
              </div>
              <p className="text-sm text-gray-400">Control who sees your profile</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function ProfileCard({ profile }: { profile: any }) {
  const router = useRouter();
  return (
    <div className="profile-card" onClick={() => router.push(`/profiles/${profile.uid}`)}>
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {profile.profilePhoto ? (
          <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.1), rgba(74,158,74,0.1))' }}>
            <User size={40} style={{ color: 'rgba(46,46,36,0.2)' }} />
          </div>
        )}
        {profile.isVerified && (
          <div className="absolute top-2 right-2 badge-verified text-xs px-2 py-0.5">✓ Verified</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white font-semibold text-sm">{profile.name}, {profile.age}</p>
          <p className="text-white/70 text-xs">{profile.city || profile.location}</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-1">
          {profile.education && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{profile.education}</span>}
          {profile.occupation && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{profile.occupation}</span>}
        </div>
      </div>
    </div>
  );
}
