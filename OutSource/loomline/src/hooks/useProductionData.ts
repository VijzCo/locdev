import { useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useCurrentSlot } from '@/hooks/useCurrentSlot';
import { useConfig } from '@/config/ConfigProvider';
import { moduleMetrics, type ModuleMetrics } from '@/calc/engine';
import { productionMinutes } from '@/time/slots';
import type {
  DailyPlan,
  Department,
  Factory,
  HourlyProduction,
  Module,
  ModuleWip,
  Section,
  Style,
} from '@/types/domain';

export interface ModuleView {
  module: Module;
  department: Department | null;
  section: Section | null;
  factory: Factory | null;
  plan: DailyPlan | null;
  style: Style | null;
  metrics: ModuleMetrics;
  /** Output per slot index for today, for the hourly chart. */
  bySlot: Record<number, number>;
}

export interface ProductionTotals {
  target: number | null;
  actual: number;
  achievement: number | null;
  wipPieces: number;
  activeModules: number;
  overWip: number;
  lowWip: number;
  forecast: number | null;
}

export interface Filter {
  factoryId?: string | null;
  departmentId?: string | null;
  sectionId?: string | null;
  moduleId?: string | null;
}

/**
 * One place assembles the numbers every dashboard shows.
 *
 * Each screen filters this rather than querying and computing for itself,
 * because the moment two screens build their own figures they start
 * disagreeing about the same module — and on a factory floor the wall
 * display and the manager's laptop showing different output for M02 is worse
 * than either being slightly wrong.
 *
 * Reads are cheap by design: WIP is a counter document per module rather
 * than a listener over every bundle, so a wall covering twenty modules
 * watches sixty small documents rather than several thousand.
 */
