// src/services/firebase/users.js
import { collection, doc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'

const COL = 'users'

export async function fetchUsers() {
  const snap = await getDocs(query(collection(db, COL), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateUser(uid, data, currentUser) {
  await updateDoc(doc(db, COL, uid), { ...data, updatedAt: serverTimestamp() })
  await addLog({ action: 'User Updated', target: data.employeeNumber || uid, detail: `${data.name} profile updated`, user: currentUser })
}

export async function deleteUser(uid, name, currentUser) {
  if (currentUser.role !== 'admin') throw new Error('Permission denied.')
  await deleteDoc(doc(db, COL, uid))
  await addLog({ action: 'User Deleted', target: uid, detail: `User ${name} removed`, user: currentUser })
}
