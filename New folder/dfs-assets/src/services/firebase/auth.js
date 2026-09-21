// src/services/firebase/auth.js
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
// signOut is imported above — used in login() to clean up orphaned Auth sessions
import { auth, db } from './config'

/** Sign in with email + password */
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const uid  = cred.user.uid
  const snap = await getDoc(doc(db, 'users', uid))

  if (!snap.exists()) {
    // Profile missing — guide user to /setup
    await signOut(auth)
    throw new Error(
      'No user profile found. If this is your first time, please visit /setup to create your admin account.'
    )
  }

  return { uid, ...snap.data() }
}

/** Sign out current user */
export function logout() {
  return signOut(auth)
}

/** Create a new user account (Admin only) */
export async function createUser({ email, password, name, employeeNumber, department, role }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    employeeNumber,
    department,
    role,          // 'admin' | 'staff' | 'viewer'
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  })
  return cred.user.uid
}

/** Fetch the current user's Firestore profile */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { uid, ...snap.data() } : null
}

/** Send password reset email */
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}
