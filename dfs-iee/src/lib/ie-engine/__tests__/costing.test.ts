import { describe, it, expect } from 'vitest';
import { calculateCpm, calculateCm, calculateProfitability } from '../costing';

describe('CPM calculation', () => {
  it('calculates basic CPM correctly', () => {
    // 100 operators × 480 min/day × 26 days/month = 1,248,000 minutes
    // $50,000 / 1,248,000 ≈ $0.04006/min
    const result = calculateCpm({
      monthlyLaborCost: 50_000,
      operatorCount: 100,
      workingMinutesPerDay: 480,
      workingDaysPerMonth: 26,
    });
    expect(result.totalAvailableMinutes).toBe(1_248_000);
    expect(result.cpm).toBeCloseTo(0.040064, 5);
  });

  it('reduces effective minutes by off-standard time', () => {
    const result = calculateCpm({
      monthlyLaborCost: 10_000,
      operatorCount: 10,
      workingMinutesPerDay: 480,
      workingDaysPerMonth: 25,
      offStandardPct: 0.1, // 10% lost
    });
    // 10 × 480 × 25 = 120,000 → 108,000 effective
    expect(result.effectiveAvailableMinutes).toBe(108_000);
    expect(result.cpm).toBeCloseTo(10000 / 108000, 6);
  });

  it('throws on invalid inputs', () => {
    expect(() =>
      calculateCpm({
        monthlyLaborCost: 50_000,
        operatorCount: 0,
        workingMinutesPerDay: 480,
        workingDaysPerMonth: 26,
      })
    ).toThrow();

    expect(() =>
      calculateCpm({
        monthlyLaborCost: 50_000,
        operatorCount: 10,
        workingMinutesPerDay: 480,
        workingDaysPerMonth: 26,
        offStandardPct: 0.8, // unreasonable
      })
    ).toThrow();
  });
});

describe('CM calculation', () => {
  it('calculates labor CM with no overhead', () => {
    // SMV 15 min × $0.04 CPM / 0.6 efficiency = $1.00 labor cost
    const result = calculateCm({
      smv: 15,
      cpm: 0.04,
      efficiency: 0.6,
    });
    expect(result.laborCost).toBeCloseTo(1.0, 4);
    expect(result.totalCm).toBeCloseTo(1.0, 4);
  });

  it('applies overhead correctly', () => {
    const result = calculateCm({
      smv: 15,
      cpm: 0.04,
      efficiency: 0.6,
      overheadPct: 0.5, // 50% overhead
    });
    expect(result.laborCost).toBeCloseTo(1.0, 4);
    expect(result.overheadCost).toBeCloseTo(0.5, 4);
    expect(result.totalCm).toBeCloseTo(1.5, 4);
  });

  it('includes trims and other costs', () => {
    const result = calculateCm({
      smv: 10,
      cpm: 0.05,
      efficiency: 0.5,
      overheadPct: 0.4,
      trimsCost: 0.3,
      otherCost: 0.1,
    });
    // Labor = 10 × 0.05 / 0.5 = 1.0
    // Overhead = 0.4
    // Total = 1.0 + 0.4 + 0.3 + 0.1 = 1.8
    expect(result.totalCm).toBeCloseTo(1.8, 4);
    expect(result.breakdown.laborPct).toBeCloseTo((1.0 / 1.8) * 100, 1);
  });

  it('lower efficiency increases CM proportionally', () => {
    const high = calculateCm({ smv: 10, cpm: 0.05, efficiency: 0.8 });
    const low = calculateCm({ smv: 10, cpm: 0.05, efficiency: 0.4 });
    // Halving efficiency should double labor cost
    expect(low.laborCost).toBeCloseTo(high.laborCost * 2, 4);
  });

  it('throws on invalid efficiency', () => {
    expect(() =>
      calculateCm({ smv: 10, cpm: 0.05, efficiency: 0 })
    ).toThrow();
    expect(() =>
      calculateCm({ smv: 10, cpm: 0.05, efficiency: 2 })
    ).toThrow();
  });
});

describe('Profitability', () => {
  it('calculates margin correctly', () => {
    // FOB $10, CM $1.5, Fabric $4, Other $0.5 → Total $6
    // Profit $4, Margin 40%
    const result = calculateProfitability({
      fobPrice: 10,
      cm: 1.5,
      fabricCost: 4,
      otherDirectCost: 0.5,
    });
    expect(result.totalCost).toBeCloseTo(6, 4);
    expect(result.grossProfit).toBeCloseTo(4, 4);
    expect(result.marginPct).toBeCloseTo(40, 2);
  });

  it('handles loss-making styles (negative margin)', () => {
    const result = calculateProfitability({
      fobPrice: 5,
      cm: 3,
      fabricCost: 4,
    });
    expect(result.grossProfit).toBe(-2);
    expect(result.marginPct).toBe(-40);
  });
});
