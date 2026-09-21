import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Lets the interface be reviewed before a Firebase project exists. When the
 * environment is empty the app runs in demo mode (see AuthProvider) — dev
 * builds only, never production.
 */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export const firebaseConfig = config;

export const app = isFirebaseConfigured ? initializeApp(config) : null;

export const auth = app ? getAuth(app) : null;

/**
 * Offline persistence is switched on here rather than in Increment 7,
 * because the scan screen depends on bundle lookups resolving from cache
 * with no connection. Multi-tab support matters on shared floor terminals
 * where a supervisor may have a dashboard open beside the scan screen.
 */
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;

/*
 * Vendor access is no longer a constant anywhere. It is granted by the
 * presence of a `vendorAdmins/{uid}` document, created once by hand in the
 * Firebase console and managed from the vendor console thereafter — so
 * adding a colleague no longer means editing and redeploying rules.
 */
