import { collection, doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { chunk } from '@/lib/bundleMath';
import type { Bundle } from '@/types/domain';

/**
 * Records a print run.
 *
 * §28 requires barcode generation and reprints to be auditable, and a
 * reprint is the one label event worth investigating: a bundle whose label
 * has been printed four times usually means the physical bundle is lost, or
 * that someone is producing duplicate tickets for the same work.
 *
 * The print count lives on the bundle so the label itself can be marked, and
 * an audit entry records who printed what and when.
 */
export async function recordPrint(
  bundles: Bundle[],
  userId: string,
  tenantId: string,
): Promise<void> {
  if (!db || bundles.length === 0) return;

  for (const group of chunk(bundles)) {
    const batch = writeBatch(db);

    group.forEach((b) => {
      batch.set(
        doc(db!, 'bundles', b.id),
        { printCount: increment(1), lastPrintedAt: new Date().toISOString() },
        { merge: true },
      );
    });

    // One audit entry per run rather than per label — a run of 400 labels is
    // one human action, and 400 rows would bury the reprint that matters.
    batch.set(doc(collection(db!, 'auditLogs')), {
      tenantId,
      userId,
      action: group.some((b) => (b.printCount ?? 0) > 0) ? 'LABEL_REPRINT' : 'LABEL_PRINT',
      entity: 'bundle',
      entityId: group[0]?.id ?? '',
      at: serverTimestamp(),
      meta: {
        count: group.length,
        bundleIds: group.slice(0, 50).map((b) => b.id),
        truncated: group.length > 50,
      },
    });

    await batch.commit();
  }
}

/**
 * Expands "B0007 to B0042" into the bundles in between. Sequence numbers are
 * what people read off a label, so ranges are expressed in those rather than
 * in document ids.
 */
export function selectRange(bundles: Bundle[], fromSeq: number, toSeq: number): Bundle[] {
  const lo = Math.min(fromSeq, toSeq);
  const hi = Math.max(fromSeq, toSeq);
  return bundles.filter((b) => b.seq >= lo && b.seq <= hi);
}
