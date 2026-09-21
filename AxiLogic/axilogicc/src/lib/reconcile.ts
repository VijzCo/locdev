import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { chunk } from '@/lib/bundleMath';
import type { ScanEvent } from '@/types/domain';

/**
 * Reconciliation.
 *
 * `scanEvents` is the immutable source of truth; WIP and hourly counters are
 * a fast projection of it maintained by commutative increments. That
 * projection is correct under normal operation, but Part D5 is honest that
 * it can drift — a batch partly applied, a counter document deleted before
 * the rules forbade it, a manual edit in the console.
 *
 * This rebuilds the counters from the ledger and reports the difference
 * before changing anything. Without Cloud Functions it cannot be scheduled,
 * so it is run by hand from the audit screen.
 */

export interface Drift {
  moduleId: string;
  field: string;
  stored: number;
  computed: number;
}

export interface ReconcileResult {
  eventsRead: number;
  drift: Drift[];
  /** True once corrections have been written. */
  applied: boolean;
}

export async function reconcileWip(
  tenantId: string,
  apply: boolean,
): Promise<ReconcileResult> {
  if (!db) throw new Error('Not connected.');

  const snap = await getDocs(
    query(collection(db, 'scanEvents'), where('tenantId', '==', tenantId)),
  );

  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScanEvent);

  // WIP is the net of everything in minus everything out, per module. This
  // is exactly what the increments should already have accumulated.
  const computed: Record<string, { pieces: number; bundles: number }> = {};
  events.forEach((e) => {
    const bucket = (computed[e.moduleId] ??= { pieces: 0, bundles: 0 });
    const sign = e.direction === 'IN' ? 1 : -1;
    bucket.pieces += sign * (e.qty ?? 0);
    bucket.bundles += sign;
  });

  const wipSnap = await getDocs(
    query(collection(db, 'moduleWip'), where('tenantId', '==', tenantId)),
  );

  const stored: Record<string, { pieces: number; bundles: number }> = {};
  wipSnap.docs.forEach((d) => {
    stored[d.id] = { pieces: d.data().pieces ?? 0, bundles: d.data().bundles ?? 0 };
  });

  const moduleIds = new Set([...Object.keys(computed), ...Object.keys(stored)]);
  const drift: Drift[] = [];

  moduleIds.forEach((moduleId) => {
    const c = computed[moduleId] ?? { pieces: 0, bundles: 0 };
    const s = stored[moduleId] ?? { pieces: 0, bundles: 0 };
    if (c.pieces !== s.pieces) {
      drift.push({ moduleId, field: 'pieces', stored: s.pieces, computed: c.pieces });
    }
    if (c.bundles !== s.bundles) {
      drift.push({ moduleId, field: 'bundles', stored: s.bundles, computed: c.bundles });
    }
  });

  if (apply && drift.length > 0) {
    const affected = Array.from(new Set(drift.map((d) => d.moduleId)));
    for (const group of chunk(affected)) {
      const batch = writeBatch(db);
      group.forEach((moduleId) => {
        const c = computed[moduleId] ?? { pieces: 0, bundles: 0 };
        // Absolute values, not increments: the point is to overwrite a
        // drifted counter with the truth from the ledger.
        batch.set(
          doc(db!, 'moduleWip', moduleId),
          { tenantId, moduleId, pieces: c.pieces, bundles: c.bundles, updatedAt: new Date().toISOString() },
          { merge: true },
        );
      });
      await batch.commit();
    }
  }

  return { eventsRead: events.length, drift, applied: apply && drift.length > 0 };
}
