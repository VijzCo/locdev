// src/pages/Dashboard.jsx
import { useMemo, useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { CELL } from "../lib/colors.js";
import KpiCard from "../components/KpiCard.jsx";
import ShiftMonitor from "../components/ShiftMonitor.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n || 0).toLocaleString();

function Cell({ cell }) {
  const c = CELL[cell.color];
  const ring = cell.state === "active" ? "ring-2 ring-info ring-offset-1 ring-offset-card" : "";
  if (cell.slotType === "Break") {
    return (
      <td className="px-1 py-1">
        <div className="flex h-12 min-w-[58px] items-center justify-center rounded-md bg-card text-[10px] font-semibold uppercase text-slate-500">
          Break
        </div>
      </td>
    );
  }
  return (
    <td className="px-1 py-1">
      <div
        className={`flex h-12 min-w-[58px] flex-col items-center justify-center rounded-md ${ring}`}
        style={{ background: c.bg, color: c.text }}
        title={`${cell.slotName} • ${CELL[cell.color].label}`}
      >
        <span className="font-mono text-sm font-bold leading-none">
          {cell.hasData ? fmt(cell.actual) : "–"}
        </span>
        <span className="mt-0.5 font-mono text-[10px] leading-none opacity-80">{fmt(cell.target)}</span>
      </div>
    </td>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState(today());
  const [factoryId, setFactoryId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [floor, setFloor] = useState("");

  const d = useDashboardData({ date, factoryId, shiftId, floor });
  const { rows, kpis, slots, alerts, shifts, factories, current } = d;

  const floors = useMemo(
    () => [...new Set(d.modules.map((m) => m.floor).filter(Boolean))], [d.modules]
  );
  const shiftName = shifts.find((s) => s.id === (shiftId || shifts[0]?.id))?.name;

  return (
    <div className="space-y-4 p-3 md:p-5">
      {/* Header + live clock */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Production Board</h1>
          <p className="text-xs text-slate-400">Live module-wise hourly monitoring</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-grid bg-card px-3 py-1.5 text-sm">
          <span className="live-dot h-2 w-2 rounded-full bg-ok" />
          <span className="font-mono text-slate-300">
            {String(Math.floor(current / 60)).padStart(2, "0")}:
            {String(current % 60).padStart(2, "0")}
          </span>
          <span className="text-xs text-slate-500">auto-refresh 30s</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className="field w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Factory</label>
          <select className="field w-40" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All factories</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Shift</label>
          <select className="field w-36" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.length === 0 && <option value="">—</option>}
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Floor</label>
          <select className="field w-32" value={floor} onChange={(e) => setFloor(e.target.value)}>
            <option value="">All floors</option>
            {floors.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Factories" value={kpis.factories} accent="info" />
        <KpiCard label="Active Modules" value={kpis.modules} accent="info" />
        <KpiCard label="Operators" value={fmt(kpis.operators)} accent="info" />
        <KpiCard label="Daily Target" value={fmt(kpis.target)} accent="warn" />
        <KpiCard label="Daily Actual" value={fmt(kpis.actual)} accent="ok" />
        <KpiCard label="Achievement" value={`${kpis.achievement}%`}
          accent={kpis.achievement >= 100 ? "ok" : kpis.achievement >= 80 ? "warn" : "bad"} />
        <KpiCard label="Efficiency" value={`${kpis.efficiency}%`}
          accent={kpis.efficiency >= 50 ? "ok" : "warn"} />
        <KpiCard label="Overtime" value={fmt(kpis.overtime)} accent="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* Board */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-grid px-4 py-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Modules × Hourly Slots</h2>
            <Legend />
          </div>
          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No modules / plans for this date. Add data via the Manage section,
                or load demo data from Settings.
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="sticky-col px-3 py-2 text-left">Module</th>
                    {slots.map((s) => (
                      <th key={s.id} className="px-1 py-2 text-center">
                        <div className={s.state === "active" ? "text-info" : ""}>{s.name}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center">Tot</th>
                    <th className="px-2 py-2 text-center">Ach%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.moduleId} className="border-t border-grid/60">
                      <td className="sticky-col px-3 py-1">
                        <div className="min-w-[120px]">
                          <div className="text-sm font-bold">{r.moduleNumber}</div>
                          <div className="truncate text-[11px] text-slate-400">
                            {r.styleNumber} · {r.teamCount}p
                          </div>
                        </div>
                      </td>
                      {r.cells.map((c) => <Cell key={c.slotId} cell={c} />)}
                      <td className="px-2 text-center font-mono text-sm font-bold">{fmt(r.actual)}</td>
                      <td className="px-2 text-center">
                        <span className={"pill " + (
                          r.achievement >= 100 ? "bg-ok/20 text-ok"
                            : r.achievement >= 80 ? "bg-warn/20 text-warn" : "bg-bad/20 text-bad"
                        )}>{r.achievement}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right rail: shift monitor + alerts */}
        <div className="space-y-4">
          <ShiftMonitor slots={slots} current={current} shiftName={shiftName} />
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">
              Alerts {alerts.length > 0 && <span className="pill ml-1 bg-bad/20 text-bad">{alerts.length}</span>}
            </h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">All modules on track.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 12).map((a, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${a.level === "bad" ? "bg-bad" : "bg-warn"}`} />
                    <span className="font-semibold">Module {a.module}</span>
                    <span className="text-slate-400">— {a.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    ["ok", "≥ Plan"], ["warn", "80–99%"], ["bad", "< 80%"],
    ["active", "Active"], ["future", "Upcoming"],
  ];
  return (
    <div className="hidden gap-3 sm:flex">
      {items.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-3 w-3 rounded" style={{ background: CELL[k].bg }} />
          {label}
        </span>
      ))}
    </div>
  );
}
