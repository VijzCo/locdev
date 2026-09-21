import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { createCounted, deleteCounted, type LimitedCollection } from '@/lib/tenantUsage';

/* Billable collections. Creating one of these moves a counter that the
   security rules check against the licence, so they cannot go through a
   plain addDoc. */
const LIMITED = new Set<string>(['factories', 'modules', 'users']);

interface Options {
  /** Extra equality filter, e.g. only modules in one section. */
  filterField?: string;
  filterValue?: string | null;
}

/**
 * Live view of one collection, scoped to the signed-in tenant.
 *
 * Every master-data screen uses this rather than talking to Firestore
 * directly, so tenant scoping is applied in one place instead of being
 * re-remembered on each screen. The rules enforce it regardless — this is
 * about not writing the same `where` clause six times.
 */
export function useTenantCollection<T extends { id: string }>(
  name: string,
  options: Options = {},
) {
  const { demoMode, licenceDoc, effectiveTenantId } = useAuth();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { filterField, filterValue } = options;

  useEffect(() => {
    if (!db || !effectiveTenantId || demoMode) {
      setItems([]);
      return;
    }

    // Reads follow the tenant being viewed, so vendor support sees the
    // customer's data rather than an empty screen.
    const constraints = [where('tenantId', '==', effectiveTenantId)];
    if (filterField && filterValue) {
      constraints.push(where(filterField, '==', filterValue));
    }

    return onSnapshot(
      query(collection(db, name), ...constraints),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setError(null);
      },
      (e) => setError(e.message),
    );
  }, [name, effectiveTenantId, demoMode, filterField, filterValue]);

  const create = useCallback(
    async (data: Omit<T, 'id'>) => {
      if (!db || !effectiveTenantId) return null;

      if (LIMITED.has(name)) {
        // Throws LimitReachedError, which the calling screen shows as a
        // sentence rather than a permission failure.
        return createCounted(
          name as LimitedCollection,
          null,
          data as Record<string, unknown>,
          effectiveTenantId,
          licenceDoc,
        );
      }

      const ref = await addDoc(collection(db, name), {
        ...data,
        tenantId: effectiveTenantId,
      });
      return ref.id;
    },
    [name, effectiveTenantId, licenceDoc],
  );

  const update = useCallback(
    async (id: string, data: Partial<T>) => {
      if (!db) return;
      await setDoc(doc(db, name, id), data, { merge: true });
    },
    [name],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!db) return;
      if (LIMITED.has(name) && effectiveTenantId) {
        await deleteCounted(name as LimitedCollection, id, effectiveTenantId);
        return;
      }
      await deleteDoc(doc(db, name, id));
    },
    [name, effectiveTenantId],
  );

  const sorted = useMemo(
    () =>
      items
        ? [...items].sort((a, b) =>
            String((a as Record<string, unknown>).code ?? '').localeCompare(
              String((b as Record<string, unknown>).code ?? ''),
            ),
          )
        : null,
    [items],
  );

  return { items: sorted, error, create, update, remove };
}
