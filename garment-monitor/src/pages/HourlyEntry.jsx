// src/pages/HourlyEntry.jsx
// Recorder workspace — enter one SLOT across ALL modules in a single screen,
// instead of one module at a time.
//   • Pick the shift + slot at the top (touch-friendly slot chips).
//   • Every module that has a plan shows its own target + input + quick-adds
//     for that slot (plain numeric inputs).
//   • "Fill empty with 0" backfills modules a recorder missed, in one tap.
//   • Saves instantly per module.
import { useMemo, useState, useEffect } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where, upsertDoc } from "../firebase/db.js";
import { setAuditSource } from "../firebase/audit.js";
import { distributeTargets, achievementPct } from "../lib/calc.js";
import { annotateSlots, to12h, nowMinutes, findActiveSlot } from "../lib/time.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";

const today = () => new Date().toISOString().slice(0, 10);
const prodId = (date, moduleId, slotId) => `${date}_${moduleId}_${slotId}`;

export default function HourlyEntry() {
  useEffect(() => { setAuditSource("recorder"); return () => setAuditSource("app"); }, []);
  const [date, setDate] = useState(today());
  const [factoryId, setFactoryId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [slotId, setSlotId] = useState("");

  const { user } = useAuth();
  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const modulesRaw = scopeFactories(user, useCollection(COL.modules, [], []).data, "factoryId");
  const shifts = useCollection(COL.shifts, [], []).data;
  const slotsAll = useCollection(COL.shiftSlots, [], []).data;
  const plans = useCollection(COL.dailyPlans, [where("date", "==", date)], [date]).data;
  const production = useCollection(COL.hourlyProduction, [where("date", "==", date)], [date]).data;

  const effShift = shiftId || shifts[0]?.id || "";

  const slots = useMemo(() => {
    const ordered = slotsAll
      .filter((s) => s.shiftId === effShift)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return annotateSlots(ordered, nowMinutes());
  }, [slotsAll, effShift]);

  const prodSlots = useMemo(() => slots.filter((s) => s.slotType !== "Break"), [slots]);

  // Default to the currently active slot.
  useEffect(() => {
    if (!slotId && prodSlots.length) {
      const active = findActiveSlot(prodSlots, nowMinutes());
      setSlotId(active?.id || prodSlots[0].id);
    }
  }, [prodSlots, slotId]);

  const slot = slots.find((s) => s.id === slotId);
  const slotIndex = slots.findIndex((s) => s.id === slotId);

  // Modules in this factory/shift that have a plan today.
  const rows = useMemo(() => {
    return modulesRaw
      .filter((m) => (!factoryId || m.factoryId === factoryId) && m.status !== "Inactive")
      .map((m) => {
        const plan = plans.find((p) => p.moduleId === m.id && p.shiftId === effShift);
        if (!plan) return null;
        const dist = distributeTargets(slots, plan.dailyTarget || 0);
        const target = dist[slotIndex]?.target ?? 0;
        const rec = production.find((p) => p.moduleId === m.id && p.slotId === slotId);
        return { module: m, plan, target, saved: rec?.actualQty ?? null };
      })
      .filter(Boolean)
      .sort((a, b) => String(a.module.number).localeCompare(String(b.module.number), undefined, { numeric: true }));
  }, [modulesRaw, factoryId, plans, effShift, slots, slotIndex, production, slotId]);

  const [vals, setVals] = useState({});
  useEffect(() => { setVals({}); }, [slotId, date, factoryId, effShift]);

  const valueFor = (mId, saved) => (vals[mId] !== undefined ? vals[mId] : (saved ?? ""));

  const [flash, setFlash] = useState("");
  const persist = async (row, qty) => {
    const safe = Math.max(0, Math.floor(Number(qty) || 0)); // never negative
    setVals((v) => ({ ...v, [row.module.id]: safe }));
    await upsertDoc(COL.hourlyProduction, prodId(date, row.module.id, slot.id), {
      date, factoryId: row.module.factoryId, moduleId: row.module.id,
      slotId: slot.id, slotName: slot.name, slotType: slot.slotType,
      actualQty: safe, target: row.target,
    });
    setFlash(row.module.id);
    setTimeout(() => setFlash((f) => (f === row.module.id ? "" : f)), 800);
  };
  const fillEmpty = () => {
    rows.forEach((r) => {
      const v = valueFor(r.module.id, r.saved);
      if (v === "" || v === null) persist(r, 0);
    });
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Hourly Production Entry</h1>
        <p className="text-xs text-slate-400">Pick a slot, then enter every module at once.</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div><label className="label">Date</label>
          <input type="date" className="field w-40" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Factory</label>
          <select className="field w-44" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All factories</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Shift</label>
          <select className="field w-40" value={shiftId} onChange={(e) => { setShiftId(e.target.value); setSlotId(""); }}>
            {shifts.length === 0 && <option value="">—</option>}
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
      </div>

      {/* Slot chips */}
      <div className="card p-3">
        <label className="label mb-2 block">Slot</label>
        <div className="flex flex-wrap gap-2">
          {prodSlots.map((s) => (
            <button key={s.id} onClick={() => setSlotId(s.id)}
              className={
                "rounded-lg px-3 py-2 text-sm font-bold transition " +
                (s.id === slotId ? "bg-info text-white"
                  : s.state === "active" ? "bg-info/20 text-info"
                  : "bg-grid/60 text-slate-300 hover:bg-grid")
              }>
              {s.name}
              <span className="ml-1 font-mono text-[10px] opacity-70">{to12h(s.startTime)}</span>
            </button>
          ))}
          {prodSlots.length === 0 && <span className="text-sm text-slate-500">No slots for this shift.</span>}
        </div>
      </div>

      {/* Entry grid */}
      {!slot ? (
        <div className="card p-10 text-center text-sm text-slate-500">Select a slot above.</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-warn">
          No modules with a daily plan for {date} on this shift. Create plans first.
        </div>
      ) : (
        <div className="card p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold">{slot.name}</span>
              <span className="ml-2 font-mono text-slate-400">{to12h(slot.startTime)}–{to12h(slot.endTime)}</span>
            </div>
            <button onClick={fillEmpty} className="btn h-9 bg-grid/60 text-xs hover:bg-grid">
              Fill empty with 0
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const v = valueFor(r.module.id, r.saved);
              const has = v !== "" && v !== null;
              const missed = slot.state !== "future" && !has;
              const met = has && Number(v) >= r.target;
              return (
                <div key={r.module.id}
                  className={"rounded-xl border p-2.5 " + (missed ? "border-bad/50 bg-bad/5" : "border-grid bg-bg")}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{r.module.number}</span>
                    <span className="font-mono text-xs text-slate-400">
                      target {r.target}{has && ` · ${achievementPct(Number(v), r.target)}%`}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" inputMode="numeric" min="0"
                      className={"field h-11 w-full text-center text-lg font-bold " + (met ? "text-ok" : missed ? "text-bad" : "")}
                      value={v}
                      onChange={(e) => setVals((x) => ({ ...x, [r.module.id]: e.target.value }))}
                      onBlur={(e) => e.target.value !== "" && persist(r, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.target.value !== "" && persist(r, e.target.value)} />
                    <span className={"w-5 text-center text-sm " + (flash === r.module.id ? "text-ok" : "text-transparent")}>✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
