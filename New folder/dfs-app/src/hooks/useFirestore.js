// src/hooks/useFirestore.js
import { useState, useEffect } from 'react';
import { subscribeToCollection, getDocument } from '../services/firestoreService';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useCollection(collectionName, orderField = 'order') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribeToCollection(
      collectionName,
      (docs) => { setData(docs); setLoading(false); },
      orderField
    );
    return unsub;
  }, [collectionName, orderField]);

  return { data, loading, error };
}

export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) return;
    const ref = doc(db, collectionName, docId);
    const unsub = onSnapshot(ref, (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    }, (err) => { setError(err); setLoading(false); });
    return unsub;
  }, [collectionName, docId]);

  return { data, loading, error };
}
