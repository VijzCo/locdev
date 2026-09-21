// src/services/firebase/inventory.js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'

const COL = 'inventory'
const LOGS_COL = 'stockLogs'

/** Fetch inventory items */
export async function fetchInventory(user) {
  const q = user.role === 'admin'
    ? query(collection(db, COL), orderBy('name'))
    : query(collection(db, COL), where('department', '==', user.department), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Create a new inventory item */
export async function createInventoryItem(data, user) {
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  const ref = await addDoc(collection(db, COL), payload)
  await addLog({ action: 'Item Created', target: data.name, detail: `Inventory item "${data.name}" added`, user })
  return { id: ref.id, ...payload }
}

/** Record stock movement (in or out) */
export async function recordStockMovement({ itemId, itemName, type, quantity, department, reference }, user) {
  const qty = type === 'in' ? Math.abs(quantity) : -Math.abs(quantity)
  await updateDoc(doc(db, COL, itemId), {
    quantity: increment(qty),
    updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, LOGS_COL), {
    itemId, itemName, type, quantity: qty,
    department, reference,
    recordedBy: user.uid,
    recordedByName: user.name,
    createdAt: serverTimestamp(),
  })
  await addLog({ action: type === 'in' ? 'Stock In' : 'Stock Out', target: itemName, detail: `${type === 'in' ? '+' : ''}${qty} units · ${reference}`, user })
}

/** Fetch stock movement logs */
export async function fetchStockLogs() {
  const snap = await getDocs(query(collection(db, LOGS_COL), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
