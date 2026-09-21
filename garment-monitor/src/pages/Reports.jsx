// src/pages/Reports.jsx
import { useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where } from "../firebase/db.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell as RCell, Legend,
} from "recharts";
import { exportExcel, exportPDF } from "../lib/exports.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";
import {
  availableMinutes, distributeTargets, achievementPct, efficiencyPct, variance, lossAnalysis, breakMinutes,
} from "../lib/calc.js";

const today = () => new Date().toISOString().slice(0, 10);
const TABS = ["Daily Production", "Hourly", "Factory Performance", "Loss Analysis", "Downtime Loss"];
const axis = { stroke: "#94A3B8", fontSize: 12 };

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState(TABS[0]);
  const [date, setDate] = useState(today());
  const [factoryId, setFactoryId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [floor, setFloor] = useState("");
  const [moduleId, setModuleId] = useState("");

  const factoriesAll = useCollection(COL.factories, [], []).data;
  const modulesAll = useCollection(COL.modules, [], []).data;
  const styles = useCollection(COL.styles, [], []).data;
  const shifts = useCollection(COL.shifts, [], []).data;
  const slots = useCollection(COL.shiftSlots, [], []).data;
  const plansAll = useCollection(COL.dailyPlans, [where("date", "==", date)], [date]).data;
  const production = useCollection(COL.hourlyProduction, [where("date", "==", date)], [date]).data;

  // Factory-wise access: non-admins only see their assigned factories.
  const factories = useMemo(() => scopeFactories(user, factoriesAll, "id"), [user, factoriesAll]);
  const allowedFactoryIds = useMemo(() => new Set(factories.map((f) => f.id)), [factories]);

  // Apply all filters to modules, then derive plans from the visible modules.
  const modules = useMemo(() => {
    let m = scopeFactories(user, modulesAll, "factoryId");
    if (factoryId) m = m.filter((x) => x.factoryId === factoryId);
    if (floor) m = m.filter((x) => String(x.floor) === String(floor));
    if (moduleId) m = m.filter((x) => x.id === moduleId);
    return m;
  }, [modulesAll, user, factoryId, floor, moduleId]);

  const moduleIds = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);
  const plans = useMemo(
    () => plansAll.filter((p) => moduleIds.has(p.moduleId) && (!shiftId || p.shiftId === shiftId)),
    [plansAll, moduleIds, shiftId]
  );

  const floors = useMemo(() => {
    const set = new Set(
      scopeFactories(user, modulesAll, "factoryId")
        .filter((m) => !factoryId || m.factoryId === factoryId)
        .map((m) => m.floor).filter((x) => x != null && x !== "")
    );
    return [...set].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [modulesAll, user, factoryId]);

  // Modules available for the module dropdown (respect factory/floor).
  const moduleOptions = useMemo(() => {
    let m = scopeFactories(user, modulesAll, "factoryId");
    if (factoryId) m = m.filter((x) => x.factoryId === factoryId);
    if (floor) m = m.filter((x) => String(x.floor) === String(floor));
    return m.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  }, [modulesAll, user, factoryId, floor]);

  const reset = () => { setFactoryId(""); setShiftId(""); setFloor(""); setModuleId(""); };

  const ctx = { factories, modules, styles, slots, plans, production, date };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Reports</h1>
          <p className="text-xs text-slate-400">Production analytics &amp; exports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <div><label className="label">Date</label>
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Factory</label>
          <select className="field" value={factoryId} onChange={(e) => { setFactoryId(e.target.value); setModuleId(""); setFloor(""); }}>
            <option value="">All factories</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Shift</label>
          <select className="field" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            <option value="">All shifts</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="label">Floor / Block</label>
          <select className="field" value={floor} onChange={(e) => { setFloor(e.target.value); setModuleId(""); }}>
            <option value="">All floors</option>
            {floors.map((f) => <option key={f} value={f}>{f}</option>)}
          </select></div>
        <div><label className="label">Module</label>
          <select className="field" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">All modules</option>
            {moduleOptions.map((m) => <option key={m.id} value={m.id}>{m.number}</option>)}
          </select></div>
        <div className="flex items-end"><button className="btn bg-grid/60 hover:bg-grid" onClick={reset}>Reset filters</button></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={"rounded-lg px-3 py-1.5 text-sm font-semibold transition " + (tab === t ? "bg-info text-white" : "bg-grid/40 text-slate-300 hover:bg-grid")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Daily Production" && <DailyProduction {...ctx} />}
      {tab === "Hourly" && <Hourly {...ctx} />}
      {tab === "Factory Performance" && <FactoryPerformance {...ctx} />}
      {tab === "Loss Analysis" && <Loss {...ctx} />}
      {tab === "Downtime Loss" && <DowntimeLoss {...ctx} />}
    </div>
  );
}

