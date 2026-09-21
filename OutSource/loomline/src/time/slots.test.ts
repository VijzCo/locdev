import { describe, expect, it } from 'vitest';
import {
  activeShift,
  breakMinutes,
  buildSlots,
  buildSlotsWithBreaks,
  crossesMidnight,
  currentSlot,
  elapsedProductionMinutes,
  isProductionOpen,
  isWithinShift,
  offsetIntoShift,
  productionDate,
  productionMinutes,
  remainingProductionMinutes,
  shiftLength,
  validateBreaks,
  validateSlots,
} from './slots';
import type { Shift, ShiftBreak, ShiftSlot } from '@/types/domain';

const at = (h: number, m = 0) => h * 60 + m;

const slot = (
  index: number,
  from: number,
  to: number,
  isBreak = false,
): ShiftSlot => ({ index, startMinute: from, endMinute: to, isBreak, active: true });

/** Day shift, 08:00–17:00, with a break from 12:00 to 13:00. */
const dayShift: Shift = {
  id: 'a',
  tenantId: 't',
  factoryId: 'f',
  name: 'Shift A',
  startMinute: at(8),
  endMinute: at(17),
  crossesMidnight: false,
  active: true,
  slots: [
    slot(0, at(8), at(9)),
    slot(1, at(9), at(10)),
    slot(2, at(10), at(11)),
    slot(3, at(11), at(12)),
    slot(4, at(12), at(13), true),
    slot(5, at(13), at(14)),
    slot(6, at(14), at(15)),
    slot(7, at(15), at(16)),
    slot(8, at(16), at(17)),
  ],
};

/** Night shift, 22:00–06:00, with a break from 02:00 to 03:00. */
const nightShift: Shift = {
  id: 'c',
  tenantId: 't',
  factoryId: 'f',
  name: 'Shift C',
  startMinute: at(22),
  endMinute: at(6),
  crossesMidnight: true,
  active: true,
  slots: [
    slot(0, at(22), at(23)),
    slot(1, at(23), at(0)),
    slot(2, at(0), at(1)),
    slot(3, at(1), at(2)),
    slot(4, at(2), at(3), true),
    slot(5, at(3), at(4)),
    slot(6, at(4), at(5)),
    slot(7, at(5), at(6)),
  ],
};

describe('shiftLength', () => {
  it('measures a day shift', () => {
    expect(shiftLength(dayShift)).toBe(9 * 60);
  });

  it('measures a shift across midnight', () => {
    expect(shiftLength(nightShift)).toBe(8 * 60);
  });

  it('treats identical start and end as a full day, not zero', () => {
    expect(shiftLength({ startMinute: at(6), endMinute: at(6) })).toBe(1440);
  });
});

describe('isWithinShift', () => {
  it('handles a day shift', () => {
    expect(isWithinShift(dayShift, at(7, 59))).toBe(false);
    expect(isWithinShift(dayShift, at(8))).toBe(true);
    expect(isWithinShift(dayShift, at(16, 59))).toBe(true);
    expect(isWithinShift(dayShift, at(17))).toBe(false);
  });

  it('handles the hours either side of midnight', () => {
    expect(isWithinShift(nightShift, at(21, 59))).toBe(false);
    expect(isWithinShift(nightShift, at(22))).toBe(true);
    expect(isWithinShift(nightShift, at(23, 59))).toBe(true);
    // The case plain comparison gets wrong.
    expect(isWithinShift(nightShift, at(0))).toBe(true);
    expect(isWithinShift(nightShift, at(3))).toBe(true);
    expect(isWithinShift(nightShift, at(5, 59))).toBe(true);
    expect(isWithinShift(nightShift, at(6))).toBe(false);
    expect(isWithinShift(nightShift, at(12))).toBe(false);
  });
});

describe('offsetIntoShift', () => {
  it('counts continuously through midnight', () => {
    expect(offsetIntoShift(nightShift, at(22))).toBe(0);
    expect(offsetIntoShift(nightShift, at(23, 30))).toBe(90);
    expect(offsetIntoShift(nightShift, at(0))).toBe(120);
    expect(offsetIntoShift(nightShift, at(1))).toBe(180);
  });

  it('is null outside the shift', () => {
    expect(offsetIntoShift(nightShift, at(12))).toBeNull();
  });
});

describe('crossesMidnight', () => {
  it('detects it without trusting the stored flag', () => {
    expect(crossesMidnight(dayShift)).toBe(false);
    expect(crossesMidnight(nightShift)).toBe(true);
  });
});

