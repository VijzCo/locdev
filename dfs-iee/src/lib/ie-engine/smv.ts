/**
 * SMV (Standard Minute Value) Calculation Engine
 *
 * This module implements the core Industrial Engineering math for
 * apparel manufacturing. The formulas here are the value of the product —
 * they must be correct, well-tested, and consistent across all
 * costing, capacity planning, and line balancing operations.
 *
 * Key concepts:
 *
 * TMU (Time Measurement Unit): the fundamental motion-study time unit.
 *   1 TMU = 0.036 seconds = 0.0006 minutes
 *   100,000 TMU = 1 hour
 *
 * Basic Time = average of cycle time observations
 * Normal Time = Basic Time × Performance Rating
 *   Rating is the analyst's assessment of operator speed vs. standard.
 *   1.00 = standard pace, 1.10 = 10% faster, 0.90 = 10% slower.
 *
 * Standard Time (SMV) = Normal Time × (1 + Allowance%)
 *   Allowance covers personal needs, fatigue, and unavoidable delays.
 *   Typical sewing allowance: 18-22%. Heavy/hot work: 25-30%.
 */

import type { Operation, MotionElement } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** 1 TMU in minutes (0.036 sec ÷ 60) */
export const TMU_TO_MINUTES = 0.0006;

/** Sensible default allowance for sewing operations */
export const DEFAULT_SEWING_ALLOWANCE = 0.18;

/** Standard analyst rating */
export const STANDARD_PERFORMANCE_RATING = 1.0;

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

export function tmuToMinutes(tmu: number): number {
  return tmu * TMU_TO_MINUTES;
}

