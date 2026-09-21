// src/lib/time.js
// Pure time helpers for shift slots. Times are stored as "HH:MM" (24h) strings.

/** Convert "HH:MM" -> minutes since midnight. Returns null on bad input. */
export function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Convert minutes since midnight -> "HH:MM". */
export function fromMinutes(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Display "HH:MM" as "h:MM AM/PM". */
export function to12h(hhmm) {
  const mins = toMinutes(hhmm);
  if (mins == null) return "--:--";
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

/** Duration of a slot in minutes, handling overnight wrap (end < start). */
export function slotDuration(slot) {
  const s = toMinutes(slot.startTime);
  const e = toMinutes(slot.endTime);
  if (s == null || e == null) return 0;
  return e >= s ? e - s : 1440 - s + e;
}

/** "now" as minutes since midnight, using a Date (defaults to real now). */
export function nowMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Classify each slot relative to `current` minutes:
 *   "past" | "active" | "future"
 * Returns slots annotated with { ...slot, state, durationMin }.
 */
export function annotateSlots(slots, current = nowMinutes()) {
  return slots.map((slot) => {
    const s = toMinutes(slot.startTime);
    const e = toMinutes(slot.endTime);
    let state = "future";
    if (s != null && e != null) {
      const inRange = e >= s ? current >= s && current < e : current >= s || current < e;
      if (inRange) state = "active";
      else if (current >= e && (e >= s ? true : false)) state = "past";
      else if (e < s && current >= e && current < s) state = "past";
      else if (current >= e) state = "past";
    }
    return { ...slot, state, durationMin: slotDuration(slot) };
  });
}

/** The currently active slot, or null. */
export function findActiveSlot(slots, current = nowMinutes()) {
  return annotateSlots(slots, current).find((s) => s.state === "active") || null;
}

/** Remaining minutes in a slot from `current`. */
export function remainingInSlot(slot, current = nowMinutes()) {
  const e = toMinutes(slot.endTime);
  if (e == null) return 0;
  const s = toMinutes(slot.startTime);
  if (e >= s) return Math.max(0, e - current);
  // overnight
  return current >= s ? 1440 - current + e : Math.max(0, e - current);
}

/**
 * Pick the shift that best matches `current` time, given all shifts and all
 * slots. Prefers a shift whose [earliest start, latest end] span contains now;
 * otherwise the shift whose start is soonest. Returns a shift id or "".
 */
export function pickShiftByTime(shifts, allSlots, current = nowMinutes()) {
  if (!shifts || shifts.length === 0) return "";
  const spans = shifts.map((sh) => {
    const slots = allSlots.filter((s) => s.shiftId === sh.id);
    const starts = slots.map((s) => toMinutes(s.startTime)).filter((x) => x != null);
    const ends = slots.map((s) => toMinutes(s.endTime)).filter((x) => x != null);
    if (!starts.length) return { id: sh.id, start: Infinity, end: -Infinity };
    return { id: sh.id, start: Math.min(...starts), end: Math.max(...ends) };
  });
  const within = spans.find((s) => current >= s.start && current < s.end);
  if (within) return within.id;
  // else the next upcoming shift today, else the first
  const upcoming = spans
    .filter((s) => s.start >= current)
    .sort((a, b) => a.start - b.start)[0];
  return (upcoming || spans[0]).id;
}
