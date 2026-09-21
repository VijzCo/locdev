import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Download } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { efficiencyPct, operatorMinutes, orderCompletionPct } from '@/calc/engine';
import { productionMinutes } from '@/time/slots';
import { downloadCsv, exportFilename } from '@/lib/csv';
import { BarChart, LineChart, type Point } from '@/components/charts/Charts';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { Metric } from '@/components/ui/Metric';
import { cn, formatMetric } from '@/lib/utils';
import type {
  Bundle,
  DailyPlan,
  HourlyProduction,
  Module,
  PurchaseOrder,
  Shift,
  Style,
} from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink focus:border-accent';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export type ReportKind = 'production' | 'efficiency' | 'wip' | 'bundles' | 'completion';

/**
 * Reports share one shell: a date range, a fetch, a chart, a table and an
 * export. Splitting them into five unrelated screens would mean five
 * date pickers behaving slightly differently.
 *
 * Historical figures come from `hourlyProduction`, which is written as scans
 * arrive, rather than from re-reading the scan ledger for every report —
 * that keeps a month-long report to a few hundred document reads instead of
 * tens of thousands.
 */
export function Reports({ kind }: { kind: ReportKind }) {
  const { profile } = useAuth();

  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(daysAgo(0));
  const [rows, setRows] = useState<HourlyProduction[] | null>(null);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [busy, setBusy] = useState(false);

  const { items: modules } = useTenantCollection<Module>('modules');
  const { items: styles } = useTenantCollection<Style>('styles');
  const { items: shifts } = useTenantCollection<Shift>('shifts');
  const { items: pos } = useTenantCollection<PurchaseOrder>('purchaseOrders');
  const { items: bundles } = useTenantCollection<Bundle>('bundles');

  const needsHistory = kind === 'production' || kind === 'efficiency' || kind === 'wip';

  useEffect(() => {
    if (!db || !profile || !needsHistory) return;
    let cancelled = false;

    (async () => {
      setBusy(true);
      try {
        const [h, p] = await Promise.all([
          getDocs(
            query(
              collection(db!, 'hourlyProduction'),
              where('tenantId', '==', profile.tenantId),
              where('date', '>=', from),
              where('date', '<=', to),
            ),
          ),
          getDocs(
            query(
              collection(db!, 'dailyPlans'),
              where('tenantId', '==', profile.tenantId),
              where('date', '>=', from),
              where('date', '<=', to),
            ),
          ),
        ]);
        if (cancelled) return;
        setRows(h.docs.map((d) => ({ id: d.id, ...d.data() }) as HourlyProduction));
        setPlans(p.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyPlan));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, profile, needsHistory]);

  const dates = useMemo(() => {
    const out: string[] = [];
    for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [from, to]);

  const moduleCode = (id: string) => modules?.find((m) => m.id === id)?.code ?? id;

  /* ---------------- production ---------------- */

  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    (rows ?? []).forEach((r) => {
      map[r.date] = (map[r.date] ?? 0) + (r.pieces ?? 0);
    });
    return map;
  }, [rows]);

  const byModule = useMemo(() => {
    const map: Record<string, number> = {};
    (rows ?? []).forEach((r) => {
      map[r.moduleId] = (map[r.moduleId] ?? 0) + (r.pieces ?? 0);
    });
    return map;
  }, [rows]);

  /* ---------------- efficiency ---------------- */

  const efficiencyRows = useMemo(() => {
    const shiftMinutes = shifts?.[0] ? productionMinutes(shifts[0]) : 0;

    return plans
      .map((plan) => {
        const actual = (rows ?? [])
          .filter((r) => r.moduleId === plan.moduleId && r.date === plan.date)
          .reduce((s, r) => s + (r.pieces ?? 0), 0);

        const opMinutes = operatorMinutes(shiftMinutes, plan.operators ?? 0);

        return {
          date: plan.date,
          moduleId: plan.moduleId,
          actual,
          target: plan.targetQty ?? null,
          efficiency: efficiencyPct(actual, plan.smv ?? 0, opMinutes),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.moduleId.localeCompare(b.moduleId));
  }, [plans, rows, shifts]);

  /* ---------------- PO completion ---------------- */

  const completion = useMemo(() => {
    if (!bundles || !pos) return [];
    return pos.map((po) => {
      const mine = bundles.filter((b) => b.poId === po.id && b.status !== 'CANCELLED');
      const ordered = mine.reduce((s, b) => s + b.qty, 0);
      const done = mine.filter((b) => b.status === 'COMPLETED').reduce((s, b) => s + b.qty, 0);
      return {
        po,
        bundles: mine.length,
        ordered,
        done,
        pct: orderCompletionPct(done, ordered),
      };
    });
  }, [bundles, pos]);

  /* ---------------- export ---------------- */

  function exportCsv() {
    if (kind === 'production') {
      downloadCsv(
        exportFilename('production', from, to),
        ['Date', 'Module', 'Slot', 'Pieces', 'Bundles'],
        (rows ?? []).map((r) => [r.date, moduleCode(r.moduleId), r.slotIndex, r.pieces, r.bundles]),
      );
    } else if (kind === 'efficiency') {
      downloadCsv(
        exportFilename('efficiency', from, to),
        ['Date', 'Module', 'Actual', 'Target', 'Efficiency %'],
        efficiencyRows.map((r) => [
          r.date,
          moduleCode(r.moduleId),
          r.actual,
          r.target,
          r.efficiency === null ? '' : r.efficiency.toFixed(1),
        ]),
      );
    } else if (kind === 'completion') {
      downloadCsv(
        exportFilename('po-completion'),
        ['PO', 'Buyer', 'Bundles', 'Ordered pieces', 'Completed pieces', 'Complete %'],
        completion.map((c) => [
          c.po.poNumber,
          c.po.buyer,
          c.bundles,
          c.ordered,
          c.done,
          c.pct === null ? '' : c.pct.toFixed(1),
        ]),
      );
    } else if (kind === 'bundles') {
      downloadCsv(
        exportFilename('bundles'),
        ['Bundle', 'Style', 'Colour', 'Size', 'Pieces', 'Status', 'Current module', 'Last scan'],
        (bundles ?? []).map((b) => [
          b.id,
          styles?.find((s) => s.id === b.styleId)?.code ?? '',
          b.colour,
          b.size,
          b.qty,
          b.status,
          b.currentModuleId ? moduleCode(b.currentModuleId) : '',
          b.lastScanAt ?? '',
        ]),
      );
    }
  }

  const title = {
    production: 'Production report',
    efficiency: 'Efficiency report',
    wip: 'WIP report',
    bundles: 'Bundle history',
    completion: 'PO completion',
  }[kind];

  return (
    <>
      <PageHeader title={title} description="Filter, review, then export for Excel." />

      <div className="space-y-4 p-4 sm:p-6">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3 pt-4">
            {needsHistory && (
              <>
                <div>
                  <label className="eyebrow mb-1.5 block">From</label>
                  <input
                    className={input}
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">To</label>
                  <input
                    className={input}
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              variant="primary"
              className="ml-auto"
              onClick={exportCsv}
              disabled={kind === 'wip'}
            >
              <Download size={16} />
              Export CSV
            </Button>
          </CardBody>
        </Card>

        {busy ? (
          <LoadingState label="Loading report" />
        ) : kind === 'production' ? (
          <ProductionReport
            dates={dates}
            byDate={byDate}
            byModule={byModule}
            moduleCode={moduleCode}
          />
        ) : kind === 'efficiency' ? (
          <EfficiencyReport rows={efficiencyRows} moduleCode={moduleCode} />
        ) : kind === 'completion' ? (
          <CompletionReport rows={completion} />
        ) : kind === 'bundles' ? (
          <BundleReport bundles={bundles ?? []} moduleCode={moduleCode} />
        ) : (
          <WipReportNote />
        )}
      </div>
    </>
  );
}

function ProductionReport({
  dates,
  byDate,
  byModule,
  moduleCode,
}: {
  dates: string[];
  byDate: Record<string, number>;
  byModule: Record<string, number>;
  moduleCode: (id: string) => string;
}) {
  // A date with no records is null, not zero — the line breaks rather than
  // implying the factory produced nothing that day.
  const trend: Point[] = dates.map((d) => ({
    label: d.slice(5),
    value: byDate[d] ?? null,
  }));

  const modules: Point[] = Object.entries(byModule)
    .sort((a, b) => b[1] - a[1])
    .map(([id, pieces]) => ({ label: moduleCode(id), value: pieces }));

  const total = Object.values(byDate).reduce((s, v) => s + v, 0);
  const days = Object.keys(byDate).length;

  return (
    <>
      <Card>
        <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
          <Metric label="Total pieces" value={total || null} />
          <Metric label="Days with output" value={days || null} />
          <Metric label="Daily average" value={days ? Math.round(total / days) : null} />
          <Metric label="Modules" value={modules.length || null} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4">
          <p className="eyebrow mb-3">Daily trend</p>
          <LineChart data={trend} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4">
          <p className="eyebrow mb-3">By module</p>
          <BarChart data={modules} />
        </CardBody>
      </Card>
    </>
  );
}

function EfficiencyReport({
  rows,
  moduleCode,
}: {
  rows: { date: string; moduleId: string; actual: number; target: number | null; efficiency: number | null }[];
  moduleCode: (id: string) => string;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No daily plans in this range, so efficiency cannot be calculated" />;
  }

  return (
    <Card>
      <CardBody className="overflow-x-auto pt-4">
        <table className="w-full min-w-[36rem] border-collapse">
          <thead>
            <tr>
              {['Date', 'Module', 'Actual', 'Target', 'Efficiency'].map((h) => (
                <th key={h} className="eyebrow border-b border-line px-2 pb-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.date}-${r.moduleId}-${i}`}>
                <td className="border-b border-line px-2 py-2 font-mono text-sm">{r.date}</td>
                <td className="border-b border-line px-2 py-2 font-display uppercase tracking-[0.03em]">
                  {moduleCode(r.moduleId)}
                </td>
                <td className="border-b border-line px-2 py-2 font-mono tnum text-sm">
                  {formatMetric(r.actual)}
                </td>
                <td className="border-b border-line px-2 py-2 font-mono tnum text-sm">
                  {formatMetric(r.target)}
                </td>
                <td
                  className={cn(
                    'border-b border-line px-2 py-2 font-mono tnum text-sm',
                    r.efficiency !== null && r.efficiency >= 70 && 'text-signal-green',
                    r.efficiency !== null && r.efficiency < 55 && 'text-signal-red',
                  )}
                >
                  {formatMetric(r.efficiency, { decimals: 1, suffix: '%' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function CompletionReport({
  rows,
}: {
  rows: { po: PurchaseOrder; bundles: number; ordered: number; done: number; pct: number | null }[];
}) {
  if (rows.length === 0) return <EmptyState title="No purchase orders yet" />;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card
          key={r.po.id}
          signal={r.pct === null ? 'GREY' : r.pct >= 100 ? 'GREEN' : r.pct >= 50 ? 'AMBER' : 'RED'}
        >
          <CardBody className="pt-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <div className="min-w-[8rem]">
                <p className="font-display text-lg uppercase tracking-[0.03em] leading-tight">
                  {r.po.poNumber}
                </p>
                <p className="text-xs text-muted">{r.po.buyer || 'No buyer'}</p>
              </div>
              <Metric label="Ordered" value={r.ordered || null} size="sm" />
              <Metric label="Completed" value={r.done || null} size="sm" />
              <Metric label="Bundles" value={r.bundles || null} size="sm" />
              <Metric
                label="Complete"
                value={r.pct}
                decimals={1}
                suffix="%"
                size="sm"
              />
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded bg-raised">
              <div className="h-full bg-accent" style={{ width: `${r.pct ?? 0}%` }} />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function BundleReport({
  bundles,
  moduleCode,
}: {
  bundles: Bundle[];
  moduleCode: (id: string) => string;
}) {
  const stuck = bundles.filter(
    (b) =>
      b.status === 'IN_MODULE' &&
      b.lastScanAt &&
      Date.now() - new Date(b.lastScanAt).getTime() > 86_400_000,
  );

  return (
    <>
      <Card>
        <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
          <Metric label="Bundles" value={bundles.length || null} />
          <Metric
            label="In production"
            value={bundles.filter((b) => b.status === 'IN_MODULE').length || null}
          />
          <Metric
            label="Completed"
            value={bundles.filter((b) => b.status === 'COMPLETED').length || null}
          />
          <Metric
            label="Stuck over a day"
            value={stuck.length || null}
            status={stuck.length > 0 ? 'AMBER' : undefined}
          />
        </CardBody>
      </Card>

      {stuck.length > 0 && (
        <Card signal="AMBER">
          <CardBody className="pt-4">
            <p className="eyebrow mb-2">
              Bundles sitting in a module for more than a day
            </p>
            <p className="mb-3 max-w-prose text-sm text-muted">
              Usually a missed OUT scan rather than a genuinely stalled bundle, but either is worth
              chasing — both distort WIP.
            </p>
            <div className="space-y-1">
              {stuck.slice(0, 30).map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"
                >
                  <span className="font-mono">{b.id}</span>
                  <span className="text-muted">
                    {b.currentModuleId ? moduleCode(b.currentModuleId) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function WipReportNote() {
  return (
    <EmptyState title="WIP history builds up as dashboards run — check back after a few shifts" />
  );
}
