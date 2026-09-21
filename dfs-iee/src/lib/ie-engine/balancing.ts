/**
 * Line Balancing Engine
 *
 * The goal of line balancing is to assign operations to operators
 * (stations) such that no single station bottlenecks the line.
 *
 * Key formulas:
 *
 *   Target Cycle Time = 60 / Target Pieces Per Hour (in minutes)
 *
 *   Station Load Factor = Station SMV / Target Cycle Time
 *     If LF > 1: station can't keep up (bottleneck)
 *     If LF < 0.7: station is under-utilized
 *
 *   Theoretical Min Operators = ceil(Total SMV / Target Cycle Time)
 *
 *   Balance Efficiency % = (Total SMV) / (Stations × Bottleneck Station SMV) × 100
 *     Perfect balance = 100%. Real-world target: 80-90%.
 */

import { round } from './smv';
import type { Operation, MachineType } from '@/types';

// ============================================================================
// CYCLE TIME & MINIMUM OPERATORS
// ============================================================================

/** Convert target pieces-per-hour into target station cycle time (minutes). */
export function targetCycleTime(targetPph: number): number {
  if (targetPph <= 0) throw new Error('Target PPH must be positive');
  return round(60 / targetPph, 4);
}

/**
 * Theoretical minimum number of operators needed to hit a target PPH.
 * Real-world line will always need more due to imperfect balance.
 */
export function theoreticalMinOperators(
  totalSmv: number,
  targetPph: number
): number {
  const cycleTime = targetCycleTime(targetPph);
  return Math.ceil(totalSmv / cycleTime);
}

// ============================================================================
// BALANCE EFFICIENCY
// ============================================================================

export function balanceEfficiency(
  stationSmvs: number[]
): { efficiencyPct: number; bottleneckSmv: number; bottleneckIndex: number } {
  if (!stationSmvs.length) {
    return { efficiencyPct: 0, bottleneckSmv: 0, bottleneckIndex: -1 };
  }
  const totalSmv = stationSmvs.reduce((a, b) => a + b, 0);
  let bottleneckSmv = 0;
  let bottleneckIndex = 0;
  stationSmvs.forEach((s, i) => {
    if (s > bottleneckSmv) {
      bottleneckSmv = s;
      bottleneckIndex = i;
    }
  });
  const denominator = stationSmvs.length * bottleneckSmv;
  const efficiencyPct = denominator > 0 ? (totalSmv / denominator) * 100 : 0;
  return {
    efficiencyPct: round(efficiencyPct, 2),
    bottleneckSmv: round(bottleneckSmv, 4),
    bottleneckIndex,
  };
}

// ============================================================================
// GREEDY AUTO-BALANCING
// ============================================================================

export interface BalanceOperation {
  id: string;
  sequence: number;
  description: string;
  machineType: MachineType;
  smv: number;
}

export interface BalanceStation {
  stationNumber: number;
  machineType: MachineType;
  operationIds: string[];
  operationCount: number;
  stationSmv: number;
  loadFactor: number;
}

export interface BalanceResult {
  stations: BalanceStation[];
  metrics: {
    operatorCount: number;
    totalSmv: number;
    targetCycleTime: number;
    bottleneckStation: number;
    bottleneckSmv: number;
    balanceEfficiencyPct: number;
    theoreticalOutputPph: number;
    actualOutputPph: number;
  };
  warnings: string[];
}

/**
 * Greedy first-fit decreasing line balance.
 *
 * Algorithm:
 *   1. Sort operations by sequence (they must stay in order — assembly is sequential).
 *   2. Walk operations in sequence, accumulating into the current station.
 *   3. When adding the next operation would exceed target cycle time,
 *      AND the machine type differs OR the station is "full enough" (>70%),
 *      open a new station.
 *
 * This respects assembly precedence (no resequencing) while keeping
 * same-machine operations together to avoid wasteful machine changes.
 *
 * For more sophisticated balancing (e.g., longest-processing-time with
 * precedence constraints), this is the place to extend the algorithm.
 */
