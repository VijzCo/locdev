// src/firebase/db.js
// Thin Firestore data-access helpers used across the app.
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config.js";
import { writeAudit } from "./audit.js";

export async function listAll(col, constraints = []) {
  const snap = await getDocs(query(collection(db, col), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createDoc(col, data) {
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  writeAudit("create", col, ref.id, data);
  return ref.id;
}

export async function upsertDoc(col, id, data) {
  await setDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  writeAudit("save", col, id, data);
  return id;
}

export async function patchDoc(col, id, data) {
  await updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
  writeAudit("update", col, id, data);
}

export async function removeDoc(col, id) {
  await deleteDoc(doc(db, col, id));
  writeAudit("delete", col, id, null);
}

/** Subscribe to a collection (optionally filtered). Returns unsubscribe fn. */
export function watch(col, constraints, cb) {
  const q = query(collection(db, col), ...(constraints || []));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export { where, query, collection, doc };