export function useProductionData(filter: Filter = {}) {
  const { cfg } = useConfig();
  const slot = useCurrentSlot(filter.factoryId);

  const { items: modules } = useTenantCollection<Module>('modules');
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: sections } = useTenantCollection<Section>('sections');
  const { items: factories } = useTenantCollection<Factory>('factories');
  const { items: styles } = useTenantCollection<Style>('styles');
  const { items: wip } = useTenantCollection<ModuleWip & { id: string }>('moduleWip');

  const { items: hourly } = useTenantCollection<HourlyProduction>('hourlyProduction', {
    filterField: 'date',
    filterValue: slot.dateKey,
  });

  const { items: plans } = useTenantCollection<DailyPlan>('dailyPlans', {
    filterField: 'date',
    filterValue: slot.dateKey,
  });

  const loading = !modules || !departments || !hourly || !plans;

  const views = useMemo<ModuleView[]>(() => {
    if (!modules) return [];

    const shiftMinutes = slot.shift ? productionMinutes(slot.shift) : 0;

    return modules
      .filter((m) => {
        if (filter.moduleId && m.id !== filter.moduleId) return false;
        if (filter.sectionId && m.sectionId !== filter.sectionId) return false;
        if (filter.departmentId && m.departmentId !== filter.departmentId) return false;
        if (filter.factoryId && m.factoryId !== filter.factoryId) return false;
        return true;
      })
      .map((module) => {
        const department = departments?.find((d) => d.id === module.departmentId) ?? null;
        const section = sections?.find((s) => s.id === module.sectionId) ?? null;
        const factory = factories?.find((f) => f.id === module.factoryId) ?? null;
        const plan = plans?.find((p) => p.moduleId === module.id) ?? null;
        const style = styles?.find((s) => s.id === plan?.styleId) ?? null;

        const rows = (hourly ?? []).filter((h) => h.moduleId === module.id);
        const actual = rows.reduce((sum, h) => sum + (h.pieces ?? 0), 0);
        const bySlot: Record<number, number> = {};
        rows.forEach((h) => {
          bySlot[h.slotIndex] = (bySlot[h.slotIndex] ?? 0) + (h.pieces ?? 0);
        });

        const counter = wip?.find((w) => w.id === module.id);

        const scope = {
          factoryId: module.factoryId,
          departmentId: module.departmentId,
          sectionId: module.sectionId,
          moduleId: module.id,
          styleId: style?.id,
        };

        const metrics = moduleMetrics({
          actual,
          wipPieces: counter?.pieces ?? 0,
          // Plan values win over defaults: today's headcount is a fact, the
          // module's stored count is only an expectation.
          operators: plan?.operators ?? module.operatorCount ?? 0,
          smv: plan?.smv ?? style?.smv ?? 0,
          plannedEfficiencyPct: plan?.plannedEfficiency ?? cfg('target.plannedEfficiency', scope),
          productionMinutesTotal: shiftMinutes,
          productionMinutesElapsed: slot.elapsedMinutes,
          thresholds: {
            min: cfg('wip.min', scope),
            reorder: cfg('wip.reorder', scope),
            max: cfg('wip.max', scope),
          },
          moduleActive: module.active !== false,
          hasPlanToday: Boolean(plan),
          achievementGreenAt: cfg('achievement.greenPct', scope),
          achievementAmberAt: cfg('achievement.amberPct', scope),
          efficiencyGreenAt: cfg('efficiency.greenPct', scope),
          efficiencyAmberAt: cfg('efficiency.amberPct', scope),
          forecastMinElapsedMinutes: cfg('forecast.minElapsedMinutes', scope),
        });

        return { module, department, section, factory, plan, style, metrics, bySlot };
      })
      .sort((a, b) => a.module.code.localeCompare(b.module.code));
  }, [
    modules, departments, sections, factories, styles, plans, hourly, wip,
    slot.shift, slot.elapsedMinutes, filter.moduleId, filter.sectionId,
    filter.departmentId, filter.factoryId, cfg,
  ]);

  const totals = useMemo<ProductionTotals>(() => {
    const planned = views.filter((v) => v.metrics.target !== null);
    const target = planned.length
      ? planned.reduce((s, v) => s + (v.metrics.target ?? 0), 0)
      : null;
    const actual = views.reduce((s, v) => s + v.metrics.actual, 0);
    const forecasts = views.filter((v) => v.metrics.forecast !== null);

    return {
      target,
      actual,
      achievement: target ? (actual / target) * 100 : null,
      wipPieces: views.reduce((s, v) => s + v.metrics.wipPieces, 0),
      activeModules: views.filter((v) => v.module.active !== false).length,
      overWip: views.filter((v) => v.metrics.wip.reason === 'OVER').length,
      lowWip: views.filter((v) => v.metrics.wip.reason === 'LOW' || v.metrics.wip.reason === 'REORDER').length,
      forecast: forecasts.length
        ? forecasts.reduce((s, v) => s + (v.metrics.forecast ?? 0), 0)
        : null,
    };
  }, [views]);

  useWipSnapshots(views, slot.dateKey, slot.minuteOfDay);

  return { loading, views, totals, slot };
}

/**
 * Hourly WIP snapshots (Part D6).
 *
 * WIP reports need a time series, but counters only hold the current value
 * and there is no server-side scheduler without Cloud Functions. So whichever
 * client happens to have a dashboard open writes the snapshot.
 *
 * The document id is `{moduleId}_{yyyymmddHH}`, which makes concurrent
 * writers harmless — three dashboards open at once write the same document
 * with the same content rather than three rows. Cost is one small write per
 * module per hour.
 *
 * The gap this leaves is real and documented: if nobody has a dashboard open
 * for an hour, that hour has no snapshot. Reports fall back to reconstructing
 * from the scan ledger for the affected window.
 */
function useWipSnapshots(views: ModuleView[], dateKey: string, minuteOfDay: number) {
  const written = useRef<string>('');
  const hour = Math.floor(minuteOfDay / 60);

  useEffect(() => {
    if (!db || views.length === 0) return;

    const stamp = `${dateKey}_${String(hour).padStart(2, '0')}`;
    if (written.current === stamp) return;
    written.current = stamp;

    views.forEach((v) => {
      // Fire and forget: a failed snapshot must never disturb a dashboard,
      // and the deterministic id means the next open client fixes it.
      setDoc(
        doc(db!, 'wipSnapshots', `${v.module.id}_${stamp}`),
        {
          tenantId: v.module.tenantId,
          factoryId: v.module.factoryId,
          moduleId: v.module.id,
          date: dateKey,
          hour,
          pieces: v.metrics.wipPieces,
          bundles: 0,
        },
        { merge: true },
      ).catch(() => {});
    });
  }, [views, dateKey, hour]);
}
