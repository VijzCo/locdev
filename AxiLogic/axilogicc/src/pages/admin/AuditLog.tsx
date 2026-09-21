import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { reconcileWip, type ReconcileResult } from '@/lib/reconcile';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { Metric } from '@/components/ui/Metric';
import { formatMetric } from '@/lib/utils';
import type { AppUser, Module } from '@/types/domain';

interface AuditRow {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  at?: { seconds: number };
  meta?: Record<string, unknown>;
}

export function AuditLog() {
  const { profile } = useAuth();
  const { items: users } = useTenantCollection<AppUser & { id: string }>('users');
  const [rows, setRows] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    if (!db || !profile) return;
    (async () => {
      const snap = await getDocs(
        query(
          collection(db!, 'auditLogs'),
          where('tenantId', '==', profile.tenantId),
          orderBy('at', 'desc'),
          limit(200),
        ),
      );
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditRow));
    })().catch(() => setRows([]));
  }, [profile]);

  const userName = (uid: string) =>
    users?.find((u) => u.id === uid)?.displayName ?? uid.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who did what. Entries are never edited or removed."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Reconcile />

        {rows === null ? (
          <LoadingState label="Loading audit log" />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing recorded yet" />
        ) : (
          <Card>
            <CardBody className="pt-4">
              <div className="space-y-0">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line py-2.5 text-sm last:border-0"
                  >
                    <span className="font-display uppercase tracking-[0.03em]">
                      {r.action.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="font-mono text-xs text-muted">{r.entityId}</span>
                    {typeof r.meta?.count === 'number' && (
                      <span className="font-mono text-xs text-muted">
                        {formatMetric(r.meta.count as number)} items
                      </span>
                    )}
                    <span className="ml-auto text-muted">{userName(r.userId)}</span>
                    <span className="font-mono text-xs text-faint">
                      {r.at ? new Date(r.at.seconds * 1000).toLocaleString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

/**
 * WIP counters are a projection of the scan ledger. They should always
 * agree, but Part D5 is honest that they can drift, so this rebuilds them
 * from the events and shows the difference before changing anything.
 *
 * Checking is separate from applying on purpose: a manager should see what
 * would change before it changes.
 */
function Reconcile() {
  const { profile, canWrite } = useAuth();
  const { items: modules } = useTenantCollection<Module>('modules');
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(apply: boolean) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await reconcileWip(profile.tenantId, apply));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const moduleCode = (id: string) => modules?.find((m) => m.id === id)?.code ?? id;

  return (
    <Card signal={result && result.drift.length > 0 ? 'AMBER' : 'GREEN'}>
      <CardBody className="space-y-3 pt-4">
        <div>
          <p className="eyebrow">Check WIP against the scan ledger</p>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Rebuilds every module's WIP from the scan events and reports any difference. Scan
            events are the record of what happened; the counters are only a fast copy of them.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(false)} disabled={busy}>
            {busy ? 'Checking' : 'Check for drift'}
          </Button>
          {result && result.drift.length > 0 && canWrite('settings.manage') && (
            <Button variant="primary" onClick={() => run(true)} disabled={busy}>
              Correct {result.drift.length} {result.drift.length === 1 ? 'counter' : 'counters'}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-8">
              <Metric label="Scan events read" value={result.eventsRead} size="sm" />
              <Metric
                label="Counters adrift"
                value={result.drift.length}
                size="sm"
                status={result.drift.length > 0 ? 'AMBER' : 'GREEN'}
              />
            </div>

            {result.drift.length === 0 ? (
              <p className="text-sm text-signal-green">
                Every counter matches the ledger.
              </p>
            ) : (
              <div className="space-y-1">
                {result.drift.map((d, i) => (
                  <div
                    key={`${d.moduleId}-${d.field}-${i}`}
                    className="flex flex-wrap gap-x-6 border-b border-line py-1.5 text-sm last:border-0"
                  >
                    <span className="font-display uppercase tracking-[0.03em]">
                      {moduleCode(d.moduleId)}
                    </span>
                    <span className="text-muted">{d.field}</span>
                    <span className="font-mono tnum text-signal-red">stored {d.stored}</span>
                    <span className="font-mono tnum text-signal-green">ledger {d.computed}</span>
                  </div>
                ))}
              </div>
            )}

            {result.applied && (
              <p className="text-sm text-signal-green">Counters corrected from the ledger.</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