export function autoBalance(
  operations: BalanceOperation[],
  targetPph: number
): BalanceResult {
  if (!operations.length) {
    throw new Error('At least one operation is required');
  }
  if (targetPph <= 0) {
    throw new Error('Target pieces per hour must be positive');
  }

  const warnings: string[] = [];
  const cycleTime = targetCycleTime(targetPph);
  const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);

  const stations: BalanceStation[] = [];
  let current: BalanceStation = {
    stationNumber: 1,
    machineType: sorted[0]!.machineType,
    operationIds: [],
    operationCount: 0,
    stationSmv: 0,
    loadFactor: 0,
  };

  for (const op of sorted) {
    if (op.smv > cycleTime) {
      warnings.push(
        `Operation "${op.description}" (SMV ${op.smv}) exceeds cycle time ${cycleTime}. Consider splitting it or duplicating the station.`
      );
    }

    const wouldExceedCycle = current.stationSmv + op.smv > cycleTime * 1.05;
    const machineChange = current.machineType !== op.machineType;
    const stationHasContent = current.operationCount > 0;

    const shouldStartNewStation =
      stationHasContent && (wouldExceedCycle || (machineChange && current.stationSmv >= cycleTime * 0.7));

    if (shouldStartNewStation) {
      current.loadFactor = round(current.stationSmv / cycleTime, 3);
      stations.push(current);
      current = {
        stationNumber: stations.length + 1,
        machineType: op.machineType,
        operationIds: [],
        operationCount: 0,
        stationSmv: 0,
        loadFactor: 0,
      };
    }

    current.operationIds.push(op.id);
    current.operationCount += 1;
    current.stationSmv = round(current.stationSmv + op.smv, 4);
    current.machineType = op.machineType;
  }

  if (current.operationCount > 0) {
    current.loadFactor = round(current.stationSmv / cycleTime, 3);
    stations.push(current);
  }

  // Metrics
  const stationSmvs = stations.map((s) => s.stationSmv);
  const { efficiencyPct, bottleneckSmv, bottleneckIndex } =
    balanceEfficiency(stationSmvs);
  const totalSmv = stationSmvs.reduce((a, b) => a + b, 0);
  const theoreticalOutputPph = totalSmv > 0 ? round((stations.length * 60) / totalSmv, 1) : 0;
  const actualOutputPph = bottleneckSmv > 0 ? round(60 / bottleneckSmv, 1) : 0;

  return {
    stations,
    metrics: {
      operatorCount: stations.length,
      totalSmv: round(totalSmv, 4),
      targetCycleTime: cycleTime,
      bottleneckStation: bottleneckIndex + 1,
      bottleneckSmv,
      balanceEfficiencyPct: efficiencyPct,
      theoreticalOutputPph,
      actualOutputPph,
    },
    warnings,
  };
}

// ============================================================================
// MANUAL VALIDATION
// ============================================================================

/**
 * Validate a manually-built line balance: report load factor for each
 * station, surface bottlenecks, and check sequence integrity.
 */
export function validateBalance(
  operations: Pick<Operation, 'id' | 'sequence' | 'smv'>[],
  stations: Array<{ stationNumber: number; operationIds: string[] }>,
  targetPph: number
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Every operation must appear in exactly one station
  const opIdSet = new Set(operations.map((o) => o.id));
  const seenIds = new Set<string>();
  for (const station of stations) {
    for (const opId of station.operationIds) {
      if (!opIdSet.has(opId)) {
        errors.push(`Station ${station.stationNumber} references unknown operation ${opId}`);
      }
      if (seenIds.has(opId)) {
        errors.push(`Operation ${opId} assigned to multiple stations`);
      }
      seenIds.add(opId);
    }
  }
  const unassigned = [...opIdSet].filter((id) => !seenIds.has(id));
  if (unassigned.length) {
    errors.push(`${unassigned.length} operation(s) not assigned to any station`);
  }

  // Sequence integrity: within a station, operations should be contiguous
  const opSeq = new Map(operations.map((o) => [o.id, o.sequence]));
  for (const station of stations) {
    const seqs = station.operationIds
      .map((id) => opSeq.get(id))
      .filter((s): s is number => s !== undefined)
      .sort((a, b) => a - b);
    for (let i = 1; i < seqs.length; i++) {
      if (seqs[i]! - seqs[i - 1]! > 1) {
        warnings.push(
          `Station ${station.stationNumber} has non-contiguous operation sequence — may break assembly flow`
        );
        break;
      }
    }
  }

  // Cycle time check
  const cycleTime = targetCycleTime(targetPph);
  const opSmv = new Map(operations.map((o) => [o.id, o.smv]));
  for (const station of stations) {
    const smv = station.operationIds.reduce((s, id) => s + (opSmv.get(id) || 0), 0);
    if (smv > cycleTime * 1.1) {
      warnings.push(
        `Station ${station.stationNumber} is overloaded (${round(smv, 3)} min > ${cycleTime} min cycle)`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
