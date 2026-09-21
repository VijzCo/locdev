// src/services/firebase/inventory.js
import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from './config'
import { addLog } from './logs'
import { canSeeAll } from '@/utils/accessControl'

const COL        = 'inventory'
const STOCK_LOGS = 'stockLogs'
const INV_ISSUE  = 'inventoryIssuances'   // NEW — tracks issued consumables

// ─── Inventory Items ──────────────────────────────────────────────────────────

export async function fetchInventory(user) {
  const q = canSeeAll(user)
    ? query(collection(db, COL), orderBy('name'))
    : query(collection(db, COL), where('department', '==', user.department), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createInventoryItem(data, user) {
  const payload = {
    ...data,
    quantity:  Number(data.quantity)  || 0,
    minStock:  Number(data.minStock)  || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, COL), payload)
  await addLog({ action: 'Item Created', target: data.name, detail: `"${data.name}" added to inventory`, user })
  return { id: ref.id, ...payload }
}

export async function updateInventoryItem(id, data, user) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
  await addLog({ action: 'Item Updated', target: data.name, detail: `"${data.name}" details updated`, user })
}

export async function deleteInventoryItem(id, name, user) {
  if (user.role !== 'admin') throw new Error('Permission denied.')
  const { deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, COL, id))
  await addLog({ action: 'Item Deleted', target: name, detail: `"${name}" removed from inventory`, user })
}

// ─── Stock Movements (Stock In / Stock Out bulk) ──────────────────────────────

export async function recordStockMovement({ itemId, itemName, type, quantity, department, reference }, user) {
  const qty = type === 'in' ? Math.abs(quantity) : -Math.abs(quantity)
  await updateDoc(doc(db, COL, itemId), { quantity: increment(qty), updatedAt: serverTimestamp() })
  await addDoc(collection(db, STOCK_LOGS), {
    itemId, itemName, type, quantity: qty,
    department, reference,
    recordedBy: user.uid,
    recordedByName: user.name,
    createdAt: serverTimestamp(),
  })
  await addLog({
    action: type === 'in' ? 'Stock In' : 'Stock Out',
    target: itemName,
    detail: `${qty > 0 ? '+' : ''}${qty} units · ${reference || '—'}`,
    user,
  })
}

export async function fetchStockLogs() {
  const snap = await getDocs(query(collection(db, STOCK_LOGS), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Inventory Issuances (issue consumables to employees) ────────────────────

/**
 * Issue one or more inventory items to an employee.
 * Deducts from stock automatically.
 */
export async function issueInventoryItems(
  { items, recipientName, recipientEmpNo, recipientEmail, recipientDept, issuedDate, notes },
  user
) {
  // Validate stock for each item first
  for (const { itemId, quantity } of items) {
    const snap = await getDoc(doc(db, COL, itemId))
    if (!snap.exists()) throw new Error(`Item not found: ${itemId}`)
    const current = snap.data().quantity || 0
    if (current < quantity) {
      throw new Error(`Insufficient stock for "${snap.data().name}" (have ${current}, need ${quantity})`)
    }
  }

  // Create issuance record
  const issuanceRef = await addDoc(collection(db, INV_ISSUE), {
    items,                        // [{ itemId, itemName, quantity }]
    recipientName,
    recipientEmpNo,
    recipientEmail,
    recipientDept,
    issuedDate,
    notes: notes || '',
    status: 'Issued',
    issuedBy: user.uid,
    issuedByName: user.name,
    createdAt: serverTimestamp(),
  })

  // Deduct stock and log each item
  for (const { itemId, itemName, quantity } of items) {
    await updateDoc(doc(db, COL, itemId), {
      quantity: increment(-Math.abs(quantity)),
      updatedAt: serverTimestamp(),
    })
    await addDoc(collection(db, STOCK_LOGS), {
      itemId, itemName, type: 'issue', quantity: -Math.abs(quantity),
      department: recipientDept,
      reference: `Issued to ${recipientName} (${recipientEmpNo})`,
      recordedBy: user.uid,
      recordedByName: user.name,
      issuanceId: issuanceRef.id,
      createdAt: serverTimestamp(),
    })
  }

  const itemNames = items.map(i => `${i.itemName} ×${i.quantity}`).join(', ')
  await addLog({
    action: 'Inventory Issued',
    target: recipientName,
    detail: `${itemNames} issued to ${recipientName} (${recipientDept})`,
    user,
  })

  return issuanceRef.id
}

/** Fetch all inventory issuances */
export async function fetchInventoryIssuances(user) {
  const q = canSeeAll(user)
    ? query(collection(db, INV_ISSUE), orderBy('createdAt', 'desc'))
    : query(collection(db, INV_ISSUE), where('recipientDept', '==', user.department), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Update an issuance record's status or notes */
export async function updateInventoryIssuance(id, data, user) {
  await updateDoc(doc(db, INV_ISSUE, id), { ...data, updatedAt: serverTimestamp() })
  await addLog({ action: 'Inventory Updated', target: id, detail: 'Issuance record updated', user })
}
