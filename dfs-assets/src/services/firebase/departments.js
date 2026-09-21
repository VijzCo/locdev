// src/services/firebase/departments.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'

const COL = 'departments'

export async function fetchDepartments() {
  const snap = await getDocs(query(collection(db, COL), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createDepartment({ name, description }, user) {
  const payload = {
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  }
  const ref = await addDoc(collection(db, COL), payload)
  await addLog({ action: 'Dept Created', target: name, detail: `Department "${name}" added`, user })
  return { id: ref.id, ...payload }
}

export async function updateDepartment(id, { name, description }, user) {
  await updateDoc(doc(db, COL, id), {
    name: name.trim(),
    description: description?.trim() || '',
    updatedAt: serverTimestamp(),
  })
  await addLog({ action: 'Dept Updated', target: name, detail: `Department "${name}" updated`, user })
}

export async function deleteDepartment(id, name, user) {
  if (user.role !== 'admin') throw new Error('Permission denied.')
  await deleteDoc(doc(db, COL, id))
  await addLog({ action: 'Dept Deleted', target: name, detail: `Department "${name}" removed`, user })
}
