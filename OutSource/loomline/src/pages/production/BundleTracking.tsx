import { useState } from 'react';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/States';
import { cn, formatMetric } from '@/lib/utils';
import type { Bundle, Module, ScanEvent, SignalStatus } from '@/types/domain';

const input =
  'h-12 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

const TONE: Record<string, SignalStatus> = {
  CREATED: 'GREY',
  IN_MODULE: 'GREEN',
  BETWEEN: 'AMBER',
  COMPLETED: 'GREEN',
  CANCELLED: 'RED',
  LOST: 'RED',
};

/**
 * The screen a supervisor opens when someone asks "where is bundle 47?".
 *
 * The journey is read straight from the immutable scan ledger rather than
 * from any summary, so what it shows is what actually happened.
 */
export function BundleTracking() {
  const { profile } = useAuth();
  const { items: modules } = useTenantCollection<Module>('modules');
  const [code, setCode] = useState('');
  const [bundle, setBundle] = useState<Bundle | null | undefined>(undefined);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!db || !profile || !code.trim()) return;
    setBusy(true);
    try {
      const id = code.trim().toUpperCase();

      // A direct get rather than a query on __name__: one read instead of
      // an indexed lookup, resolves from the offline cache, and needs no
      // composite index. The tenant is checked after reading because the
      // rules already refuse a bundle belonging to anyone else.
      const snap = await getDoc(doc(db, 'bundles', id));

      if (!snap.exists() || snap.data().tenantId !== profile.tenantId) {
        setBundle(null);
        setEvents([]);
        return;
      }

      const found = { id: snap.id, ...snap.data() } as Bundle;
      setBundle(found);

      const evSnap = await getDocs(
        query(
          collection(db, 'scanEvents'),
          where('bundleId', '==', found.id),
          orderBy('serverTime', 'asc'),
        ),
      );
      setEvents(evSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScanEvent));
    } finally {
      setBusy(false);
    }
  }

  const moduleCode = (id: string) => modules?.find((m) => m.id === id)?.code ?? id;

  return (
    <>
      <PageHeader
        title="Bundle tracking"
        description="Scan or type a bundle id to see everywhere it has been."
      />

      <div className="max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="flex gap-2">
          <input
            className={input}
            value={code}
            placeholder="Scan or type a bundle id"
            autoFocus
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button variant="primary" size="lg" onClick={search} disabled={busy || !code.trim()}>
            {busy ? 'Looking' : 'Find'}
          </Button>
        </div>

        {bundle === null && <EmptyState title="No bundle with that id" />}

        {bundle && (
          <>
            <Card signal={TONE[bundle.status] ?? 'GREY'}>
              <CardBody className="pt-4">
                <p className="font-mono text-sm">{bundle.id}</p>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Size" value={bundle.size} />
                  <Field label="Colour" value={bundle.colour} />
                  <Field label="Pieces" value={formatMetric(bundle.qty)} />
                  <Field
                    label="Now"
                    value={
                      bundle.currentModuleId
                        ? moduleCode(bundle.currentModuleId)
                        : bundle.status.replace('_', ' ')
                    }
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="pt-4">
                <p className="eyebrow mb-3">Journey</p>

                {events.length === 0 ? (
                  <p className="text-sm text-muted">
                    Created but not yet scanned anywhere.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {events.map((e, i) => (
                      <div key={e.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              'mt-1.5 h-2.5 w-2.5 rounded-[1px]',
                              e.direction === 'IN' ? 'bg-signal-green' : 'bg-signal-amber',
                            )}
                          />
                          {i < events.length - 1 && <span className="w-px flex-1 bg-line" />}
                        </div>
                        <div className="pb-4">
                          <p className="font-display text-base uppercase tracking-[0.03em] leading-tight">
                            {moduleCode(e.moduleId)} · {e.direction}
                          </p>
                          <p className="font-mono text-xs text-muted">
                            {new Date(e.clientTime).toLocaleString()} · slot {e.slotIndex}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="font-display text-lg uppercase tracking-[0.03em]">{value}</p>
    </div>
  );
}
