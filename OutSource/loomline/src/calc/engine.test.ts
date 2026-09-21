import { describe, expect, it } from 'vitest';
import {
  achievementPct,
  bandFor,
  completionOutlook,
  efficiencyPct,
  forecast,
  hourlyRate,
  moduleMetrics,
  operatorMinutes,
  orderCompletionPct,
  requiredHourlyRate,
  targetQty,
  wipStatus,
} from './engine';

const thresholds = { min: 50, reorder: 100, max: 250 };

describe('operatorMinutes', () => {
  it('multiplies production minutes by headcount', () => {
    expect(operatorMinutes(480, 25)).toBe(12000);
  });

  it('is zero with no operators, not null', () => {
    // A module with nobody on it is a real state and reads as zero capacity.
    expect(operatorMinutes(480, 0)).toBe(0);
  });

  it('rejects nonsense', () => {
    expect(operatorMinutes(-1, 10)).toBeNull();
    expect(operatorMinutes(480, -5)).toBeNull();
    expect(operatorMinutes(Number.NaN, 10)).toBeNull();
  });
});

describe('targetQty', () => {
  it('uses the corrected formula, not the double-counting one', () => {
    // 480 min × 25 operators = 12,000 operator minutes.
    // At 65% efficiency and 14.5 SMV: 12,000 × 0.65 / 14.5 = 537.9 → 537.
    expect(targetQty(operatorMinutes(480, 25), 65, 14.5)).toBe(537);
  });

  it('scales linearly with headcount, not quadratically', () => {
    // The brief's formula would have made 50 operators four times 25, not
    // twice. This is the regression that matters.
    const a = targetQty(operatorMinutes(480, 25), 65, 14.5)!;
    const b = targetQty(operatorMinutes(480, 50), 65, 14.5)!;
    expect(b / a).toBeCloseTo(2, 1);
  });

  it('returns null rather than Infinity when SMV is missing', () => {
    expect(targetQty(operatorMinutes(480, 25), 65, 0)).toBeNull();
    expect(targetQty(operatorMinutes(480, 25), 65, -1)).toBeNull();
  });

  it('is zero with no operators', () => {
    expect(targetQty(operatorMinutes(480, 0), 65, 14.5)).toBe(0);
  });
});

describe('target and efficiency agree', () => {
  it('produces exactly the planned efficiency when target is met', () => {
    const opMin = operatorMinutes(480, 25);
    const plannedEff = 65;
    const target = targetQty(opMin, plannedEff, 14.5)!;
    const achieved = efficiencyPct(target, 14.5, opMin)!;
    // Within a piece of rounding from the floor in targetQty.
    expect(achieved).toBeCloseTo(plannedEff, 0);
  });
});

describe('achievementPct', () => {
  it('computes the ratio', () => {
    expect(achievementPct(840, 1000)).toBe(84);
  });

  it('allows over-achievement', () => {
    // Floating point makes this 110.00000000000001; the UI rounds for
    // display, so exactness here is not worth chasing.
    expect(achievementPct(1100, 1000)).toBeCloseTo(110, 6);
  });

  it('returns null on a zero target rather than Infinity', () => {
    expect(achievementPct(500, 0)).toBeNull();
  });
});

describe('efficiencyPct', () => {
  it('computes standard minutes produced over minutes paid', () => {
    // 500 pieces × 14.5 SMV = 7,250 standard minutes of 12,000 available.
    expect(efficiencyPct(500, 14.5, 12000)).toBeCloseTo(60.4, 1);
  });

  it('is null when SMV or capacity is missing', () => {
    expect(efficiencyPct(500, 0, 12000)).toBeNull();
    expect(efficiencyPct(500, 14.5, 0)).toBeNull();
    expect(efficiencyPct(500, 14.5, null)).toBeNull();
  });

  it('is zero for no production, not null', () => {
    expect(efficiencyPct(0, 14.5, 12000)).toBe(0);
  });
});

describe('hourlyRate', () => {
  it('converts to pieces per hour', () => {
    expect(hourlyRate(600, 300)).toBe(120);
  });

  it('is null before any time has elapsed', () => {
    expect(hourlyRate(0, 0)).toBeNull();
  });
});

describe('forecast', () => {
  it('reproduces the worked example from the brief', () => {
    // 600 pieces in 5 hours is 120/hour; 4 hours left gives 1,080.
    expect(
      forecast({
        actual: 600,
        elapsedProductionMinutes: 300,
        remainingProductionMinutes: 240,
        minElapsedMinutes: 45,
      }),
    ).toBe(1080);
  });

  it('stays silent until enough of the shift has run', () => {
    // Twelve minutes of data would project wildly and people act on it.
    expect(
      forecast({
        actual: 30,
        elapsedProductionMinutes: 12,
        remainingProductionMinutes: 468,
        minElapsedMinutes: 45,
      }),
    ).toBeNull();
  });

  it('equals actual at the end of the shift', () => {
    expect(
      forecast({
        actual: 950,
        elapsedProductionMinutes: 480,
        remainingProductionMinutes: 0,
        minElapsedMinutes: 45,
      }),
    ).toBe(950);
  });

  it('handles a module that has produced nothing', () => {
    expect(
      forecast({
        actual: 0,
        elapsedProductionMinutes: 120,
        remainingProductionMinutes: 360,
        minElapsedMinutes: 45,
      }),
    ).toBe(0);
  });
});

