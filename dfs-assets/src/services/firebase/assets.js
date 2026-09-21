// src/services/firebase/assets.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'
import { generateAssetId } from '@/utils/idGenerator'
import { canSeeAll, canWrite, canDelete } from '@/utils/accessControl'

const COL = 'assets'

/**
 * super_admin + IT staff → all departments (no filter)
 * viewer                 → own department only
 */
export async function fetchAssets(user) {
  const q = canSeeAll(user)
    ? query(collection(db, COL), orderBy('createdAt', 'desc'))
    : query(collection(db, COL),
        where('department', '==', user.department),
        orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function fetchAsset(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createAsset(data, user) {
  if (!canWrite(user)) throw new Error('Permission denied.')
  const assetId = generateAssetId(data.category)
  const payload = {
    ...data,
    assetId,
    status:    'Available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user.uid,
  }
  const ref = await addDoc(collection(db, COL), payload)
  await addLog({ action: 'Asset Created', target: assetId, detail: `${data.name} added to ${data.department}`, user })
  return { id: ref.id, ...payload }
}

export async function updateAsset(id, data, user) {
  if (!canWrite(user)) throw new Error('Permission denied.')
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
  await addLog({ action: 'Asset Updated', target: data.assetId || id, detail: `${data.name || id} updated`, user })
}

/** super_admin ONLY */
export async function deleteAsset(id, assetId, user) {
  if (!canDelete(user)) throw new Error('Only Super Admin can delete assets.')
  await deleteDoc(doc(db, COL, id))
  await addLog({ action: 'Asset Deleted', target: assetId, detail: `Asset ${assetId} permanently removed`, user })
}
