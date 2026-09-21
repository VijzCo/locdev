// src/services/firebase/issuance.js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import { updateAsset } from './assets'
import { addLog } from './logs'

const COL = 'issuance'

/** Fetch all active issuances */
export async function fetchIssuances(user) {
  const q = user.role === 'admin'
    ? query(collection(db, COL), orderBy('issuedDate', 'desc'))
    : query(collection(db, COL), where('recipientDept', '==', user.department), orderBy('issuedDate', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Issue an asset to an employee */
export async function issueAsset(
  { assetDocId, assetId, assetName, recipientName, recipientEmpNo, recipientEmail, recipientDept, issuedDate, checklist },
  user
) {
  const payload = {
    assetDocId, assetId, assetName,
    recipientName, recipientEmpNo, recipientEmail, recipientDept,
    issuedDate, checklist,
    status: 'Active',
    issuedBy: user.uid,
    issuedByName: user.name,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, COL), payload)
  // Update asset status to Issued
  await updateAsset(assetDocId, { status: 'Issued', assetId, name: assetName }, user)
  await addLog({ action: 'Asset Issued', target: assetId, detail: `Issued to ${recipientName} (${recipientDept})`, user })
  return { id: ref.id, ...payload }
}

/** Return an asset */
export async function returnAsset(issuanceDocId, assetDocId, assetId, assetName, user) {
  await updateDoc(doc(db, COL, issuanceDocId), { status: 'Returned', returnedAt: serverTimestamp() })
  await updateAsset(assetDocId, { status: 'Available', assetId, name: assetName }, user)
  await addLog({ action: 'Asset Returned', target: assetId, detail: `${assetName} returned`, user })
}
