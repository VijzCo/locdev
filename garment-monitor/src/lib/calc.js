// src/lib/calc.js
// ---------------------------------------------------------------------------
// Pure production-math engine. No React, no Firebase — fully unit-testable.
// All formulas come straight from the spec.
// ---------------------------------------------------------------------------
import { slotDuration } from "./time.js";

export const PRODUCTION = "Production";
export const BREAK = "Break";
export const OVERTIME = "Overtime";

/** Minutes available for production = sum of Production-slot durations. */
export function availableMinutes(slots) {
  return slots
    .filter((s) => s.slotType === PRODUCTION)
    .reduce((acc, s) => acc + slotDuration(s), 0);
}

/** Total break minutes (for loss analysis / shift summary). */
export function breakMinutes(slots) {
  return slots
    .filter((s) => s.slotType === BREAK)
    .reduce((acc, s) => acc + slotDuration(s), 0);
}

/**
 * Daily target quantity.
 *   Target = (AvailableMinutes × TeamMembers × Efficiency%) ÷ SMV
 * `efficiencyPct` is a percentage (e.g. 75 means 75%). SMV in minutes/piece.
 */
export function dailyTarget({ availableMin, teamMembers, efficiencyPct, smv }) {
  if (!smv || smv <= 0) return 0;
  const qty = (availableMin * teamMembers * (efficiencyPct / 100)) / smv;
  return Math.round(qty);
}

/**
 * Distribute a daily target across slots proportionally to each Production
 * slot's duration. Break/Overtime slots get target 0. The remainder from
 * rounding is pushed onto the final production slot so the sum matches exactly.
 *
 * Returns: [{ slotId, slotName, slotType, durationMin, target }]
 */
export function distributeTargets(slots, dailyTargetQty) {
  const prodMin = availableMinutes(slots);
  const rows = slots.map((s) => {
    const durationMin = slotDuration(s);
    let target = 0;
    if (s.slotType === PRODUCTION && prodMin > 0) {
      target = Math.round((dailyTargetQty * durationMin) / prodMin);
    }
    return {
      slotId: s.id,
      slotName: s.name,
      slotType: s.slotType,
      durationMin,
      target,
    };
  });

  // Reconcile rounding drift onto the last production slot.
  const assigned = rows.reduce((a, r) => a + r.target, 0);
  const drift = dailyTargetQty - assigned;
  if (drift !== 0) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].slotType === PRODUCTION) {
        rows[i].target = Math.max(0, rows[i].target + drift);
        break;
      }
    }
  }
  return rows;
}

/** Achievement % of actual vs plan. plan 0 -> 0 to avoid divide-by-zero. */
export function achievementPct(actual, plan) {
  if (!plan || plan <= 0) return 0;
  return Math.round((actual / plan) * 100);
}

/**
 * Realised efficiency % = (producedMinutes / availableManMinutes) × 100
 *   producedMinutes = actualPieces × SMV
 *   availableManMinutes = availableMin × teamMembers
 */
export function efficiencyPct({ actual, smv, availableMin, teamMembers }) {
  const manMin = availableMin * teamMembers;
  if (!manMin) return 0;
  return Math.round(((actual * smv) / manMin) * 100);
}

/** Variance = actual − target (can be negative). */
export function variance(actual, target) {
  return (actual || 0) - (target || 0);
}

/**
 * Production loss analysis (in equivalent pieces) for one module-day.
 *  - efficiencyLoss: pieces lost to running below planned efficiency
 *  - breakLoss:      pieces "not produced" during breaks (informational)
 *  - manpowerLoss:   pieces lost from missing operators vs plan
 *  - downtimeLoss:   target − actual − efficiencyLoss (residual, floored at 0)
 */
export function lossAnalysis({
  target,
  actual,
  smv,
  availableMin,
  plannedTeam,
  actualTeam,
  breakMin,
}) {
  const safeSmv = smv > 0 ? smv : 1;
  const realisedEff = efficiencyPct({ actual, smv, availableMin, teamMembers: actualTeam || plannedTeam });
  const plannedEff = target && availableMin && plannedTeam
    ? (target * safeSmv) / (availableMin * plannedTeam) * 100
    : 0;

  const efficiencyLoss = Math.max(
    0,
    Math.round(((plannedEff - realisedEff) / 100) * (availableMin * (actualTeam || plannedTeam)) / safeSmv)
  );
  const manpowerLoss = Math.max(
    0,
    Math.round(((plannedTeam - (actualTeam || plannedTeam)) * availableMin) / safeSmv * (plannedEff / 100))
  );
  const breakLoss = Math.round((breakMin * (actualTeam || plannedTeam)) / safeSmv * (plannedEff / 100));
  const downtimeLoss = Math.max(0, (target || 0) - (actual || 0) - efficiencyLoss);

  return { efficiencyLoss, manpowerLoss, breakLoss, downtimeLoss };
}

/** Roll up many module rows into dashboard KPI totals. */
export function rollupKpis(moduleRows) {
  const t = moduleRows.reduce(
    (a, r) => {
      a.target += r.target || 0;
      a.actual += r.actual || 0;
      a.overtime += r.overtime || 0;
      a.operators += r.teamCount || 0;
      return a;
    },
    { target: 0, actual: 0, overtime: 0, operators: 0 }
  );
  t.achievement = achievementPct(t.actual, t.target);
  t.modules = moduleRows.length;
  return t;
}
