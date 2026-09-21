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
    await signOut(auth)
    throw new Error(
      'No user profile found. If this is your first time, please visit /setup to create your Super Admin account.'
    )
  }

  return { uid, ...snap.data() }
}

/** Sign out current user */
export function logout() {
  return signOut(auth)
}

/**
 * Create a new user account.
 * Only super_admin can call this. Cannot create another super_admin via UI.
 */
export async function createUser({ email, password, name, employeeNumber, department, role }) {
  // Guard: never allow creating super_admin via this function
  const safeRole = role === 'super_admin' ? 'staff' : role
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    employeeNumber,
    department,
    role: safeRole,   // 'staff' | 'viewer'
    createdAt:   serverTimestamp(),
    lastActive:  serverTimestamp(),
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
