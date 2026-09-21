// src/components/ShiftMonitor.jsx
import { to12h, slotDuration, remainingInSlot, toMinutes } from "../lib/time.js";

function Bar({ pct, color }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-grid">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export default function ShiftMonitor({ slots, current, shiftName }) {
  const prod = slots.filter((s) => s.slotType !== "Break");
  const active = slots.find((s) => s.state === "active");
  const activeIdx = slots.findIndex((s) => s.state === "active");
  const next = activeIdx >= 0 ? slots[activeIdx + 1] : slots.find((s) => s.state === "future");

  const dayStart = slots.length ? toMinutes(slots[0].startTime) : 0;
  const dayEnd = slots.length ? toMinutes(slots[slots.length - 1].endTime) : 0;
  const dayLen = Math.max(1, dayEnd - dayStart);
  const dayPct = Math.round(((current - dayStart) / dayLen) * 100);

  const doneProd = prod.filter((s) => s.state === "past").length;
  const shiftPct = prod.length ? Math.round((doneProd / prod.length) * 100) : 0;
  const remain = active ? remainingInSlot(active, current) : 0;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Shift Monitor</h3>
        <span className="pill bg-info/15 text-info">{shiftName || "—"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-bg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Current slot</div>
          <div className="font-mono text-lg font-bold text-info">{active?.name || "—"}</div>
          <div className="text-xs text-slate-400">
            {active ? `${to12h(active.startTime)} – ${to12h(active.endTime)}` : "Outside shift"}
          </div>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Next slot</div>
          <div className="font-mono text-lg font-bold text-ink">{next?.name || "—"}</div>
          <div className="text-xs text-slate-400">
            {next ? `${to12h(next.startTime)} – ${to12h(next.endTime)}` : "End of shift"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-bg p-3">
        <span className="text-xs text-slate-400">Remaining in slot</span>
        <span className="font-mono text-lg font-bold text-warn">
          {active ? `${remain} min` : "—"}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Shift progress</span><span className="font-mono">{Math.max(0, Math.min(100, shiftPct))}%</span>
          </div>
          <Bar pct={shiftPct} color="#10B981" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Production day</span><span className="font-mono">{Math.max(0, Math.min(100, dayPct))}%</span>
          </div>
          <Bar pct={Math.max(0, dayPct)} color="#3B82F6" />
        </div>
      </div>
    </div>
  );
}
