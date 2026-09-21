// Top-summary KPI card used on the dashboard.
export default function KpiCard({ label, value, sub, accent = "info", icon }) {
  const ring = {
    info: "border-info/30", ok: "border-ok/30",
    warn: "border-warn/30", bad: "border-bad/30",
  }[accent];
  const dot = {
    info: "bg-info", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad",
  }[accent];
  return (
    <div className={`rounded-xl border ${ring} bg-card p-4 shadow-lg shadow-black/20`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-ink md:text-3xl">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
