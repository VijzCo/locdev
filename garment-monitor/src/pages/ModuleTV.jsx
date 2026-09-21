// src/pages/ModuleTV.jsx — Public single-module TV (one per module).
// URL: /module/tv?module=M01 . Auto-fullscreen, no scroll, dark, modern.
// Left half: uniform hourly-output tiles. Right half: plan/targets, decision
// KPIs, downtime analysis, quality (coming soon). Bottom: LED variance ticker.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCollection } from "../hooks/useCollection.js";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { where } from "../firebase/db.js";
import { COL } from "../firebase/config.js";
import { toMinutes, nowMinutes } from "../lib/time.js";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (!isFinite(n) ? "—" : (Math.round(n) || 0).toLocaleString());
const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const C = { ok: "#10B981", warn: "#F59E0B", bad: "#EF4444", info: "#3B82F6", dim: "#64748B" };

export default function ModuleTV() {
  const [params] = useSearchParams();
  const urlModule = (params.get("module") || "").trim();
  const date = params.get("date") || today();

  const modules = useCollection(COL.modules, [], []).data;
  const factories = useCollection(COL.factories, [], []).data;
  const reasons = useCollection(COL.downtimeReasons, [], []).data;
  const mod = useMemo(() => {
    const k = urlModule.toLowerCase();
    return modules.find((m) => String(m.number).toLowerCase() === k) || modules.find((m) => m.id === urlModule) || null;
  }, [modules, urlModule]);
  const factory = factories.find((f) => f.id === mod?.factoryId);

  const d = useDashboardData({ date, factoryId: mod?.factoryId || "", moduleId: mod?.id || "", publicView: true });
  const row = (d.rows || [])[0];
  const prodSlots = useMemo(() => (d.slots || []).filter((s) => s.slotType !== "Break"), [d.slots]);
  const current = d.current ?? nowMinutes();
  const shiftName = (d.shifts || []).find((s) => s.id === prodSlots[0]?.shiftId)?.name || "";

  const dt = useCollection(COL.downtimes, mod ? [where("moduleId", "==", mod.id)] : [where("moduleId", "==", "__none__")], [mod?.id]).data;

  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  const embed = params.get("embed") === "1";
  useEffect(() => {
    if (embed) return;   // embedded in the module tab → never grab fullscreen
    const go = () => document.documentElement.requestFullscreen?.().catch(() => {});
    go();
    const once = () => { go(); window.removeEventListener("click", once); };
    window.addEventListener("click", once);
    return () => window.removeEventListener("click", once);
  }, [embed]);

  if (!mod) return <Center>Waiting for module… <span className="text-[2.5vw] opacity-60">add ?module=CODE</span></Center>;
  if (!row) return <Center>{factory?.code} · {mod.number}<div className="mt-2 text-[2.5vw] opacity-60">No plan for {date}</div></Center>;

  // ---- production metrics ----
  const cells = row.cells || [];
  const slotMin = (s) => Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime));
  const totalProdMin = prodSlots.reduce((a, s) => a + slotMin(s), 0);
  const cumProdMin = prodSlots.reduce((a, s) => {
    if (s.state === "past") return a + slotMin(s);
    if (s.state === "active") return a + Math.min(slotMin(s), Math.max(0, current - toMinutes(s.startTime)));
    return a;
  }, 0);
  const remMin = Math.max(0, totalProdMin - cumProdMin);
  const dayTarget = row.target || 0, cumActual = row.actual || 0, smv = row.smv || 0, ops = row.teamCount || 0;
  const cumPlan = cells.reduce((a, c) => a + (c.state !== "future" ? (c.target || 0) : 0), 0);
  const varPcs = cumActual - cumPlan;
  const ptp = row.achievement || 0, eff = row.efficiency || 0;
  const ratePerHr = cumProdMin > 0 ? Math.round((cumActual * 60) / cumProdMin) : 0;
  const forecast = Math.round((ratePerHr * totalProdMin) / 60);
  const fPct = dayTarget ? Math.round((forecast / dayTarget) * 100) : 0;
  const fTone = fPct >= 100 ? "ok" : fPct >= 90 ? "warn" : "bad";
  const remTarget = Math.max(0, dayTarget - cumActual);
  const needPerHr = remTarget <= 0 ? 0 : remMin > 0 ? Math.round((remTarget * 60) / remMin) : Infinity;
  const paceTone = remTarget <= 0 ? "ok" : !isFinite(needPerHr) ? "bad" : ratePerHr >= needPerHr ? "ok" : "warn";
  const planEff = totalProdMin > 0 && ops > 0 ? Math.round((dayTarget * smv) / (totalProdMin * ops) * 100) : 0;
  const active = prodSlots.find((s) => s.state === "active");
  const activeIdx = prodSlots.findIndex((s) => s.state === "active");
  const dayPct = dayTarget ? Math.min(100, Math.round((cumActual / dayTarget) * 100)) : 0;

  // ---- downtime analysis (this module, today) ----
  const dtToday = dt.filter((x) => (x.date || (x.raisedAt || "").slice(0, 10)) === date);
  const dtOpen = dtToday.filter((x) => x.status === "Raised" || x.status === "Attended");
  const dtLoss = dtToday.reduce((a, x) => a + (x.totalDowntime || 0), 0);
  const byReason = {};
  dtToday.forEach((x) => { byReason[x.reasonId] = (byReason[x.reasonId] || 0) + 1; });
  const topRid = Object.keys(byReason).sort((a, b) => byReason[b] - byReason[a])[0];
  const topReason = reasons.find((r) => r.id === topRid)?.name || (dtToday.length ? "—" : "None");

  // ---- LED ticker text ----
  const ticker = [
    `${factory?.code || ""} ${mod.number}`,
    `OUTPUT ${fmt(cumActual)} / PLAN ${fmt(cumPlan)}`,
    `VARIANCE ${varPcs >= 0 ? "+" : ""}${fmt(varPcs)} PCS`,
    `FORECAST ${fmt(forecast)} (${fPct}%)`,
    remTarget <= 0 ? "TARGET MET" : (paceTone === "ok" ? `ON PACE — NEED ${fmt(needPerHr)}/HR` : `SPEED UP — NEED ${fmt(needPerHr)}/HR vs ${fmt(ratePerHr)}/HR`),
    `EFF ${eff}%  PTP ${ptp}%`,
    `DOWNTIME ${dtToday.length} EVENTS / ${fmt(dtLoss)} MIN${dtOpen.length ? ` · ${dtOpen.length} OPEN` : ""}`,
  ].join("   ◆   ");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B1220] text-ink" style={{ fontFeatureSettings: '"tnum"' }}>
      <style>{`@keyframes tvscroll{from{transform:translateX(100%)}to{transform:translateX(-100%)}}.tvscroll{display:inline-block;white-space:nowrap;animation:tvscroll 30s linear infinite;will-change:transform}`}</style>

      {/* header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 px-[1vw] py-[0.8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <span className="rounded-lg bg-info/15 px-[0.9vw] py-[0.4vh] text-[clamp(.7rem,1.4vw,1.4rem)] font-black uppercase tracking-widest text-info">{factory?.code || factory?.name || "—"}</span>
          <span className="text-[clamp(1.5rem,4vw,4rem)] font-black leading-none">{mod.number}</span>
          <span className="hidden text-[clamp(.8rem,1.4vw,1.4rem)] text-slate-400 lg:inline">{mod.name}</span>
        </div>
        <div className="flex items-center gap-[1.2vw]">
          <span className="rounded-lg bg-white/5 px-[0.9vw] py-[0.4vh] text-[clamp(.7rem,1.3vw,1.3rem)] font-bold text-slate-300">{shiftName || "—"}</span>
          <div className="text-right leading-none">
            <div className="font-black tabular-nums text-[clamp(1.8rem,4.6vw,4.8rem)]">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</div>
            <div className="text-[clamp(.6rem,1vw,1.1rem)] text-slate-500">{date}</div>
          </div>
        </div>
      </div>

      {/* body: hourly band (~1/4) on top, panels below */}
      <div className="flex min-h-0 flex-1 flex-col gap-[0.8vh] px-[1vw] py-[0.8vh]">
        {/* hourly output — single row, ~1/4 page height (bottom) */}
        <div className="order-2 flex h-[23vh] shrink-0 flex-col">
          <div className="mb-[1vh] flex items-baseline justify-between">
            <span className="text-[clamp(.8rem,1.5vw,1.5rem)] font-bold uppercase tracking-widest text-slate-400">Hourly Output</span>
            <span className="text-[clamp(.75rem,1.3vw,1.3rem)] text-slate-400">{dayPct}% of {fmt(dayTarget)}</span>
          </div>
          <div className="grid min-h-0 flex-1 gap-[0.6vw]"
            style={{ gridTemplateColumns: `repeat(${prodSlots.length || 1},minmax(0,1fr))`, gridAutoRows: "1fr" }}>
            {prodSlots.map((s, i) => {
              const c = cells.find((x) => x.slotId === s.id);
              const val = s.state === "future" ? null : (c?.actual ?? 0);
              const tgt = c?.target ?? 0;
              const live = s.state === "active";
              const met = tgt > 0 && val != null && val >= tgt;
              const bg = val == null ? "rgba(148,163,184,.12)" : met ? "rgba(16,185,129,.95)" : "rgba(239,68,68,.95)";
              const txt = val == null ? "#94A3B8" : met ? "#06281d" : "#000000";
              return (
                <div key={s.id} className="flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: bg, color: txt, outline: live ? `0.5vh solid ${C.info}` : "none" }}>
                  <span className="text-[clamp(.7rem,1.2vw,1.7rem)] font-bold opacity-80">{ord(i + 1)}</span>
                  <span className="font-black leading-none text-[clamp(1.8rem,3.9vw,5.4rem)]">{val == null ? "–" : val}</span>
                  <span className="text-[clamp(.7rem,1vw,1.4rem)] font-bold opacity-80">/{tgt}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-[1vh] h-[1.4vh] w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${dayPct}%`, background: ptp >= 100 ? C.ok : ptp >= 80 ? C.warn : C.bad }} />
          </div>
        </div>

        {/* RIGHT — plan/targets + KPIs */}
        <div className="order-1 grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-[1vh]">
          {/* plan & targets */}
          <Panel title="Plan & Targets">
            <div className="flex min-h-0 flex-col gap-[0.7vh]">
              <div className="flex items-baseline gap-2 leading-none">
                <span className="text-[clamp(.5rem,.85vw,.95rem)] font-bold uppercase tracking-widest text-slate-500">Style</span>
                <span className="truncate text-[clamp(1.3rem,2.4vw,2.8rem)] font-black">{row.styleNumber}</span>
              </div>
              <div className="grid grid-cols-6 gap-[0.6vw]">
                <div className="col-span-2 flex min-h-0 flex-col justify-center overflow-hidden rounded-xl bg-bg/60 px-[0.7vw] py-[0.6vh] text-center">
                  <div className="truncate text-[clamp(.8rem,1.4vw,1.55rem)] uppercase tracking-widest text-slate-500">Actual / Target</div>
                  <div className="truncate font-black leading-tight text-[clamp(2rem,4.4vw,5rem)]">
                    <span style={{ color: cumActual >= cumPlan ? C.ok : C.bad }}>{fmt(cumActual)}</span>
                    <span className="text-slate-500"> / {fmt(dayTarget)}</span>
                  </div>
                </div>
                <Chip k="SMV" v={smv || "—"} />
                <Chip k="Operators" v={ops || "—"} />
                <Chip k="Plan Eff" v={`${planEff}%`} />
                <Chip k="Work Hrs" v={Math.round(totalProdMin / 60)} />
              </div>
            </div>
          </Panel>

          {/* decision KPIs */}
          <div className="grid min-h-0 grid-cols-2 gap-[0.9vw] lg:grid-cols-4">
            <Tile label="Forecast EOS" value={fmt(forecast)} sub={`tgt ${fmt(dayTarget)} · ${fPct}%`} tone={fTone} />
            <Tile label="Need / hr" value={fmt(needPerHr)} sub={`now ${fmt(ratePerHr)}/hr`} tone={paceTone} foot={remTarget <= 0 ? "Met ✓" : paceTone === "ok" ? "On pace" : "Speed up"} />
            <Tile label="Efficiency" value={`${eff}%`} sub={`plan ${planEff}%`} tone={eff >= 100 ? "ok" : eff >= 70 ? "warn" : "bad"} />
            <Tile label="PTP%" value={`${ptp}%`} sub={`${varPcs >= 0 ? "+" : ""}${fmt(varPcs)} vs plan`} tone={ptp >= 100 ? "ok" : ptp >= 80 ? "warn" : "bad"} />
          </div>
        </div>
      </div>

      {/* LED variance ticker */}
      <div className="overflow-hidden border-t border-white/10 bg-black/40 py-[1vh]">
        <div className="tvscroll px-[2vw] text-[clamp(1rem,2.4vw,2.6rem)] font-black uppercase tracking-wider"
          style={{ color: varPcs >= 0 ? C.ok : C.bad, textShadow: "0 0 12px currentColor" }}>
          {ticker}&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;{ticker}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, accent = "#3B82F6", children }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card/70 p-[0.9vw] ring-1 ring-white/5">
      <div className="mb-[0.6vh] flex items-center gap-2 text-[clamp(.6rem,1vw,1.1rem)] font-bold uppercase tracking-widest text-slate-400">
        <span className="h-[1vh] w-[1vh] rounded-full" style={{ background: accent }} />{title}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
function Tile({ label, value, sub, foot, tone = "info" }) {
  return (
    <div className="flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-card/70 px-[0.9vw] py-[0.8vh] ring-1 ring-white/5">
      <div className="truncate text-[clamp(1rem,1.9vw,2.1rem)] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="truncate font-black leading-none text-[clamp(2.6rem,6.2vw,7.2rem)]" style={{ color: C[tone] }}>{value}</div>
      {sub && <div className="truncate text-[clamp(.85rem,1.5vw,1.7rem)] text-slate-400">{sub}</div>}
      {foot && <div className="truncate text-[clamp(.85rem,1.5vw,1.7rem)] font-bold" style={{ color: C[tone] }}>{foot}</div>}
    </div>
  );
}
function Chip({ k, v }) {
  return (
    <div className="flex min-h-0 flex-col justify-center overflow-hidden rounded-xl bg-bg/60 px-[0.7vw] py-[0.6vh] text-center">
      <div className="truncate text-[clamp(.8rem,1.4vw,1.55rem)] uppercase tracking-widest text-slate-500">{k}</div>
      <div className="truncate font-black leading-tight text-[clamp(2rem,4.4vw,5rem)]">{v}</div>
    </div>
  );
}
function Mini({ k, v, tone, small }) {
  return (
    <div className="flex min-h-0 flex-col justify-center overflow-hidden rounded-xl bg-bg/60 px-[0.5vw] py-[0.5vh]">
      <div className="truncate text-[clamp(.5rem,.8vw,.9rem)] uppercase tracking-widest text-slate-500">{k}</div>
      <div className={"truncate font-black leading-tight " + (small ? "text-[clamp(.8rem,1.3vw,1.5rem)]" : "text-[clamp(1.3rem,2.6vw,3rem)]")} style={{ color: tone ? C[tone] : "#fff" }}>{v}</div>
    </div>
  );
}
function Center({ children }) {
  return <div className="flex h-screen flex-col items-center justify-center bg-[#0B1220] text-center text-[4.5vw] font-black text-ink">{children}</div>;
}
