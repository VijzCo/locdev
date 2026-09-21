import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { License } from '@/types/domain';

/**
 * Licence limit enforcement.
 *
 * Limits are billable: every factory, module and user a customer creates is
 * something they are paying for. Writing the numbers onto the licence
 * document and trusting the interface to respect them is not enforcement —
 * it is a suggestion.
 *
 * Firestore rules cannot count documents, so each tenant carries a counter
 * document. Creating a limited record and moving its counter happen in one
 * atomic batch, and the rules require both: the write is refused unless the
 * counter moves by exactly one and stays inside the licensed number.
 *
 * These counters are written as absolute values, NOT with increment().
 *
 * That is not a style choice. Firestore applies field transforms after
 * evaluating rules, so `getAfter()` on a document updated with increment()
 * returns the value *before* the increment — and a rule comparing the result
 * can therefore never be satisfied. Every write was refused, and the record
 * appeared briefly on screen before the rollback.
 *
 * The WIP counters in the scan path still use increment(), correctly: those
 * are never value-checked by rules, and they need commutativity to survive
 * offline scanning. These are administrator-frequency writes where a lost
 * update is unlikely and recoverable by rebuilding the counters.
 */

export type LimitedCollection = 'factories' | 'modules' | 'users';

export interface TenantUsage {
  tenantId: string;
  factories: number;
  modules: number;
  users: number;
}

export const LIMIT_FIELD: Record<LimitedCollection, keyof License['limits']> = {
  factories: 'maxFactories',
  modules: 'maxModules',
  users: 'maxUsers',
};

const LABEL: Record<LimitedCollection, string> = {
  factories: 'factories',
  modules: 'modules',
  users: 'user accounts',
};

/**
 * Firestore's own refusal message names no cause. On this screen there are
 * only a few things it can mean, so say them.
 */
export function explainWriteFailure(err: unknown, collection: LimitedCollection): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code !== 'permission-denied') {
    return (err as Error)?.message ?? 'Could not save.';
  }

  if (collection === 'factories') {
    return (
      'The server refused this. Usually one of three things: your licence does not cover ' +
      'another factory, your account is not a system administrator, or your licence has ' +
      'expired. Check the licence page, or ask your supplier.'
    );
  }

  return (
    'The server refused this. Usually your licence does not cover another ' +
    `${collection === 'users' ? 'user account' : 'module'}, or your licence has expired. ` +
    'Check the licence page, or ask your supplier.'
  );
}

export class LimitReachedError extends Error {
  constructor(
    public collection: LimitedCollection,
    public used: number,
    public limit: number,
  ) {
    super(
      `Your licence covers ${limit} ${LABEL[collection]} and ${used} are in use. ` +
        `Contact your supplier to increase it.`,
    );
  }
}

export async function readUsage(tenantId: string): Promise<TenantUsage | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'tenantUsage', tenantId));
  return snap.exists() ? ({ tenantId, ...snap.data() } as TenantUsage) : null;
}

/** null limit means unlimited. */
export function limitFor(licence: License | null, collection: LimitedCollection): number | null {
  const value = licence?.limits?.[LIMIT_FIELD[collection]];
  return typeof value === 'number' ? value : null;
}

export function isAtLimit(
  usage: TenantUsage | null,
  licence: License | null,
  collection: LimitedCollection,
): boolean {
  const limit = limitFor(licence, collection);
  if (limit === null) return false;
  return (usage?.[collection] ?? 0) >= limit;
}

/**
 * Creates a record and moves its counter in one batch.
 *
 * The counter update is not bookkeeping the client could skip — the rules
 * check that it happened, so a create without it is refused.
 */
export async function createCounted(
  collection: LimitedCollection,
  documentId: string | null,
  data: Record<string, unknown>,
  tenantId: string,
  licence: License | null,
): Promise<string> {
  if (!db) throw new Error('Not connected.');

  const usage = await readUsage(tenantId);
  const limit = limitFor(licence, collection);

  /* No counter document means this tenant predates usage counting. The
     rules compare against it on every limited create, so without one every
     attempt is refused — and "missing or insufficient permissions" gives no
     clue why. */
  if (!usage) {
    throw new Error(
      'This organisation has no usage record yet, so new records cannot be created. ' +
        'Ask your supplier to run "Rebuild counters" in the vendor console.',
    );
  }

  // Checked here so the person gets a sentence rather than a permission
  // error. The rules check it again, and they are the authority.
  if (limit !== null && (usage?.[collection] ?? 0) >= limit) {
    throw new LimitReachedError(collection, usage?.[collection] ?? 0, limit);
  }

  // Users are keyed by their Auth uid; everything else gets a generated id.
  const ref = doc(db, collection, documentId ?? crypto.randomUUID());

  const batch = writeBatch(db);
  batch.set(ref, { ...data, tenantId });
  batch.set(
    doc(db, 'tenantUsage', tenantId),
    { tenantId, [collection]: (usage[collection] ?? 0) + 1 },
    { merge: true },
  );
  await batch.commit();

  return ref.id;
}

/** Deletes a record and moves its counter back, in one batch. */
export async function deleteCounted(
  collection: LimitedCollection,
  documentId: string,
  tenantId: string,
): Promise<void> {
  if (!db) throw new Error('Not connected.');

  const usage = await readUsage(tenantId);
  const next = Math.max(0, (usage?.[collection] ?? 1) - 1);

  const batch = writeBatch(db);
  batch.delete(doc(db, collection, documentId));
  batch.set(doc(db, 'tenantUsage', tenantId), { tenantId, [collection]: next }, { merge: true });
  await batch.commit();
}
