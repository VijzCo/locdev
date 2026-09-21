import type { SignalStatus, WipThresholds } from '@/types/domain';

/**
 * The calculation engine.
 *
 * §40 asks for one module that owns every derived number, and nothing else
 * in this codebase computes a target, an efficiency, an achievement or a
 * forecast. Duplicating one of these formulas in a component is how two
 * screens end up disagreeing about the same module.
 *
 * Every function returns `null` rather than NaN or Infinity when an input is
 * missing or a divisor is zero. A factory with no SMV recorded should see an
 * em dash, not "Infinity%".
 */

/** Guards a divisor. Zero operators or zero SMV are real states, not errors. */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/**
 * Total operator minutes available.
 *
 * The original brief defined available minutes as `minutes × operators` and
 * then multiplied by operators again in the target formula, which
 * double-counts: a 30-operator module would show a target 30× too high.
 * Part B1 of the architecture document records the correction. This is the
 * single term both target and efficiency divide by, which is what keeps them
 * consistent — hitting target always yields exactly the planned efficiency.
 */
export function operatorMinutes(productionMinutes: number, operators: number): number | null {
  if (!Number.isFinite(productionMinutes) || !Number.isFinite(operators)) return null;
  if (productionMinutes < 0 || operators < 0) return null;
  return productionMinutes * operators;
}

/**
 * Target quantity for a plan.
 *
 *   target = (operator minutes × planned efficiency) / SMV
 */
export function targetQty(
  opMinutes: number | null,
  plannedEfficiencyPct: number,
  smv: number,
): number | null {
  if (opMinutes === null || !Number.isFinite(plannedEfficiencyPct)) return null;
  if (smv <= 0) return null;
  const result = safeDivide(opMinutes * (plannedEfficiencyPct / 100), smv);
  return result === null ? null : Math.floor(result);
}

/** Achievement against target, as a percentage. */
export function achievementPct(actual: number, target: number): number | null {
  const ratio = safeDivide(actual, target);
  return ratio === null ? null : ratio * 100;
}

/**
 * Efficiency: the minutes of standard work produced, over the minutes paid
 * for.
 *
 *   efficiency = (actual × SMV) / operator minutes × 100
 */
export function efficiencyPct(
  actual: number,
  smv: number,
  opMinutes: number | null,
): number | null {
  if (opMinutes === null || smv <= 0 || !Number.isFinite(actual)) return null;
  const ratio = safeDivide(actual * smv, opMinutes);
  return ratio === null ? null : ratio * 100;
}

/** Pieces per hour achieved so far. */
export function hourlyRate(actual: number, elapsedMinutes: number): number | null {
  const perMinute = safeDivide(actual, elapsedMinutes);
  return perMinute === null ? null : perMinute * 60;
}

export interface ForecastInput {
  actual: number;
  elapsedProductionMinutes: number;
  remainingProductionMinutes: number;
  /** Forecasts are suppressed before this much of the shift has run. */
  minElapsedMinutes: number;
}

/**
 * Day forecast.
 *
 * Deliberately conservative in two ways. It projects the rate achieved so
 * far rather than the best hour, and it refuses to answer at all until
 * enough of the shift has run — a forecast built on twelve minutes of data
 * is worse than no forecast, because people act on it.
 *
 * Remaining minutes come from the shift's production slots, so breaks and
 * shift end are already accounted for.
 */
export function forecast(input: ForecastInput): number | null {
  const { actual, elapsedProductionMinutes, remainingProductionMinutes, minElapsedMinutes } = input;

  if (elapsedProductionMinutes < minElapsedMinutes) return null;
  if (!Number.isFinite(actual) || actual < 0) return null;

  const perMinute = safeDivide(actual, elapsedProductionMinutes);
  if (perMinute === null) return null;

  return Math.round(actual + perMinute * Math.max(0, remainingProductionMinutes));
}

/** Pieces per hour still needed to reach target. Null once target is met. */
export function requiredHourlyRate(
  target: number,
  actual: number,
  remainingProductionMinutes: number,
): number | null {
  const shortfall = target - actual;
  if (shortfall <= 0) return null;
  const perMinute = safeDivide(shortfall, remainingProductionMinutes);
  return perMinute === null ? null : Math.ceil(perMinute * 60);
}

export function orderCompletionPct(produced: number, orderQty: number): number | null {
  const ratio = safeDivide(produced, orderQty);
  return ratio === null ? null : Math.min(100, ratio * 100);
}

/**
 * Generic threshold banding, used for achievement and efficiency alike.
 * Thresholds are configuration, never literals in a component.
 */
