// src/hooks/useFirestore.js
import { useState, useEffect } from 'react';
import { onSnapshot, doc, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * useCollection — real-time collection listener.
 * Sorts client-side by `order` as a NUMBER so "2" never sorts after "10".
 * Falls back to Firestore orderBy if the index exists; if not, fetches all
 * and sorts in JS — works either way without needing composite indexes.
 */
export function useCollection(collectionName, orderField = 'order') {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;

    // Try with Firestore orderBy first; if it fails (missing index) fall back
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderField, 'asc')
      );
      unsub = onSnapshot(
        q,
        snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Always re-sort client-side so numeric strings ("2", "10") sort correctly
          docs.sort((a, b) => {
            const av = Number(a[orderField] ?? 9999);
            const bv = Number(b[orderField] ?? 9999);
            return av - bv;
          });
          setData(docs);
          setLoading(false);
        },
        () => {
          // Index missing or permission error → fall back to unordered fetch
          const fallback = onSnapshot(
            collection(db, collectionName),
            snap2 => {
              const docs = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
              docs.sort((a, b) => {
                const av = Number(a[orderField] ?? 9999);
                const bv = Number(b[orderField] ?? 9999);
                return av - bv;
              });
              setData(docs);
              setLoading(false);
            }
          );
          unsub = fallback;
        }
      );
    } catch {
      // Totally unexpected error — just listen without ordering
      unsub = onSnapshot(
        collection(db, collectionName),
        snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a, b) => Number(a[orderField] ?? 9999) - Number(b[orderField] ?? 9999));
          setData(docs);
          setLoading(false);
        }
      );
    }

    return () => { if (unsub) unsub(); };
  }, [collectionName, orderField]);

  return { data, loading };
}

/**
 * useDocument — real-time single document listener.
 */
export function useDocument(collectionName, docId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;
    const ref  = doc(db, collectionName, docId);
    const unsub = onSnapshot(
      ref,
      snap => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      err => {
        console.error(`[useDocument] ${collectionName}/${docId}:`, err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionName, docId]);

  return { data, loading };
}
