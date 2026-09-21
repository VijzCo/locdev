import { Card, CardBody } from '@/components/ui/Card';
import { Metric, StatusChip } from '@/components/ui/Metric';
import { cn, formatMetric } from '@/lib/utils';
import type { ModuleView, ProductionTotals } from '@/hooks/useProductionData';

const WIP_LABEL: Record<string, string> = {
  OVER: 'Over WIP',
  NORMAL: 'Normal',
  REORDER: 'Feed soon',
  LOW: 'Low',
  INACTIVE: 'Inactive',
  NO_PLAN: 'No plan today',
};

/**
 * One module, as it appears on every dashboard.
 *
 * The andon rail carries WIP status, because that is the thing a supervisor
 * walking past needs to act on — an over-WIP module means stop feeding it
 * now, and that decision should not require reading any numbers.
 */
export function ModuleCard({ view, compact }: { view: ModuleView; compact?: boolean }) {
  const { module, style, metrics } = view;

  return (
    <Card signal={metrics.wip.status}>
      <CardBody className="pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-xl uppercase tracking-[0.03em]">{module.code}</span>
          <span className="font-mono text-xs text-muted">{style?.code ?? '—'}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric label="Actual" value={metrics.actual} size="sm" />
          <Metric label="Target" value={metrics.target} size="sm" />
          <Metric
            label="Achievement"
            value={metrics.achievement}
            suffix="%"
            size="sm"
            status={metrics.achievementBand}
          />
          <Metric
            label="Efficiency"
            value={metrics.efficiency}
            suffix="%"
            size="sm"
            status={metrics.efficiencyBand}
          />
        </div>

        {!compact && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3">
            <Metric label="WIP pieces" value={metrics.wipPieces || null} size="sm" />
            <Metric label="Forecast" value={metrics.forecast} size="sm" />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <StatusChip status={metrics.wip.status} label={WIP_LABEL[metrics.wip.reason]} />
          {metrics.requiredRate !== null && (
            <span className="font-mono text-xs text-muted">
              needs {formatMetric(metrics.requiredRate)}/h
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Roll-up strip shown above every dashboard grid. */
export function TotalsStrip({ totals }: { totals: ProductionTotals }) {
  return (
    <Card>
      <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Target" value={totals.target} />
        <Metric label="Actual" value={totals.actual} />
        <Metric label="Achievement" value={totals.achievement} suffix="%" />
        <Metric label="WIP pieces" value={totals.wipPieces} />
        <Metric label="Forecast" value={totals.forecast} />
        <div className="flex flex-col justify-center gap-1.5">
          <span className="eyebrow">Attention</span>
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                'font-mono text-sm',
                totals.overWip > 0 ? 'text-signal-red' : 'text-muted',
              )}
            >
              {totals.overWip} over WIP
            </span>
            <span
              className={cn(
                'font-mono text-sm',
                totals.lowWip > 0 ? 'text-signal-amber' : 'text-muted',
              )}
            >
              {totals.lowWip} need feeding
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** Shift progress, so a figure is never read without knowing how far in it is. */
export function ShiftStrip({
  shiftName,
  time,
  elapsed,
  total,
  dateKey,
}: {
  shiftName: string;
  time: string;
  elapsed: number;
  total: number;
  dateKey: string;
}) {
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded border border-line bg-surface px-4 py-3">
      <div>
        <p className="eyebrow leading-none">{shiftName}</p>
        <p className="font-mono tnum text-2xl leading-tight">{time}</p>
      </div>
      <div>
        <p className="eyebrow">Production date</p>
        <p className="font-mono text-sm">{dateKey}</p>
      </div>
      <div className="min-w-[12rem] flex-1">
        <div className="mb-1.5 flex justify-between">
          <span className="eyebrow">Shift progress</span>
          <span className="font-mono tnum text-xs text-muted">
            {elapsed} / {total} min
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-raised">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