export function bandFor(
  value: number | null,
  greenAt: number,
  amberAt: number,
): SignalStatus {
  if (value === null || !Number.isFinite(value)) return 'GREY';
  if (value >= greenAt) return 'GREEN';
  if (value >= amberAt) return 'AMBER';
  return 'RED';
}

export interface WipInput {
  pieces: number;
  thresholds: WipThresholds;
  moduleActive: boolean;
  hasPlanToday: boolean;
}

export interface WipResult {
  status: SignalStatus;
  reason: 'OVER' | 'NORMAL' | 'REORDER' | 'LOW' | 'INACTIVE' | 'NO_PLAN';
}

/**
 * WIP banding, resolving the overlap in the original brief.
 *
 * §12 defined green as min ≤ WIP ≤ max while §13's example left 50–99
 * belonging to both green and amber. Part B2 settles it: over maximum is
 * red, reorder to maximum is green, minimum to reorder is amber, and below
 * minimum is grey.
 *
 * "No plan today" and "critically low" are both grey but carry different
 * reasons, so the interface can say which without inventing a fifth colour.
 */
export function wipStatus({ pieces, thresholds, moduleActive, hasPlanToday }: WipInput): WipResult {
  if (!moduleActive) return { status: 'GREY', reason: 'INACTIVE' };
  if (!hasPlanToday) return { status: 'GREY', reason: 'NO_PLAN' };
  if (pieces > thresholds.max) return { status: 'RED', reason: 'OVER' };
  if (pieces >= thresholds.reorder) return { status: 'GREEN', reason: 'NORMAL' };
  if (pieces >= thresholds.min) return { status: 'AMBER', reason: 'REORDER' };
  return { status: 'GREY', reason: 'LOW' };
}

/** Whether an order looks likely to finish, per §21. */
export function completionOutlook(
  forecastQty: number | null,
  remainingOrderQty: number,
): SignalStatus {
  if (forecastQty === null) return 'GREY';
  if (forecastQty >= remainingOrderQty) return 'GREEN';
  if (forecastQty >= remainingOrderQty * 0.9) return 'AMBER';
  return 'RED';
}

/**
 * Everything a module card needs, computed once. Screens call this rather
 * than assembling the figures themselves, so a dashboard and a wall display
 * can never disagree.
 */
export interface ModuleMetricsInput {
  actual: number;
  wipPieces: number;
  operators: number;
  smv: number;
  plannedEfficiencyPct: number;
  productionMinutesTotal: number;
  productionMinutesElapsed: number;
  thresholds: WipThresholds;
  moduleActive: boolean;
  hasPlanToday: boolean;
  achievementGreenAt: number;
  achievementAmberAt: number;
  efficiencyGreenAt: number;
  efficiencyAmberAt: number;
  forecastMinElapsedMinutes: number;
}

export interface ModuleMetrics {
  target: number | null;
  actual: number;
  achievement: number | null;
  achievementBand: SignalStatus;
  efficiency: number | null;
  efficiencyBand: SignalStatus;
  hourly: number | null;
  forecast: number | null;
  requiredRate: number | null;
  wip: WipResult;
  wipPieces: number;
}

export function moduleMetrics(input: ModuleMetricsInput): ModuleMetrics {
  const opMinutesTotal = operatorMinutes(input.productionMinutesTotal, input.operators);
  const opMinutesElapsed = operatorMinutes(input.productionMinutesElapsed, input.operators);

  const target = targetQty(opMinutesTotal, input.plannedEfficiencyPct, input.smv);
  const achievement = target === null ? null : achievementPct(input.actual, target);

  // Efficiency measures time worked so far, not the whole shift — otherwise
  // every module reads badly at nine in the morning.
  const efficiency = efficiencyPct(input.actual, input.smv, opMinutesElapsed);

  const remaining = Math.max(0, input.productionMinutesTotal - input.productionMinutesElapsed);

  return {
    target,
    actual: input.actual,
    achievement,
    achievementBand: bandFor(achievement, input.achievementGreenAt, input.achievementAmberAt),
    efficiency,
    efficiencyBand: bandFor(efficiency, input.efficiencyGreenAt, input.efficiencyAmberAt),
    hourly: hourlyRate(input.actual, input.productionMinutesElapsed),
    forecast: forecast({
      actual: input.actual,
      elapsedProductionMinutes: input.productionMinutesElapsed,
      remainingProductionMinutes: remaining,
      minElapsedMinutes: input.forecastMinElapsedMinutes,
    }),
    requiredRate: target === null ? null : requiredHourlyRate(target, input.actual, remaining),
    wip: wipStatus({
      pieces: input.wipPieces,
      thresholds: input.thresholds,
      moduleActive: input.moduleActive,
      hasPlanToday: input.hasPlanToday,
    }),
    wipPieces: input.wipPieces,
  };
}
