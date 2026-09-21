import { useMemo, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { operatorMinutes, targetQty } from '@/calc/engine';
import { productionMinutes } from '@/time/slots';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { Metric } from '@/components/ui/Metric';
import { cn, formatMetric } from '@/lib/utils';
import type { DailyPlan, Module, PurchaseOrder, Shift, Style } from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink focus:border-accent';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Daily plans set the target a module is measured against.
 *
 * The document id is `{moduleId}_{date}_{shiftId}`, which is what enforces
 * §18's rule against duplicate plans for the same module, shift and day —
 * a second plan overwrites the first rather than quietly creating a rival
 * target that different screens might disagree over.
 */
export function DailyPlans() {
  const { profile, canWrite } = useAuth();
  const { cfg } = useConfig();

  const { items: plans, remove } = useTenantCollection<DailyPlan>('dailyPlans');
  const { items: modules } = useTenantCollection<Module>('modules');
  const { items: shifts } = useTenantCollection<Shift>('shifts');
  const { items: styles } = useTenantCollection<Style>('styles');
  const { items: pos } = useTenantCollection<PurchaseOrder>('purchaseOrders');

  const [date, setDate] = useState(today());
  const [moduleId, setModuleId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [poId, setPoId] = useState('');
  const [operators, setOperators] = useState(0);
  const [smv, setSmv] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [busy, setBusy] = useState(false);

  const editable = canWrite('plan.manage');

  const module = modules?.find((m) => m.id === moduleId) ?? null;
  const shift = shifts?.find((s) => s.id === shiftId) ?? null;
  const style = styles?.find((s) => s.id === styleId) ?? null;

  /* Defaults come from the records that already know the answer: headcount
     from the module, SMV from the style, efficiency from configuration. The
     planner overrides only what differs today. */
  function pickModule(id: string) {
    setModuleId(id);
    const m = modules?.find((x) => x.id === id);
    if (m && !operators) setOperators(m.operatorCount ?? 0);
    if (m && !efficiency) {
      setEfficiency(cfg('target.plannedEfficiency', { factoryId: m.factoryId, moduleId: m.id }));
    }
  }

  function pickStyle(id: string) {
    setStyleId(id);
    const s = styles?.find((x) => x.id === id);
    if (s) setSmv(s.smv);
  }

  const preview = useMemo(() => {
    if (!shift) return null;
    const minutes = productionMinutes(shift);
    const opMinutes = operatorMinutes(minutes, operators);
    return {
      minutes,
      opMinutes,
      target: targetQty(opMinutes, efficiency, smv),
    };
  }, [shift, operators, efficiency, smv]);

  async function save() {
    if (!db || !profile || !module || !shift || !style || !preview?.target) return;
    setBusy(true);
    try {
      const id = `${module.id}_${date}_${shift.id}`;
      await setDoc(doc(db, 'dailyPlans', id), {
        tenantId: profile.tenantId,
        factoryId: module.factoryId,
        moduleId: module.id,
        shiftId: shift.id,
        date,
        styleId: style.id,
        poId,
        operators,
        smv,
        plannedEfficiency: efficiency,
        targetQty: preview.target,
      });
      setModuleId('');
      setStyleId('');
      setOperators(0);
      setSmv(0);
    } finally {
      setBusy(false);
    }
  }

  const forDate = useMemo(
    () => (plans ?? []).filter((p) => p.date === date),
    [plans, date],
  );

  const complete = module && shift && style && operators > 0 && smv > 0 && efficiency > 0;

  return (
    <>
      <PageHeader
        title="Daily plans"
        description="What each module is running today, and the target it is measured against."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="eyebrow mb-1.5 block">Date</label>
            <input
              className={input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-6">
            <Metric label="Plans" value={forDate.length || null} size="sm" />
            <Metric
              label="Total target"
              value={forDate.reduce((s, p) => s + (p.targetQty ?? 0), 0) || null}
              size="sm"
            />
          </div>
        </div>

        {editable && (
          <Card>
            <CardBody className="space-y-3 pt-4">
              <p className="eyebrow">New plan</p>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <label className="eyebrow mb-1.5 block">Module</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={moduleId}
                    onChange={(e) => pickModule(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(modules ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Shift</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(shifts ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Style</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={styleId}
                    onChange={(e) => pickStyle(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(styles ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Order</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={poId}
                    onChange={(e) => setPoId(e.target.value)}
                  >
                    <option value="">Optional</option>
                    {(pos ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.poNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Operators</label>
                  <input
                    className={input}
                    type="number"
                    value={operators || ''}
                    onChange={(e) => setOperators(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">SMV</label>
                  <input
                    className={input}
                    type="number"
                    step="0.01"
                    value={smv || ''}
                    onChange={(e) => setSmv(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Planned efficiency %</label>
                  <input
                    className={input}
                    type="number"
                    value={efficiency || ''}
                    onChange={(e) => setEfficiency(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* The target is shown as it is entered, because a planner needs
                  to see whether a headcount change is worth making before
                  committing to it. */}
              {preview && (
                <div className="flex flex-wrap items-end gap-8 rounded border border-line bg-raised px-4 py-3">
                  <Metric label="Production minutes" value={preview.minutes} size="sm" />
                  <Metric label="Operator minutes" value={preview.opMinutes} size="sm" />
                  <Metric label="Target" value={preview.target} size="sm" status="GREEN" />
                  {preview.target === null && (
                    <p className="text-sm text-muted">
                      A target needs a shift with production time, operators, and an SMV above
                      zero.
                    </p>
                  )}
                </div>
              )}

              <Button variant="primary" onClick={save} disabled={busy || !complete}>
                {busy ? 'Saving' : 'Save plan'}
              </Button>
            </CardBody>
          </Card>
        )}

        {plans === null ? (
          <LoadingState label="Loading plans" />
        ) : forDate.length === 0 ? (
          <EmptyState title={`No plans for ${date} — add one so modules have a target`} />
        ) : (
          <div className="space-y-2">
            {forDate.map((p) => {
              const m = modules?.find((x) => x.id === p.moduleId);
              const s = styles?.find((x) => x.id === p.styleId);
              return (
                <Card key={p.id} signal="GREEN">
                  <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-4">
                    <div className="min-w-[8rem]">
                      <p className="font-display text-lg uppercase tracking-[0.03em] leading-tight">
                        {m?.code ?? '—'}
                      </p>
                      <p className="font-mono text-xs text-muted">{s?.code ?? '—'}</p>
                    </div>
                    <Field label="Operators" value={formatMetric(p.operators)} />
                    <Field label="SMV" value={String(p.smv)} />
                    <Field label="Planned eff" value={`${p.plannedEfficiency}%`} />
                    <Metric label="Target" value={p.targetQty} size="sm" />
                    {editable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="font-mono tnum text-sm">{value}</p>
    </div>
  );
}
