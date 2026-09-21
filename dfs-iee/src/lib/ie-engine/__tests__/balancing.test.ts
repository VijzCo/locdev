import { describe, it, expect } from 'vitest';
import {
  targetCycleTime,
  theoreticalMinOperators,
  balanceEfficiency,
  autoBalance,
  validateBalance,
  type BalanceOperation,
} from '../balancing';

describe('Target cycle time', () => {
  it('60 pph = 1 min cycle', () => {
    expect(targetCycleTime(60)).toBe(1);
  });
  it('120 pph = 0.5 min cycle', () => {
    expect(targetCycleTime(120)).toBe(0.5);
  });
});

describe('Theoretical minimum operators', () => {
  it('rounds up correctly', () => {
    // 20 min total SMV ÷ 0.5 min cycle = 40 operators
    expect(theoreticalMinOperators(20, 120)).toBe(40);
    // 20.1 min total SMV ÷ 0.5 cycle = 40.2 → 41 operators
    expect(theoreticalMinOperators(20.1, 120)).toBe(41);
  });
});

describe('Balance efficiency', () => {
  it('100% when all stations equal', () => {
    const r = balanceEfficiency([1.0, 1.0, 1.0, 1.0]);
    expect(r.efficiencyPct).toBe(100);
  });
  it('drops when bottleneck exists', () => {
    // Total 6, bottleneck 2, stations 4 → 6 / (4 × 2) = 75%
    const r = balanceEfficiency([1.0, 1.5, 1.5, 2.0]);
    expect(r.efficiencyPct).toBe(75);
    expect(r.bottleneckIndex).toBe(3);
    expect(r.bottleneckSmv).toBe(2.0);
  });
});

describe('Auto-balance', () => {
  const makeOps = (smvs: number[]): BalanceOperation[] =>
    smvs.map((smv, i) => ({
      id: `op-${i + 1}`,
      sequence: i + 1,
      description: `Operation ${i + 1}`,
      machineType: 'SNLS',
      smv,
    }));

  it('groups small operations into stations under cycle time', () => {
    // Cycle time at 120 pph = 0.5 min. 6 ops of 0.2 min each.
    // Each station can hold roughly 2-3 ops (0.4-0.6 min).
    const result = autoBalance(makeOps([0.2, 0.2, 0.2, 0.2, 0.2, 0.2]), 120);
    expect(result.metrics.totalSmv).toBeCloseTo(1.2, 4);
    expect(result.stations.length).toBeGreaterThanOrEqual(2);
    expect(result.stations.length).toBeLessThanOrEqual(4);
    // No station exceeds 105% of cycle time
    for (const s of result.stations) {
      expect(s.stationSmv).toBeLessThanOrEqual(0.525);
    }
  });

  it('creates one station per operation when ops are large', () => {
    // Cycle time = 1 min. Each op = 0.9 min → must be its own station.
    const result = autoBalance(makeOps([0.9, 0.9, 0.9]), 60);
    expect(result.stations.length).toBe(3);
  });

  it('warns when an operation exceeds cycle time', () => {
    // Cycle 1 min, but one op is 1.5 min
    const result = autoBalance(makeOps([0.5, 1.5, 0.5]), 60);
    expect(result.warnings.some((w) => w.toLowerCase().includes('exceeds'))).toBe(true);
  });

  it('respects sequence order', () => {
    const result = autoBalance(makeOps([0.3, 0.3, 0.3, 0.3]), 60);
    // The first station's first op should always be op-1, etc.
    expect(result.stations[0]!.operationIds[0]).toBe('op-1');
  });

  it('reports correct metrics', () => {
    const result = autoBalance(makeOps([0.4, 0.4, 0.4]), 60);
    expect(result.metrics.targetCycleTime).toBe(1);
    expect(result.metrics.totalSmv).toBeCloseTo(1.2, 4);
    expect(result.metrics.operatorCount).toBe(result.stations.length);
  });
});

describe('Validate balance', () => {
  const ops = [
    { id: 'a', sequence: 1, smv: 0.3 },
    { id: 'b', sequence: 2, smv: 0.3 },
    { id: 'c', sequence: 3, smv: 0.3 },
  ];

  it('passes when all operations assigned exactly once', () => {
    const result = validateBalance(
      ops,
      [
        { stationNumber: 1, operationIds: ['a', 'b'] },
        { stationNumber: 2, operationIds: ['c'] },
      ],
      60
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when operations are unassigned', () => {
    const result = validateBalance(
      ops,
      [{ stationNumber: 1, operationIds: ['a'] }],
      60
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not assigned'))).toBe(true);
  });

  it('fails when an operation is assigned twice', () => {
    const result = validateBalance(
      ops,
      [
        { stationNumber: 1, operationIds: ['a', 'b'] },
        { stationNumber: 2, operationIds: ['b', 'c'] },
      ],
      60
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('multiple stations'))).toBe(true);
  });

  it('warns on overloaded station', () => {
    const heavyOps = [
      { id: 'a', sequence: 1, smv: 0.8 },
      { id: 'b', sequence: 2, smv: 0.8 },
    ];
    const result = validateBalance(
      heavyOps,
      [{ stationNumber: 1, operationIds: ['a', 'b'] }],
      60 // 1 min cycle → 1.6 min in one station is overloaded
    );
    expect(result.warnings.some((w) => w.includes('overloaded'))).toBe(true);
  });
});
