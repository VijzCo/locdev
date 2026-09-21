// src/pages/DeviceHome.jsx
// Native kiosk entry. Flow: launch → (if not set up) a Manage-Devices user logs
// in and configures Factory→Department→Section→Module + which apps this device
// runs → saved to the device record (visible in Device Management) → a home
// screen showing ONLY the enabled apps as icons. Tapping one opens it; a Home
// button returns here. Central control: the page listens to its own device
// record, so reassigning / toggling apps / disabling from the web reflects live.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db, COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { upsertDoc } from "../firebase/db.js";
import { useAuth } from "../context/AuthContext.jsx";
import { can } from "../lib/roles.js";
import { getDeviceId, getDeviceLabel, setDeviceLabel, heartbeat } from "../lib/device.js";
import { toEmail, DEFAULT_DOMAIN } from "../lib/login.js";

const APPS = [
  { key: "promis", name: "PROMIS Production", desc: "Hourly entry & targets", icon: "▦", to: "/module", grad: "from-info/25" },
  { key: "downtime", name: "Downtime & Andon", desc: "Raise & track issues", icon: "◬", to: "/module?app=downtime", grad: "from-warn/25" },
  { key: "quality", name: "Quality", desc: "Coming soon", icon: "✓", to: null, soon: true, grad: "from-ok/25" },
];

export default function DeviceHome() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const pickMode = sp.get("pick") === "1";   // arrived via the Home icon → show the picker
  const canConfig = can(user, "manage_devices");
  const deviceId = getDeviceId();

  const [device, setDevice] = useState(undefined); // undefined=loading, null=none
  useEffect(() => {
    heartbeat();
    const unsub = onSnapshot(doc(db, COL.devices, deviceId),
      (s) => setDevice(s.exists() ? { id: s.id, ...s.data() } : null),
      () => setDevice(null));
    return () => unsub();
  }, [deviceId]);

  const settings = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const factories = useCollection(COL.factories, [], []).data;
  const departments = useCollection(COL.departments, [], []).data;
  const sections = useCollection(COL.sections, [], []).data;
  const modules = useCollection(COL.modules, [], []).data;

  const configured = !!device?.moduleId;
  const disabled = device?.status === "Disabled";
  const apps = (device?.appsEnabled) || { promis: true, downtime: false, quality: false };
  const enabledApps = APPS.filter((a) => apps[a.key]);

  const [forceSetup, setForceSetup] = useState(false);
  const showSetup = (device !== undefined) && (!configured || forceSetup);

  // The device's primary app (PROMIS production preferred), opened on launch.
  const primaryApp = (apps.promis && APPS.find((a) => a.key === "promis"))
    || APPS.find((a) => apps[a.key] && !a.soon) || null;

  // On launch open the primary app directly; the picker only shows via the Home icon (?pick=1).
  useEffect(() => {
    if (!configured || forceSetup || disabled || pickMode) return;
    if (primaryApp) navigate(primaryApp.to, { replace: true });
  }, [configured, forceSetup, disabled, pickMode, device]);

  if (device === undefined) return <Frame><div className="text-slate-400">Loading device…</div></Frame>;
  if (disabled) return (
    <Frame>
      <div className="text-center">
        <div className="text-5xl">🚫</div>
        <div className="mt-3 text-xl font-bold text-bad">This device is disabled</div>
        <div className="text-sm text-slate-400">Please contact the production team.</div>
      </div>
    </Frame>
  );
  if (showSetup) return <Setup {...{ canConfig, user, login, settings, factories, departments, sections, modules, deviceId, device, onDone: () => { setForceSetup(false); logout?.(); } }} />;

  // Configured and not in pick mode → we're redirecting to the primary app; show a brief loader.
  if (!pickMode && primaryApp) return <Frame><div className="text-slate-400">Opening…</div></Frame>;

  // Configured home — enabled app icons only
  return (
    <Frame>
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-extrabold">{device?.name || modules.find((m) => m.id === device.moduleId)?.number || "Device"}</div>
          <div className="text-xs text-slate-500">{factories.find((f) => f.id === device.factoryId)?.name} · {modules.find((m) => m.id === device.moduleId)?.number}</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enabledApps.map((a) => (
            <button key={a.key} disabled={a.soon}
              onClick={() => a.to && navigate(a.to)}
              className={"flex items-center gap-4 rounded-2xl border border-grid bg-gradient-to-br to-card p-5 text-left transition " + a.grad + (a.soon ? " opacity-60" : " hover:border-info active:scale-[.99]")}>
              <span className="text-4xl">{a.icon}</span>
              <div>
                <div className="text-lg font-extrabold">{a.name}</div>
                <div className="text-sm text-slate-400">{a.desc}</div>
              </div>
            </button>
          ))}
          {enabledApps.length === 0 && <div className="text-slate-500">No apps enabled for this device.</div>}

          {/* Device Setup as a tile — always requires a fresh Manage-Devices login */}
          <button onClick={() => { logout?.(); setForceSetup(true); }}
            className="flex items-center gap-4 rounded-2xl border border-dashed border-grid bg-gradient-to-br from-slate-500/15 to-card p-5 text-left transition hover:border-info active:scale-[.99]">
            <span className="text-4xl">⚙</span>
            <div>
              <div className="text-lg font-extrabold">Device Setup</div>
              <div className="text-sm text-slate-400">Login required · assign line & apps</div>
            </div>
          </button>
        </div>
      </div>
    </Frame>
  );
}

