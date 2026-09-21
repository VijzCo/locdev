// src/pages/TeamAllocation.jsx
// Shift & team allocation:
//   • Bulk allocate a shift to many modules across a date range.
//   • Below, a filterable list of the allocated shifts with an editable
//     "Team members / module" field and a delete action. Allocations whose
//     shift is already in the PAST cannot be deleted (history is preserved).
import { useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where, upsertDoc, removeDoc } from "../firebase/db.js";
import { availableMinutes, dailyTarget } from "../lib/calc.js";
import { toMinutes, nowMinutes } from "../lib/time.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";

const today = () => new Date().toISOString().slice(0, 10);
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const num = (v) => Number(v) || 0;

function datesBetween(start, end) {
  // Pure string/UTC iteration so the output dates exactly equal the inputs —
  // no local-timezone shift (which previously moved dates back a day for
  // positive-offset zones like UTC+2, saving allocations under the wrong day).
  const out = [];
  if (!start || !end || end < start) return out;
  let d = start;
  while (d <= end && out.length <= 92) {
    out.push(d);
    const dt = new Date(d + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return out;
}

export default function TeamAllocation() {
  // bulk allocate state
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [bFactory, setBFactory] = useState("");
  const [bShift, setBShift] = useState("");
  const [bStyle, setBStyle] = useState("");
  const [bTeam, setBTeam] = useState("");
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  // list filters
  const [fFrom, setFFrom] = useState(ago(-7));
  const [fTo, setFTo] = useState(ago(7));
  const [fFactory, setFFactory] = useState("");
  const [fShift, setFShift] = useState("");
  const [fModule, setFModule] = useState("");
  const [teamEdits, setTeamEdits] = useState({});
  const [sel, setSel] = useState({});           // planId -> selected for bulk delete

  const { user } = useAuth();
  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const modulesRaw = scopeFactories(user, useCollection(COL.modules, [], []).data, "factoryId");
  const styles = useCollection(COL.styles, [], []).data;
  const shifts = useCollection(COL.shifts, [], []).data;
  const slotsAll = useCollection(COL.shiftSlots, [], []).data;
  const allocPlans = useCollection(COL.dailyPlans, [where("date", ">=", fFrom), where("date", "<=", fTo)], [fFrom, fTo]).data;

  const factoryName = (id) => factories.find((f) => f.id === id)?.name || "—";
  const moduleNum = (id) => modulesRaw.find((m) => m.id === id)?.number || id;
  const shiftName = (id) => shifts.find((s) => s.id === id)?.name || "—";
  const availMinOf = (shiftId) => availableMinutes(slotsAll.filter((s) => s.shiftId === shiftId));

  // ----- bulk allocate -----
  const effShift = bShift || shifts[0]?.id || "";
  const bAvail = useMemo(() => availMinOf(effShift), [slotsAll, effShift]);
  const bStyleObj = styles.find((s) => s.id === bStyle);
  const modulesForFactory = useMemo(
    () => modulesRaw.filter((m) => (!bFactory || m.factoryId === bFactory) && m.status !== "Inactive")
      .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })),
    [modulesRaw, bFactory]
  );
  const chosen = modulesForFactory.filter((m) => picked[m.id]);
  const bTarget = dailyTarget({ availableMin: bAvail, teamMembers: num(bTeam), efficiencyPct: bStyleObj?.plannedEffPct ?? 75, smv: bStyleObj?.smv ?? 0 });
  const dates = datesBetween(start, end);
  const toggleAll = () => setPicked(chosen.length === modulesForFactory.length ? {} : Object.fromEntries(modulesForFactory.map((m) => [m.id, true])));

  const allocate = async () => {
    if (!effShift || !chosen.length || !dates.length) return;
    setBusy(true); setLog(""); let n = 0;
    try {
      for (const d of dates) for (const m of chosen) {
        await upsertDoc(COL.dailyPlans, `${d}_${m.id}`, {
          date: d, factoryId: m.factoryId, moduleId: m.id, shiftId: effShift,
          styleId: bStyle || "", smv: bStyleObj?.smv ?? 0, plannedEffPct: bStyleObj?.plannedEffPct ?? 75,
          teamCount: Math.max(0, num(bTeam)), availableMin: bAvail, mode: "Production", targetMode: "auto", dailyTarget: bTarget,
        });
        await upsertDoc(COL.teamAllocations, `${d}_${m.id}`, {
          date: d, factoryId: m.factoryId, moduleId: m.id, shiftId: effShift, styleId: bStyle || "", teamCount: Math.max(0, num(bTeam)),
        });
        n++; setLog(`Allocated ${n} of ${dates.length * chosen.length}…`);
      }
      setLog(`Done — ${n} allocations.`);
    } catch (e) { setLog("Error: " + (e?.message || e)); } finally { setBusy(false); }
  };

  // ----- allocations list -----
  const isPast = (plan) => {
    const t = today();
    if (plan.date < t) return true;
    if (plan.date > t) return false;
    const ends = slotsAll.filter((s) => s.shiftId === plan.shiftId).map((s) => toMinutes(s.endTime)).filter((x) => x != null);
    return ends.length ? Math.max(...ends) <= nowMinutes() : false;
  };
  const statusOf = (plan) => {
    const t = today();
    if (plan.date < t) return { label: "Past", tone: "text-slate-500" };
    if (plan.date > t) return { label: "Upcoming", tone: "text-info" };
    return isPast(plan) ? { label: "Ended", tone: "text-slate-500" } : { label: "Today", tone: "text-ok" };
  };

  const list = useMemo(() => {
    return allocPlans
      .filter((p) => p.shiftId)
      .filter((p) => (!fFactory || p.factoryId === fFactory) && (!fShift || p.shiftId === fShift) && (!fModule || p.moduleId === fModule))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(moduleNum(a.moduleId)).localeCompare(String(moduleNum(b.moduleId)), undefined, { numeric: true })));
  }, [allocPlans, fFactory, fShift, fModule]);

  const teamVal = (p) => (teamEdits[p.id] !== undefined ? teamEdits[p.id] : (p.teamCount ?? ""));
  const saveTeam = async (p) => {
    const t = Math.max(0, num(teamVal(p)));
    const tgt = p.targetMode === "manual"
      ? p.dailyTarget
      : dailyTarget({ availableMin: availMinOf(p.shiftId), teamMembers: t, efficiencyPct: p.plannedEffPct ?? 75, smv: p.smv ?? 0 });
    await upsertDoc(COL.dailyPlans, p.id, { teamCount: t, dailyTarget: tgt });
    await upsertDoc(COL.teamAllocations, p.id, { teamCount: t });
    setTeamEdits((e) => { const n = { ...e }; delete n[p.id]; return n; });
  };
  const del = async (p) => {
    if (isPast(p)) return;
    if (!window.confirm(`Delete ${moduleNum(p.moduleId)} on ${p.date}?`)) return;
    await removeDoc(COL.dailyPlans, p.id);
    await removeDoc(COL.teamAllocations, p.id);
  };

  // bulk delete — only non-past allocations are selectable
  const deletable = useMemo(() => list.filter((p) => !isPast(p)), [list]);
  const selectedIds = deletable.filter((p) => sel[p.id]).map((p) => p.id);
  const allSelected = deletable.length > 0 && selectedIds.length === deletable.length;
  const toggleSelAll = () =>
    setSel(allSelected ? {} : Object.fromEntries(deletable.map((p) => [p.id, true])));
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} allocation(s)? Past shifts are skipped.`)) return;
    setBulkBusy(true);
    try {
      for (const id of selectedIds) {
        await removeDoc(COL.dailyPlans, id);
        await removeDoc(COL.teamAllocations, id);
      }
      setSel({});
    } finally { setBulkBusy(false); }
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Shift &amp; Team Allocation</h1>
        <p className="text-xs text-slate-400">Bulk-allocate a shift to modules, then manage the allocations below.</p>
      </div>

      {/* Bulk allocate */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Bulk allocate</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div><label className="label">From date</label><input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label className="label">To date</label><input type="date" className="field" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><label className="label">Factory</label>
            <select className="field" value={bFactory} onChange={(e) => { setBFactory(e.target.value); setPicked({}); }}>
              <option value="">All factories</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div><label className="label">Shift</label>
            <select className="field" value={effShift} onChange={(e) => setBShift(e.target.value)}>
              {shifts.length === 0 && <option value="">—</option>}{shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="label">Style (optional)</label>
            <select className="field" value={bStyle} onChange={(e) => setBStyle(e.target.value)}>
              <option value="">—</option>{styles.map((s) => <option key={s.id} value={s.id}>{s.number} — {s.buyer}</option>)}
            </select></div>
          <div><label className="label">Team members / module</label>
            <input type="number" min="0" className="field" value={bTeam} onChange={(e) => setBTeam(e.target.value)} /></div>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Modules <span className="text-slate-400">({chosen.length} selected)</span></span>
            <button className="text-xs text-info underline" onClick={toggleAll}>{chosen.length === modulesForFactory.length && modulesForFactory.length ? "Clear all" : "Select all"}</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {modulesForFactory.map((m) => (
              <label key={m.id} className={"flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm " + (picked[m.id] ? "border-info bg-info/10" : "border-grid bg-bg")}>
                <input type="checkbox" checked={!!picked[m.id]} onChange={(e) => setPicked((p) => ({ ...p, [m.id]: e.target.checked }))} />
                <span className="font-semibold">{m.number}</span>
              </label>
            ))}
            {modulesForFactory.length === 0 && <span className="text-sm text-slate-500">No modules.</span>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            <span className="font-mono text-ink">{dates.length}</span> day(s) · <span className="font-mono text-ink">{chosen.length}</span> module(s) ·
            target/module <span className="font-mono text-ok">{bTarget.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            {log && <span className="text-xs text-slate-400">{log}</span>}
            <button className="btn-primary disabled:opacity-40" disabled={busy || !effShift || !chosen.length || !dates.length} onClick={allocate}>{busy ? "Allocating…" : "Allocate"}</button>
          </div>
        </div>
      </div>

      {/* Allocations list */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Allocated shifts</h2>
          <button className="btn-danger px-3 py-1.5 text-xs disabled:opacity-30"
            onClick={bulkDelete} disabled={!selectedIds.length || bulkBusy}>
            {bulkBusy ? "Deleting…" : `Delete selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div><label className="label">From</label><input type="date" className="field" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input type="date" className="field" value={fTo} onChange={(e) => setFTo(e.target.value)} /></div>
          <div><label className="label">Factory</label>
            <select className="field" value={fFactory} onChange={(e) => setFFactory(e.target.value)}>
              <option value="">All</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div><label className="label">Shift</label>
            <select className="field" value={fShift} onChange={(e) => setFShift(e.target.value)}>
              <option value="">All</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="label">Module</label>
            <select className="field" value={fModule} onChange={(e) => setFModule(e.target.value)}>
              <option value="">All</option>{modulesRaw.map((m) => <option key={m.id} value={m.id}>{m.number}</option>)}
            </select></div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2"><input type="checkbox" className="h-4 w-4 accent-info" checked={allSelected} onChange={toggleSelAll} disabled={!deletable.length} title="Select all deletable" /></th>
                <th className="px-3 py-2">Date</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Factory</th>
                <th className="px-3 py-2">Shift</th><th className="px-3 py-2">Team / module</th><th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-slate-500">No allocations in range.</td></tr>}
              {list.map((p) => {
                const past = isPast(p);
                const st = statusOf(p);
                return (
                  <tr key={p.id} className={"border-b border-grid/50 " + (sel[p.id] ? "bg-bad/5" : "")}>
                    <td className="px-3 py-2">
                      <input type="checkbox" className="h-4 w-4 accent-info" checked={!!sel[p.id]} disabled={past}
                        onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                        title={past ? "Past shifts can't be deleted" : "Select"} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.date}</td>
                    <td className="px-3 py-2 font-semibold">{moduleNum(p.moduleId)}</td>
                    <td className="px-3 py-2 text-slate-400">{factoryName(p.factoryId)}</td>
                    <td className="px-3 py-2">{shiftName(p.shiftId)}</td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" className="field h-9 w-24" value={teamVal(p)}
                        onChange={(e) => setTeamEdits((s) => ({ ...s, [p.id]: e.target.value }))}
                        onBlur={() => saveTeam(p)} />
                    </td>
                    <td className="px-3 py-2 font-mono text-ok">{(p.dailyTarget || 0).toLocaleString()}</td>
                    <td className={"px-3 py-2 font-semibold " + st.tone}>{st.label}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn-danger px-2 py-1 text-xs disabled:opacity-30" onClick={() => del(p)}
                        disabled={past} title={past ? "Past shifts can't be deleted" : "Delete"}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
