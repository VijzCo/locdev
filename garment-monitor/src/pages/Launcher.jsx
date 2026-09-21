// src/pages/Launcher.jsx
// Platform landing / application launcher. Shows the apps this device + user is
// authorised for, a factory selector, a KPI summary, quick-access tiles and the
// user profile. The production board, masters, etc. live behind these.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { can, scopeFactories, ROLE_LABEL } from "../lib/roles.js";
import { heartbeat, getMyDevice } from "../lib/device.js";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n || 0).toLocaleString();

export default function Launcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const [factoryId, setFactoryId] = useState("");
  const [deviceApps, setDeviceApps] = useState(null); // null = unknown -> show all

  useEffect(() => { heartbeat(); getMyDevice().then((d) => setDeviceApps(d?.appsEnabled || null)); }, []);

  const kpi = useDashboardData({ date: today(), factoryId, publicView: false }).kpis;
  const appOn = (key) => (deviceApps ? deviceApps[key] !== false : true);

  const apps = [
    { key: "promis", name: "PROMIS Production", desc: "Hourly production, targets, efficiency & live board",
      icon: "▦", tone: "info", to: `/promis${factoryId ? `?factory=${factoryId}` : ""}`, ready: true, cap: "view_dashboard" },
    { key: "downtime", name: "Downtime & Andon", desc: "Raise, attend, complete & verify downtime + andon calls",
      icon: "◬", tone: "warn", to: "/downtime", ready: true, cap: "view_downtime_dashboard" },
    { key: "quality", name: "Quality Management", desc: "Inline, endline & final audit",
      icon: "✓", tone: "ok", to: "#", ready: false, comingSoon: true, cap: null },
  ].filter((a) => appOn(a.key) && (!a.cap || can(user, a.cap)));

  const tiles = [
    { label: "Daily Plans", to: "/plans", cap: "manage_plans", icon: "🗒" },
    { label: "Shift Allocation", to: "/allocation", cap: "manage_allocation", icon: "👥" },
    { label: "Reports", to: "/reports", cap: "view_reports", icon: "📊" },
    { label: "Devices", to: "/devices", cap: "manage_devices", icon: "📟" },
    { label: "Audit Log", to: "/audit", cap: "view_audit", icon: "❖" },
    { label: "Roles & Access", to: "/roles", cap: "manage_roles", icon: "⛨" },
    { label: "Users", to: "/users", cap: "manage_users", icon: "◉" },
    { label: "TV Display", to: "/display", cap: "view_dashboard", icon: "⛶", external: true },
  ].filter((t) => can(user, t.cap));

  const toneCls = (t) => t === "warn" ? "from-warn/20 text-warn" : t === "ok" ? "from-ok/20 text-ok" : "from-info/20 text-info";

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info font-mono text-lg font-bold text-white">PM</div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{settings.companyName || "PROMIS"}</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500">Production Monitoring Information System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="field h-10 w-48" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All factories</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="text-right">
            <div className="text-sm font-bold">{user?.name || user?.email}</div>
            <div className="text-[11px] text-slate-400">{ROLE_LABEL[user?.role] || user?.role}</div>
          </div>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Modules" value={kpi.modules} />
        <Kpi label="Operators" value={fmt(kpi.operators)} />
        <Kpi label="Target" value={fmt(kpi.target)} />
        <Kpi label="Actual" value={fmt(kpi.actual)} tone="ok" />
        <Kpi label="PTP%" value={`${kpi.achievement}%`} tone={kpi.achievement >= 100 ? "ok" : "bad"} />
        <Kpi label="Eff%" value={`${kpi.efficiency}%`} />
      </div>

      {/* Applications */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">Applications</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <button key={a.key} disabled={!a.ready}
              onClick={() => a.ready && navigate(a.to)}
              className={"group relative overflow-hidden rounded-2xl border border-grid bg-gradient-to-br to-card p-5 text-left transition " + toneCls(a.tone) + (a.ready ? " hover:border-info hover:shadow-lg" : " cursor-default opacity-70")}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{a.icon}</span>
                {a.comingSoon ? <span className="pill bg-grid/60 text-slate-300">Coming soon</span>
                  : !a.ready ? <span className="pill bg-warn/20 text-warn">Next update</span>
                  : <span className="pill bg-ok/20 text-ok">Open</span>}
              </div>
              <div className="mt-4 text-lg font-extrabold text-ink">{a.name}</div>
              <div className="mt-1 text-sm text-slate-400">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick access */}
      {tiles.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">Quick access</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <button key={t.label}
                onClick={() => t.external ? window.open(t.to, "_blank") : navigate(t.to)}
                className="flex items-center gap-3 rounded-xl border border-grid bg-card p-3 text-left transition hover:border-info">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.announcement && (
        <div className="rounded-xl border border-info/40 bg-info/10 p-4 text-sm">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-info">Announcement</div>
          {settings.announcement}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-xl border border-grid bg-card px-3 py-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={"font-mono text-2xl font-bold " + c}>{value}</div>
    </div>
  );
}