describe('currentSlot', () => {
  it('finds the slot in a day shift', () => {
    expect(currentSlot(dayShift, at(9, 30))?.index).toBe(1);
    expect(currentSlot(dayShift, at(12, 30))?.index).toBe(4);
  });

  it('finds slots on both sides of midnight', () => {
    expect(currentSlot(nightShift, at(22, 30))?.index).toBe(0);
    expect(currentSlot(nightShift, at(23, 30))?.index).toBe(1);
    expect(currentSlot(nightShift, at(0, 30))?.index).toBe(2);
    expect(currentSlot(nightShift, at(4, 30))?.index).toBe(6);
  });

  it('returns null outside the shift', () => {
    expect(currentSlot(dayShift, at(19))).toBeNull();
  });

  it('is exclusive at the upper boundary, so slots never overlap', () => {
    expect(currentSlot(dayShift, at(9))?.index).toBe(1);
  });
});

describe('isProductionOpen', () => {
  it('is closed during a break', () => {
    expect(isProductionOpen(dayShift, at(12, 30))).toBe(false);
    expect(isProductionOpen(dayShift, at(13, 1))).toBe(true);
  });

  it('is closed during a break on a night shift', () => {
    expect(isProductionOpen(nightShift, at(2, 30))).toBe(false);
    expect(isProductionOpen(nightShift, at(3, 30))).toBe(true);
  });

  it('is closed outside the shift', () => {
    expect(isProductionOpen(dayShift, at(6))).toBe(false);
  });
});

describe('productionMinutes', () => {
  it('excludes breaks', () => {
    expect(productionMinutes(dayShift)).toBe(8 * 60);
    expect(productionMinutes(nightShift)).toBe(7 * 60);
  });
});

describe('elapsedProductionMinutes', () => {
  it('counts from the start of the shift', () => {
    expect(elapsedProductionMinutes(dayShift, at(8))).toBe(0);
    expect(elapsedProductionMinutes(dayShift, at(10, 30))).toBe(150);
  });

  it('does not count the lunch break', () => {
    // 08:00 to 12:00 is four production hours; the break adds nothing.
    expect(elapsedProductionMinutes(dayShift, at(12, 30))).toBe(240);
    expect(elapsedProductionMinutes(dayShift, at(13, 30))).toBe(270);
  });

  it('caps at the full shift once it has ended', () => {
    expect(elapsedProductionMinutes(dayShift, at(20))).toBe(8 * 60);
  });

  it('counts correctly past midnight', () => {
    expect(elapsedProductionMinutes(nightShift, at(0, 30))).toBe(150);
    // 22:00–02:00 is four hours, then the break contributes nothing.
    expect(elapsedProductionMinutes(nightShift, at(2, 30))).toBe(240);
  });
});

describe('remainingProductionMinutes', () => {
  it('is the complement of elapsed', () => {
    expect(remainingProductionMinutes(dayShift, at(13))).toBe(240);
    expect(remainingProductionMinutes(dayShift, at(17))).toBe(0);
  });
});

describe('productionDate', () => {
  const tz = 'UTC';

  it('uses the calendar date for a day shift', () => {
    expect(productionDate(dayShift, new Date('2026-03-10T10:00:00Z'), tz)).toBe('2026-03-10');
  });

  it('keeps night-shift output on the day the shift began', () => {
    // 02:00 Wednesday belongs to Tuesday's shift, and Tuesday's figures.
    expect(productionDate(nightShift, new Date('2026-03-11T02:00:00Z'), tz)).toBe('2026-03-10');
  });

  it('uses the same date before midnight on a night shift', () => {
    expect(productionDate(nightShift, new Date('2026-03-10T23:00:00Z'), tz)).toBe('2026-03-10');
  });

  it('rolls the month back correctly', () => {
    expect(productionDate(nightShift, new Date('2026-04-01T03:00:00Z'), tz)).toBe('2026-03-31');
  });
});

describe('activeShift', () => {
  it('picks the shift covering now', () => {
    expect(activeShift([dayShift, nightShift], at(10))?.id).toBe('a');
    expect(activeShift([dayShift, nightShift], at(1))?.id).toBe('c');
  });

  it('returns null between shifts', () => {
    expect(activeShift([dayShift, nightShift], at(19))).toBeNull();
  });
});

describe('buildSlots', () => {
  it('fills a day shift with hourly slots', () => {
    const slots = buildSlots(at(8), at(17));
    expect(slots).toHaveLength(9);
    expect(slots[0]).toMatchObject({ startMinute: at(8), endMinute: at(9) });
    expect(slots.at(-1)).toMatchObject({ startMinute: at(16), endMinute: at(17) });
  });

  it('wraps across midnight', () => {
    const slots = buildSlots(at(22), at(6));
    expect(slots).toHaveLength(8);
    expect(slots[2]).toMatchObject({ startMinute: at(0), endMinute: at(1) });
  });

  it('leaves a short final slot rather than overrunning the shift', () => {
    const slots = buildSlots(at(8), at(12, 30));
    expect(slots).toHaveLength(5);
    expect(slots.at(-1)).toMatchObject({ startMinute: at(12), endMinute: at(12, 30) });
  });
});

