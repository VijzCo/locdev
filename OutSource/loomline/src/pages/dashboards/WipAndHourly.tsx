import { useProductionData } from '@/hooks/useProductionData';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { Metric, StatusChip } from '@/components/ui/Metric';
import { EmptyState, LoadingState } from '@/components/common/States';
import { ShiftStrip } from '@/components/dashboard/ModuleCard';
import { formatMinute } from '@/time/slots';
import { cn, formatMetric } from '@/lib/utils';

const REASON: Record<string, string> = {
  OVER: 'Over WIP — stop feeding',
  NORMAL: 'Normal',
  REORDER: 'Below reorder — feed soon',
  LOW: 'Critically low',
  INACTIVE: 'Module inactive',
  NO_PLAN: 'No plan today',
};

/**
 * WIP across the factory, ordered by what needs attention rather than by
 * module code. A supervisor opening this screen wants the problems first.
 */
export function WipDashboard() {
  const { loading, views, totals, slot } = useProductionData();

  const ordered = [...views].sort((a, b) => {
    const weight = { RED: 0, AMBER: 1, GREEN: 2, GREY: 3 } as const;
    return weight[a.metrics.wip.status] - weight[b.metrics.wip.status];
  });

  return (
    <>
      <PageHeader
        title="WIP dashboard"
        description="Work in progress by module, most urgent first."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <ShiftStrip
          shiftName={slot.shift?.name ?? 'No shift running'}
          time={slot.time}
          elapsed={slot.elapsedMinutes}
          total={slot.totalMinutes}
          dateKey={slot.dateKey}
        />

        <Card>
          <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
            <Metric label="Total WIP pieces" value={totals.wipPieces} />
            <Metric label="Modules" value={totals.activeModules} />
            <Metric
              label="Over WIP"
              value={totals.overWip || null}
              status={totals.overWip > 0 ? 'RED' : undefined}
            />
            <Metric
              label="Need feeding"
              value={totals.lowWip || null}
              status={totals.lowWip > 0 ? 'AMBER' : undefined}
            />
          </CardBody>
        </Card>

        {loading ? (
          <LoadingState label="Loading WIP" />
        ) : ordered.length === 0 ? (
          <EmptyState title="No modules to show" />
        ) : (
          <div className="space-y-2">
            {ordered.map((v) => (
              <Card key={v.module.id} signal={v.metrics.wip.status}>
                <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-4">
                  <div className="min-w-[7rem]">
                    <p className="font-display text-lg uppercase tracking-[0.03em] leading-tight">
                      {v.module.code}
                    </p>
                    <p className="font-mono text-xs text-muted">{v.style?.code ?? '—'}</p>
                  </div>
                  <Metric label="WIP pieces" value={v.metrics.wipPieces || null} size="sm" />
                  <Metric label="Actual today" value={v.metrics.actual || null} size="sm" />
                  <StatusChip
                    status={v.metrics.wip.status}
                    label={REASON[v.metrics.wip.reason]}
                    className="ml-auto"
                  />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Output per hour across every module — the grid a production manager reads
 * to see which line lost an hour and when.
 */
export function HourlyOutput() {
  const { loading, views, slot } = useProductionData();
  const slots = (slot.shift?.slots ?? []).filter((s) => s.active !== false);

  return (
    <>
      <PageHeader
        title="Hourly output"
        description="Pieces scanned out per slot, by module. Derived from out scans, not entered by hand."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <ShiftStrip
          shiftName={slot.shift?.name ?? 'No shift running'}
          time={slot.time}
          elapsed={slot.elapsedMinutes}
          total={slot.totalMinutes}
          dateKey={slot.dateKey}
        />

        {loading ? (
          <LoadingState label="Loading output" />
        ) : slots.length === 0 ? (
          <EmptyState title="No shift running, so there are no production slots" />
        ) : (
          <Card>
            <CardBody className="overflow-x-auto pt-4">
              <table className="w-full min-w-[40rem] border-collapse">
                <thead>
                  <tr>
                    <th className="eyebrow border-b border-line px-2 pb-2 text-left">Module</th>
                    {slots.map((s) => (
                      <th key={s.index} className="border-b border-line px-2 pb-2">
                        <span className="eyebrow block text-center">
                          {formatMinute(s.startMinute)}
                        </span>
                      </th>
                    ))}
                    <th className="eyebrow border-b border-line px-2 pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {views.map((v) => (
                    <tr key={v.module.id}>
                      <td className="border-b border-line px-2 py-2 font-display uppercase tracking-[0.03em]">
                        {v.module.code}
                      </td>
                      {slots.map((s) => {
                        const pieces = v.bySlot[s.index] ?? 0;
                        return (
                          <td
                            key={s.index}
                            className={cn(
                              'border-b border-line px-2 py-2 text-center font-mono tnum text-sm',
                              s.isBreak && 'bg-raised text-faint',
                              !s.isBreak && pieces === 0 && 'text-faint',
                            )}
                          >
                            {s.isBreak ? '—' : pieces || '·'}
                          </td>
                        );
                      })}
                      <td className="border-b border-line px-2 py-2 text-right font-mono tnum text-sm">
                        {formatMetric(v.metrics.actual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
