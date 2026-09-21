import type { ScanDirection } from '@/types/domain';

/**
 * The scan outbox.
 *
 * Firestore's own write queue is not enough on its own. While offline the
 * commit promise never settles, and a rules rejection rolls the local write
 * back with nothing surfaced to the operator. §30 says a scan must never be
 * silently lost, so every scan is recorded here first, in IndexedDB, and
 * only removed once the server has acknowledged it.
 *
 * Raw IndexedDB rather than a wrapper library: this is roughly eighty lines
 * and it runs on the one screen that must not break.
 */

export type OutboxState = 'PENDING' | 'ACKNOWLEDGED' | 'REJECTED';

export interface OutboxRecord {
  scanId: string;
  bundleId: string;
  moduleId: string;
  moduleCode: string;
  direction: ScanDirection;
  qty: number;
  clientTime: string;
  state: OutboxState;
  attempts: number;
  rejectionReason?: string;
}

const DB_NAME = 'loomline-outbox';
const STORE = 'scans';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'scanId' });
        store.createIndex('state', 'state');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = fn(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function enqueue(record: OutboxRecord): Promise<void> {
  await tx('readwrite', (s) => s.put(record));
}

export async function markAcknowledged(scanId: string): Promise<void> {
  const existing = await tx<OutboxRecord | undefined>('readonly', (s) => s.get(scanId));
  if (!existing) return;
  await tx('readwrite', (s) => s.put({ ...existing, state: 'ACKNOWLEDGED' }));
}

/**
 * Rejections are kept, not deleted. An operator needs to see that a scan
 * did not stick and why — a bundle that silently vanished from the count is
 * exactly the failure this system exists to prevent.
 */
export async function markRejected(scanId: string, reason: string): Promise<void> {
  const existing = await tx<OutboxRecord | undefined>('readonly', (s) => s.get(scanId));
  if (!existing) return;
  await tx('readwrite', (s) =>
    s.put({ ...existing, state: 'REJECTED', rejectionReason: reason, attempts: existing.attempts + 1 }),
  );
}

export async function all(): Promise<OutboxRecord[]> {
  return tx<OutboxRecord[]>('readonly', (s) => s.getAll());
}

/**
 * Scan ids this device has already accepted, whether or not they have
 * reached the server. This is the duplicate check that works offline.
 */
export async function queuedScanIds(): Promise<string[]> {
  const records = await all();
  return records.filter((r) => r.state !== 'REJECTED').map((r) => r.scanId);
}

export async function pending(): Promise<OutboxRecord[]> {
  const records = await all();
  return records.filter((r) => r.state === 'PENDING');
}

export async function rejected(): Promise<OutboxRecord[]> {
  const records = await all();
  return records.filter((r) => r.state === 'REJECTED');
}

/** Clears acknowledged records so the store does not grow without bound. */
export async function pruneAcknowledged(): Promise<number> {
  const records = await all();
  const done = records.filter((r) => r.state === 'ACKNOWLEDGED');
  for (const r of done) {
    await tx('readwrite', (s) => s.delete(r.scanId));
  }
  return done.length;
}

export async function dismissRejected(scanId: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(scanId));
}

/** Age of the oldest unsent scan, in minutes. Surfaced to supervisors. */
export function oldestPendingMinutes(records: OutboxRecord[], now = Date.now()): number | null {
  const times = records
    .filter((r) => r.state === 'PENDING')
    .map((r) => new Date(r.clientTime).getTime());
  if (times.length === 0) return null;
  return Math.floor((now - Math.min(...times)) / 60_000);
}
