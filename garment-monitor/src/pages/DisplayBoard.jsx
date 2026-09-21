// src/pages/DisplayBoard.jsx
// Shared production board: /display (public, full-screen TV) and / (embedded).
// Rows = hourly slots, columns = modules; break slots removed; cells red/green;
// a rightmost TOTAL column (hourly totals) and a bottom TOTAL row (per-module
// + grand total). QCO modules fade slowly (configurable). Clock shows seconds.
// Date auto-tracks today; shift auto-selected from the clock; /display tries to
// go full-screen automatically.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { CELL_RG, cellColorRG } from "../lib/colors.js";
import { to12h, toMinutes, nowMinutes, pickShiftByTime } from "../lib/time.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";
import { heartbeat } from "../lib/device.js";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n || 0).toLocaleString();

export default function DisplayBoard({ embedded = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const urlDate = params.get("date");
  const date = urlDate || today();
  const factoryId = params.get("factory") || "";
  const urlShift = params.get("shift") || "";
  const moduleId = params.get("module") || "";
  const bare = params.get("bare") === "1";

  const shiftsRaw = useCollection(COL.shifts, [], []).data;
  const slotsRaw = useCollection(COL.shiftSlots, [], []).data;
  const settings = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const qcoOn = settings.qcoBlinkEnabled ?? true;
  const qcoDur = `${Number(settings.qcoBlinkSeconds) || 2.6}s`;

  const effShift = urlShift || pickShiftByTime(shiftsRaw, slotsRaw, nowMinutes());
  const d = useDashboardData({ date, factoryId, shiftId: effShift, moduleId, publicView: !embedded });
  const { rows, slots, shifts, factories, kpis, current } = d;
  const visFactories = embedded ? scopeFactories(user, factories, "id") : factories;
  const prodSlots = useMemo(() => slots.filter((s) => s.slotType !== "Break"), [slots]);

  // live clock with seconds
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    heartbeat();
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  // auto full-screen on the public board (browsers need a gesture, so also arm
  // a one-time listener as a fallback)
  useEffect(() => {
    if (embedded || bare) return;
    const go = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };
    go();
    const once = () => { go(); window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); };
    window.addEventListener("pointerdown", once);
    window.addEventListener("keydown", once);
    return () => { window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); };
  }, [embedded, bare]);

  const set = (key, val) => {
    const next = new URLSearchParams(params);
    val ? next.set(key, val) : next.delete(key);
    setParams(next, { replace: true });
  };

  // totals
  const slotTotal = (slotId) => rows.reduce((a, r) => {
    const c = r.cells.find((x) => x.slotId === slotId);
    return { actual: a.actual + (c?.actual || 0), target: a.target + (c?.target || 0) };
  }, { actual: 0, target: 0 });
  const grandActual = rows.reduce((a, r) => a + r.actual, 0);
  const grandTarget = rows.reduce((a, r) => a + r.target, 0);
  const grandAch = grandTarget ? Math.round((grandActual / grandTarget) * 100) : 0;

  // ---- Analytics (cumulative up to now) ----
  // Productive minutes elapsed so far (excludes breaks; live slot counts elapsed).
  const slotMin = (s) => Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime));
  const cumProdMin = prodSlots.reduce((a, s) => {
    if (s.state === "past") return a + slotMin(s);
    if (s.state === "active") return a + Math.min(slotMin(s), Math.max(0, current - toMinutes(s.startTime)));
    return a;
  }, 0);
  const ana = rows.map((r) => {
    const cumPlan = r.cells.reduce((a, c) => a + (c.state !== "future" ? (c.target || 0) : 0), 0);
    const cumActual = r.actual;
    const manMin = cumProdMin * (r.teamCount || 0);
    return {
      id: r.moduleId, smv: r.smv, dailyPlan: r.target, cumPlan, cumActual,
      varPcs: cumActual - cumPlan,
      sah: (cumActual * r.smv) / 60, planSah: (cumPlan * r.smv) / 60,
      varHrs: ((cumActual - cumPlan) * r.smv) / 60,
      effA: manMin > 0 ? Math.round(((cumActual * r.smv) / manMin) * 100) : 0,
      effP: manMin > 0 ? Math.round(((cumPlan * r.smv) / manMin) * 100) : 0,
    };
  });
  const aSum = (k) => ana.reduce((a, x) => a + x[k], 0);
  const tot = {
    dailyPlan: grandTarget, cumPlan: aSum("cumPlan"), cumActual: grandActual,
    varPcs: grandActual - aSum("cumPlan"), sah: aSum("sah"), planSah: aSum("planSah"),
    varHrs: aSum("sah") - aSum("planSah"),
  };
  const totManMin = rows.reduce((a, r) => a + cumProdMin * (r.teamCount || 0), 0);
  const totEarnA = rows.reduce((a, r) => a + r.actual * r.smv, 0);
  const totEarnP = ana.reduce((a, x) => a + x.cumPlan * x.smv, 0);
  tot.effA = totManMin > 0 ? Math.round((totEarnA / totManMin) * 100) : 0;
  tot.effP = totManMin > 0 ? Math.round((totEarnP / totManMin) * 100) : 0;
  const fix1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const vcol = (n) => (n >= 0 ? "text-ok" : "text-bad");

  // Analytics: Auto (hide if grid would overflow) / On (always, scrollable) / Off.
  const scrollRef = useRef(null);
  const anaRef = useRef(null);
  const anaH = useRef(0);
  const [anaMode, setAnaMode] = useState("on"); // on | auto | off
  const [autoFit, setAutoFit] = useState(true);
  const showAna = anaMode === "on" ? true : anaMode === "off" ? false : autoFit;
  useLayoutEffect(() => {
    const cont = scrollRef.current;
    if (!cont) return;
    const measure = () => {
      if (anaRef.current) anaH.current = anaRef.current.offsetHeight || anaH.current;
      if (showAna) setAutoFit(cont.scrollHeight <= cont.clientHeight + 2);
      else setAutoFit(cont.clientHeight - cont.scrollHeight > (anaH.current || 130) + 10);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [showAna, rows.length, prodSlots.length]);
  const AnaRow = ({ label, get, total, strong }) => (
    <tr>
      <th className={"sticky left-0 z-10 px-2 py-[0.35vh] text-left text-[clamp(.5rem,.82vw,.92rem)] font-bold uppercase leading-none " + (strong ? "bg-grid/70 text-slate-100" : "bg-card text-slate-400")}>{label}</th>
      {ana.map((a) => (
        <td key={a.id} className={"px-1 py-[0.35vh] text-center font-mono text-[clamp(.6rem,1vw,1.15rem)] leading-none " + (strong ? "font-extrabold" : "")}>{get(a)}</td>
      ))}
      <td className="sticky right-0 z-10 bg-bg px-1 py-[0.35vh] text-center font-mono text-[clamp(.6rem,1vw,1.15rem)] font-bold leading-none">{total}</td>
    </tr>
  );

  const shell = embedded
    ? "flex h-full min-h-0 flex-col overflow-hidden bg-bg text-ink"
    : "flex h-screen w-screen flex-col overflow-hidden bg-bg text-ink";

  return (
    <div className={shell}>
      <header className="flex items-center justify-between gap-3 border-b border-grid px-[2vw] py-[1.2vh]">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[clamp(1.1rem,2.2vw,2.2rem)] font-extrabold tracking-tight">Production Board</h1>
          <span className="hidden text-[clamp(.6rem,1vw,1rem)] text-slate-400 sm:inline">
            {factories.find((f) => f.id === factoryId)?.name || "All factories"} ·{" "}
            {shifts.find((s) => s.id === effShift)?.name || "Auto shift"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAnaMode((m) => (m === "on" ? "auto" : m === "auto" ? "off" : "on"))}
            className="rounded-lg border border-grid bg-card px-2.5 py-1.5 text-[clamp(.6rem,1vw,.95rem)] font-bold text-slate-300 hover:border-info"
            title="Toggle analytics rows">📊 {anaMode === "auto" ? "Auto" : anaMode === "on" ? "On" : "Off"}</button>
          <span className="text-[clamp(.7rem,1.3vw,1.4rem)] text-slate-400">{date}</span>
          <div className="flex items-center gap-2 rounded-lg border border-grid bg-card px-3 py-1.5">
            <span className="live-dot h-2.5 w-2.5 rounded-full bg-ok" />
            <span className="font-mono text-[clamp(.8rem,1.5vw,1.6rem)] font-bold tabular-nums">{clock}</span>
          </div>
        </div>
      </header>

      {embedded && (
        <div className="grid grid-cols-3 gap-2 border-b border-grid px-[2vw] py-2 sm:grid-cols-6">
          <Kpi label="Modules" value={kpis.modules} />
          <Kpi label="Operators" value={fmt(kpis.operators)} />
          <Kpi label="Target" value={fmt(kpis.target)} />
          <Kpi label="Actual" value={fmt(kpis.actual)} tone="ok" />
          <Kpi label="PTP%" value={`${kpis.achievement}%`} tone={kpis.achievement >= 100 ? "ok" : "bad"} />
          <Kpi label="Eff%" value={`${kpis.efficiency}%`} />
        </div>
      )}

      {!bare && (
        <div className="flex flex-wrap items-end gap-2 border-b border-grid bg-card/40 px-[2vw] py-2">
          <div><label className="label">Date</label>
            <input type="date" className="field h-9 w-40" value={date} onChange={(e) => set("date", e.target.value)} /></div>
          <div><label className="label">Factory</label>
            <select className="field h-9 w-44" value={factoryId} onChange={(e) => set("factory", e.target.value)}>
              <option value="">All factories</option>{visFactories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div><label className="label">Shift (auto)</label>
            <select className="field h-9 w-40" value={effShift} onChange={(e) => set("shift", e.target.value)}>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
        </div>
      )}

      <div ref={scrollRef} className={"min-h-0 flex-1 px-[1vw] py-[0.6vh] " + (anaMode === "on" ? "overflow-auto" : "overflow-hidden")}>
        {rows.length === 0 || prodSlots.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-500">
            No modules or plans for this date. Check the factory/shift, or load demo data.
          </div>
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-[3px]">
            <colgroup>
              <col style={{ width: "96px" }} />
              {rows.map((r) => <col key={r.moduleId} />)}
              <col style={{ width: "84px" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-bg px-2 py-2 text-left text-[clamp(.6rem,1vw,1rem)] uppercase tracking-wide text-slate-400">Hour</th>
                {rows.map((r) => {
                  const qco = qcoOn && r.mode === "QCO";
                  return (
                    <th key={r.moduleId} className="sticky top-0 z-10 bg-bg px-1 py-2 text-center align-bottom"
                      style={qco ? { ["--qco-dur"]: qcoDur } : undefined}>
                      <div className={"text-[clamp(.75rem,1.3vw,1.5rem)] font-extrabold leading-tight " + (qco ? "qco-fade" : "")}>
                        {r.moduleNumber}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky right-0 top-0 z-20 bg-bg px-2 py-2 text-center text-[clamp(.6rem,1vw,1rem)] uppercase tracking-wide text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {prodSlots.map((slot) => {
                const rt = slotTotal(slot.id);
                return (
                  <tr key={slot.id}>
                    <th className={"sticky left-0 z-10 rounded-md px-2 py-1 text-left " + (slot.state === "active" ? "bg-info/20 text-info" : "bg-card text-slate-300")}>
                      <div className="text-[clamp(.7rem,1.1vw,1.3rem)] font-bold leading-tight">{slot.name}</div>
                      <div className="font-mono text-[clamp(.5rem,.75vw,.8rem)] text-slate-500">{to12h(slot.startTime)}</div>
                    </th>
                    {rows.map((r) => {
                      const c = r.cells.find((x) => x.slotId === slot.id) || {};
                      const key = cellColorRG({ actual: c.actual, target: c.target, state: slot.state });
                      const col = CELL_RG[key];
                      const ring = slot.state === "active" ? "outline outline-2 outline-info" : "";
                      const qco = qcoOn && r.mode === "QCO" ? "qco-fade" : "";
                      return (
                        <td key={r.moduleId} className="p-0">
                          <div className={`flex h-[clamp(22px,4.4vh,58px)] flex-col items-center justify-center rounded-md ${ring} ${qco}`}
                            style={{ background: col.bg, color: col.text, ...(qco ? { ["--qco-dur"]: qcoDur } : {}) }}>
                            <span className="font-mono text-[clamp(.8rem,1.5vw,1.9rem)] font-extrabold leading-none">
                              {c.hasData ? fmt(c.actual) : key === "idle" ? "" : "0"}
                            </span>
                            <span className="font-mono text-[clamp(.5rem,.8vw,.95rem)] leading-none opacity-80">/{fmt(c.target)}</span>
                          </div>
                        </td>
                      );
                    })}
                    {/* hourly total */}
                    <td className="sticky right-0 z-10 p-0">
                      <div className="flex h-[clamp(22px,4.4vh,58px)] flex-col items-center justify-center rounded-md bg-grid/70">
                        <span className="font-mono text-[clamp(.8rem,1.5vw,1.9rem)] font-extrabold leading-none">{fmt(rt.actual)}</span>
                        <span className="font-mono text-[clamp(.5rem,.8vw,.95rem)] leading-none text-slate-400">/{fmt(rt.target)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* bottom totals */}
              <tr>
                <th className="sticky left-0 z-10 rounded-md bg-grid/70 px-2 py-1 text-left text-[clamp(.65rem,1vw,1.2rem)] font-bold uppercase text-slate-200">Total</th>
                {rows.map((r) => {
                  const met = r.achievement >= 100;
                  return (
                    <td key={r.moduleId} className="p-0">
                      <div className="flex h-[clamp(22px,4.4vh,58px)] flex-col items-center justify-center rounded-md bg-grid/70">
                        <span className="font-mono text-[clamp(.8rem,1.5vw,1.9rem)] font-extrabold leading-none">{fmt(r.actual)}</span>
                        <span className={"font-mono text-[clamp(.55rem,.9vw,1.1rem)] font-bold leading-none " + (met ? "text-ok" : "text-bad")}>{r.achievement}%</span>
                      </div>
                    </td>
                  );
                })}
                {/* grand total */}
                <td className="sticky right-0 z-10 p-0">
                  <div className="flex h-[clamp(22px,4.4vh,58px)] flex-col items-center justify-center rounded-md bg-info/30 outline outline-1 outline-info/50">
                    <span className="font-mono text-[clamp(.85rem,1.6vw,2rem)] font-extrabold leading-none">{fmt(grandActual)}</span>
                    <span className={"font-mono text-[clamp(.55rem,.9vw,1.1rem)] font-bold leading-none " + (grandAch >= 100 ? "text-ok" : "text-bad")}>{grandAch}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
            {/* ---- analytics (cumulative to now); auto-hidden if space is tight ---- */}
            {showAna && (
              <tbody ref={anaRef}>
              <tr>
                <td colSpan={rows.length + 2} className="px-2 pt-1 pb-0.5 text-left text-[clamp(.5rem,.8vw,.9rem)] font-bold uppercase tracking-widest text-info">
                  <div className="border-t border-info/40 pt-1">Shift analytics (cumulative)</div>
                </td>
              </tr>
              {AnaRow({ label: "Eff% A/P", strong: true,
                get: (a) => <span>{a.effA}<span className="opacity-50">/{a.effP}</span></span>,
                total: <span>{tot.effA}<span className="opacity-50">/{tot.effP}</span></span> })}
              {AnaRow({ label: "SAH A/P",
                get: (a) => <span>{fmt(Math.round(a.sah))}<span className="opacity-50">/{fmt(Math.round(a.planSah))}</span></span>,
                total: <span>{fmt(Math.round(tot.sah))}<span className="opacity-50">/{fmt(Math.round(tot.planSah))}</span></span> })}
              {AnaRow({ label: "Cum Actual", get: (a) => fmt(a.cumActual), total: fmt(tot.cumActual) })}
              {AnaRow({ label: "Cum Plan", get: (a) => fmt(a.cumPlan), total: fmt(tot.cumPlan) })}
              {AnaRow({ label: "Daily Plan", get: (a) => fmt(a.dailyPlan), total: fmt(tot.dailyPlan) })}
              {AnaRow({ label: "Variance Pcs",
                get: (a) => <span className={vcol(a.varPcs)}>{a.varPcs >= 0 ? "+" : ""}{fmt(a.varPcs)}</span>,
                total: <span className={vcol(tot.varPcs)}>{tot.varPcs >= 0 ? "+" : ""}{fmt(tot.varPcs)}</span> })}
              {AnaRow({ label: "Variance Hrs",
                get: (a) => <span className={vcol(a.varHrs)}>{a.varHrs >= 0 ? "+" : ""}{fix1(a.varHrs)}</span>,
                total: <span className={vcol(tot.varHrs)}>{tot.varHrs >= 0 ? "+" : ""}{fix1(tot.varHrs)}</span> })}
              </tbody>
            )}
          </table>
        )}
      </div>

      <footer className="flex items-center justify-center gap-5 border-t border-grid py-1.5 text-[clamp(.55rem,.9vw,.95rem)] text-slate-400">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: CELL_RG.ok.bg }} /> Target met</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: CELL_RG.bad.bg }} /> Behind / missed</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: CELL_RG.idle.bg }} /> Upcoming</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-warn qco-tag" /> QCO (change-over)</span>
      </footer>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-lg bg-card px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={"font-mono text-lg font-bold " + c}>{value}</div>
    </div>
  );
}
