import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { Edit, MapPin, BookOpen, Briefcase, Heart, Check, User, Moon } from 'lucide-react';
import Link from 'next/link';

export default function MyProfilePage() {
  const { userProfile } = useAuth();

  if (!userProfile) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--rose-gold)', borderTopColor: 'transparent' }} />
      </div>
    </Layout>
  );

  const completionColor = userProfile.profileComplete >= 80 ? '#4A9E4A' : userProfile.profileComplete >= 50 ? '#C8956C' : '#E57373';

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        {/* Header card */}
        <div className="card overflow-hidden">
          {/* Banner */}
          <div className="h-28 pattern-bg" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.15), rgba(74,158,74,0.1))' }} />
          
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                {userProfile.profilePhoto ? (
                  <img src={userProfile.profilePhoto} className="w-20 h-20 rounded-full object-cover" style={{ border: '3px solid white', boxShadow: '0 2px 12px rgba(15,15,10,0.1)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,149,108,0.15), rgba(74,158,74,0.1))', border: '3px solid white' }}>
                    <User size={30} style={{ color: 'rgba(46,46,36,0.3)' }} />
                  </div>
                )}
                {userProfile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                    <Check size={10} color="white" />
                  </div>
                )}
              </div>
              <Link href="/profile/edit">
                <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                  <Edit size={13} /> Edit Profile
                </button>
              </Link>
            </div>

            {/* Name & status */}
            <div className="mb-4">
              <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>
                {userProfile.name}{userProfile.age ? `, ${userProfile.age}` : ''}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {userProfile.city && (
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <MapPin size={12} /> {userProfile.city}{userProfile.country ? `, ${userProfile.country}` : ''}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{
                  background: 'rgba(200,149,108,0.1)',
                  color: 'var(--rose-gold)',
                }}>
                  {userProfile.profileStatus?.replace('_', ' ')}
                </span>
                {userProfile.accountType === 'parent' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">👨‍👩‍👧 Parent Account</span>
                )}
              </div>
            </div>

            {/* Profile completion */}
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(46,46,36,0.03)', border: '1px solid rgba(46,46,36,0.06)' }}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium" style={{ color: 'var(--charcoal)' }}>Profile Strength</span>
                <span style={{ color: completionColor, fontWeight: 600 }}>{userProfile.profileComplete}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${userProfile.profileComplete}%`, background: completionColor }} />
              </div>
              {userProfile.profileComplete < 80 && (
                <p className="text-xs text-gray-400 mt-2">Complete your profile to get more visibility</p>
              )}
            </div>

            {/* Bio */}
            {userProfile.bio && (
              <p className="text-sm text-gray-600 leading-relaxed">{userProfile.bio}</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Profile Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, label: 'Education', value: userProfile.education?.replace('_', ' '), color: 'var(--rose-gold)' },
              { icon: Briefcase, label: 'Occupation', value: userProfile.occupation, color: 'var(--rose-gold)' },
              { icon: Moon, label: 'Religion', value: userProfile.religion?.replace('_', ' '), color: '#4A9E4A' },
              { icon: Heart, label: 'Marital Status', value: userProfile.maritalStatus, color: '#4A9E4A' },
            ].map(({ icon: Icon, label, value, color }) => value ? (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(46,46,36,0.02)' }}>
                <Icon size={16} style={{ color, marginTop: 2 }} />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--charcoal)' }}>{value}</p>
                </div>
              </div>
            ) : null)}
          </div>
        </div>

        {/* Interests */}
        {userProfile.interests && userProfile.interests.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Interests</h3>
            <div className="flex flex-wrap gap-2">
              {userProfile.interests.map(interest => (
                <span key={interest} className="text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(200,149,108,0.08)', color: 'var(--rose-gold)', border: '1px solid rgba(200,149,108,0.2)' }}>
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {userProfile.languages && userProfile.languages.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Languages</h3>
            <div className="flex flex-wrap gap-2">
              {userProfile.languages.map(lang => (
                <span key={lang} className="text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(74,158,74,0.08)', color: '#2E7D32', border: '1px solid rgba(74,158,74,0.2)' }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/settings">
            <div className="card p-4 cursor-pointer text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>Privacy Settings</p>
              <p className="text-xs text-gray-400 mt-1">Control visibility</p>
            </div>
          </Link>
          <Link href="/profile/edit">
            <div className="card p-4 cursor-pointer text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>Complete Profile</p>
              <p className="text-xs text-gray-400 mt-1">Add more details</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
