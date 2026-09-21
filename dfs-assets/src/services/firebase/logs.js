// src/services/firebase/logs.js
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

const COL = 'logs'

/** Add an audit log entry */
export async function addLog({ action, target, detail, user }) {
  await addDoc(collection(db, COL), {
    action, target, detail,
    userId: user?.uid || 'system',
    userName: user?.name || 'System',
    userDept: user?.department || '—',
    createdAt: serverTimestamp(),
  })
}

/** Fetch recent audit logs */
export async function fetchLogs(limitCount = 200) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(limitCount))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
