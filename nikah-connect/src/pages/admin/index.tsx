import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Users, Flag, BarChart2, Shield, Check, X, Eye } from 'lucide-react';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalMatches: 0, totalReports: 0 });
  const [tab, setTab] = useState<'overview' | 'users' | 'reports'>('overview');

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) router.push('/dashboard');
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
    const fetchData = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const userList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(userList);

      const reportsSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const matchesSnap = await getDocs(collection(db, 'matches'));
      setStats({
        totalUsers: userList.length,
        activeUsers: userList.filter((u: any) => u.isActive).length,
        totalMatches: matchesSnap.size,
        totalReports: reportsSnap.size,
      });
    };
    fetchData();
  }, [userProfile]);

  const resolveReport = async (reportId: string) => {
    await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
    setReports(r => r.map(rep => rep.id === reportId ? { ...rep, status: 'resolved' } : rep));
  };

  const toggleUserActive = async (uid: string, isActive: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isActive: !isActive });
    setUsers(u => u.map(usr => usr.uid === uid ? { ...usr, isActive: !isActive } : usr));
  };

  if (!userProfile?.isAdmin) return null;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'reports', label: 'Reports', icon: Flag },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} style={{ color: 'var(--rose-gold)' }} />
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Admin Panel</h1>
          </div>
          <p className="text-sm text-gray-400">Manage users, reports, and platform health</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(46,46,36,0.06)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className="py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? 'var(--charcoal)' : '#6E6E62',
                boxShadow: tab === t.key ? '0 1px 4px rgba(15,15,10,0.1)' : 'none',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'var(--rose-gold)', bg: 'rgba(200,149,108,0.1)' },
                { label: 'Active Users', value: stats.activeUsers, icon: Users, color: '#4A9E4A', bg: 'rgba(74,158,74,0.1)' },
                { label: 'Total Matches', value: stats.totalMatches, icon: BarChart2, color: 'var(--rose-gold)', bg: 'rgba(200,149,108,0.1)' },
                { label: 'Pending Reports', value: reports.filter(r => r.status === 'pending').length, icon: Flag, color: '#E57373', bg: 'rgba(229,115,115,0.1)' },
              ].map((s, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold font-display" style={{ color: 'var(--charcoal)' }}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                      <s.icon size={18} style={{ color: s.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--charcoal)' }}>Recent Registrations</h3>
              <div className="space-y-3">
                {users.slice(0, 5).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
                      {u.name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{u.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <input className="input-field text-sm" placeholder="Search users..." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider" style={{ background: 'rgba(46,46,36,0.02)' }}>
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Location</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{u.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-xs capitalize text-gray-500">{u.accountType || 'individual'}</td>
                      <td className="p-4 text-xs text-gray-500">{u.city || '-'}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/profiles/${u.uid}`)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View Profile"
                          >
                            <Eye size={14} style={{ color: '#6E6E62' }} />
                          </button>
                          <button
                            onClick={() => toggleUserActive(u.uid, u.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${u.isActive ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                          >
                            {u.isActive
                              ? <X size={14} style={{ color: '#E57373' }} />
                              : <Check size={14} style={{ color: '#4A9E4A' }} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="card p-12 text-center">
                <Flag size={36} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
                <p className="font-display text-lg" style={{ color: 'var(--charcoal)' }}>No reports</p>
              </div>
            ) : (
              reports.map((report: any) => (
                <div key={report.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag size={14} style={{ color: report.status === 'pending' ? '#E57373' : '#4A9E4A' }} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${report.status === 'pending' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{report.reason}</p>
                      {report.details && <p className="text-xs text-gray-400 mt-1">{report.details}</p>}
                      <p className="text-xs text-gray-400 mt-2">
                        Reporter: {report.reporterId.slice(0, 8)}... · Reported: {report.reportedId.slice(0, 8)}...
                      </p>
                    </div>
                    {report.status === 'pending' && (
                      <button onClick={() => resolveReport(report.id)} className="btn-sage text-xs py-1.5 px-3 flex-shrink-0">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