describe('validateSlots', () => {
  it('accepts a well-formed shift', () => {
    expect(validateSlots(dayShift)).toEqual([]);
    expect(validateSlots(nightShift)).toEqual([]);
  });

  it('reports a gap', () => {
    const broken = { ...dayShift, slots: [slot(0, at(8), at(9)), slot(1, at(10), at(11))] };
    expect(validateSlots(broken).join(' ')).toContain('Gap');
  });

  it('reports an overlap', () => {
    const broken = { ...dayShift, slots: [slot(0, at(8), at(10)), slot(1, at(9), at(11))] };
    expect(validateSlots(broken).join(' ')).toContain('overlap');
  });

  it('reports a shift with no production time', () => {
    const broken = { ...dayShift, slots: [slot(0, at(8), at(9), true)] };
    expect(validateSlots(broken).join(' ')).toContain('no production time');
  });
});


const brk = (name: string, from: number, to: number): ShiftBreak => ({
  name, startMinute: from, endMinute: to, paid: false,
});

describe('buildSlotsWithBreaks', () => {
  it('splits an hour around a short tea break instead of writing it off', () => {
    // The whole point: 15 minutes of tea should not cost an hour of target.
    const slots = buildSlotsWithBreaks(at(8), at(12), 60, [brk('Tea', at(10), at(10, 15))]);
    const labels = slots.map((s) => [s.startMinute, s.endMinute, s.isBreak]);

    expect(labels).toEqual([
      [at(8), at(9), false],
      [at(9), at(10), false],
      [at(10), at(10, 15), true],
      [at(10, 15), at(11, 15), false],
      [at(11, 15), at(12), false],
    ]);
  });

  it('handles several breaks of different lengths in one shift', () => {
    const slots = buildSlotsWithBreaks(at(8), at(17), 60, [
      brk('Tea', at(10), at(10, 15)),
      brk('Lunch', at(12, 30), at(13, 30)),
      brk('Tea', at(15), at(15, 10)),
    ]);
    const breaks = slots.filter((s) => s.isBreak);
    expect(breaks).toHaveLength(3);
    expect(breaks.map((b) => b.name)).toEqual(['Tea', 'Lunch', 'Tea']);
  });

  it('keeps production minutes correct to the minute', () => {
    // 9 hours less 15 + 60 + 10 minutes of break = 455 production minutes.
    const shift = {
      ...dayShift,
      slots: buildSlotsWithBreaks(at(8), at(17), 60, [
        brk('Tea', at(10), at(10, 15)),
        brk('Lunch', at(12, 30), at(13, 30)),
        brk('Tea', at(15), at(15, 10)),
      ]),
    };
    expect(productionMinutes(shift)).toBe(9 * 60 - 15 - 60 - 10);
    expect(breakMinutes(shift)).toBe(85);
  });

  it('works across midnight', () => {
    const slots = buildSlotsWithBreaks(at(22), at(6), 60, [brk('Lunch', at(2), at(2, 30))]);
    const lunch = slots.find((s) => s.isBreak);
    expect(lunch).toMatchObject({ startMinute: at(2), endMinute: at(2, 30) });
    expect(slots.every((s) => s.index >= 0)).toBe(true);
  });

  it('numbers every slot in order with no gaps', () => {
    const slots = buildSlotsWithBreaks(at(8), at(17), 60, [brk('Lunch', at(12), at(13))]);
    expect(slots.map((s) => s.index)).toEqual(slots.map((_, i) => i));
  });

  it('produces plain slots when there are no breaks', () => {
    expect(buildSlotsWithBreaks(at(8), at(12), 60, [])).toHaveLength(4);
  });

  it('handles a break starting exactly on a slot boundary', () => {
    const slots = buildSlotsWithBreaks(at(8), at(11), 60, [brk('Tea', at(9), at(9, 30))]);
    expect(slots.map((s) => [s.startMinute, s.endMinute])).toEqual([
      [at(8), at(9)],
      [at(9), at(9, 30)],
      [at(9, 30), at(10, 30)],
      [at(10, 30), at(11)],
    ]);
  });
});

describe('validateBreaks', () => {
  const span = { startMinute: at(8), endMinute: at(17) };

  it('accepts breaks inside the shift', () => {
    expect(validateBreaks(span, [brk('Tea', at(10), at(10, 15))])).toEqual([]);
  });

  it('reports two breaks that overlap', () => {
    const problems = validateBreaks(span, [
      brk('Tea', at(10), at(10, 30)),
      brk('Lunch', at(10, 15), at(11)),
    ]);
    expect(problems.join(' ')).toContain('overlap');
  });

  it('reports a break running past the end of the shift', () => {
    expect(validateBreaks(span, [brk('Lunch', at(16, 30), at(17, 30))]).join(' ')).toContain('past the end');
  });

  it('reports a break with no length', () => {
    expect(validateBreaks(span, [brk('Tea', at(10), at(10))]).join(' ')).toContain('no length');
  });
});
