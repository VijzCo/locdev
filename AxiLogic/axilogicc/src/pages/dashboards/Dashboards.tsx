import { useState } from 'react';
import { useProductionData } from '@/hooks/useProductionData';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { ModuleCard, ShiftStrip, TotalsStrip } from '@/components/dashboard/ModuleCard';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { Metric } from '@/components/ui/Metric';
import { EmptyState, LoadingState } from '@/components/common/States';
import { cn, formatMetric } from '@/lib/utils';
import type { Department, Section } from '@/types/domain';

function Frame({
  title,
  description,
  filter,
  children,
}: {
  title: string;
  description: string;
  filter?: Parameters<typeof useProductionData>[0];
  children?: React.ReactNode;
}) {
  const { loading, views, totals, slot } = useProductionData(filter);

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="space-y-4 p-4 sm:p-6">
        <ShiftStrip
          shiftName={slot.shift?.name ?? 'No shift running'}
          time={slot.time}
          elapsed={slot.elapsedMinutes}
          total={slot.totalMinutes}
          dateKey={slot.dateKey}
        />

        {children}

        <TotalsStrip totals={totals} />

        {loading ? (
          <LoadingState label="Loading production" />
        ) : views.length === 0 ? (
          <EmptyState title="No modules here yet — add them under master data" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {views.map((v) => (
              <ModuleCard key={v.module.id} view={v} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function FactoryDashboard() {
  return (
    <Frame
      title="Factory dashboard"
      description="Every module, live. Figures update as scans arrive."
    />
  );
}

export function DepartmentDashboard() {
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: sections } = useTenantCollection<Section>('sections');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const inDept = (sections ?? []).filter((s) => !departmentId || s.departmentId === departmentId);

  return (
    <Frame
      title="Department dashboard"
      description="The same figures, narrowed to one department or section."
      filter={{ departmentId, sectionId }}
    >
      <div className="flex flex-wrap gap-1.5">
        <Chip active={!departmentId} onClick={() => { setDepartmentId(null); setSectionId(null); }}>
          All departments
        </Chip>
        {(departments ?? []).map((d) => (
          <Chip
            key={d.id}
            active={departmentId === d.id}
            onClick={() => { setDepartmentId(d.id); setSectionId(null); }}
          >
            {d.name}
          </Chip>
        ))}
      </div>

      {departmentId && inDept.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!sectionId} onClick={() => setSectionId(null)}>
            All sections
          </Chip>
          {inDept.map((s) => (
            <Chip key={s.id} active={sectionId === s.id} onClick={() => setSectionId(s.id)}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}
    </Frame>
  );
}

/** One module in detail, including its hour-by-hour output. */
export function ModuleDashboard() {
  const [moduleId, setModuleId] = useState<string | null>(null);
  const { views, slot } = useProductionData({});
  const selected = views.find((v) => v.module.id === moduleId) ?? views[0] ?? null;

  return (
    <>
      <PageHeader
        title="Module dashboard"
        description="One line in detail, hour by hour."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          {views.map((v) => (
            <Chip
              key={v.module.id}
              active={selected?.module.id === v.module.id}
              onClick={() => setModuleId(v.module.id)}
            >
              {v.module.code}
            </Chip>
          ))}
        </div>

        {!selected ? (
          <EmptyState title="No modules to show" />
        ) : (
          <>
            <ShiftStrip
              shiftName={slot.shift?.name ?? 'No shift running'}
              time={slot.time}
              elapsed={slot.elapsedMinutes}
              total={slot.totalMinutes}
              dateKey={slot.dateKey}
            />

            <Card signal={selected.metrics.wip.status}>
              <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Actual" value={selected.metrics.actual} />
                <Metric label="Target" value={selected.metrics.target} />
                <Metric
                  label="Achievement"
                  value={selected.metrics.achievement}
                  suffix="%"
                  status={selected.metrics.achievementBand}
                />
                <Metric
                  label="Efficiency"
                  value={selected.metrics.efficiency}
                  suffix="%"
                  status={selected.metrics.efficiencyBand}
                />
                <Metric label="WIP" value={selected.metrics.wipPieces} />
                <Metric label="Forecast" value={selected.metrics.forecast} />
              </CardBody>
            </Card>

            <HourlyBars view={selected} shiftSlots={slot.shift?.slots ?? []} />

            <Card>
              <CardBody className="grid gap-4 pt-4 sm:grid-cols-4">
                <Field label="Style" value={selected.style?.code ?? '—'} />
                <Field label="Operators" value={formatMetric(selected.plan?.operators ?? null)} />
                <Field label="SMV" value={selected.plan?.smv ? String(selected.plan.smv) : '—'} />
                <Field
                  label="Needs per hour"
                  value={
                    selected.metrics.requiredRate === null
                      ? 'On track'
                      : `${formatMetric(selected.metrics.requiredRate)}`
                  }
                />
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Hour-by-hour output. Bars rather than a line chart because production is a
 * count per slot, not a continuous quantity, and because breaks should read
 * as absent rather than as a dip to zero.
 */
function HourlyBars({
  view,
  shiftSlots,
}: {
  view: ReturnType<typeof useProductionData>['views'][number];
  shiftSlots: { index: number; startMinute: number; isBreak: boolean }[];
}) {
  const values = shiftSlots.filter((s) => !s.isBreak).map((s) => view.bySlot[s.index] ?? 0);
  const peak = Math.max(1, ...values);

  return (
    <Card>
      <CardBody className="pt-4">
        <p className="eyebrow mb-3">Output by hour</p>
        {shiftSlots.length === 0 ? (
          <p className="text-sm text-muted">No shift running, so there are no slots to show.</p>
        ) : (
          <div className="flex items-end gap-1.5" style={{ height: '9rem' }}>
            {shiftSlots.map((s) => {
              const pieces = view.bySlot[s.index] ?? 0;
              const height = s.isBreak ? 6 : Math.max(2, (pieces / peak) * 100);
              return (
                <div key={s.index} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono tnum text-xs text-muted">
                    {s.isBreak ? '' : pieces || ''}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-sm',
                      s.isBreak ? 'bg-line' : pieces > 0 ? 'bg-accent' : 'bg-raised',
                    )}
                    style={{ height: `${height}%` }}
                    title={s.isBreak ? 'Break' : `${pieces} pieces`}
                  />
                  <span className="font-mono text-[0.625rem] text-faint">
                    {String(Math.floor(s.startMinute / 60)).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 rounded border px-3 font-display text-sm uppercase tracking-[0.04em]',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-line bg-surface text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
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
