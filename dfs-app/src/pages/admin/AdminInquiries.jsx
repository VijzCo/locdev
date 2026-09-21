// src/pages/admin/AdminInquiries.jsx
import { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, Search, X, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore';

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString('en-ZA');
}

export default function AdminInquiries() {
  const [inquiries, setInquiries]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all'); // all | unread | read
  const [selected, setSelected]     = useState(null);  // inquiry detail modal

  // Real-time listener
  useEffect(() => {
    const q = query(
      collection(db, 'inquiries'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openInquiry = async (inq) => {
    setSelected(inq);
    if (!inq.read) {
      try {
        await updateDoc(doc(db, 'inquiries', inq.id), { read: true });
      } catch {}
    }
  };

  const markAllRead = async () => {
    const unread = inquiries.filter(i => !i.read);
    if (!unread.length) { toast('All inquiries are already read.'); return; }
    const batch = writeBatch(db);
    unread.forEach(i => batch.update(doc(db, 'inquiries', i.id), { read: true }));
    await batch.commit();
    toast.success(`Marked ${unread.length} as read.`);
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this inquiry permanently?')) return;
    try {
      await deleteDoc(doc(db, 'inquiries', id));
      if (selected?.id === id) setSelected(null);
      toast.success('Inquiry deleted.');
    } catch { toast.error('Delete failed.'); }
  };

  // Filter + search
  const visible = inquiries.filter(i => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unread' && !i.read) ||
      (filter === 'read'   &&  i.read);
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      i.name?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q) ||
      i.subject?.toLowerCase().includes(q) ||
      i.message?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const unreadCount = inquiries.filter(i => !i.read).length;

  const SUBJECT_COLORS = {
    'Product Enquiry':        { bg: '#eff6ff', color: '#1d4ed8' },
    'Request a Quote':        { bg: '#f0fdf4', color: '#15803d' },
    'Factory Visit':          { bg: '#faf5ff', color: '#7e22ce' },
    'Partnership Opportunity':{ bg: '#fff7ed', color: '#c2410c' },
    'General Enquiry':        { bg: '#f8fafc', color: '#475569' },
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Inquiries
            {unreadCount > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: 100, fontSize: 11, fontWeight: 700, padding: '2px 9px', letterSpacing: .5 }}>
                {unreadCount} new
              </span>
            )}
          </h1>
          <p>All contact form submissions from the public website.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-admin-secondary" onClick={markAllRead}>
            <MailOpen size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="admin-content">

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total',    value: inquiries.length,                      color: '#6b7280' },
            { label: 'Unread',   value: unreadCount,                           color: '#dc2626' },
            { label: 'Read',     value: inquiries.length - unreadCount,        color: '#16a34a' },
            { label: 'Quotes',   value: inquiries.filter(i => i.subject === 'Request a Quote').length, color: '#d97706' },
          ].map(({ label, value, color }) => (
            <div key={label} className="admin-stat-card">
              <div className="admin-stat-card__icon" style={{ background: color + '18' }}>
                <Mail size={20} style={{ color }} />
              </div>
              <div>
                <div className="admin-stat-card__val">{value}</div>
                <div className="admin-stat-card__label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="admin-card">
          <div className="admin-card__header">
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['all','unread','read'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                    background: filter === f ? 'var(--navy)' : 'var(--gray-100)',
                    color:      filter === f ? '#fff'        : 'var(--gray-600)',
                    transition: 'all .15s',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'unread' && unreadCount > 0 && (
                    <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 100, fontSize: 10, padding: '1px 6px' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="admin-search">
              <Search size={14} className="admin-search__icon" />
              <input
                className="admin-search__input"
                placeholder="Search name, email, subject…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : visible.length === 0 ? (
            <div className="admin-empty">
              <Mail size={36} style={{ color: 'var(--gray-300)' }} />
              <h3>{search || filter !== 'all' ? 'No matching inquiries' : 'No inquiries yet'}</h3>
              <p>{search || filter !== 'all' ? 'Try clearing your search or filter.' : 'Inquiries submitted via the Contact page will appear here.'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 8 }}></th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(inq => {
                    const subjectStyle = SUBJECT_COLORS[inq.subject] || SUBJECT_COLORS['General Enquiry'];
                    return (
                      <tr
                        key={inq.id}
                        onClick={() => openInquiry(inq)}
                        style={{
                          cursor: 'pointer',
                          background: inq.read ? 'transparent' : '#fffbeb',
                          fontWeight: inq.read ? 400 : 600,
                        }}
                      >
                        {/* Unread dot */}
                        <td style={{ width: 8, padding: '13px 0 13px 16px' }}>
                          {!inq.read && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: inq.read ? 500 : 700, fontSize: 14 }}>{inq.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                            {inq.email}
                            {inq.company && <> · {inq.company}</>}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 100,
                            fontSize: 12, fontWeight: 600,
                            background: subjectStyle.bg, color: subjectStyle.color,
                          }}>
                            {inq.subject || 'General Enquiry'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <span style={{ fontSize: 13, color: 'var(--gray-600)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inq.message}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                          {timeAgo(inq.submittedAt || inq.createdAt?.toDate?.()?.toISOString())}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="table-actions">
                            <a
                              href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject || 'Your Inquiry')}&body=Dear ${encodeURIComponent(inq.name)},%0A%0AThank you for contacting Duty Free Sourcing.%0A%0A`}
                              className="btn-admin-edit"
                              style={{ textDecoration: 'none' }}
                              title="Reply via email"
                            >
                              <ExternalLink size={12} /> Reply
                            </a>
                            <button
                              className="btn-admin-danger"
                              onClick={e => handleDelete(inq.id, e)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Inquiry detail modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3 style={{ marginBottom: 2 }}>{selected.subject || 'Inquiry'}</h3>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {timeAgo(selected.submittedAt || selected.createdAt?.toDate?.()?.toISOString())}
                </p>
              </div>
              <button className="modal__close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <div className="modal__body">
              {/* Sender info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
                {[
                  { label: 'Name',    value: selected.name },
                  { label: 'Company', value: selected.company || '—' },
                  { label: 'Email',   value: selected.email, href: `mailto:${selected.email}` },
                  { label: 'Phone',   value: selected.phone || '—', href: selected.phone ? `tel:${selected.phone}` : null },
                ].map(({ label, value, href }) => (
                  <div key={label}>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 3 }}>
                      {label}
                    </span>
                    {href
                      ? <a href={href} style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>{value}</a>
                      : <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{value}</span>
                    }
                  </div>
                ))}
              </div>

              {/* Message */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 8 }}>
                  Message
                </span>
                <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--gray-800)', background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: 8, padding: 16, whiteSpace: 'pre-wrap' }}>
                  {selected.message}
                </div>
              </div>
            </div>

            <div className="modal__footer">
              <button className="btn-admin-danger" onClick={e => handleDelete(selected.id, e)}>
                <Trash2 size={13} /> Delete
              </button>
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Your Inquiry')}&body=Dear ${encodeURIComponent(selected.name)},%0A%0AThank you for contacting Duty Free Sourcing Inc.%0A%0A`}
                className="btn-admin-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: 'var(--navy)', color: '#fff' }}
              >
                <ExternalLink size={14} /> Reply via Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
