import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig, isFirebaseConfigured } from '@/lib/firebase';
import type { AppUser, License } from '@/types/domain';
import { buildLoginEmail, normaliseUsername, validateUsername } from '@/lib/loginId';
import { readUsage } from '@/lib/tenantUsage';

/**
 * Tenant provisioning.
 *
 * A tenant and its first administrator are created together, deliberately.
 *
 * Creating them separately was the original mistake: the tenant was made in
 * the vendor console, then the administrator was made from the ordinary
 * Users screen — which creates users into *the signed-in person's* tenant.
 * The customer's administrator therefore landed inside the vendor tenant
 * with full rights over vendor data, and the new tenant had nobody in it at
 * all. There was no code path that put a user into a named tenant.
 *
 * Now there is exactly one way to create a tenant, and it always ends with
 * an administrator inside it.
 */

export interface ProvisionInput {
  organisation: string;
  contactEmail: string;
  /** The customer's first factory, created with the tenant. */
  factory: {
    name: string;
    code: string;
    timezone: string;
  };
  admin: {
    displayName: string;
    username: string;
    password: string;
    /** Optional real address, used only for password resets. */
    recoveryEmail?: string;
  };
  trialDays: number;
  limits: License['limits'];
}

export interface ProvisionResult {
  tenantId: string;
  adminUid: string;
}

export class ProvisioningError extends Error {}

/** Format check only — the same one Firebase applies, applied earlier. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'An email is required.';
  if (/\s/.test(email)) return 'An email cannot contain spaces.';
  if (!email.includes('@')) return 'An email needs an @ sign, for example a.smith@acme.com';
  if (!EMAIL.test(email)) {
    return 'That is not a valid email. It needs a name, an @ sign and a domain with a dot, for example a.smith@acme.com';
  }
  return null;
}

/**
 * Firebase auth codes are not sentences. These are the ones this flow can
 * realistically produce, turned into something that says what to do.
 */
function readableAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That administrator email is not a valid address. Check for spaces or a missing domain.';
    case 'auth/email-already-in-use':
      return 'That username is already taken. Usernames are shared across all customers, so pick something more specific — "nf.admin" rather than "admin".';
    case 'auth/weak-password':
      return 'That password is too weak. Use at least 8 characters.';
    case 'auth/network-request-failed':
      return 'No connection to Firebase. Creating an account needs a network.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is turned off in the Firebase console. Enable it under Authentication, Sign-in method.';
    case 'auth/admin-restricted-operation':
      return 'Firebase is refusing new sign-ups. Check that email and password sign-in is enabled.';
    default:
      return (err as Error)?.message ?? 'Could not create the account.';
  }
}

const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const msFor = (iso: string) => new Date(iso).getTime();

/**
 * Creates an Auth account without a backend, using a secondary Firebase App
 * instance so the vendor's own session is untouched.
 */
