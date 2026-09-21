import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Repair utilities. Vendor-only.
 *
 * Two problems these exist for, both from the original provisioning fault:
 *
 *  1. Tenants created before usage counting have no counter document. The
 *     rules compare against it on every limited create, so without one every
 *     factory, module and user create is refused.
 *
 *  2. Administrators created through the ordinary Users screen were placed
 *     in the signed-in person's tenant rather than the customer's. Those
 *     accounts sit in the vendor tenant with full rights over vendor data.
 */

interface Counts {
  factories: number;
  modules: number;
  users: number;
}

/**
 * Backfills `expiresAtMs` and `graceUntilMs` on licences written before the
 * rules compared milliseconds.
 *
 * Until a licence has these, the rules fall back to the status check alone —
 * so an expired customer would keep writing. Run this once after upgrading.
 */
export async function backfillLicenceDates(): Promise<string[]> {
  if (!db) throw new Error('Not connected.');

  const snap = await getDocs(collection(db, 'licenses'));
  const report: string[] = [];
  const batch = writeBatch(db);
  let changed = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    if (typeof data.graceUntilMs === 'number' && typeof data.expiresAtMs === 'number') {
      return;
    }
    const expiresAtMs = data.expiresAt ? new Date(data.expiresAt).getTime() : null;
    const graceUntilMs = data.graceUntil ? new Date(data.graceUntil).getTime() : null;
    if (!expiresAtMs || !graceUntilMs) {
      report.push(`${d.id}: no dates to convert — set the plan again from the customer card`);
      return;
    }
    batch.set(d.ref, { expiresAtMs, graceUntilMs }, { merge: true });
    report.push(`${d.id}: dates converted`);
    changed++;
  });

  if (changed > 0) await batch.commit();
  if (report.length === 0) report.push('Every licence already had millisecond dates.');
  return report;
}

export async function rebuildUsage(): Promise<string[]> {
  if (!db) throw new Error('Not connected.');

  const [tenants, factories, modules, users] = await Promise.all([
    getDocs(collection(db, 'tenants')),
    getDocs(collection(db, 'factories')),
    getDocs(collection(db, 'modules')),
    getDocs(collection(db, 'users')),
  ]);

  const counts: Record<string, Counts> = {};
  const ensure = (tenantId: string) =>
    (counts[tenantId] ??= { factories: 0, modules: 0, users: 0 });

  tenants.docs.forEach((d) => ensure(d.id));
  factories.docs.forEach((d) => ensure(d.data().tenantId as string).factories++);
  modules.docs.forEach((d) => ensure(d.data().tenantId as string).modules++);
  users.docs.forEach((d) => ensure(d.data().tenantId as string).users++);

  const batch = writeBatch(db);
  Object.entries(counts).forEach(([tenantId, c]) => {
    batch.set(doc(db!, 'tenantUsage', tenantId), { tenantId, ...c }, { merge: true });
  });
  await batch.commit();

  const report = Object.entries(counts).map(
    ([tenantId, c]) =>
      `${tenantId}: ${c.factories} factories, ${c.modules} modules, ${c.users} users`,
  );

  // Accounts sitting in the vendor tenant. On a correctly provisioned system
  // only the vendor's own account should be there.
  const strays = users.docs.filter((d) => d.data().tenantId === 'vendor');

  if (strays.length > 0) {
    report.push('');
    report.push(
      `${strays.length} account(s) sit in the vendor tenant. Your own belongs there;` +
        ' any others are probably customer administrators created the old way:',
    );
    strays.forEach((d) =>
      report.push(`  ${d.data().email ?? d.id} — ${d.data().displayName ?? 'no name'}`),
    );
    report.push('');
    report.push(
      'Move each to the right tenant with "Move account" below, or disable it and create' +
        ' the administrator again from the customer card.',
    );
  }

  return report;
}

/**
 * Moves an account into a different tenant. Vendor-only, and the only
 * supported way for a user to change tenant — `tenantId` is immutable for
 * every non-vendor role precisely so an administrator cannot do this.
 */
export async function moveAccountToTenant(uid: string, tenantId: string): Promise<void> {
  if (!db) throw new Error('Not connected.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), { tenantId, role: 'SYSTEM_ADMIN' }, { merge: true });
  await batch.commit();
}
