// src/services/firebase/assets.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'
import { generateAssetId } from '@/utils/idGenerator'

const COL = 'assets'

/** Fetch all assets (Admin) or department-filtered (Staff/Viewer) */
export async function fetchAssets(user) {
  let q = user.role === 'admin'
    ? query(collection(db, COL), orderBy('createdAt', 'desc'))
    : query(collection(db, COL), where('department', '==', user.department), orderBy('createdAt', 'desc'))

  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Fetch a single asset by Firestore doc ID */
export async function fetchAsset(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Create a new asset */
export async function createAsset(data, user) {
  const assetId = generateAssetId(data.category)
  const payload = {
    ...data,
    assetId,
    status: 'Available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user.uid,
  }
  const ref = await addDoc(collection(db, COL), payload)
  await addLog({ action: 'Asset Created', target: assetId, detail: `${data.name} added`, user })
  return { id: ref.id, ...payload }
}

/** Update an asset */
export async function updateAsset(id, data, user) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
  await addLog({ action: 'Asset Updated', target: data.assetId || id, detail: `${data.name || id} updated`, user })
}

/** Delete an asset (Admin only) */
export async function deleteAsset(id, assetId, user) {
  if (user.role !== 'admin') throw new Error('Permission denied.')
  await deleteDoc(doc(db, COL, id))
  await addLog({ action: 'Asset Deleted', target: assetId, detail: `Asset ${assetId} removed`, user })
}
