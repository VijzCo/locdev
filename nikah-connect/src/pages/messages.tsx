import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, updateDoc, doc, getDocs, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { Send, Search, User, MoreVertical, Shield, Flag, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user, userProfile } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load accepted matches
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid), where('status', '==', 'accepted'));
    const unsub = onSnapshot(q, async (snap) => {
      const matchList = await Promise.all(snap.docs.map(async d => {
        const data = { id: d.id, ...d.data() } as any;
        const otherUid = data.users.find((u: string) => u !== user.uid);
        try {
          const profDoc = await getDoc(doc(db, 'users', otherUid));
          data.otherProfile = profDoc.exists() ? profDoc.data() : null;
        } catch {}
        return data;
      }));
      setMatches(matchList);
    });
    return unsub;
  }, [user]);

  // Load messages for active match
  useEffect(() => {
    if (!activeMatch || !user) return;
    const q = query(
      collection(db, 'messages'),
      where('matchId', '==', activeMatch.id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeMatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectMatch = async (match: any) => {
    setActiveMatch(match);
    setShowOptions(false);
    const otherUid = match.users.find((u: string) => u !== user?.uid);
    if (otherUid) {
      try {
        const profDoc = await getDoc(doc(db, 'users', otherUid));
        setOtherProfile(profDoc.exists() ? profDoc.data() : null);
      } catch {}
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeMatch || !user) return;
    const text = newMsg.trim();
    setNewMsg('');
    try {
      await addDoc(collection(db, 'messages'), {
        matchId: activeMatch.id,
        senderId: user.uid,
        text,
        status: 'sent',
        createdAt: serverTimestamp(),
      });
      // Update last message on match
      await updateDoc(doc(db, 'matches', activeMatch.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (e) {
      toast.error('Failed to send message');
      setNewMsg(text);
    }
  };

  const handleReport = async () => {
    if (!activeMatch || !user) return;
    const otherUid = activeMatch.users.find((u: string) => u !== user.uid);
    await addDoc(collection(db, 'reports'), {
      reporterId: user.uid,
      reportedId: otherUid,
      reason: 'Reported from messages',
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    toast.success('User reported. Our team will review this.');
    setShowOptions(false);
  };

  const handleBlock = async () => {
    if (!activeMatch) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { status: 'blocked' });
    setActiveMatch(null);
    setOtherProfile(null);
    toast.success('User blocked.');
    setShowOptions(false);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] flex gap-0 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(46,46,36,0.08)', background: 'white', boxShadow: '0 4px 24px rgba(15,15,10,0.06)' }}>
        {/* Sidebar: match list */}
        <div className={`${activeMatch ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-gray-100`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-display font-semibold" style={{ color: 'var(--charcoal)' }}>Messages</h2>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-9 text-sm py-2" placeholder="Search conversations..." />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-3">💌</div>
                <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Match with someone to start chatting</p>
              </div>
            ) : (
              matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => selectMatch(match)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  style={{ borderBottom: '1px solid rgba(46,46,36,0.05)', background: activeMatch?.id === match.id ? 'rgba(200,149,108,0.06)' : undefined }}
                >
                  <div className="relative flex-shrink-0">
                    {match.otherProfile?.profilePhoto ? (
                      <img src={match.otherProfile.profilePhoto} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)' }}>
                        <User size={18} style={{ color: 'var(--rose-gold)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--charcoal)' }}>
                      {match.otherProfile?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{match.lastMessage || 'Start a conversation'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        {activeMatch ? (
          <div className="flex-1 flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button className="md:hidden mr-1" onClick={() => setActiveMatch(null)}>←</button>
              {otherProfile?.profilePhoto ? (
                <img src={otherProfile.profilePhoto} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,149,108,0.1)' }}>
                  <User size={18} style={{ color: 'var(--rose-gold)' }} />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'var(--charcoal)' }}>{otherProfile?.name || 'Chat'}</p>
                <p className="text-xs text-gray-400">{otherProfile?.city || ''}</p>
              </div>
              <div className="relative">
                <button onClick={() => setShowOptions(!showOptions)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical size={16} style={{ color: '#6E6E62' }} />
                </button>
                {showOptions && (
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 w-40">
                    <button onClick={handleReport} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                      <Flag size={13} /> Report User
                    </button>
                    <button onClick={handleBlock} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <Shield size={13} /> Block User
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="text-center mt-8">
                  <div className="text-3xl mb-2">🌙</div>
                  <p className="text-sm text-gray-400">Say Assalamu Alaikum!</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={msg.senderId === user?.uid ? 'bubble-sent' : 'bubble-received'}>
                    <p className="text-sm">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-60">
                        {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
                      </span>
                      {msg.senderId === user?.uid && (
                        msg.status === 'read'
                          ? <CheckCheck size={12} className="opacity-70" />
                          : <Check size={12} className="opacity-50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2 items-end">
                <input
                  className="input-field flex-1 text-sm"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #C8956C, #A0714E)' }}
                >
                  <Send size={15} color="white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3">
            <div className="text-4xl">💬</div>
            <p className="font-display text-lg" style={{ color: 'var(--charcoal)' }}>Select a conversation</p>
            <p className="text-sm text-gray-400">Choose a match to start chatting</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