async function createAuthAccount(email: string, password: string): Promise<string> {
  const worker = initializeApp(firebaseConfig, `provision-${Date.now()}`);
  const workerAuth = getAuth(worker);
  try {
    const cred = await createUserWithEmailAndPassword(workerAuth, email.trim(), password);
    await signOut(workerAuth);
    return cred.user.uid;
  } catch (err) {
    throw new ProvisioningError(readableAuthError(err));
  } finally {
    await deleteApp(worker);
  }
}

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  if (!isFirebaseConfigured || !db) {
    throw new ProvisioningError('Connect a Firebase project first.');
  }
  if (!input.organisation.trim()) throw new ProvisioningError('Organisation name is required.');

  if (!input.factory.name.trim()) throw new ProvisioningError('A factory name is required.');
  if (!input.factory.code.trim()) throw new ProvisioningError('A factory code is required.');

  const usernameProblem = validateUsername(input.admin.username);
  if (usernameProblem) throw new ProvisioningError(usernameProblem);

  if (input.admin.recoveryEmail) {
    const problem = validateEmail(input.admin.recoveryEmail);
    if (problem) throw new ProvisioningError(`Recovery email: ${problem}`);
  }

  if (input.admin.password.length < 8) {
    throw new ProvisioningError('Administrator password must be at least 8 characters.');
  }

  const username = normaliseUsername(input.admin.username);
  const loginEmail = buildLoginEmail(username);

  const tenantRef = doc(collection(db, 'tenants'));
  const tenantId = tenantRef.id;

  // The Auth account first: if this fails, no half-built tenant is left
  // behind. Everything after it is one atomic batch.
  const adminUid = await createAuthAccount(loginEmail, input.admin.password);

  const batch = writeBatch(db);

  batch.set(tenantRef, {
    name: input.organisation.trim(),
    contactEmail: input.contactEmail.trim(),
    createdAt: new Date().toISOString(),
    status: 'TRIAL',
  });

  /* The first factory is created with the tenant. A customer signing in to
     an empty system has to build the hierarchy from nothing before any
     screen shows anything, and the factory is the one record everything
     else hangs off. */
  const factoryRef = doc(collection(db, 'factories'));
  batch.set(factoryRef, {
    tenantId,
    name: input.factory.name.trim(),
    code: input.factory.code.trim().toUpperCase(),
    timezone: input.factory.timezone,
    active: true,
  });

  const expiresAt = addDays(input.trialDays);
  const graceUntil = addDays(input.trialDays + 7);

  batch.set(doc(db, 'licenses', tenantId), {
    plan: 'TRIAL',
    status: 'TRIAL',
    billingCycle: null,
    startsAt: new Date().toISOString(),
    expiresAt,
    graceUntil,
    /* Epoch milliseconds for the security rules. An ISO string cannot be
       compared against request.time — that mismatch silently denied every
       customer write. */
    expiresAtMs: msFor(expiresAt),
    graceUntilMs: msFor(graceUntil),
    limits: input.limits,
  });

  // The usage counter must exist before anything is created, because the
  // rules compare against it on every limited write.
  batch.set(doc(db, 'tenantUsage', tenantId), {
    tenantId,
    // The factory created above is counted from the start, or the counter
    // and reality disagree the moment the customer signs in.
    factories: 1,
    modules: 0,
    users: 1,
  });

  const profile: Omit<AppUser, 'uid'> = {
    tenantId,
    displayName: input.admin.displayName.trim(),
    username,
    email: loginEmail,
    recoveryEmail: input.admin.recoveryEmail?.trim() ?? '',
    role: 'SYSTEM_ADMIN',
    disabled: false,
    scope: { factoryIds: [], departmentIds: [], sectionIds: [], moduleIds: [], shiftIds: [] },
    scanAccess: 'BOTH',
    capabilities: [],
    mustChangePassword: true,
  };
  batch.set(doc(db, 'users', adminUid), profile);

  batch.set(doc(collection(db, 'licenseEvents')), {
    tenantId,
    action: 'TENANT_PROVISIONED',
    before: null,
    after: { organisation: input.organisation, trialDays: input.trialDays },
    at: serverTimestamp(),
  });

  /* If the batch fails after the Auth account was created, that account
     exists with no profile document — which means it can read and write
     nothing, but it does hold the email address. The message says so,
     because the retry will otherwise fail with "email already in use" and
     look like a different problem. */
  try {
    await batch.commit();
  } catch (err) {
    throw new ProvisioningError(
      `The organisation could not be saved: ${(err as Error).message}. ` +
        `A sign-in account for ${username} was already created and is now unusable — ` +
        `use a different username on the retry, or delete it under Authentication in the ` +
        `Firebase console.`,
    );
  }

  return { tenantId, adminUid };
}

/**
 * Adds another administrator to an existing tenant. Vendor-only, because
 * putting a user into a tenant you are not part of is a vendor action by
 * definition.
 */
export async function addTenantAdmin(
  tenantId: string,
  admin: { displayName: string; username: string; password: string },
): Promise<string> {
  if (!db) throw new ProvisioningError('Connect a Firebase project first.');
  if (admin.password.length < 8) {
    throw new ProvisioningError('Password must be at least 8 characters.');
  }

  const usernameProblem = validateUsername(admin.username);
  if (usernameProblem) throw new ProvisioningError(usernameProblem);

  const username = normaliseUsername(admin.username);
  const uid = await createAuthAccount(buildLoginEmail(username), admin.password);

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    tenantId,
    displayName: admin.displayName.trim(),
    username,
    email: buildLoginEmail(username),
    role: 'SYSTEM_ADMIN',
    disabled: false,
    scope: { factoryIds: [], departmentIds: [], sectionIds: [], moduleIds: [], shiftIds: [] },
    scanAccess: 'BOTH',
    capabilities: [],
    mustChangePassword: true,
  });
  const usage = await readUsage(tenantId);
  batch.set(
    doc(db, 'tenantUsage', tenantId),
    { tenantId, users: (usage?.users ?? 0) + 1 },
    { merge: true },
  );
  await batch.commit();

  return uid;
}
