'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppUser } from '@/types/models';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      // Firebase not configured yet — common during first-run setup.
      setLoading(false);
      setConfigured(false);
      return;
    }
    setConfigured(true);

    let unsub: (() => void) | undefined;
    (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      const { getFirebaseAuth, getDb } = await import('@/lib/firebase');

      unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
        setFirebaseUser(user);
        if (user) {
          try {
            const snap = await getDoc(doc(getDb(), 'users', user.uid));
            setAppUser(snap.exists() ? ({ id: snap.id, ...snap.data() } as AppUser) : null);
          } catch (e) {
            console.error('Failed to load app user', e);
            setAppUser(null);
          }
        } else {
          setAppUser(null);
        }
        setLoading(false);
      });
    })();

    return () => unsub?.();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, configured }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
