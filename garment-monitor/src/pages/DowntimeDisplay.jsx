// src/pages/DowntimeDisplay.jsx
// Public, full-screen live DOWNTIME board (login-less, like the production
// /display). One tile per raised downtime, colour-coded by stage with a running
// timer until verification. Verified items drop to a grey "Completed" strip.
//   Raised    → whole tile RED
//   Attended  → AMBER/ORANGE
//   Completed → GREEN
//   Verified  → leaves live section, shown GREY under Completed Downtimes
// URL params: ?factory=<id>  ?dept=<department name>   (both optional)
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { heartbeat } from "../lib/device.js";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDur = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`;
};
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const STAGE_BG = { Raised: "bg-bad", Attended: "bg-warn", Completed: "bg-ok" };
const STAGE_INK = { Raised: "text-white", Attended: "text-black", Completed: "text-[#06281d]" };

export default function DowntimeDisplay() {
  const [params] = useSearchParams();
  const factoryParam = params.get("factory") || "";
  const deptParam = params.get("dept") || "";

  const [now, setNow] = useState(Date.now());
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    heartbeat();
    document.documentElement.requestFullscreen?.().catch(() => {});
    const id = setInterval(() => { setNow(Date.now()); setClock(new Date().toLocaleTimeString()); }, 1000);
    return () => clearInterval(id);
  }, []);

  const factories = useCollection(COL.factories, [], []).data;
  const departments = useCollection(COL.departments, [], []).data;
  const modules = useCollection(COL.modules, [], []).data;
  const reasons = useCollection(COL.downtimeReasons, [], []).data;
  const downtimes = useCollection(COL.downtimes, [], []).data;

  const deptName = (id) => departments.find((d) => d.id === id)?.name || "—";
  const modNum = (id) => modules.find((m) => m.id === id)?.number || "—";
  const reasonText = (d) => reasons.find((r) => r.id === d.reasonId)?.description || d.description || "";
  const factoryName = factories.find((f) => f.id === factoryParam)?.name;

  // Optional department-name filter from the URL (case-insensitive; matches name or id).
  const deptIds = useMemo(() => {
    if (!deptParam) return null;
    const want = deptParam.trim().toLowerCase();
    const ids = departments.filter((d) => (d.name || "").toLowerCase() === want || d.id === deptParam).map((d) => d.id);
    return new Set(ids);
  }, [departments, deptParam]);

  const scoped = useMemo(
    () => downtimes
      .filter((d) => !factoryParam || d.factoryId === factoryParam)
      .filter((d) => !deptIds || deptIds.has(d.departmentId)),
    [downtimes, factoryParam, deptIds]
  );
  const live = useMemo(
    () => scoped.filter((d) => d.status !== "Verified").sort((a, b) => (a.raisedAt < b.raisedAt ? -1 : 1)),
    [scoped]
  );
  const completed = useMemo(
    () => scoped.filter((d) => d.status === "Verified" && (d.raisedAt || "").slice(0, 10) === today())
      .sort((a, b) => (a.verifiedAt < b.verifiedAt ? 1 : -1)),
    [scoped]
  );

  const scopeLabel = [factoryName || "All factories", deptParam].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-bg p-4 text-ink md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-3xl font-extrabold tracking-tight md:text-4xl">DOWNTIME — LIVE</div>
          <div className="text-sm text-slate-400">{scopeLabel} · {today()}</div>
        </div>
        <div className="flex items-center gap-2 font-mono text-2xl font-bold tabular-nums md:text-3xl">
          <span className="live-dot h-3 w-3 rounded-full bg-bad" />{clock}
        </div>
      </div>

      {live.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-2xl border border-grid bg-card text-2xl font-bold text-ok">
          ✓ No active downtime
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {live.map((d) => {
            const elapsed = (now - new Date(d.raisedAt).getTime()) / 1000;
            return (
              <div key={d.id} className={"rounded-2xl p-4 shadow-lg " + (STAGE_BG[d.status] || "bg-grid") + " " + (STAGE_INK[d.status] || "")}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">{d.status}</span>
                  <span className="text-xs font-semibold opacity-80">⏱ {fmtTime(d.raisedAt)}</span>
                </div>
                <div className="mt-1 text-2xl font-extrabold leading-tight">{deptName(d.departmentId)}</div>
                {reasonText(d) && <div className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug opacity-90">{reasonText(d)}</div>}
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide opacity-75">Module</div>
                    <div className="text-3xl font-black leading-none">{modNum(d.moduleId)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wide opacity-75">Elapsed</div>
                    <div className="font-mono text-3xl font-black tabular-nums leading-none">{fmtDur(elapsed)}</div>
                  </div>
                </div>
                <div className="mt-2 truncate font-mono text-[11px] opacity-80">{d.ref}</div>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">Completed downtimes (today)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {completed.map((d) => (
              <div key={d.id} className="rounded-xl border border-grid bg-grid/40 p-3 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold leading-tight">{deptName(d.departmentId)}</span>
                  <span className="text-[10px] opacity-70">{d.autoClosed ? "auto · " : ""}⏱ {fmtTime(d.raisedAt)}</span>
                </div>
                {reasonText(d) && <div className="line-clamp-2 text-xs leading-snug text-slate-400">{reasonText(d)}</div>}
                <div className="mt-1 flex items-end justify-between">
                  <span className="text-xl font-black">{modNum(d.moduleId)}</span>
                  <span className="font-mono text-sm">{fmtDur((d.fullResolutionTime ?? d.totalDowntime ?? 0) * 60)}</span>
                </div>
                <div className="truncate font-mono text-[10px] text-slate-500">{d.ref}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
