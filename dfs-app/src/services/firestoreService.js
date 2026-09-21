// src/services/firestoreService.js
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, setDoc, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ensure `order` is always stored as a real number, never a string */
const normalise = (data) => ({
  ...data,
  ...(data.order !== undefined ? { order: Number(data.order) || 0 } : {}),
});

export const getCollection = async (collectionName, orderField = 'order') => {
  try {
    const q    = query(collection(db, collectionName), orderBy(orderField, 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, collectionName));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => Number(a[orderField] ?? 9999) - Number(b[orderField] ?? 9999));
    return docs;
  }
};

export const getDocument = async (collectionName, docId) => {
  const snap = await getDoc(doc(db, collectionName, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addDocument = async (collectionName, data) => {
  const ref = await addDoc(collection(db, collectionName), {
    ...normalise(data),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
};

export const updateDocument = async (collectionName, docId, data) => {
  await updateDoc(doc(db, collectionName, docId), {
    ...normalise(data),
    updatedAt: new Date(),
  });
};

export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};

export const overwriteDocument = async (collectionName, docId, data) => {
  // Full overwrite — NO merge. Deleted array items are actually removed.
  await setDoc(
    doc(db, collectionName, docId),
    { ...data, updatedAt: new Date() }
  );
};

export const setDocument = async (collectionName, docId, data) => {
  await setDoc(
    doc(db, collectionName, docId),
    { ...data, updatedAt: new Date() },
    { merge: true }
  );
};

export const subscribeToCollection = (collectionName, callback, orderField = 'order') => {
  try {
    const q = query(collection(db, collectionName), orderBy(orderField, 'asc'));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => Number(a[orderField] ?? 9999) - Number(b[orderField] ?? 9999));
      callback(docs);
    });
  } catch {
    return onSnapshot(collection(db, collectionName), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => Number(a[orderField] ?? 9999) - Number(b[orderField] ?? 9999));
      callback(docs);
    });
  }
};

// ── Domain helpers ────────────────────────────────────────────────────────────

export const getCompanyOverview    = ()       => getDocument('company',  'overview');
export const updateCompanyOverview = (data)   => setDocument('company',  'overview', data);

export const getContactSettings    = ()       => getDocument('settings', 'contact');
export const updateContactSettings = (data)   => setDocument('settings', 'contact', data);

export const getBrandSettings      = ()       => getDocument('settings', 'brand');
export const updateBrandSettings   = (data)   => setDocument('settings', 'brand', data);

// Leadership — always coerce order to number on write
export const getLeadership  = ()         => getCollection('leadership', 'order');
export const addLeader      = (data)     => addDocument('leadership',   normalise(data));
export const updateLeader   = (id, data) => updateDocument('leadership', id, normalise(data));
export const deleteLeader   = (id)       => deleteDocument('leadership', id);

export const getFactories   = ()         => getCollection('factories', 'order');
export const addFactory     = (data)     => addDocument('factories',   normalise(data));
export const updateFactory  = (id, data) => updateDocument('factories', id, normalise(data));
export const deleteFactory  = (id)       => deleteDocument('factories', id);

export const getProducts    = ()         => getCollection('products', 'order');
export const addProduct     = (data)     => addDocument('products',   normalise(data));
export const updateProduct  = (id, data) => updateDocument('products', id, normalise(data));
export const deleteProduct  = (id)       => deleteDocument('products', id);

export const getServices    = ()         => getCollection('services', 'order');
export const addService     = (data)     => addDocument('services',   normalise(data));
export const updateService  = (id, data) => updateDocument('services', id, normalise(data));
export const deleteService  = (id)       => deleteDocument('services', id);

// Inquiries
export const saveInquiry    = (data)     => addDocument('inquiries', data);
export const markInquiryRead= (id)       => updateDocument('inquiries', id, { read: true });
export const deleteInquiry  = (id)       => deleteDocument('inquiries', id);
