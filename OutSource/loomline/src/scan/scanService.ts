import { doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { enqueue, markAcknowledged, markRejected } from './outbox';
import { scanEventId } from './scanValidation';
import type { Bundle, Module, ProductionStage, ScanDirection, Style } from '@/types/domain';

export interface CommitScanInput {
  bundle: Bundle;
  module: Module;
  moduleStage: ProductionStage;
  style: Style | null;
  direction: ScanDirection;
  userId: string;
  tenantId: string;
  factoryId: string;
  shiftId: string;
  timezone: string;
  /** Configured slot index, from the live shift. */
  slotIndex: number;
  /** Production date — not today's date on a night shift. */
  dateKey: string;
  /** True when this module is the last tracked stage for the style. */
  isFinalStage: boolean;
}

export interface CommitScanResult {
  scanId: string;
  slotIndex: number;
}

/**
 * Records one scan.
 *
 * Everything goes in a single `writeBatch`, never `runTransaction`.
 * Transactions need a live server round trip and throw when offline, which
 * would make scanning stop the moment the network blinked — see Part D1.
 * Batches are atomic, are validated by the security rules on arrival, and
 * queue in the SDK while offline.
 *
 * The counters use `increment()`, which carries a delta rather than a
 * computed result. Ten scans made offline across three tablets apply in any
 * order and still land on the correct total. That commutativity is the whole
 * reason WIP survives an outage.
 *
 * The commit promise is deliberately not awaited. Offline it never settles,
 * so awaiting would freeze the scan screen. Instead the outbox records the
 * scan first and the promise updates it later.
 */
export async function commitScan(input: CommitScanInput): Promise<CommitScanResult> {
  if (!db) throw new Error('Not connected.');

  const {
    bundle,
    module,
    moduleStage,
    direction,
    userId,
    tenantId,
    factoryId,
    shiftId,
    slotIndex,
    dateKey,
    isFinalStage,
  } = input;

  const scanId = scanEventId(bundle.id, module.id, direction);
  const clientTime = new Date().toISOString();

  await enqueue({
    scanId,
    bundleId: bundle.id,
    moduleId: module.id,
    moduleCode: module.code,
    direction,
    qty: bundle.qty,
    clientTime,
    state: 'PENDING',
    attempts: 0,
  });

  const batch = writeBatch(db);

  batch.set(doc(db, 'scanEvents', scanId), {
    tenantId,
    factoryId,
    bundleId: bundle.id,
    moduleId: module.id,
    direction,
    qty: bundle.qty,
    userId,
    shiftId,
    slotIndex,
    clientTime,
    serverTime: serverTimestamp(),
  });

  batch.set(
    doc(db, 'bundles', bundle.id),
    direction === 'IN'
      ? {
          status: 'IN_MODULE',
          currentModuleId: module.id,
          currentStage: moduleStage,
          lastScanAt: clientTime,
        }
      : {
          status: isFinalStage ? 'COMPLETED' : 'BETWEEN',
          currentModuleId: null,
          currentStage: moduleStage,
          lastScanAt: clientTime,
        },
    { merge: true },
  );

  // WIP rises on the way in and falls on the way out. Same document, equal
  // and opposite deltas, so a completed pass leaves it exactly where it was.
  batch.set(
    doc(db, 'moduleWip', module.id),
    {
      tenantId,
      factoryId,
      moduleId: module.id,
      pieces: increment(direction === 'IN' ? bundle.qty : -bundle.qty),
      bundles: increment(direction === 'IN' ? 1 : -1),
      updatedAt: clientTime,
    },
    { merge: true },
  );

  // Hourly output is derived from OUT scans only (decision Q8).
  if (direction === 'OUT') {
    batch.set(
      doc(db, 'hourlyProduction', `${module.id}_${dateKey}_${slotIndex}`),
      {
        tenantId,
        factoryId,
        moduleId: module.id,
        date: dateKey,
        slotIndex,
        pieces: increment(bundle.qty),
        bundles: increment(1),
      },
      { merge: true },
    );
  }

  batch
    .commit()
    .then(() => markAcknowledged(scanId))
    .catch((err: unknown) => {
      const message = (err as { code?: string; message?: string })?.code ?? '';
      markRejected(
        scanId,
        message === 'permission-denied'
          ? 'Refused by the server. The bundle may have been scanned elsewhere first.'
          : ((err as Error).message ?? 'Sync failed.'),
      );
    });

  return { scanId, slotIndex };
}
