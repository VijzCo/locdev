// src/pages/Plans.jsx
// Daily plans as an EDITABLE TABLE — set every module's plan in one grid
// instead of one-by-one. Team allocation is combined in (the Team column),
// and Style is a manual per-row selector that auto-fills SMV/efficiency
// (both still editable). Targets recompute live; each row saves on its own,
// or use "Save all". Plan id is deterministic: `${date}_${moduleId}`.
import { useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where, upsertDoc, removeDoc, patchDoc } from "../firebase/db.js";
import { availableMinutes, dailyTarget } from "../lib/calc.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";

const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v) || 0;

export default function Plans() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [factoryId, setFactoryId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [edits, setEdits] = useState({});   // moduleId -> partial overrides
  const [savingAll, setSavingAll] = useState(false);

  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const modulesRaw = scopeFactories(user, useCollection(COL.modules, [], []).data, "factoryId");
  const styles = useCollection(COL.styles, [], []).data;
  const shifts = useCollection(COL.shifts, [], []).data;
  const slotsAll = useCollection(COL.shiftSlots, [], []).data;
  const plans = useCollection(COL.dailyPlans, [where("date", "==", date)], [date]).data;

  const styleById = useMemo(() => Object.fromEntries(styles.map((s) => [s.id, s])), [styles]);
  const effShift = shiftId || shifts[0]?.id || "";
  const availMin = useMemo(
    () => availableMinutes(slotsAll.filter((s) => s.shiftId === effShift)),
    [slotsAll, effShift]
  );

  const modules = useMemo(
    () => modulesRaw
      .filter((m) => (!factoryId || m.factoryId === factoryId) && m.status !== "Inactive")
      .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })),
    [modulesRaw, factoryId]
  );

  const planFor = (mId) => plans.find((p) => p.moduleId === mId);
  const rowData = (m) => {
    const p = planFor(m.id) || {};
    const e = edits[m.id] || {};
    const styleId = e.styleId ?? p.styleId ?? "";
    const st = styleById[styleId];
    return {
      styleId,
      smv: e.smv ?? p.smv ?? st?.smv ?? "",
      plannedEffPct: e.plannedEffPct ?? p.plannedEffPct ?? st?.plannedEffPct ?? 75,
      teamCount: e.teamCount ?? p.teamCount ?? "",
      mode: e.mode ?? p.mode ?? "Production",
      targetMode: e.targetMode ?? p.targetMode ?? "auto",
      manualTarget: e.manualTarget ?? (p.targetMode === "manual" ? p.dailyTarget : "") ?? "",
      hasPlan: !!planFor(m.id),
      dirty: !!edits[m.id],
    };
  };
  const autoTarget = (r) =>
    dailyTarget({ availableMin: availMin, teamMembers: num(r.teamCount), efficiencyPct: num(r.plannedEffPct), smv: num(r.smv) });
  const targetOf = (r) => (r.targetMode === "manual" ? Math.max(0, num(r.manualTarget)) : autoTarget(r));

  const setEdit = (mId, patch) => setEdits((s) => ({ ...s, [mId]: { ...s[mId], ...patch } }));
  const onStyle = (m, styleId) => {
    const st = styleById[styleId];
    const r = rowData(m);
    setEdit(m.id, { styleId, smv: st?.smv ?? r.smv, plannedEffPct: st?.plannedEffPct ?? r.plannedEffPct });
  };

  const saveRow = async (m) => {
    if (!effShift) return;
    const r = rowData(m);
    const payload = {
      date, factoryId: m.factoryId, moduleId: m.id, shiftId: effShift,
      styleId: r.styleId || "", smv: num(r.smv), plannedEffPct: num(r.plannedEffPct),
      teamCount: Math.max(0, num(r.teamCount)), availableMin: availMin,
      mode: r.mode, targetMode: r.targetMode, dailyTarget: targetOf(r),
    };
    await upsertDoc(COL.dailyPlans, `${date}_${m.id}`, payload);
    await upsertDoc(COL.teamAllocations, `${date}_${m.id}`, {
      date, factoryId: m.factoryId, moduleId: m.id, shiftId: effShift,
      styleId: r.styleId || "", teamCount: Math.max(0, num(r.teamCount)),
    });
    setEdits((s) => { const n = { ...s }; delete n[m.id]; return n; });
  };

  const saveAll = async () => {
    setSavingAll(true);
    const dirty = modules.filter((m) => edits[m.id]);
    for (const m of dirty) await saveRow(m);
    setSavingAll(false);
  };

  const del = async (m) => {
    if (!window.confirm(`Delete plan for ${m.number}?`)) return;
    await removeDoc(COL.dailyPlans, `${date}_${m.id}`).catch(() => {});
    await removeDoc(COL.teamAllocations, `${date}_${m.id}`).catch(() => {});
  };

  const dirtyCount = modules.filter((m) => edits[m.id]).length;

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Daily Production Plans</h1>
          <p className="text-xs text-slate-400">Edit every module inline · team &amp; style included · targets auto-calculated</p>
        </div>
        <button className="btn-primary disabled:opacity-40" onClick={saveAll} disabled={!dirtyCount || savingAll}>
          {savingAll ? "Saving…" : `Save all${dirtyCount ? ` (${dirtyCount})` : ""}`}
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div><label className="label">Date</label><input type="date" className="field w-40" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Factory</label>
          <select className="field w-44" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All factories</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Shift</label>
          <select className="field w-40" value={effShift} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.length === 0 && <option value="">—</option>}
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div className="ml-auto text-xs text-slate-400">Available minutes: <b className="font-mono text-ink">{availMin}</b></div>
      </div>

      {/* Editable grid */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Style</th>
              <th className="px-3 py-2">SMV</th>
              <th className="px-3 py-2">Eff%</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Plan qty</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-slate-500">No modules. Add modules / pick a factory.</td></tr>}
            {modules.map((m) => {
              const r = rowData(m);
              const target = targetOf(r);
              return (
                <tr key={m.id} className={"border-b border-grid/50 " + (r.dirty ? "bg-info/5" : "")}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{m.number}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.hasPlan ? "planned" : "no plan"}
                      {planFor(m.id)?.targetLocked && (
                        <button className="ml-1 text-warn underline" title="Target was locked from the module tab"
                          onClick={() => patchDoc(COL.dailyPlans, `${date}_${m.id}`, { targetLocked: false })}>🔒 unlock</button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select className={"field h-9 w-28 " + (r.mode === "QCO" ? "text-warn" : "")}
                      value={r.mode} onChange={(e) => setEdit(m.id, { mode: e.target.value })}>
                      <option value="Production">Production</option>
                      <option value="QCO">QCO</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select className="field h-9 w-40" value={r.styleId} onChange={(e) => onStyle(m, e.target.value)}>
                      <option value="">—</option>{styles.map((s) => <option key={s.id} value={s.id}>{s.number}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" min="0" className="field h-9 w-20" value={r.smv}
                      onChange={(e) => setEdit(m.id, { smv: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" className="field h-9 w-16" value={r.plannedEffPct}
                      onChange={(e) => setEdit(m.id, { plannedEffPct: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" className="field h-9 w-16" value={r.teamCount}
                      onChange={(e) => setEdit(m.id, { teamCount: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input type="number" min="0"
                        className={"field h-9 w-24 font-mono font-bold " + (r.targetMode === "manual" ? "text-info" : "text-ok")}
                        value={target}
                        onChange={(e) => setEdit(m.id, { targetMode: "manual", manualTarget: e.target.value })} />
                      {r.targetMode === "manual"
                        ? <button title="Back to auto-calculated" className="text-[10px] text-slate-400 underline"
                            onClick={() => setEdit(m.id, { targetMode: "auto" })}>auto</button>
                        : <span className="text-[10px] text-slate-500">auto</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="btn-primary mr-1 px-2 py-1 text-xs disabled:opacity-40"
                      onClick={() => saveRow(m)} disabled={!effShift}>Save</button>
                    {r.hasPlan && <button className="btn-danger px-2 py-1 text-xs" onClick={() => del(m)}>Del</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!effShift && <p className="text-xs text-warn">Select a shift to compute targets and save.</p>}
    </div>
  );
}
