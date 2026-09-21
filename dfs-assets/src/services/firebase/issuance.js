// src/services/firebase/issuance.js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import { updateAsset } from './assets'
import { addLog } from './logs'
import { canSeeAll, canIssue } from '@/utils/accessControl'

const COL = 'issuance'

/**
 * super_admin + IT staff → all issuances
 * viewer                 → own department only
 */
export async function fetchIssuances(user) {
  const q = canSeeAll(user)
    ? query(collection(db, COL), orderBy('createdAt', 'desc'))
    : query(collection(db, COL),
        where('recipientDept', '==', user.department),
        orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Issue an asset — super_admin and IT staff only */
export async function issueAsset(data, user) {
  if (!canIssue(user)) throw new Error('Only Super Admin and IT Staff can issue assets.')
  const {
    assetDocId, assetId, assetName,
    recipientName, recipientEmpNo, recipientEmail,
    recipientDept, issuedDate, checklist,
  } = data

  const payload = {
    assetDocId, assetId, assetName,
    recipientName, recipientEmpNo, recipientEmail,
    recipientDept, issuedDate, checklist,
    status:        'Active',
    issuedBy:      user.uid,
    issuedByName:  user.name,
    createdAt:     serverTimestamp(),
  }
  const ref = await addDoc(collection(db, COL), payload)
  await updateAsset(assetDocId, { status: 'Issued', assetId, name: assetName }, user)
  await addLog({
    action: 'Asset Issued',
    target: assetId,
    detail: `Issued to ${recipientName} — ${recipientDept}`,
    user,
  })
  return { id: ref.id, ...payload }
}

/** Return an asset */
export async function returnAsset(issuanceDocId, assetDocId, assetId, assetName, user) {
  if (!canIssue(user)) throw new Error('Only Super Admin and IT Staff can return assets.')
  await updateDoc(doc(db, COL, issuanceDocId), {
    status:     'Returned',
    returnedAt: serverTimestamp(),
  })
  await updateAsset(assetDocId, { status: 'Available', assetId, name: assetName }, user)
  await addLog({ action: 'Asset Returned', target: assetId, detail: `${assetName} returned`, user })
}