export function minutesToTmu(minutes: number): number {
  return minutes / TMU_TO_MINUTES;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

// ============================================================================
// STOPWATCH TIME STUDY
// ============================================================================

export interface StopwatchInput {
  /** Observed cycle times in seconds */
  observations: number[];
  /** Analyst's performance rating (0.85 - 1.20 typical) */
  performanceRating: number;
  /** Allowance as decimal (0.18 = 18%) */
  allowancePct: number;
}

export interface StopwatchResult {
  observationCount: number;
  basicTimeMinutes: number;
  normalTimeMinutes: number;
  /** Final SMV in minutes */
  smv: number;
  /** Standard deviation of observations (in seconds) for reliability check */
  stdDevSeconds: number;
  /** Coefficient of variation (stdDev / mean). > 0.10 = high variance, take more readings. */
  coefficientOfVariation: number;
  warnings: string[];
}

/**
 * Calculate SMV from stopwatch observations using the classical formula:
 *
 *   Basic Time = mean of observations
 *   Normal Time = Basic Time × Rating
 *   SMV = Normal Time × (1 + Allowance)
 *
 * Throws if inputs are invalid (no observations, negative rating, etc.)
 */
export function calculateSmvFromStopwatch(input: StopwatchInput): StopwatchResult {
  const { observations, performanceRating, allowancePct } = input;

  // Validation
  if (!observations.length) {
    throw new Error('At least one observation is required');
  }
  if (observations.some((o) => o <= 0)) {
    throw new Error('All observations must be positive numbers');
  }
  if (performanceRating <= 0 || performanceRating > 2) {
    throw new Error('Performance rating must be between 0 and 2 (typical: 0.85-1.20)');
  }
  if (allowancePct < 0 || allowancePct > 1) {
    throw new Error('Allowance must be between 0 and 1 (e.g. 0.18 for 18%)');
  }

  const warnings: string[] = [];

  // Mean cycle time in seconds
  const meanSeconds =
    observations.reduce((sum, o) => sum + o, 0) / observations.length;

  // Standard deviation for reliability assessment
  const variance =
    observations.reduce((sum, o) => sum + Math.pow(o - meanSeconds, 2), 0) /
    observations.length;
  const stdDevSeconds = Math.sqrt(variance);
  const cv = stdDevSeconds / meanSeconds;

  if (observations.length < 5) {
    warnings.push(
      `Only ${observations.length} observations — IE best practice recommends at least 5–10 cycles for reliability.`
    );
  }
  if (cv > 0.1) {
    warnings.push(
      `High variance detected (CV = ${(cv * 100).toFixed(1)}%). Consider taking more observations or investigating method inconsistency.`
    );
  }

  const basicTimeMinutes = secondsToMinutes(meanSeconds);
  const normalTimeMinutes = basicTimeMinutes * performanceRating;
  const smv = normalTimeMinutes * (1 + allowancePct);

  return {
    observationCount: observations.length,
    basicTimeMinutes: round(basicTimeMinutes, 4),
    normalTimeMinutes: round(normalTimeMinutes, 4),
    smv: round(smv, 4),
    stdDevSeconds: round(stdDevSeconds, 3),
    coefficientOfVariation: round(cv, 4),
    warnings,
  };
}

// ============================================================================
// MOTION ANALYSIS (GSD / PMTS-style)
// ============================================================================

export interface MotionBreakdownItem {
  motionId: string;
  motionCode: string;
  description: string;
  /** TMU value for this single motion */
  tmu: number;
  /** Number of times this motion occurs in the operation */
  frequency: number;
}

export interface MotionAnalysisInput {
  motions: MotionBreakdownItem[];
  /** Allowance as decimal (0.18 = 18%) */
  allowancePct: number;
  /** Optional performance rating (usually 1.00 for synthetic data) */
  performanceRating?: number;
}

export interface MotionAnalysisResult {
  totalTmu: number;
  basicTimeMinutes: number;
  normalTimeMinutes: number;
  smv: number;
  motionCount: number;
}

/**
 * Calculate SMV by summing motion elements (synthetic / GSD-style method).
 *
 * Each motion has a fixed TMU value. We sum (tmu × frequency), convert to
 * minutes, apply rating, then apply allowance.
 */
export function calculateSmvFromMotions(
  input: MotionAnalysisInput
): MotionAnalysisResult {
  const { motions, allowancePct, performanceRating = 1.0 } = input;

  if (!motions.length) {
    throw new Error('At least one motion element is required');
  }
  if (allowancePct < 0 || allowancePct > 1) {
    throw new Error('Allowance must be between 0 and 1');
  }

  const totalTmu = motions.reduce(
    (sum, m) => sum + m.tmu * Math.max(0, m.frequency),
    0
  );

  const basicTimeMinutes = tmuToMinutes(totalTmu);
  const normalTimeMinutes = basicTimeMinutes * performanceRating;
  const smv = normalTimeMinutes * (1 + allowancePct);

  return {
    totalTmu: round(totalTmu, 2),
    basicTimeMinutes: round(basicTimeMinutes, 4),
    normalTimeMinutes: round(normalTimeMinutes, 4),
    smv: round(smv, 4),
    motionCount: motions.length,
  };
}

// ============================================================================
// MACHINE-BASED SMV (for sewing operations)
// ============================================================================

export interface MachineSmvInput {
  /** Stitch density: stitches per cm */
  stitchesPerCm: number;
  /** Length of seam in cm */
  seamLengthCm: number;
  /** Machine speed in stitches per minute (RPM) */
  machineRpm: number;
  /**
   * Machine utilization factor — operators can never sew at 100% RPM
   * due to start/stop, alignment, etc. Typical: 0.55-0.70.
   */
  machineUtilization: number;
  /** Handling time per piece in minutes (pick up, position, set aside) */
  handlingTimeMinutes: number;
  /** Allowance as decimal */
  allowancePct: number;
}

export interface MachineSmvResult {
  totalStitches: number;
  effectiveRpm: number;
  sewingTimeMinutes: number;
  handlingTimeMinutes: number;
  basicTimeMinutes: number;
  smv: number;
}

/**
 * Estimate SMV for a sewing operation from machine + seam parameters.
 *
 *   Stitches = stitchesPerCm × seamLengthCm
 *   Sewing Time = Stitches / (RPM × Utilization)
 *   Basic Time = Sewing Time + Handling Time
 *   SMV = Basic Time × (1 + Allowance)
 *
 * Useful for quick estimates when motion analysis isn't practical.
 */
export function calculateSmvFromMachine(input: MachineSmvInput): MachineSmvResult {
  const {
    stitchesPerCm,
    seamLengthCm,
    machineRpm,
    machineUtilization,
    handlingTimeMinutes,
    allowancePct,
  } = input;

  if (stitchesPerCm <= 0 || seamLengthCm < 0 || machineRpm <= 0) {
    throw new Error('Stitch density, seam length, and RPM must be positive');
  }
  if (machineUtilization <= 0 || machineUtilization > 1) {
    throw new Error('Machine utilization must be between 0 and 1');
  }

  const totalStitches = stitchesPerCm * seamLengthCm;
  const effectiveRpm = machineRpm * machineUtilization;
  const sewingTimeMinutes = totalStitches / effectiveRpm;
  const basicTimeMinutes = sewingTimeMinutes + handlingTimeMinutes;
  const smv = basicTimeMinutes * (1 + allowancePct);

  return {
    totalStitches: round(totalStitches, 0),
    effectiveRpm: round(effectiveRpm, 0),
    sewingTimeMinutes: round(sewingTimeMinutes, 4),
    handlingTimeMinutes: round(handlingTimeMinutes, 4),
    basicTimeMinutes: round(basicTimeMinutes, 4),
    smv: round(smv, 4),
  };
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Sum the SMVs of a list of operations.
 * Used to calculate the total SMV of an Operation Bulletin / Style.
 */
export function totalStyleSmv(operations: Pick<Operation, 'smv'>[]): number {
  return round(
    operations.reduce((sum, op) => sum + (op.smv || 0), 0),
    4
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
