/**
 * Firebase client-side initialization.
 *
 * This module is safe to import from any client component. The Web API
 * config values are public by design — security is enforced server-side
 * via Firestore Security Rules.
 *
 * Singleton pattern: getApps() check prevents re-initialization in Next.js
 * hot-reload during development.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function createFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase config missing. Copy .env.example to .env.local and fill in your Firebase project values.'
    );
  }
  return initializeApp(firebaseConfig);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  if (!_app) _app = createFirebaseApp();
  return _app;
}

export function firebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(firebaseApp());
    maybeConnectEmulators();
  }
  return _auth;
}

export function firestore(): Firestore {
  if (!_db) {
    _db = getFirestore(firebaseApp());
    maybeConnectEmulators();
  }
  return _db;
}

export function firebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(firebaseApp());
    maybeConnectEmulators();
  }
  return _storage;
}

function maybeConnectEmulators() {
  if (_emulatorsConnected) return;
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'true') return;

  try {
    if (_auth) connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    if (_db) connectFirestoreEmulator(_db, '127.0.0.1', 8080);
    if (_storage) connectStorageEmulator(_storage, '127.0.0.1', 9199);
    _emulatorsConnected = true;
    // eslint-disable-next-line no-console
    console.info('[firebase] connected to local emulators');
  } catch (err) {
    // emulators not running — ignore
  }
}
