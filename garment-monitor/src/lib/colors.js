// src/lib/colors.js
// Cell color logic for the production board, exactly per spec.
//   Green  : actual >= plan
//   Amber  : actual between 80% and 99% of plan
//   Red    : actual below 80% of plan
//   Grey   : future slot (or break slot)
//   Blue   : current active slot
//
// `state` comes from time.annotateSlots: "past" | "active" | "future".

export const CELL = {
  ok: { bg: "#10B981", text: "#06281d", label: "On / Above Target" },
  warn: { bg: "#F59E0B", text: "#2b1c00", label: "80–99% of Target" },
  bad: { bg: "#EF4444", text: "#2b0606", label: "Below 80%" },
  future: { bg: "#334155", text: "#94A3B8", label: "Upcoming Slot" },
  active: { bg: "#3B82F6", text: "#04132e", label: "Active Slot" },
  break: { bg: "#1E293B", text: "#64748B", label: "Break" },
};

/**
 * Decide a cell's color.
 * @returns one of CELL keys: "ok" | "warn" | "bad" | "future" | "active" | "break"
 */
export function cellColor({ actual, plan, slotType, state }) {
  if (slotType === "Break") return "break";
  if (state === "future") return "future";

  // Active slots still color by performance, but get a blue ring (handled in UI).
  if (!plan || plan <= 0) return state === "active" ? "active" : "future";

  const ratio = actual / plan;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.8) return "warn";
  return "bad";
}

/** Whether a cell should show the blue "active" ring overlay. */
export function isActiveSlot(state) {
  return state === "active";
}

// ---------------------------------------------------------------------------
// Red / green-only mode (used by the public TV display board).
//   Green : a production slot whose actual >= target (target met)
//   Red   : a production slot that is past/active but target not met
//           (includes "past slot with no entry" = a missed update)
//   Idle  : a future production slot (nothing to judge yet) — dim, not red
// Break slots are not rendered at all on the display board.
export const CELL_RG = {
  ok: { bg: "#10B981", text: "#06281d", label: "Target met" },
  bad: { bg: "#EF4444", text: "#2b0606", label: "Below target / missed" },
  idle: { bg: "#1E293B", text: "#64748B", label: "Upcoming" },
};

export function cellColorRG({ actual, target, state }) {
  if (state === "future") return "idle";   // nothing to grade yet
  if (!target || target <= 0) return "idle";
  return (actual ?? 0) >= target ? "ok" : "bad";
}
