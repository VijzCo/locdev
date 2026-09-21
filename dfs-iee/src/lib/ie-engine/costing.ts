/**
 * Costing Engine
 *
 * Implements the standard IE costing formulas for apparel:
 *
 *   CPM (Cost Per Minute) = Monthly Labor Cost / Available Minutes per Month
 *
 *   Labor CM (Cost of Make) per garment = SMV × CPM / Efficiency
 *
 *   Full CM = Labor CM + Overhead allocation + Trims/Consumables
 *
 *   Profit % = (FOB Price - CM) / FOB Price × 100
 *
 * All costs are in the tenant's configured currency.
 */

import { round } from './smv';

// ============================================================================
// CPM (COST PER MINUTE)
// ============================================================================

export interface CpmInput {
  /** Total monthly labor cost (wages + benefits + overtime) */
  monthlyLaborCost: number;
  /** Number of direct operators */
  operatorCount: number;
  /** Working minutes per day (e.g. 480 for 8-hour shift) */
  workingMinutesPerDay: number;
  /** Working days per month (typically 24-26) */
  workingDaysPerMonth: number;
  /**
   * Off-standard time percentage — time lost to meetings, training,
   * machine breakdowns, line setup. Typical: 5-15%.
   */
  offStandardPct?: number;
}

export interface CpmResult {
  totalAvailableMinutes: number;
  effectiveAvailableMinutes: number;
  cpm: number;
}

/**
 * Calculate Cost Per Minute at factory or department level.
 *
 *   Available Minutes = Operators × Mins/Day × Days/Month
 *   Effective Minutes = Available × (1 - off-standard%)
 *   CPM = Monthly Cost / Effective Minutes
 */
export function calculateCpm(input: CpmInput): CpmResult {
  const {
    monthlyLaborCost,
    operatorCount,
    workingMinutesPerDay,
    workingDaysPerMonth,
    offStandardPct = 0,
  } = input;

  if (monthlyLaborCost < 0 || operatorCount <= 0) {
    throw new Error('Monthly cost must be ≥ 0 and operator count > 0');
  }
  if (workingMinutesPerDay <= 0 || workingDaysPerMonth <= 0) {
    throw new Error('Working minutes and days must be positive');
  }
  if (offStandardPct < 0 || offStandardPct > 0.5) {
    throw new Error('Off-standard percentage must be between 0 and 0.5');
  }

  const totalAvailableMinutes =
    operatorCount * workingMinutesPerDay * workingDaysPerMonth;
  const effectiveAvailableMinutes = totalAvailableMinutes * (1 - offStandardPct);
  const cpm = monthlyLaborCost / effectiveAvailableMinutes;

  return {
    totalAvailableMinutes: round(totalAvailableMinutes, 0),
    effectiveAvailableMinutes: round(effectiveAvailableMinutes, 0),
    cpm: round(cpm, 6),
  };
}

// ============================================================================
// CM (COST OF MAKE)
// ============================================================================

export interface CmInput {
  /** Garment SMV in minutes */
  smv: number;
  /** Cost per minute */
  cpm: number;
  /**
   * Expected line efficiency (0.50 = 50%). Lower efficiency means
   * higher actual cost per garment because more time is needed.
   */
  efficiency: number;
  /**
   * Overhead percentage applied on top of labor cost.
   * Covers utilities, supervision, indirect labor. Typical: 30-60%.
   */
  overheadPct?: number;
  /** Trims and consumables cost per garment (thread, labels, etc.) */
  trimsCost?: number;
  /** Any other fixed cost per garment */
  otherCost?: number;
}

export interface CmResult {
  /** Pure labor cost (SMV × CPM ÷ efficiency) */
  laborCost: number;
  /** Overhead applied on labor */
  overheadCost: number;
  trimsCost: number;
  otherCost: number;
  /** Total CM per garment */
  totalCm: number;
  /** Breakdown as percentages of total CM */
  breakdown: {
    laborPct: number;
    overheadPct: number;
    trimsPct: number;
    otherPct: number;
  };
}

/**
 * Calculate Cost of Make per garment.
 *
 *   Labor Cost = SMV × CPM / Efficiency
 *   Overhead = Labor × Overhead%
 *   Total CM = Labor + Overhead + Trims + Other
 */
export function calculateCm(input: CmInput): CmResult {
  const {
    smv,
    cpm,
    efficiency,
    overheadPct = 0,
    trimsCost = 0,
    otherCost = 0,
  } = input;

  if (smv < 0 || cpm < 0) {
    throw new Error('SMV and CPM must be non-negative');
  }
  if (efficiency <= 0 || efficiency > 1.5) {
    throw new Error('Efficiency must be > 0 and ≤ 1.5 (50% = 0.5)');
  }
  if (overheadPct < 0 || overheadPct > 2) {
    throw new Error('Overhead must be between 0 and 2 (200%)');
  }

  const laborCost = (smv * cpm) / efficiency;
  const overheadCost = laborCost * overheadPct;
  const totalCm = laborCost + overheadCost + trimsCost + otherCost;

  // Avoid division by zero if total is 0
  const safeTotal = totalCm || 1;

  return {
    laborCost: round(laborCost, 4),
    overheadCost: round(overheadCost, 4),
    trimsCost: round(trimsCost, 4),
    otherCost: round(otherCost, 4),
    totalCm: round(totalCm, 4),
    breakdown: {
      laborPct: round((laborCost / safeTotal) * 100, 2),
      overheadPct: round((overheadCost / safeTotal) * 100, 2),
      trimsPct: round((trimsCost / safeTotal) * 100, 2),
      otherPct: round((otherCost / safeTotal) * 100, 2),
    },
  };
}

// ============================================================================
// PROFITABILITY
// ============================================================================

export interface ProfitabilityInput {
  fobPrice: number;
  cm: number;
  fabricCost: number;
  /** Any other direct material costs */
  otherDirectCost?: number;
}

export interface ProfitabilityResult {
  fobPrice: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
}

/**
 * Calculate gross margin on a style.
 *
 *   Total Cost = CM + Fabric + Other Direct Materials
 *   Gross Profit = FOB Price - Total Cost
 *   Margin% = Gross Profit / FOB × 100
 */
export function calculateProfitability(
  input: ProfitabilityInput
): ProfitabilityResult {
  const { fobPrice, cm, fabricCost, otherDirectCost = 0 } = input;

  if (fobPrice < 0 || cm < 0 || fabricCost < 0) {
    throw new Error('Prices and costs must be non-negative');
  }

  const totalCost = cm + fabricCost + otherDirectCost;
  const grossProfit = fobPrice - totalCost;
  const marginPct = fobPrice > 0 ? (grossProfit / fobPrice) * 100 : 0;

  return {
    fobPrice: round(fobPrice, 4),
    totalCost: round(totalCost, 4),
    grossProfit: round(grossProfit, 4),
    marginPct: round(marginPct, 2),
  };
}