describe('requiredHourlyRate', () => {
  it('says what is needed to catch up', () => {
    // 400 short over 4 hours is 100 an hour.
    expect(requiredHourlyRate(1000, 600, 240)).toBe(100);
  });

  it('is null once the target is met', () => {
    expect(requiredHourlyRate(1000, 1000, 240)).toBeNull();
    expect(requiredHourlyRate(1000, 1200, 240)).toBeNull();
  });

  it('is null with no time left, rather than Infinity', () => {
    expect(requiredHourlyRate(1000, 600, 0)).toBeNull();
  });
});

describe('wipStatus', () => {
  const base = { thresholds, moduleActive: true, hasPlanToday: true };

  it('is red above maximum', () => {
    expect(wipStatus({ ...base, pieces: 300 })).toEqual({ status: 'RED', reason: 'OVER' });
  });

  it('is green between reorder and maximum', () => {
    expect(wipStatus({ ...base, pieces: 180 }).status).toBe('GREEN');
    expect(wipStatus({ ...base, pieces: 100 }).status).toBe('GREEN');
    expect(wipStatus({ ...base, pieces: 250 }).status).toBe('GREEN');
  });

  it('is amber between minimum and reorder — the band the brief left ambiguous', () => {
    expect(wipStatus({ ...base, pieces: 99 })).toEqual({ status: 'AMBER', reason: 'REORDER' });
    expect(wipStatus({ ...base, pieces: 50 }).status).toBe('AMBER');
  });

  it('is grey below minimum', () => {
    expect(wipStatus({ ...base, pieces: 49 })).toEqual({ status: 'GREY', reason: 'LOW' });
  });

  it('distinguishes no plan from critically low', () => {
    expect(wipStatus({ ...base, pieces: 0, hasPlanToday: false }).reason).toBe('NO_PLAN');
    expect(wipStatus({ ...base, pieces: 0, moduleActive: false }).reason).toBe('INACTIVE');
  });
});

describe('bandFor', () => {
  it('bands against configured thresholds', () => {
    expect(bandFor(96, 95, 85)).toBe('GREEN');
    expect(bandFor(90, 95, 85)).toBe('AMBER');
    expect(bandFor(70, 95, 85)).toBe('RED');
  });

  it('is grey for a missing value, never a false red', () => {
    expect(bandFor(null, 95, 85)).toBe('GREY');
  });
});

describe('orderCompletionPct', () => {
  it('caps at 100 so an overrun does not read as 104% complete', () => {
    expect(orderCompletionPct(1100, 1000)).toBe(100);
  });

  it('is null against a zero order', () => {
    expect(orderCompletionPct(0, 0)).toBeNull();
  });
});

describe('completionOutlook', () => {
  it('is green when the forecast covers what is left', () => {
    expect(completionOutlook(1100, 1000)).toBe('GREEN');
  });

  it('is amber when close', () => {
    expect(completionOutlook(950, 1000)).toBe('AMBER');
  });

  it('is red when well short', () => {
    expect(completionOutlook(600, 1000)).toBe('RED');
  });

  it('is grey with no forecast yet', () => {
    expect(completionOutlook(null, 1000)).toBe('GREY');
  });
});

describe('moduleMetrics', () => {
  const input = {
    actual: 400,
    wipPieces: 180,
    operators: 25,
    smv: 14.5,
    plannedEfficiencyPct: 65,
    productionMinutesTotal: 480,
    productionMinutesElapsed: 240,
    thresholds,
    moduleActive: true,
    hasPlanToday: true,
    achievementGreenAt: 95,
    achievementAmberAt: 85,
    efficiencyGreenAt: 70,
    efficiencyAmberAt: 55,
    forecastMinElapsedMinutes: 45,
  };

  it('assembles a full card without any NaN', () => {
    const m = moduleMetrics(input);
    expect(m.target).toBe(537);
    expect(m.forecast).toBe(800);
    expect(m.wip.status).toBe('GREEN');
    Object.values(m).forEach((v) => {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    });
  });

  it('measures efficiency against time worked, not the whole shift', () => {
    // 400 × 14.5 over 240 × 25 = 96.7%, not the 48% a full-shift divisor
    // would give at the halfway point.
    expect(moduleMetrics(input).efficiency).toBeCloseTo(96.7, 1);
  });

  it('survives a module with no plan, no SMV and no operators', () => {
    const m = moduleMetrics({
      ...input,
      actual: 0,
      operators: 0,
      smv: 0,
      wipPieces: 0,
      hasPlanToday: false,
      productionMinutesElapsed: 0,
    });
    expect(m.target).toBeNull();
    expect(m.efficiency).toBeNull();
    expect(m.achievement).toBeNull();
    expect(m.achievementBand).toBe('GREY');
    expect(m.wip.reason).toBe('NO_PLAN');
  });
});
