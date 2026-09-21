// src/pages/DowntimeDashboard.jsx
// Live Downtime & Andon dashboard: active counts, MTTA/MTTR, SLA achievement,
// live escalations, top reasons (Pareto) and department ranking. Filterable by
// factory, department, kind and date range. Realtime via Firestore listeners.
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";
import { getTarget, escalation, isOpen, minutesBetween } from "../lib/downtime.js";

const today = () => new Date().toISOString().slice(0, 10);
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const fmtMin = (m) => (m == null ? "—" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

export default function DowntimeDashboard() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 20000); return () => clearInterval(id); }, []);

  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const departments = scopeFactories(user, useCollection(COL.departments, [], []).data, "factoryId");
  const targets = useCollection(COL.targets, [], []).data;
  const dReasons = useCollection(COL.downtimeReasons, [], []).data;
  const aReasons = useCollection(COL.andonReasons, [], []).data;
  const downtimes = useCollection(COL.downtimes, [], []).data;
  const andons = useCollection(COL.andons, [], []).data;
  const facIds = new Set(factories.map((f) => f.id));

  const [factoryId, setFactoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState(ago(-7));
  const [to, setTo] = useState(today());

  const all = useMemo(() => {
    void tick;
    const tagged = [
      ...downtimes.map((d) => ({ ...d, kind: "downtime" })),
      ...andons.map((a) => ({ ...a, kind: "andon" })),
    ];
    return tagged
      .filter((i) => facIds.has(i.factoryId) || user?.role === "super_admin")
      .filter((i) => (!factoryId || i.factoryId === factoryId) && (!departmentId || i.departmentId === departmentId) && (!kind || i.kind === kind))
      .filter((i) => { const d = (i.raisedAt || "").slice(0, 10); return d >= from && d <= to; });
  }, [downtimes, andons, facIds, factoryId, departmentId, kind, from, to, user, tick]);

  const open = all.filter((i) => isOpen(i.status));
  const resolved = all.filter((i) => i.status === "Completed" || i.status === "Verified");
  const mtta = avg(all.filter((i) => i.timeToAttend != null).map((i) => i.timeToAttend));
  const mttr = avg(resolved.filter((i) => i.totalDowntime != null).map((i) => i.totalDowntime));
  const slaMet = resolved.filter((i) => { const t = getTarget(targets, i.kind, i.factoryId, i.departmentId); return (i.totalDowntime ?? 1e9) <= (t.completeTarget || 15); }).length;
  const sla = resolved.length ? Math.round((slaMet / resolved.length) * 100) : 0;
  const critical = open.filter((i) => escalation(i, getTarget(targets, i.kind, i.factoryId, i.departmentId)).color === "bad").length;

  const reasonLabel = (i) => {
    const arr = i.kind === "downtime" ? dReasons : aReasons;
    return arr.find((r) => r.id === i.reasonId)?.description || i.description || "Other";
  };
  const topReasons = useMemo(() => {
    const map = {};
    all.forEach((i) => { const k = reasonLabel(i); map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [all, dReasons, aReasons]);

  const deptRanking = useMemo(() => {
    const map = {};
    all.forEach((i) => {
      const d = departments.find((x) => x.id === i.departmentId);
      const name = d?.name || "Unassigned";
      map[name] = map[name] || { name, count: 0, mttr: [] };
      map[name].count += 1;
      if (i.totalDowntime != null) map[name].mttr.push(i.totalDowntime);
    });
    return Object.values(map).map((d) => ({ name: d.name, count: d.count, mttr: avg(d.mttr) })).sort((a, b) => b.count - a.count);
  }, [all, departments]);

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Downtime &amp; Andon Dashboard</h1>
        <p className="text-xs text-slate-400">Live response & resolution performance</p>
      </div>

      <div className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label">From</label><input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><label className="label">Factory</label>
          <select className="field" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Department</label>
          <select className="field" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All</option>{departments.filter((d) => !factoryId || d.factoryId === factoryId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></div>
        <div><label className="label">Type</label>
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Both</option><option value="downtime">Downtime</option><option value="andon">Andon</option>
          </select></div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Open now" value={open.length} tone={open.length ? "warn" : "ok"} />
        <Kpi label="Escalated (critical)" value={critical} tone={critical ? "bad" : "ok"} />
        <Kpi label="MTTA" value={fmtMin(mtta)} />
        <Kpi label="MTTR" value={fmtMin(mttr)} />
        <Kpi label="SLA met" value={`${sla}%`} tone={sla >= 80 ? "ok" : "bad"} />
        <Kpi label="Total events" value={all.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">Top reasons (Pareto)</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={topReasons} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8 }} cursor={{ fill: "#33415533" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">Department ranking</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-grid text-[11px] uppercase text-slate-400"><th className="px-2 py-1">Department</th><th className="px-2 py-1">Events</th><th className="px-2 py-1">MTTR</th></tr></thead>
              <tbody>
                {deptRanking.length === 0 && <tr><td colSpan={3} className="px-2 py-4 text-slate-500">No data.</td></tr>}
                {deptRanking.map((d) => (
                  <tr key={d.name} className="border-b border-grid/40"><td className="px-2 py-1.5 font-semibold">{d.name}</td><td className="px-2 py-1.5 font-mono">{d.count}</td><td className="px-2 py-1.5 font-mono text-slate-400">{fmtMin(d.mttr)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-xl border border-grid bg-card px-3 py-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={"font-mono text-2xl font-bold " + c}>{value}</div>
    </div>
  );
}
