import type { SignalStatus } from '@/types/domain';
import type { ModuleView } from '@/hooks/useProductionData';

/**
 * Alert rules.
 *
 * The hard part of an alerting system is not detecting problems, it is
 * staying quiet. A wall of red at 08:15 because no module has hit its daily
 * target yet teaches everyone to ignore the panel, and after that a real
 * over-WIP alert is invisible too.
 *
 * So every rule here has a suppression condition, and each one is tested.
 */

export type AlertKind =
  | 'OVER_WIP'
  | 'LOW_WIP'
  | 'BEHIND_TARGET'
  | 'FORECAST_SHORT'
  | 'NO_OUTPUT'
  | 'NO_PLAN';

export interface Alert {
  /** Deterministic, so acknowledging one silences it for the day. */
  id: string;
  kind: AlertKind;
  severity: SignalStatus;
  moduleId: string;
  moduleCode: string;
  title: string;
  detail: string;
}

export interface AlertSettings {
  overWip: boolean;
  lowWip: boolean;
  behindTarget: boolean;
  forecastShort: boolean;
  noOutput: boolean;
  /** Nothing fires before this much of the shift has run. */
  minElapsedMinutes: number;
  /** Achievement below this counts as behind. */
  behindThresholdPct: number;
}

export interface AlertContext {
  views: ModuleView[];
  settings: AlertSettings;
  elapsedMinutes: number;
  /** Index of the last slot that has fully finished, or null early on. */
  lastCompletedSlot: number | null;
  dateKey: string;
  shiftRunning: boolean;
}

const SEVERITY_ORDER: Record<SignalStatus, number> = { RED: 0, AMBER: 1, GREEN: 2, GREY: 3 };

export function evaluateAlerts({
  views,
  settings,
  elapsedMinutes,
  lastCompletedSlot,
  dateKey,
  shiftRunning,
}: AlertContext): Alert[] {
  // Nothing to say when the factory is not running.
  if (!shiftRunning) return [];

  const alerts: Alert[] = [];
  const id = (kind: AlertKind, moduleId: string) => `${kind}__${moduleId}__${dateKey}`;

  for (const view of views) {
    const { module, metrics, plan } = view;

    if (module.active === false) continue;

    /* Over WIP fires immediately. It does not need the shift to have run —
       a module drowning at 08:10 needs feeding stopped at 08:10. */
    if (settings.overWip && metrics.wip.reason === 'OVER') {
      alerts.push({
        id: id('OVER_WIP', module.id),
        kind: 'OVER_WIP',
        severity: 'RED',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} is over WIP`,
        detail: `${metrics.wipPieces} pieces waiting. Stop feeding this module.`,
      });
    }

    if (settings.lowWip && metrics.wip.reason === 'LOW') {
      alerts.push({
        id: id('LOW_WIP', module.id),
        kind: 'LOW_WIP',
        severity: 'AMBER',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} is running out of work`,
        detail: `Only ${metrics.wipPieces} pieces left. Feed it before the line stops.`,
      });
    }

    /* A module with no plan is worth knowing about, but only once the shift
       is properly underway — plans are often entered a few minutes late. */
    if (!plan && elapsedMinutes >= settings.minElapsedMinutes) {
      alerts.push({
        id: id('NO_PLAN', module.id),
        kind: 'NO_PLAN',
        severity: 'GREY',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} has no plan today`,
        detail: 'Without a plan there is no target, so this module is not being measured.',
      });
      continue;
    }

    // Everything below compares against a target, so it needs enough of the
    // shift to have run to mean anything.
    if (elapsedMinutes < settings.minElapsedMinutes) continue;

    if (
      settings.behindTarget &&
      metrics.achievement !== null &&
      metrics.achievement < settings.behindThresholdPct
    ) {
      alerts.push({
        id: id('BEHIND_TARGET', module.id),
        kind: 'BEHIND_TARGET',
        severity: metrics.achievementBand === 'RED' ? 'RED' : 'AMBER',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} is behind target`,
        detail:
          metrics.requiredRate !== null
            ? `At ${Math.round(metrics.achievement)}% of target. Needs ${metrics.requiredRate} pieces an hour to catch up.`
            : `At ${Math.round(metrics.achievement)}% of target.`,
      });
    }

    if (
      settings.forecastShort &&
      metrics.forecast !== null &&
      metrics.target !== null &&
      metrics.forecast < metrics.target
    ) {
      const shortfall = metrics.target - metrics.forecast;
      alerts.push({
        id: id('FORECAST_SHORT', module.id),
        kind: 'FORECAST_SHORT',
        severity: 'AMBER',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} will finish short`,
        detail: `On the current rate it ends the shift about ${shortfall} pieces under target.`,
      });
    }

    /* No output in the last finished slot. Checked against a completed slot
       rather than the current one, because a module twenty minutes into an
       hour has legitimately not scanned anything out yet. */
    if (
      settings.noOutput &&
      lastCompletedSlot !== null &&
      (view.bySlot[lastCompletedSlot] ?? 0) === 0
    ) {
      alerts.push({
        id: id('NO_OUTPUT', module.id),
        kind: 'NO_OUTPUT',
        severity: 'AMBER',
        moduleId: module.id,
        moduleCode: module.code,
        title: `${module.code} recorded nothing last hour`,
        detail: 'Either the line stopped, or bundles are not being scanned out.',
      });
    }
  }

  return alerts.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.moduleCode.localeCompare(b.moduleCode),
  );
}

/**
 * Acknowledgements live in local storage rather than Firestore.
 *
 * An alert is a view of current state, not a record of anything — writing a
 * notification document per module per rule would add writes on every
 * dashboard load and leave stale rows to clean up. Dismissing one silences
 * it on that device for the rest of the day, which is what a supervisor
 * actually wants.
 */
const KEY = 'gpt.alerts.acknowledged';

export function loadAcknowledged(dateKey: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string[]>;
    return new Set(raw[dateKey] ?? []);
  } catch {
    return new Set();
  }
}

export function acknowledge(dateKey: string, alertId: string): void {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string[]>;
    const forDay = new Set(raw[dateKey] ?? []);
    forDay.add(alertId);
    // Only today's acknowledgements are kept, so the store cannot grow.
    localStorage.setItem(KEY, JSON.stringify({ [dateKey]: Array.from(forDay) }));
  } catch {
    // Storage unavailable; alerts simply reappear.
  }
}
