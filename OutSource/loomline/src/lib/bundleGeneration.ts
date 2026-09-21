import { doc, getDocs, query, where, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { chunk, formatBundleId, planBundles } from '@/lib/bundleMath';
import type { Bundle, PoLine, PurchaseOrder, Style } from '@/types/domain';

export interface GenerateInput {
  tenantId: string;
  factoryId: string;
  po: PurchaseOrder;
  line: PoLine;
  style: Style;
  template: string;
  padding: number;
}

export interface GenerateResult {
  created: number;
  pieces: number;
  batches: number;
}

export class BundleGenerationError extends Error {}

/**
 * Creates every bundle for one order line.
 *
 * Two guarantees:
 *
 *   Quantity is conserved. `planBundles` asserts this before a single
 *   document is written, so an arithmetic fault fails loudly and early
 *   rather than leaving a partially generated order behind.
 *
 *   Ids are deterministic. A bundle's document id comes from the configured
 *   template, so re-running generation targets the same documents rather
 *   than creating a duplicate set. The line is still guarded against
 *   regeneration, but the id scheme means an interrupted run can be safely
 *   repeated.
 */
export async function generateBundles(input: GenerateInput): Promise<GenerateResult> {
  if (!db) throw new BundleGenerationError('Connect a Firebase project first.');

  const { tenantId, factoryId, po, line, style, template, padding } = input;

  if (line.bundlesGenerated) {
    throw new BundleGenerationError(
      'Bundles already exist for this line. Cancel them before generating again.',
    );
  }

  const planned = planBundles(line.orderQty, line.bundleQty);

  const bundles = planned.map((p) => {
    const id = formatBundleId(
      template,
      {
        po: po.poNumber,
        style: style.code,
        colour: line.colour,
        size: line.size,
        seq: p.seq,
      },
      padding,
    );

    const bundle: Omit<Bundle, 'id'> = {
      tenantId,
      factoryId,
      poId: po.id,
      poLineId: line.id,
      styleId: style.id,
      colour: line.colour,
      size: line.size,
      qty: p.qty,
      seq: p.seq,
      status: 'CREATED',
      currentModuleId: null,
      currentStage: null,
      createdAt: new Date().toISOString(),
      lastScanAt: null,
    };

    return { id, data: bundle };
  });

  /* A template that omits size or colour would produce colliding ids across
     lines, silently overwriting one line's bundles with another's. Cheaper
     to catch here than to discover from a purchase order that will not
     close. */
  const ids = new Set(bundles.map((b) => b.id));
  if (ids.size !== bundles.length) {
    throw new BundleGenerationError(
      'The bundle id format produces duplicates. Include {SEQ}, and {COLOR} and {SIZE} if the order has several.',
    );
  }

  const groups = chunk(bundles);

  for (const group of groups) {
    const batch = writeBatch(db);
    group.forEach((b) => batch.set(doc(db!, 'bundles', b.id), b.data));
    await batch.commit();
  }

  // Marked last: if generation fails partway, the line stays open and the
  // deterministic ids make a repeat run idempotent.
  const finalBatch = writeBatch(db);
  finalBatch.set(doc(db, 'poLines', line.id), { bundlesGenerated: true }, { merge: true });
  await finalBatch.commit();

  return {
    created: bundles.length,
    pieces: bundles.reduce((s, b) => s + b.data.qty, 0),
    batches: groups.length,
  };
}

/**
 * Cancels a line's bundles rather than deleting them, so the audit trail
 * survives. Bundles that have already been scanned are left alone — history
 * is never rewritten (§28).
 */
export async function cancelLineBundles(lineId: string): Promise<number> {
  if (!db) throw new BundleGenerationError('Connect a Firebase project first.');

  const snap = await getDocs(
    query(collection(db, 'bundles'), where('poLineId', '==', lineId)),
  );

  const cancellable = snap.docs.filter((d) => d.data().status === 'CREATED');

  for (const group of chunk(cancellable)) {
    const batch = writeBatch(db);
    group.forEach((d) => batch.set(d.ref, { status: 'CANCELLED' }, { merge: true }));
    await batch.commit();
  }

  const reopen = writeBatch(db);
  reopen.set(doc(db, 'poLines', lineId), { bundlesGenerated: false }, { merge: true });
  await reopen.commit();

  return cancellable.length;
}
