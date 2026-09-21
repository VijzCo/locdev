import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { registerSchema } from '@/lib/validators';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';
import { PLAN_LIMITS } from '@/config/plans';
import { permissionsForRole } from '@/lib/utils/rbac';
import { COLLECTIONS } from '@/lib/firebase/collections';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 *
 * Atomically:
 *   1. Validates input
 *   2. Creates a Firebase Auth user
 *   3. Creates the tenant document (free plan, 14-day trial)
 *   4. Creates the user document linked to the tenant
 *   5. Sets custom claims (tenantId, role) on the Firebase user
 *
 * If any step fails, the Auth user is rolled back.
 */
export async function POST(req: Request) {
  let createdUid: string | null = null;
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, displayName, companyName, country } = parsed.data;

    const auth = adminAuth();
    const db = adminFirestore();

    // 1. Create the Firebase Auth user
    const fbUser = await auth.createUser({ email, password, displayName });
    createdUid = fbUser.uid;

    // 2. Create tenant doc
    const tenantRef = db.collection(COLLECTIONS.tenants).doc();
    const tenantId = tenantRef.id;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    await tenantRef.set({
      name: companyName,
      slug,
      ownerId: fbUser.uid,
      country,
      currency: country === 'LK' ? 'LKR' : country === 'IN' ? 'INR' : 'USD',
      defaultLanguage: 'en',
      subscription: {
        plan: 'free',
        status: 'trialing',
        trialEndsAt: trialEnd,
        limits: PLAN_LIMITS.free,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 3. Create the user doc (factory_admin = founder)
    const userRef = db.collection(COLLECTIONS.users).doc(fbUser.uid);
    await userRef.set({
      email,
      displayName,
      tenantId,
      role: 'factory_admin',
      factoryAccess: [], // empty = all factories in tenant
      permissions: permissionsForRole('factory_admin'),
      status: 'active',
      language: 'en',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4. Set custom claims — used by Storage rules and middleware
    await auth.setCustomUserClaims(fbUser.uid, {
      tenantId,
      role: 'factory_admin',
    });

    return NextResponse.json({ uid: fbUser.uid, tenantId }, { status: 201 });
  } catch (err) {
    // Roll back the Auth user if anything after creation failed
    if (createdUid) {
      try {
        await adminAuth().deleteUser(createdUid);
      } catch {
        /* swallow rollback errors */
      }
    }
    // eslint-disable-next-line no-console
    console.error('[register] failed', err);
    const msg = err instanceof Error ? err.message : 'Registration failed';
    if (msg.includes('email-already-exists')) {
      return NextResponse.json({ error: 'That email is already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