/* ---- shared helpers ---- */
function moduleRows({ modules, plans, styles, slots, production }) {
  return plans.map((p) => {
    const mod = modules.find((m) => m.id === p.moduleId);
    const style = styles.find((s) => s.id === p.styleId);
    const shiftSlots = slots.filter((s) => s.shiftId === p.shiftId);
    const availMin = availableMinutes(shiftSlots);
    const actual = production.filter((pr) => pr.moduleId === p.moduleId && pr.slotType !== "Overtime")
      .reduce((a, pr) => a + (pr.actualQty || 0), 0);
    const target = p.dailyTarget || 0;
    return {
      factory: modules.length && mod ? mod.factoryId : "",
      factoryName: "",
      module: mod?.number || "—",
      style: style?.number || "—",
      buyer: style?.buyer || "—",
      smv: p.smv, teamCount: p.teamCount,
      target, actual, variance: variance(actual, target),
      achievement: achievementPct(actual, target),
      efficiency: efficiencyPct({ actual, smv: p.smv, availableMin: availMin, teamMembers: p.teamCount }),
      availMin, plannedEff: p.plannedEffPct, shiftId: p.shiftId, moduleId: p.moduleId,
      breakMin: breakMinutes(shiftSlots),
    };
  });
}
function ExportBar({ rows, columns, title, date }) {
  return (
    <div className="flex gap-2">
      <button className="btn-ghost text-xs" onClick={() => exportExcel(rows, columns, title.replace(/\s/g, "_"))}>⬇ Excel</button>
      <button className="btn-ghost text-xs" onClick={() => exportPDF(rows, columns, { filename: title.replace(/\s/g, "_"), title, meta: `Date: ${date}` })}>⬇ PDF</button>
      <button className="btn-ghost text-xs" onClick={() => window.print()}>🖨 Print</button>
    </div>
  );
}
const fmt = (n) => (n || 0).toLocaleString();

