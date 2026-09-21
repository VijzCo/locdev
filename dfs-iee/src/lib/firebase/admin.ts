/**
 * Firebase Admin SDK initialization for server-side code.
 *
 * Use this in:
 *   - Next.js API routes / Server Actions
 *   - Cloud Functions
 *
 * NEVER import this from client components — it requires private credentials
 * and bypasses Firestore Security Rules.
 */

import {
  initializeApp,
  getApps,
  cert,
  type App as AdminApp,
} from 'firebase-admin/app';
import { getAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';

let _adminApp: AdminApp | null = null;

export function adminApp(): AdminApp {
  if (_adminApp) return _adminApp;
  if (getApps().length) {
    _adminApp = getApps()[0]!;
    return _adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment.'
    );
  }

  _adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  return _adminApp;
}

export function adminAuth(): AdminAuth {
  return getAuth(adminApp());
}

export function adminFirestore(): AdminFirestore {
  return getFirestore(adminApp());
}
