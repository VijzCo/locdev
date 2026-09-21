import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Bell, Heart, MessageCircle, Eye, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/router';

const iconMap: Record<string, any> = {
  match_request: { icon: Heart, color: 'var(--rose-gold)', bg: 'rgba(200,149,108,0.1)' },
  match_accepted: { icon: Heart, color: '#4A9E4A', bg: 'rgba(74,158,74,0.1)' },
  new_message: { icon: MessageCircle, color: 'var(--rose-gold)', bg: 'rgba(200,149,108,0.1)' },
  profile_view: { icon: Eye, color: '#6E6E62', bg: 'rgba(110,110,98,0.08)' },
  photo_request: { icon: Eye, color: 'var(--rose-gold)', bg: 'rgba(200,149,108,0.1)' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const markAllRead = async () => {
    await Promise.all(
      notifications.filter(n => !n.isRead).map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--charcoal)' }}>Notifications</h1>
            <p className="text-sm text-gray-400">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: 'var(--rose-gold)' }}>
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="card p-16 text-center">
              <Bell size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--charcoal)' }} />
              <p className="font-display text-lg mb-2" style={{ color: 'var(--charcoal)' }}>No notifications yet</p>
              <p className="text-sm text-gray-400">Activity will appear here.</p>
            </div>
          ) : (
            notifications.map(n => {
              const config = iconMap[n.type] || { icon: Bell, color: '#6E6E62', bg: 'rgba(110,110,98,0.08)' };
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) router.push(n.link); }}
                  className="card p-4 flex items-start gap-4 cursor-pointer transition-all"
                  style={{ opacity: n.isRead ? 0.7 : 1, background: n.isRead ? 'white' : 'rgba(200,149,108,0.03)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.bg }}>
                    <Icon size={17} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--charcoal)', fontWeight: n.isRead ? 400 : 500 }}>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--rose-gold)' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
