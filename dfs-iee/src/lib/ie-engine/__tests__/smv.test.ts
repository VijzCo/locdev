import { describe, it, expect } from 'vitest';
import {
  TMU_TO_MINUTES,
  tmuToMinutes,
  minutesToTmu,
  calculateSmvFromStopwatch,
  calculateSmvFromMotions,
  calculateSmvFromMachine,
  totalStyleSmv,
} from '../smv';

describe('Unit conversions', () => {
  it('1 TMU equals 0.0006 minutes (0.036 seconds)', () => {
    expect(TMU_TO_MINUTES).toBe(0.0006);
    expect(tmuToMinutes(1)).toBe(0.0006);
  });

  it('100,000 TMU equals 60 minutes (one hour)', () => {
    expect(tmuToMinutes(100_000)).toBeCloseTo(60, 5);
  });

  it('round-trips through minutes/TMU', () => {
    expect(minutesToTmu(tmuToMinutes(500))).toBeCloseTo(500, 5);
  });
});

describe('Stopwatch SMV calculation', () => {
  it('matches the classical worked example', () => {
    // Worked example: 5 observations averaging 30 sec, rating 100%, allowance 15%
    // Basic time = 30 sec = 0.5 min
    // Normal time = 0.5 × 1.0 = 0.5 min
    // SMV = 0.5 × 1.15 = 0.575 min
    const result = calculateSmvFromStopwatch({
      observations: [29, 30, 31, 30, 30],
      performanceRating: 1.0,
      allowancePct: 0.15,
    });
    expect(result.basicTimeMinutes).toBeCloseTo(0.5, 4);
    expect(result.normalTimeMinutes).toBeCloseTo(0.5, 4);
    expect(result.smv).toBeCloseTo(0.575, 4);
  });

  it('applies performance rating correctly', () => {
    // Fast operator: rating 1.20 means observed time was 20% faster than standard
    const result = calculateSmvFromStopwatch({
      observations: [24], // 0.4 min
      performanceRating: 1.2,
      allowancePct: 0,
    });
    // Normal = 0.4 × 1.2 = 0.48
    expect(result.normalTimeMinutes).toBeCloseTo(0.48, 4);
  });

  it('applies allowance correctly', () => {
    const result = calculateSmvFromStopwatch({
      observations: [60], // 1.0 min
      performanceRating: 1.0,
      allowancePct: 0.2,
    });
    expect(result.smv).toBeCloseTo(1.2, 4);
  });

  it('warns on insufficient observations', () => {
    const result = calculateSmvFromStopwatch({
      observations: [30, 30],
      performanceRating: 1.0,
      allowancePct: 0.15,
    });
    expect(result.warnings.some((w) => w.includes('observations'))).toBe(true);
  });

  it('warns on high variance', () => {
    const result = calculateSmvFromStopwatch({
      observations: [20, 30, 40, 25, 35, 22, 45, 28],
      performanceRating: 1.0,
      allowancePct: 0.15,
    });
    expect(result.warnings.some((w) => w.includes('variance'))).toBe(true);
  });

  it('throws on invalid input', () => {
    expect(() =>
      calculateSmvFromStopwatch({
        observations: [],
        performanceRating: 1.0,
        allowancePct: 0.15,
      })
    ).toThrow();

    expect(() =>
      calculateSmvFromStopwatch({
        observations: [30, -5],
        performanceRating: 1.0,
        allowancePct: 0.15,
      })
    ).toThrow();

    expect(() =>
      calculateSmvFromStopwatch({
        observations: [30],
        performanceRating: 3.0, // invalid
        allowancePct: 0.15,
      })
    ).toThrow();
  });
});

describe('Motion analysis (GSD/PMTS-style)', () => {
  it('sums TMU correctly and converts to SMV', () => {
    // Operation: 3 motions, total 100 TMU
    // Basic = 100 × 0.0006 = 0.06 min
    // Normal = 0.06 (rating 1.0)
    // SMV = 0.06 × 1.18 = 0.0708 min
    const result = calculateSmvFromMotions({
      motions: [
        { motionId: 'a', motionCode: 'GET_S', description: '', tmu: 20, frequency: 1 },
        { motionId: 'b', motionCode: 'POS_M', description: '', tmu: 30, frequency: 2 },
        { motionId: 'c', motionCode: 'ASIDE', description: '', tmu: 20, frequency: 1 },
      ],
      allowancePct: 0.18,
    });
    expect(result.totalTmu).toBe(100);
    expect(result.basicTimeMinutes).toBeCloseTo(0.06, 5);
    expect(result.smv).toBeCloseTo(0.0708, 4);
  });

  it('respects motion frequency', () => {
    const result = calculateSmvFromMotions({
      motions: [{ motionId: 'a', motionCode: 'X', description: '', tmu: 10, frequency: 5 }],
      allowancePct: 0,
    });
    expect(result.totalTmu).toBe(50);
  });
});

describe('Machine-based SMV', () => {
  it('calculates sewing time from stitch density and RPM', () => {
    // 4 stitches/cm × 25 cm = 100 stitches
    // RPM 4000 × utilization 0.5 = effective 2000 spm
    // Sewing time = 100 / 2000 = 0.05 min
    // Basic = 0.05 + handling 0.1 = 0.15 min
    // SMV = 0.15 × 1.2 = 0.18 min
    const result = calculateSmvFromMachine({
      stitchesPerCm: 4,
      seamLengthCm: 25,
      machineRpm: 4000,
      machineUtilization: 0.5,
      handlingTimeMinutes: 0.1,
      allowancePct: 0.2,
    });
    expect(result.totalStitches).toBe(100);
    expect(result.effectiveRpm).toBe(2000);
    expect(result.sewingTimeMinutes).toBeCloseTo(0.05, 4);
    expect(result.smv).toBeCloseTo(0.18, 4);
  });
});

describe('Style SMV aggregation', () => {
  it('sums operation SMVs', () => {
    const ops = [{ smv: 0.5 }, { smv: 0.75 }, { smv: 1.25 }];
    expect(totalStyleSmv(ops)).toBe(2.5);
  });

  it('handles empty list', () => {
    expect(totalStyleSmv([])).toBe(0);
  });
});
