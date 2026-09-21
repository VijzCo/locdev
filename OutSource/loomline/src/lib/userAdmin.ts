import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig, isFirebaseConfigured } from '@/lib/firebase';
import type { AppUser, Role, ScanAccess, UserScope } from '@/types/domain';
import { buildLoginEmail, normaliseUsername, validateUsername } from '@/lib/loginId';
import { readUsage } from '@/lib/tenantUsage';

export interface CreateUserInput {
  /** What the person types to sign in. Unique across all customers. */
  username: string;
  password: string;
  displayName: string;
  tenantId: string;
  role: Role;
  scope: UserScope;
  scanAccess: ScanAccess;
  /** Optional real address, used only for password resets. */
  recoveryEmail?: string;
}

/**
 * Creates an account without a backend, using the secondary-app method
 * described in Part F2.
 *
 * A second Firebase App instance is initialised, the account is created on
 * *its* auth object, and the instance is then destroyed. The administrator's
 * own session lives on the default app and is never touched.
 *
 * Known limits of doing this from the client, all documented in Part F2:
 *   - accounts cannot be hard-deleted or disabled (we use a `disabled` flag
 *     that the rules treat as a global deny)
 *   - passwords cannot be changed by an administrator afterwards, only
 *     reset by email
 * Lifting either of these needs one Cloud Function.
 */
export async function createUserAccount(input: CreateUserInput): Promise<AppUser> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Connect a Firebase project before creating accounts.');
  }

  const problem = validateUsername(input.username);
  if (problem) throw new Error(problem);

  const username = normaliseUsername(input.username);
  const loginEmail = buildLoginEmail(username);

  const worker = initializeApp(firebaseConfig, `admin-worker-${Date.now()}`);
  const workerAuth = getAuth(worker);

  try {
    const cred = await createUserWithEmailAndPassword(workerAuth, loginEmail, input.password);

    const profile: AppUser = {
      uid: cred.user.uid,
      tenantId: input.tenantId,
      displayName: input.displayName.trim(),
      username,
      email: loginEmail,
      recoveryEmail: input.recoveryEmail?.trim() ?? '',
      role: input.role,
      disabled: false,
      scope: input.scope,
      scanAccess: input.scanAccess,
      capabilities: [],
      // The administrator has seen this password, so it is temporary by
      // definition.
      mustChangePassword: true,
    };

    // Written by the administrator, who has permission — not by the new
    // account, which has none until this document exists.
    //
    // The usage counter moves in the same batch. User accounts are billable,
    // so the rules refuse a create that does not move it, and refuse one
    // that would push the count past the licence.
    // Absolute, not increment: rules cannot see the result of a transform,
    // so a rule that checks the resulting count would always refuse.
    const usage = await readUsage(input.tenantId);

    const { uid, ...rest } = profile;
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), rest);
    batch.set(
      doc(db, 'tenantUsage', input.tenantId),
      { tenantId: input.tenantId, users: (usage?.users ?? 0) + 1 },
      { merge: true },
    );
    await batch.commit();

    await signOut(workerAuth);
    return profile;
  } finally {
    await deleteApp(worker);
  }
}

/** Turns a person's name into a usable username. */
export function suggestUsername(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
  return slug || 'operator';
}
