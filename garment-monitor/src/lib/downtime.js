// src/lib/downtime.js
// Shared logic for the Downtime & Andon module — sequential reference numbers
// (via a Firestore transaction, no Cloud Functions), stage timing math, the
// escalation engine, and notification writes.
import { runTransaction, doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, COL } from "../firebase/config.js";
import { toMinutes } from "./time.js";

const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

// DT-YYYYMMDD-000001 / AN-YYYYMMDD-000001, atomic per day per kind.
export async function nextRef(prefix) {
  const id = `${prefix}-${ymd()}`;
  const ref = doc(db, COL.counters, id);
  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const n = (snap.exists() ? (snap.data().seq || 0) : 0) + 1;
    tx.set(ref, { seq: n, updatedAt: serverTimestamp() }, { merge: true });
    return n;
  });
  return `${prefix}-${ymd()}-${String(seq).padStart(6, "0")}`;
}

export const minutesBetween = (aIso, bIso) =>
  !aIso || !bIso ? 0 : Math.max(0, Math.round((new Date(bIso) - new Date(aIso)) / 60000));

export const STATUS = ["Raised", "Attended", "Completed", "Verified"];
export const isOpen = (s) => s === "Raised" || s === "Attended";

const DEFAULT_TARGET = { attendTarget: 5, completeTarget: 15 };

/** Best-matching target: department-specific → factory-level → default. */
export function getTarget(targets, kind, factoryId, departmentId) {
  const k = (t) => !t.kind || t.kind === kind;
  return (
    targets.find((t) => k(t) && t.factoryId === factoryId && t.departmentId && t.departmentId === departmentId) ||
    targets.find((t) => k(t) && t.factoryId === factoryId && !t.departmentId) ||
    DEFAULT_TARGET
  );
}

const LEVEL_OWNER = { 1: "Supervisor", 2: "Department Manager", 3: "Factory Manager" };

/** Live escalation state for an open item. color: ok | warn | bad. */
export function escalation(item, target, nowIso = new Date().toISOString()) {
  if (item.status === "Completed" || item.status === "Verified") {
    return { status: "Normal", level: 0, color: "ok", elapsed: item.totalDowntime ?? null, owner: "" };
  }
  const elapsed = minutesBetween(item.raisedAt, nowIso);
  const limit = item.status === "Raised" ? (target.attendTarget || DEFAULT_TARGET.attendTarget)
                                         : (target.completeTarget || DEFAULT_TARGET.completeTarget);
  const ratio = limit ? elapsed / limit : 0;
  if (ratio < 0.8) return { status: "Normal", level: 0, color: "ok", elapsed, limit, owner: "" };
  if (ratio < 1) return { status: "Warning", level: 1, color: "warn", elapsed, limit, owner: LEVEL_OWNER[1] };
  const level = ratio >= 3 ? 3 : ratio >= 2 ? 2 : 1;
  return { status: "Critical", level, color: "bad", elapsed, limit, owner: LEVEL_OWNER[level] };
}

export async function writeNotification(n) {
  try {
    await addDoc(collection(db, COL.notifications), {
      ...n, read: false, createdAt: new Date().toISOString(), ts: serverTimestamp(),
    });
  } catch { /* notifications are best-effort */ }
}

// ---- Cross-shift handling (client-side; no Cloud Functions) ----------------
// Global setting `downtimeCarryOver`:
//   ON  → an open downtime that reaches its shift end carries into the NEXT
//         shift IF that shift is allocated for the module; otherwise it is
//         auto-closed at shift end.
//   OFF → every open downtime is auto-closed by the system at shift end.
// Enforced by whichever client is open to observe it (module tab / board).

function shiftSpan(shiftId, slots) {
  const ss = slots.filter((s) => s.shiftId === shiftId);
  const starts = ss.map((s) => toMinutes(s.startTime)).filter((x) => x != null);
  const ends = ss.map((s) => toMinutes(s.endTime)).filter((x) => x != null);
  if (!starts.length || !ends.length) return null;
  const startMin = Math.min(...starts), endMin = Math.max(...ends);
  return { startMin, endMin, overnight: endMin <= startMin };
}
// Local wall-clock datetime (the device runs in factory-local time).
function atTime(dateStr, mins, addDay = false) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (addDay) d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0); d.setMinutes(mins);
  return d;
}
export function shiftEndDate(dateStr, shiftId, slots) {
  const s = shiftSpan(shiftId, slots);
  return s && dateStr ? atTime(dateStr, s.endMin, s.overnight) : null;
}
export function shiftStartDate(dateStr, shiftId, slots) {
  const s = shiftSpan(shiftId, slots);
  return s && dateStr ? atTime(dateStr, s.startMin) : null;
}
// Earliest shift allocated for the module (from its dailyPlans) starting at/after `afterDate`.
export function nextAllocatedShift(modulePlans, slots, afterDate) {
  let best = null;
  for (const p of modulePlans) {
    if (!p.shiftId || !p.date) continue;
    const start = shiftStartDate(p.date, p.shiftId, slots);
    if (start && start.getTime() >= afterDate.getTime() - 60000) {
      if (!best || start.getTime() < best._t) best = { date: p.date, shiftId: p.shiftId, _t: start.getTime() };
    }
  }
  return best ? { date: best.date, shiftId: best.shiftId } : null;
}
// Returns a patch to apply (or null). Patch with __carry means "move to next shift".
export function reconcileDowntime(item, { carryOver, slots, modulePlans, now = new Date() }) {
  if (!isOpen(item.status)) return null;
  const dateStr = item.date || (item.raisedAt || "").slice(0, 10);
  if (!item.shiftId || !dateStr) return null;
  const end = shiftEndDate(dateStr, item.shiftId, slots);
  if (!end || now.getTime() < end.getTime()) return null;          // shift not over yet

  if (carryOver) {
    const next = nextAllocatedShift(modulePlans, slots, end);
    if (next && (next.date !== dateStr || next.shiftId !== item.shiftId)) {
      return { __carry: true, shiftId: next.shiftId, date: next.date, carriedOver: true };
    }
  }
  const closeIso = end.toISOString();
  const attendedAt = item.attendedAt || closeIso;
  return {
    status: "Verified", autoClosed: true,
    attendedAt, timeToAttend: item.timeToAttend ?? minutesBetween(item.raisedAt, attendedAt),
    completedAt: closeIso, completionNotes: "System auto-closed at shift end", rootCause: "Auto-closed (shift end)",
    timeToComplete: minutesBetween(attendedAt, closeIso), totalDowntime: minutesBetween(item.raisedAt, closeIso),
    verifiedAt: closeIso, verificationTime: 0, fullResolutionTime: minutesBetween(item.raisedAt, closeIso),
  };
}
