// src/services/firestoreService.js
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, setDoc, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Generic helpers ──────────────────────────────────────────────────────────

export const getCollection = async (collectionName, orderField = 'order') => {
  try {
    const q = query(collection(db, collectionName), orderBy(orderField, 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    // fallback without ordering
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

export const getDocument = async (collectionName, docId) => {
  const ref = doc(db, collectionName, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addDocument = async (collectionName, data) => {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
};

export const updateDocument = async (collectionName, docId, data) => {
  const ref = doc(db, collectionName, docId);
  await updateDoc(ref, { ...data, updatedAt: new Date() });
};

export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};

export const setDocument = async (collectionName, docId, data) => {
  const ref = doc(db, collectionName, docId);
  await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
};

// ── Real-time subscriptions ──────────────────────────────────────────────────

export const subscribeToCollection = (collectionName, callback, orderField = 'order') => {
  try {
    const q = query(collection(db, collectionName), orderBy(orderField, 'asc'));
    return onSnapshot(q, snapshot => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  } catch {
    return onSnapshot(collection(db, collectionName), snapshot => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
};

// ── Domain-specific ──────────────────────────────────────────────────────────

export const getCompanyOverview = () => getDocument('company', 'overview');
export const updateCompanyOverview = (data) => setDocument('company', 'overview', data);

export const getContactSettings = () => getDocument('settings', 'contact');
export const updateContactSettings = (data) => setDocument('settings', 'contact', data);

export const getLeadership = () => getCollection('leadership', 'order');
export const addLeader = (data) => addDocument('leadership', data);
export const updateLeader = (id, data) => updateDocument('leadership', id, data);
export const deleteLeader = (id) => deleteDocument('leadership', id);

export const getFactories = () => getCollection('factories', 'order');
export const addFactory = (data) => addDocument('factories', data);
export const updateFactory = (id, data) => updateDocument('factories', id, data);
export const deleteFactory = (id) => deleteDocument('factories', id);

export const getProducts = () => getCollection('products', 'order');
export const addProduct = (data) => addDocument('products', data);
export const updateProduct = (id, data) => updateDocument('products', id, data);
export const deleteProduct = (id) => deleteDocument('products', id);

export const getServices = () => getCollection('services', 'order');
export const addService = (data) => addDocument('services', data);
export const updateService = (id, data) => updateDocument('services', id, data);
export const deleteService = (id) => deleteDocument('services', id);
