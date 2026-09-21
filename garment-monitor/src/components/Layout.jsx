// src/components/Layout.jsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { can, ROLE_LABEL } from "../lib/roles.js";

const NAV = [
  { to: "/", label: "Home", cap: "view_dashboard", icon: "⌂" },
  { to: "/promis", label: "Production Board", cap: "view_dashboard", icon: "▦" },
  { to: "/entry", label: "Hourly Entry", cap: "enter_production", icon: "✎" },
  { to: "/reports", label: "Reports", cap: "view_reports", icon: "▤" },
  { divider: "Downtime & Andon" },
  { to: "/downtime", label: "Operations", cap: "view_downtime_dashboard", icon: "◬" },
  { to: "/downtime/dashboard", label: "DT Dashboard", cap: "view_downtime_dashboard", icon: "◎" },
  { to: "/downtime/config", label: "DT Config", cap: "manage_downtime_config", icon: "⚙" },
  { to: "/notifications", label: "Notifications", cap: "view_dashboard", icon: "🔔" },
  { divider: "Manage" },
  { to: "/factories", label: "Factories", cap: "manage_factories", icon: "▢" },
  { to: "/departments", label: "Departments", cap: "manage_departments", icon: "❏" },
  { to: "/sections", label: "Sections", cap: "manage_sections", icon: "❐" },
  { to: "/modules", label: "Modules", cap: "manage_modules", icon: "▣" },
  { to: "/styles", label: "Styles", cap: "manage_styles", icon: "✄" },
  { to: "/shifts", label: "Shifts & Slots", cap: "manage_shifts", icon: "◷" },
  { to: "/allocation", label: "Shift Allocation", cap: "manage_allocation", icon: "👥" },
  { to: "/plans", label: "Daily Plans", cap: "manage_plans", icon: "▥" },
  { divider: "Admin" },
  { to: "/devices", label: "Devices", cap: "manage_devices", icon: "📟" },
  { to: "/users", label: "Users", cap: "manage_users", icon: "◉" },
  { to: "/roles", label: "Roles & Access", cap: "manage_roles", icon: "⛨" },
  { to: "/audit", label: "Audit Log", cap: "view_audit", icon: "❖" },
  { to: "/settings", label: "Settings", cap: "manage_settings", icon: "⚙" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => n.divider || can(user, n.cap));

  const Side = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info font-mono text-sm font-bold text-white">
          PM
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold">PROMIS</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Production Monitoring
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {items.map((n, i) =>
          n.divider ? (
            <div key={i} className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {n.divider}
            </div>
          ) : (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
                (isActive
                  ? "bg-info/15 text-info"
                  : "text-slate-300 hover:bg-grid/40 hover:text-ink")
              }
            >
              <span className="w-4 text-center opacity-80">{n.icon}</span>
              {n.label}
            </NavLink>
          )
        )}
      </div>
      <div className="border-t border-grid p-3">
        <a href="/display" target="_blank" rel="noreferrer"
           className="btn-ghost mb-2 flex w-full items-center justify-center gap-2 text-xs">
          ⛶ Open TV Display
        </a>
        <div className="mb-2 px-1">
          <div className="truncate text-sm font-medium">{user?.name || user?.email}</div>
          <div className="text-[11px] text-slate-500">{ROLE_LABEL[user?.role] || "—"}</div>
        </div>
        <button
          className="btn-ghost w-full"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-grid bg-card md:block">
        {Side}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-grid bg-card">
            {Side}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-grid bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <button className="btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Menu">
            ☰
          </button>
          <span className="font-bold">Garment Monitor</span>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
