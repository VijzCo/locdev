import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy init so we don't crash during SSR/prerendering when env vars are absent.
// Firebase client is only ever used in the browser ("use client" components).
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (_app) return _app;
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase config missing. Did you set NEXT_PUBLIC_FIREBASE_* in .env.local?');
  }
  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getApp());
  return _storage;
}

// Convenience proxies for ergonomics in client components.
// Access them only after the component has mounted (e.g. in useEffect).
export const auth = new Proxy({} as Auth, { get: (_t, p) => Reflect.get(getFirebaseAuth(), p) });
export const db = new Proxy({} as Firestore, { get: (_t, p) => Reflect.get(getDb(), p) });
export const storage = new Proxy({} as FirebaseStorage, { get: (_t, p) => Reflect.get(getFirebaseStorage(), p) });