/* ---- Daily Production Report ---- */
function DailyProduction(ctx) {
  const rows = useMemo(() => {
    const r = moduleRows(ctx);
    return r.map((x) => ({ ...x, factoryName: ctx.factories.find((f) => f.id === x.factory)?.name || "—" }));
  }, [ctx]);
  const cols = [
    { key: "factoryName", label: "Factory" }, { key: "module", label: "Module" },
    { key: "style", label: "Style" }, { key: "teamCount", label: "Team" },
    { key: "target", label: "Target" }, { key: "actual", label: "Actual" },
    { key: "variance", label: "Variance" }, { key: "achievement", label: "Ach %" },
  ];
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-grid px-4 py-2.5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Daily Production — {ctx.date}</h3>
        <ExportBar rows={rows} columns={cols} title="Daily Production Report" date={ctx.date} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
            {cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-slate-500">No data.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-grid/50">
                <td className="px-3 py-2">{r.factoryName}</td>
                <td className="px-3 py-2 font-semibold">{r.module}</td>
                <td className="px-3 py-2">{r.style}</td>
                <td className="px-3 py-2 font-mono">{r.teamCount}</td>
                <td className="px-3 py-2 font-mono">{fmt(r.target)}</td>
                <td className="px-3 py-2 font-mono">{fmt(r.actual)}</td>
                <td className={"px-3 py-2 font-mono " + (r.variance < 0 ? "text-bad" : "text-ok")}>{r.variance > 0 ? "+" : ""}{fmt(r.variance)}</td>
                <td className="px-3 py-2"><span className={"pill " + (r.achievement >= 100 ? "bg-ok/20 text-ok" : r.achievement >= 80 ? "bg-warn/20 text-warn" : "bg-bad/20 text-bad")}>{r.achievement}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Hourly Report (color coded) ---- */
function Hourly(ctx) {
  const [moduleId, setModuleId] = useState("");
  const plan = ctx.plans.find((p) => p.moduleId === moduleId);
  const shiftSlots = plan ? ctx.slots.filter((s) => s.shiftId === plan.shiftId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const dist = distributeTargets(shiftSlots, plan?.dailyTarget || 0);
  const rows = shiftSlots.map((s, i) => {
    const rec = ctx.production.find((p) => p.moduleId === moduleId && p.slotId === s.id);
    const planned = dist[i]?.target ?? 0;
    const actual = rec?.actualQty ?? 0;
    return { slot: s.name, type: s.slotType, planned, actual, diff: actual - planned, achievement: s.slotType === "Break" ? "—" : achievementPct(actual, planned) };
  });
  const cols = [{ key: "slot", label: "Slot" }, { key: "planned", label: "Planned" }, { key: "actual", label: "Actual" }, { key: "diff", label: "Difference" }, { key: "achievement", label: "Ach %" }];
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid px-4 py-2.5">
        <select className="field w-56" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
          <option value="">Select module…</option>
          {ctx.plans.map((p) => { const m = ctx.modules.find((x) => x.id === p.moduleId); return <option key={p.id} value={p.moduleId}>{m?.number}</option>; })}
        </select>
        {moduleId && <ExportBar rows={rows} columns={cols} title="Hourly Production Report" date={ctx.date} />}
      </div>
      {!moduleId ? <div className="p-8 text-center text-sm text-slate-500">Pick a module.</div> : (
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">{cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const isBreak = r.type === "Break";
              const ach = Number(r.achievement);
              const bg = isBreak ? "" : ach >= 100 ? "bg-ok/10" : ach >= 80 ? "bg-warn/10" : "bg-bad/10";
              return (
                <tr key={i} className={"border-b border-grid/50 " + bg}>
                  <td className="px-3 py-2 font-semibold">{r.slot}</td>
                  <td className="px-3 py-2 font-mono">{isBreak ? "—" : r.planned}</td>
                  <td className="px-3 py-2 font-mono">{isBreak ? "—" : r.actual}</td>
                  <td className={"px-3 py-2 font-mono " + (r.diff < 0 ? "text-bad" : "text-ok")}>{isBreak ? "—" : (r.diff > 0 ? "+" : "") + r.diff}</td>
                  <td className="px-3 py-2 font-mono">{isBreak ? "—" : r.achievement + "%"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Factory Performance (chart) ---- */
function FactoryPerformance(ctx) {
  const rows = useMemo(() => {
    const mr = moduleRows(ctx);
    const map = {};
    mr.forEach((r) => {
      const f = ctx.factories.find((x) => x.id === r.factory)?.name || "—";
      map[f] = map[f] || { factory: f, target: 0, actual: 0, effSum: 0, n: 0 };
      map[f].target += r.target; map[f].actual += r.actual; map[f].effSum += r.efficiency; map[f].n += 1;
    });
    return Object.values(map).map((x) => ({
      factory: x.factory, target: x.target, actual: x.actual,
      efficiency: x.n ? Math.round(x.effSum / x.n) : 0, achievement: achievementPct(x.actual, x.target),
    }));
  }, [ctx]);
  const cols = [{ key: "factory", label: "Factory" }, { key: "target", label: "Target" }, { key: "actual", label: "Actual" }, { key: "efficiency", label: "Efficiency %" }, { key: "achievement", label: "Ach %" }];
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Target vs Actual by Factory</h3>
          <ExportBar rows={rows} columns={cols} title="Factory Performance Report" date={ctx.date} />
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={rows}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="factory" tick={axis} /><YAxis tick={axis} />
              <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }} />
              <Legend />
              <Bar dataKey="target" fill="#F59E0B" name="Target" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#10B981" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">{cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-grid/50">
                <td className="px-3 py-2 font-semibold">{r.factory}</td>
                <td className="px-3 py-2 font-mono">{fmt(r.target)}</td>
                <td className="px-3 py-2 font-mono">{fmt(r.actual)}</td>
                <td className="px-3 py-2 font-mono">{r.efficiency}%</td>
                <td className="px-3 py-2 font-mono">{r.achievement}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Production Loss Analysis (chart) ---- */
function Loss(ctx) {
  const totals = useMemo(() => {
    const mr = moduleRows(ctx);
    const t = { efficiencyLoss: 0, manpowerLoss: 0, downtimeLoss: 0, breakLoss: 0 };
    mr.forEach((r) => {
      const l = lossAnalysis({
        target: r.target, actual: r.actual, smv: r.smv, availableMin: r.availMin,
        plannedTeam: r.teamCount, actualTeam: r.teamCount, breakMin: r.breakMin,
      });
      t.efficiencyLoss += l.efficiencyLoss; t.manpowerLoss += l.manpowerLoss;
      t.downtimeLoss += l.downtimeLoss; t.breakLoss += l.breakLoss;
    });
    return t;
  }, [ctx]);
  const data = [
    { name: "Efficiency", value: totals.efficiencyLoss, fill: "#EF4444" },
    { name: "Manpower", value: totals.manpowerLoss, fill: "#F59E0B" },
    { name: "Downtime", value: totals.downtimeLoss, fill: "#3B82F6" },
    { name: "Break", value: totals.breakLoss, fill: "#64748B" },
  ];
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Production Loss Analysis (equivalent pieces)</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={axis} /><YAxis tick={axis} />
            <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <RCell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Downtime loss-hours analysis ----
function DowntimeLoss(ctx) {
  const downtimes = useCollection(COL.downtimes, [], []).data;
  const reasons = useCollection(COL.downtimeReasons, [], []).data;
  const departments = useCollection(COL.departments, [], []).data;
  const modIds = new Set(ctx.modules.map((m) => m.id));
  const modNum = (id) => ctx.modules.find((m) => m.id === id)?.number || id;
  const deptName = (id) => departments.find((d) => d.id === id)?.name || "Unassigned";
  const reasonName = (id) => reasons.find((r) => r.id === id)?.description || "—";
  const lossMin = (d) => d.totalDowntime != null ? d.totalDowntime
    : d.raisedAt ? Math.max(0, Math.round((Date.now() - new Date(d.raisedAt)) / 60000)) : 0;

  const dts = downtimes.filter((d) => modIds.has(d.moduleId) && (d.raisedAt || "").slice(0, 10) === ctx.date);
  const totalMin = dts.reduce((s, d) => s + lossMin(d), 0);
  const hrs = (m) => (m / 60).toFixed(2);

  const group = (keyFn, labelFn) => {
    const map = {};
    dts.forEach((d) => { const k = keyFn(d); map[k] = map[k] || { key: k, label: labelFn(d), events: 0, min: 0 }; map[k].events++; map[k].min += lossMin(d); });
    return Object.values(map).sort((a, b) => b.min - a.min);
  };
  const byModule = group((d) => d.moduleId, (d) => modNum(d.moduleId)).map((r) => ({ Module: r.label, Events: r.events, "Loss (min)": r.min, "Loss (hrs)": hrs(r.min) }));
  const byDept = group((d) => d.departmentId, (d) => deptName(d.departmentId)).map((r) => ({ Department: r.label, Events: r.events, "Loss (min)": r.min, "Loss (hrs)": hrs(r.min) }));
  const byReason = group((d) => d.reasonId, (d) => reasonName(d.reasonId)).map((r) => ({ Reason: r.label, Events: r.events, "Loss (min)": r.min, "Loss (hrs)": hrs(r.min) }));

  const Tbl = ({ title, rows, keyCol }) => (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <ExportBar rows={rows} columns={[keyCol, "Events", "Loss (min)", "Loss (hrs)"].map((k) => ({ key: k, label: k }))} title={`Downtime_${title}`} date={ctx.date} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-grid text-[11px] uppercase text-slate-400">
            <th className="px-2 py-1">{keyCol}</th><th className="px-2 py-1">Events</th><th className="px-2 py-1">Loss (min)</th><th className="px-2 py-1">Loss (hrs)</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-slate-500">No downtime for this filter.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-grid/40">
                <td className="px-2 py-1.5 font-semibold">{r[keyCol]}</td><td className="px-2 py-1.5 font-mono">{r.Events}</td>
                <td className="px-2 py-1.5 font-mono">{r["Loss (min)"]}</td><td className="px-2 py-1.5 font-mono text-bad">{r["Loss (hrs)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-grid bg-card px-3 py-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Downtime events</div><div className="font-mono text-2xl font-bold">{dts.length}</div></div>
        <div className="rounded-xl border border-grid bg-card px-3 py-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Total loss</div><div className="font-mono text-2xl font-bold text-bad">{hrs(totalMin)} h</div></div>
        <div className="rounded-xl border border-grid bg-card px-3 py-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Avg / event</div><div className="font-mono text-2xl font-bold">{dts.length ? Math.round(totalMin / dts.length) : 0} m</div></div>
      </div>
      <Tbl title="By Module" rows={byModule} keyCol="Module" />
      <Tbl title="By Responsible Department" rows={byDept} keyCol="Department" />
      <Tbl title="By Reason" rows={byReason} keyCol="Reason" />
    </div>
  );
}
