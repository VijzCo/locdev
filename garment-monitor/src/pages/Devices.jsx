// src/pages/Devices.jsx
// Device registry. Tablets/TVs/phones self-register via a heartbeat (see
// lib/device.js); admins name them, assign factory/department/module, toggle
// which applications each device may show, and enable/disable or force-logout.
import { useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { upsertDoc, patchDoc, removeDoc } from "../firebase/db.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function Devices() {
  const { user } = useAuth();
  const devices = useCollection(COL.devices, [], []).data;
  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const departments = scopeFactories(user, useCollection(COL.departments, [], []).data, "factoryId");
  const modules = scopeFactories(user, useCollection(COL.modules, [], []).data, "factoryId");
  const facIds = new Set(factories.map((f) => f.id));

  const [fFactory, setFFactory] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [edits, setEdits] = useState({});

  const rows = useMemo(() => devices
    .filter((d) => !d.factoryId || facIds.has(d.factoryId) || user?.role === "super_admin")
    .filter((d) => (!fFactory || d.factoryId === fFactory) && (!fStatus || (d.status || "Active") === fStatus))
    .sort((a, b) => (a.lastActiveAt < b.lastActiveAt ? 1 : -1)),
    [devices, fFactory, fStatus, facIds, user]);

  const val = (d, k, dflt) => { const e = edits[d.id] || {}; return e[k] !== undefined ? e[k] : (d[k] ?? dflt); };
  const apps = (d) => ({ promis: true, downtime: true, quality: false, ...(d.appsEnabled || {}), ...((edits[d.id] || {}).appsEnabled || {}) });
  const setE = (id, patch) => setEdits((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const setApp = (d, key, on) => setE(d.id, { appsEnabled: { ...apps(d), [key]: on } });

  const save = async (d) => {
    const e = edits[d.id]; if (!e) return;
    await upsertDoc(COL.devices, d.id, {
      name: val(d, "name", ""), factoryId: val(d, "factoryId", ""), departmentId: val(d, "departmentId", ""),
      moduleId: val(d, "moduleId", ""), status: val(d, "status", "Active"), appsEnabled: apps(d),
    });
    setEdits((s) => { const n = { ...s }; delete n[d.id]; return n; });
  };
  const toggleStatus = (d) => patchDoc(COL.devices, d.id, { status: (val(d, "status", "Active") === "Active" ? "Disabled" : "Active") });
  const forceLogout = (d) => patchDoc(COL.devices, d.id, { forceLogoutAt: new Date().toISOString() });
  const del = (d) => window.confirm("Remove this device?") && removeDoc(COL.devices, d.id);

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Device Management</h1>
        <p className="text-xs text-slate-400">Tablets, TVs and phones self-register on first open. Name, assign and authorise apps here.</p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div><label className="label">Factory</label>
          <select className="field w-44" value={fFactory} onChange={(e) => setFFactory(e.target.value)}>
            <option value="">All</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Status</label>
          <select className="field w-36" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All</option><option value="Active">Active</option><option value="Disabled">Disabled</option>
          </select></div>
        <div className="ml-auto text-xs text-slate-400">{rows.length} device(s)</div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Device</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Factory</th>
              <th className="px-3 py-2">Department</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Apps</th>
              <th className="px-3 py-2">Last active</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-slate-500">No devices yet. Open a public page on a device to register it.</td></tr>}
            {rows.map((d) => {
              const a = apps(d); const dirty = !!edits[d.id]; const status = val(d, "status", "Active");
              const deptOpts = departments.filter((x) => !val(d, "factoryId", "") || x.factoryId === val(d, "factoryId", ""));
              const modOpts = modules.filter((x) => !val(d, "factoryId", "") || x.factoryId === val(d, "factoryId", ""));
              return (
                <tr key={d.id} className={"border-b border-grid/50 align-top " + (dirty ? "bg-info/5" : "")}>
                  <td className="px-3 py-2"><div className="font-mono text-[11px]">{d.id.slice(0, 10)}…</div><div className="text-[10px] text-slate-500">{d.platform}</div></td>
                  <td className="px-3 py-2"><input className="field h-9 w-32" value={val(d, "name", "")} onChange={(e) => setE(d.id, { name: e.target.value })} placeholder="e.g. Q01 tablet" /></td>
                  <td className="px-3 py-2">
                    <select className="field h-9 w-32" value={val(d, "factoryId", "")} onChange={(e) => setE(d.id, { factoryId: e.target.value, departmentId: "", moduleId: "" })}>
                      <option value="">—</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select className="field h-9 w-32" value={val(d, "departmentId", "")} onChange={(e) => setE(d.id, { departmentId: e.target.value })}>
                      <option value="">—</option>{deptOpts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select className="field h-9 w-28" value={val(d, "moduleId", "")} onChange={(e) => setE(d.id, { moduleId: e.target.value })}>
                      <option value="">—</option>{modOpts.map((x) => <option key={x.id} value={x.id}>{x.number}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!a.promis} onChange={(e) => setApp(d, "promis", e.target.checked)} /> PROMIS</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!a.downtime} onChange={(e) => setApp(d, "downtime", e.target.checked)} /> Downtime</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!a.quality} onChange={(e) => setApp(d, "quality", e.target.checked)} /> Quality</label>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{fmtTime(d.lastActiveAt)}</td>
                  <td className="px-3 py-2"><span className={"pill " + (status === "Disabled" ? "bg-bad/20 text-bad" : "bg-ok/20 text-ok")}>{status}</span></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button className="btn-primary px-2 py-1 text-xs disabled:opacity-40" onClick={() => save(d)} disabled={!dirty}>Save</button>
                      <button className="text-[11px] text-warn underline" onClick={() => toggleStatus(d)}>{status === "Disabled" ? "Enable" : "Disable"}</button>
                      <button className="text-[11px] text-info underline" onClick={() => forceLogout(d)}>Force logout</button>
                      <button className="text-[11px] text-bad underline" onClick={() => del(d)}>Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