function Setup({ canConfig, user, login, settings, factories, departments, sections, modules, deviceId, device, onDone }) {
  const domain = settings.companyDomain || DEFAULT_DOMAIN;
  const [lg, setLg] = useState({ user: "", pass: "", err: "", busy: false });
  const [f, setF] = useState({
    factoryId: device?.factoryId || "", departmentId: device?.departmentId || "",
    sectionId: device?.sectionId || "", moduleId: device?.moduleId || "",
    name: device?.name || getDeviceLabel() || "",
    apps: { promis: true, downtime: false, quality: false, ...(device?.appsEnabled || {}) },
  });
  const [busy, setBusy] = useState(false);

  const doLogin = async () => {
    setLg((s) => ({ ...s, busy: true, err: "" }));
    try { await login(toEmail(lg.user, domain), lg.pass); setLg((s) => ({ ...s, busy: false, pass: "" })); }
    catch { setLg((s) => ({ ...s, busy: false, err: "Invalid username or password." })); }
  };

  const deps = departments.filter((d) => d.factoryId === f.factoryId);
  const secs = sections.filter((s) => (!f.departmentId || s.departmentId === f.departmentId) && (!f.factoryId || s.factoryId === f.factoryId));
  const mods = useMemo(() => modules.filter((m) => m.factoryId === f.factoryId && (!f.departmentId || m.departmentId === f.departmentId))
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })), [modules, f.factoryId, f.departmentId]);
  const ready = f.factoryId && f.moduleId && (f.apps.promis || f.apps.downtime || f.apps.quality);

  const save = async () => {
    setBusy(true);
    if (f.name) setDeviceLabel(f.name);
    try {
      await upsertDoc(COL.devices, deviceId, {
        deviceId, name: f.name || undefined, factoryId: f.factoryId, departmentId: f.departmentId || "",
        sectionId: f.sectionId || "", moduleId: f.moduleId, appsEnabled: f.apps, status: "Active",
      });
      onDone();
    } finally { setBusy(false); }
  };

  if (!canConfig) return (
    <Frame>
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <div className="text-xl font-extrabold">Device setup</div>
          <p className="text-sm text-slate-400">An authorised user must sign in to set up this device.</p>
        </div>
        <div className="card space-y-3 p-5">
          <div><label className="label">Username</label>
            <input className="field" value={lg.user} autoCapitalize="none" autoCorrect="off" placeholder="e.g. vijan.b"
              onChange={(e) => setLg((s) => ({ ...s, user: e.target.value }))} /></div>
          <div><label className="label">Password</label>
            <input className="field" type="password" value={lg.pass}
              onChange={(e) => setLg((s) => ({ ...s, pass: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && doLogin()} /></div>
          {lg.err && <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{lg.err}</p>}
          {user && !canConfig && <p className="rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">This account can’t set up devices.</p>}
          <button className="btn-primary w-full" onClick={doLogin} disabled={lg.busy}>{lg.busy ? "Signing in…" : "Sign in to set up"}</button>
        </div>
      </div>
    </Frame>
  );

  return (
    <Frame>
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <div className="text-xl font-extrabold">Device setup</div>
          <p className="text-xs text-slate-400">Signed in as {user?.email}</p>
        </div>
        <div className="card space-y-3 p-5">
          <div><label className="label">Device name (optional)</label>
            <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Q01 tablet" /></div>
          <Sel label="Factory" value={f.factoryId} onChange={(v) => setF({ ...f, factoryId: v, departmentId: "", sectionId: "", moduleId: "" })} opts={factories.map((x) => [x.id, x.name])} />
          <Sel label="Department" value={f.departmentId} onChange={(v) => setF({ ...f, departmentId: v, sectionId: "", moduleId: "" })} opts={deps.map((x) => [x.id, x.name])} />
          <Sel label="Section" value={f.sectionId} onChange={(v) => setF({ ...f, sectionId: v })} opts={secs.map((x) => [x.id, x.name])} />
          <Sel label="Module" value={f.moduleId} onChange={(v) => setF({ ...f, moduleId: v })} opts={mods.map((x) => [x.id, x.number])} />
          <div>
            <label className="label">Apps enabled on this device</label>
            <div className="grid grid-cols-3 gap-2">
              {[["promis", "PROMIS"], ["downtime", "Downtime"], ["quality", "Quality"]].map(([k, lbl]) => (
                <label key={k} className={"flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm " + (f.apps[k] ? "border-info bg-info/10" : "border-grid bg-bg")}>
                  <input type="checkbox" checked={!!f.apps[k]} onChange={(e) => setF({ ...f, apps: { ...f.apps, [k]: e.target.checked } })} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
          {f.factoryId && f.moduleId && (
            <p className="rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
              Setting up this tablet as <b>{mods.find((m) => m.id === f.moduleId)?.number}</b>
              {f.departmentId && <> · {deps.find((d) => d.id === f.departmentId)?.name}</>} · {factories.find((x) => x.id === f.factoryId)?.name}.
            </p>
          )}
          <button className="btn-primary w-full disabled:opacity-40" onClick={save} disabled={!ready || busy}>{busy ? "Saving…" : "Save & continue"}</button>
        </div>
      </div>
    </Frame>
  );
}

function Frame({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-bg p-4 text-ink">{children}</div>;
}
function Sel({ label, value, onChange, opts }) {
  return <div><label className="label">{label}</label>
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select></div>;
}
