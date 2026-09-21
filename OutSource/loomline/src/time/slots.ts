import type { Shift, ShiftBreak, ShiftSlot } from '@/types/domain';

/**
 * Shift and production-slot arithmetic.
 *
 * All times are minutes from factory-local midnight. The awkward part is the
 * overnight shift: 22:00–06:00 runs across a date boundary, so plain
 * comparison against the clock gives the wrong answer for eight hours a day.
 *
 * Everything here works in *shift-relative* minutes instead — how far into
 * the shift a moment is — which makes an overnight shift behave exactly like
 * a day shift and removes the special case entirely.
 */

export const MINUTES_PER_DAY = 1440;

export function wrap(minute: number): number {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Length of a shift in minutes, correct across midnight. */
export function shiftLength(shift: Pick<Shift, 'startMinute' | 'endMinute'>): number {
  const raw = wrap(shift.endMinute - shift.startMinute);
  // A shift with identical start and end is a full 24 hours, not zero.
  return raw === 0 ? MINUTES_PER_DAY : raw;
}

/** How far into the shift a clock time falls. Null when outside it. */
export function offsetIntoShift(
  shift: Pick<Shift, 'startMinute' | 'endMinute'>,
  minuteOfDay: number,
): number | null {
  const offset = wrap(minuteOfDay - shift.startMinute);
  return offset < shiftLength(shift) ? offset : null;
}

export function isWithinShift(
  shift: Pick<Shift, 'startMinute' | 'endMinute'>,
  minuteOfDay: number,
): boolean {
  return offsetIntoShift(shift, minuteOfDay) !== null;
}

export function crossesMidnight(shift: Pick<Shift, 'startMinute' | 'endMinute'>): boolean {
  return shift.startMinute + shiftLength(shift) > MINUTES_PER_DAY;
}

/**
 * The slot containing a moment, or null outside the shift. Break slots are
 * returned too — the caller decides what a break means, because "which slot
 * is it" and "may I scan" are different questions.
 */
export function currentSlot(shift: Shift, minuteOfDay: number): ShiftSlot | null {
  const offset = offsetIntoShift(shift, minuteOfDay);
  if (offset === null) return null;

  for (const slot of shift.slots) {
    if (slot.active === false) continue;
    const start = wrap(slot.startMinute - shift.startMinute);
    const end = start + slotLength(slot);
    if (offset >= start && offset < end) return slot;
  }
  return null;
}

export function slotLength(slot: Pick<ShiftSlot, 'startMinute' | 'endMinute'>): number {
  const raw = wrap(slot.endMinute - slot.startMinute);
  return raw === 0 ? MINUTES_PER_DAY : raw;
}

/** Whether production may be recorded right now. */
export function isProductionOpen(shift: Shift, minuteOfDay: number): boolean {
  const slot = currentSlot(shift, minuteOfDay);
  return Boolean(slot && !slot.isBreak);
}

/**
 * Total production minutes in a shift, breaks excluded. This is the
 * denominator behind every target and efficiency figure, so it lives here
 * rather than being recomputed anywhere it is needed.
 */
export function productionMinutes(shift: Shift): number {
  return shift.slots
    .filter((s) => s.active !== false && !s.isBreak)
    .reduce((total, s) => total + slotLength(s), 0);
}

/**
 * Production minutes elapsed so far, clipped to the current moment.
 *
 * A shift half over does not mean half the production minutes have passed —
 * a lunch break sitting in the middle would make that wrong, and the error
 * flows straight into every forecast on the wall display.
 */
export function elapsedProductionMinutes(shift: Shift, minuteOfDay: number): number {
  const offset = offsetIntoShift(shift, minuteOfDay);
  if (offset === null) {
    // Before the shift starts nothing has elapsed; after it ends, all of it.
    return wrap(minuteOfDay - shift.startMinute) < shiftLength(shift) ? 0 : productionMinutes(shift);
  }

  let elapsed = 0;
  for (const slot of shift.slots) {
    if (slot.active === false || slot.isBreak) continue;
    const start = wrap(slot.startMinute - shift.startMinute);
    const end = start + slotLength(slot);
    if (offset >= end) elapsed += slotLength(slot);
    else if (offset > start) elapsed += offset - start;
  }
  return elapsed;
}

export function remainingProductionMinutes(shift: Shift, minuteOfDay: number): number {
  return Math.max(0, productionMinutes(shift) - elapsedProductionMinutes(shift, minuteOfDay));
}

/**
 * The production date a moment belongs to.
 *
 * A night shift starting at 22:00 on Monday is still Monday's production at
 * 02:00 on Tuesday. Booking those pieces to Tuesday would leave Monday
 * short and give Tuesday output it never made.
 */
export function productionDate(
  shift: Pick<Shift, 'startMinute' | 'endMinute'>,
  now: Date,
  timezone: string,
): string {
  const minuteOfDay = minuteOfDayIn(now, timezone);
  const offset = offsetIntoShift(shift, minuteOfDay);

  // Inside an overnight shift, past midnight: belongs to the day it began.
  const rolledOver = offset !== null && minuteOfDay < shift.startMinute;
  const anchor = rolledOver ? new Date(now.getTime() - MINUTES_PER_DAY * 60_000) : now;

  return dateKeyIn(anchor, timezone);
}

export function minuteOfDayIn(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function dateKeyIn(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Picks the shift covering a moment, preferring the one it is furthest into. */
export function activeShift(shifts: Shift[], minuteOfDay: number): Shift | null {
  const candidates = shifts
    .filter((s) => s.active !== false && isWithinShift(s, minuteOfDay))
    .sort((a, b) => (offsetIntoShift(b, minuteOfDay) ?? 0) - (offsetIntoShift(a, minuteOfDay) ?? 0));
  return candidates[0] ?? null;
}

/** Builds evenly spaced slots for a shift with no breaks. */
export function buildSlots(
  startMinute: number,
  endMinute: number,
  slotMinutes = 60,
): ShiftSlot[] {
  const length = shiftLength({ startMinute, endMinute });
  const count = Math.ceil(length / slotMinutes);

  return Array.from({ length: count }, (_, i) => {
    const from = wrap(startMinute + i * slotMinutes);
    const remaining = length - i * slotMinutes;
    const to = wrap(from + Math.min(slotMinutes, remaining));
    return { index: i, startMinute: from, endMinute: to, isBreak: false, active: true };
  });
}

/**
 * Length of a break.
 *
 * Deliberately not `slotLength`, which treats equal start and end as a full
 * 24 hours — right for a shift that runs round the clock, wrong for a break,
 * where it means somebody left the end time as the start time.
 */
export function breakLength(b: Pick<ShiftBreak, 'startMinute' | 'endMinute'>): number {
  return wrap(b.endMinute - b.startMinute);
}

/**
 * Builds slots around breaks of any length.
 *
 * Production time is chunked into slots as before, but a break interrupts a
 * chunk rather than consuming a whole one. A fifteen-minute tea break at ten
 * o'clock leaves 10:00–10:15 as a break and 10:15–11:00 as production,
 * instead of writing off the hour.
 *
 * Everything downstream keeps working because the result is still an
 * ordered list of slots — the difference is that they are no longer all the
 * same length.
 */
export function buildSlotsWithBreaks(
  startMinute: number,
  endMinute: number,
  slotMinutes: number,
  breaks: ShiftBreak[],
): ShiftSlot[] {
  const length = shiftLength({ startMinute, endMinute });

  // Work in shift-relative minutes so an overnight shift needs no special
  // case, then convert back at the end.
  const rel = breaks
    .map((b) => ({
      ...b,
      from: wrap(b.startMinute - startMinute),
      to: wrap(b.startMinute - startMinute) + breakLength(b),
    }))
    .filter((b) => b.from < length && b.to > 0)
    .map((b) => ({ ...b, from: Math.max(0, b.from), to: Math.min(length, b.to) }))
    .sort((a, b) => a.from - b.from);

  const slots: ShiftSlot[] = [];
  let cursor = 0;
  let index = 0;

  const pushProduction = (from: number, to: number) => {
    for (let at = from; at < to; at += slotMinutes) {
      const stop = Math.min(at + slotMinutes, to);
      slots.push({
        index: index++,
        startMinute: wrap(startMinute + at),
        endMinute: wrap(startMinute + stop),
        isBreak: false,
        active: true,
      });
    }
  };

  for (const b of rel) {
    if (b.from > cursor) pushProduction(cursor, b.from);
    if (b.to > b.from) {
      slots.push({
        index: index++,
        startMinute: wrap(startMinute + b.from),
        endMinute: wrap(startMinute + b.to),
        isBreak: true,
        name: b.name,
        active: true,
      });
    }
    cursor = Math.max(cursor, b.to);
  }

  if (cursor < length) pushProduction(cursor, length);

  return slots;
}

/** Reports breaks that fall outside the shift or overlap each other. */
export function validateBreaks(
  shift: Pick<Shift, 'startMinute' | 'endMinute'>,
  breaks: ShiftBreak[],
): string[] {
  const problems: string[] = [];
  const length = shiftLength(shift);

  const rel = breaks
    .map((b, i) => ({
      i,
      name: b.name || `Break ${i + 1}`,
      from: wrap(b.startMinute - shift.startMinute),
      len: breakLength(b),
    }))
    .sort((a, b) => a.from - b.from);

  rel.forEach((b) => {
    if (b.len <= 0) problems.push(`${b.name} has no length.`);
    if (b.from >= length) problems.push(`${b.name} starts after the shift ends.`);
    else if (b.from + b.len > length) problems.push(`${b.name} runs past the end of the shift.`);
  });

  for (let i = 0; i < rel.length - 1; i++) {
    const a = rel[i]!;
    const next = rel[i + 1]!;
    if (a.from + a.len > next.from) {
      problems.push(`${a.name} and ${next.name} overlap.`);
    }
  }

  return problems;
}

/** Total break minutes in a shift. Shown beside production minutes. */
export function breakMinutes(shift: Shift): number {
  return shift.slots
    .filter((s) => s.active !== false && s.isBreak)
    .reduce((total, s) => total + slotLength(s), 0);
}

/** Reports slots that overlap or leave gaps, so the editor can warn. */
export function validateSlots(shift: Shift): string[] {
  const problems: string[] = [];
  const ordered = [...shift.slots]
    .filter((s) => s.active !== false)
    .sort(
      (a, b) =>
        wrap(a.startMinute - shift.startMinute) - wrap(b.startMinute - shift.startMinute),
    );

  for (let i = 0; i < ordered.length - 1; i++) {
    const current = ordered[i]!;
    const next = ordered[i + 1]!;
    const currentEnd = wrap(current.startMinute - shift.startMinute) + slotLength(current);
    const nextStart = wrap(next.startMinute - shift.startMinute);
    if (nextStart < currentEnd) problems.push(`Slots ${current.index + 1} and ${next.index + 1} overlap.`);
    else if (nextStart > currentEnd) problems.push(`Gap between slots ${current.index + 1} and ${next.index + 1}.`);
  }

  if (productionMinutes(shift) === 0) {
    problems.push('Every slot is a break, so no production time exists.');
  }

  return problems;
}

export function formatMinute(minute: number): string {
  const m = wrap(minute);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function parseClock(value: string): number {
  const [h = '0', m = '0'] = value.split(':');
  return wrap(Number(h) * 60 + Number(m));
}
