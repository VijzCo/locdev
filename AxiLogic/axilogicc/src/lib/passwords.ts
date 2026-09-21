import { doc, setDoc } from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

/**
 * Passwords.
 *
 * One constraint shapes all of this: without a backend, an administrator
 * cannot *set* another person's password. Firebase only allows the account
 * holder to change their own, or a reset link to be emailed. So the flow is
 * built around what is actually possible:
 *
 *   create   → the administrator generates a temporary password and hands
 *              it over, and the account is flagged to change it
 *   first    → the person signs in with it and must choose their own before
 *   sign-in    they can reach any screen
 *   reset    → an emailed link where the account has an address; otherwise
 *              a new temporary password from the administrator, and the flag
 *              set again
 *
 * The flag lives on the profile, so it survives across devices and cannot be
 * skipped by clearing browser storage.
 */

/** Characters chosen to be readable aloud over a noisy factory floor. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';

/**
 * Generates a temporary password.
 *
 * Uses the platform's cryptographic source, not Math.random, because a
 * predictable temporary password is worth nothing. Characters that look
 * alike — O and 0, I and l and 1 — are left out; an operator is going to be
 * reading this off a slip of paper.
 */
export function generatePassword(length = 12): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('');
}

export interface PasswordStrength {
  ok: boolean;
  problems: string[];
}

/**
 * Minimum standards, checked in the interface. Firebase enforces only a
 * six-character minimum, which is not enough for an account that can see a
 * factory's entire production history.
 */
export function checkPassword(password: string, username?: string): PasswordStrength {
  const problems: string[] = [];

  if (password.length < 10) problems.push('Use at least 10 characters.');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    problems.push('Mix upper and lower case letters.');
  }
  if (!/[0-9]/.test(password)) problems.push('Include at least one number.');
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    problems.push('Do not put your username in your password.');
  }
  if (/^(.)\1+$/.test(password)) problems.push('Do not repeat a single character.');

  const common = ['password', '12345678', 'qwerty', 'letmein', 'admin123', 'welcome'];
  if (common.some((c) => password.toLowerCase().includes(c))) {
    problems.push('That is too easy to guess.');
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Changes the signed-in person's own password.
 *
 * Firebase requires a recent sign-in for this, so the current password is
 * re-checked first. That is also the right behaviour: someone walking past
 * an unattended terminal should not be able to change the password on it.
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!auth?.currentUser?.email) throw new Error('Not signed in.');

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  try {
    await reauthenticateWithCredential(auth.currentUser, credential);
  } catch {
    throw new Error('Your current password is not correct.');
  }

  await updatePassword(auth.currentUser, newPassword);

  // Clear the flag only after the change succeeds.
  if (db) {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { mustChangePassword: false, passwordChangedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}

/**
 * Flags an account so the next sign-in must set a new password.
 *
 * This is what an administrator can actually do. It does not change the
 * password itself — they must also hand over a new temporary one, or send a
 * reset link where the account has an email address.
 */
export async function requirePasswordChange(uid: string): Promise<void> {
  if (!db) throw new Error('Not connected.');
  await setDoc(
    doc(db, 'users', uid),
    { mustChangePassword: true, passwordResetAt: new Date().toISOString() },
    { merge: true },
  );
}

/** Sends a reset link. Only works for accounts with a real email address. */
export async function sendReset(email: string): Promise<void> {
  if (!auth) throw new Error('Not connected.');
  await sendPasswordResetEmail(auth, email);
}
