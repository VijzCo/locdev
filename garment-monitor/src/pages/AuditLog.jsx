// src/pages/AuditLog.jsx
// Full audit trail with rich filtering. Every create/save/update/delete that
// passes through the data layer is recorded; here an admin/manager can slice it
// by date range, user, action, entity (collection), factory, module, source,
// and a free-text search, then export the filtered view to Excel/PDF.
import { useMemo, useState } from "react";
import { orderBy, limit as fbLimit } from "firebase/firestore";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { exportExcel, exportPDF } from "../lib/exports.js";

const today = () => new Date().toISOString().slice(0, 10);
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const ENTITY_LABEL = {
  factories: "Factory", modules: "Module", styles: "Style", shifts: "Shift",
  shiftSlots: "Shift slot", teamAllocations: "Allocation", dailyPlans: "Daily plan",
  hourlyProduction: "Production entry", users: "User", settings: "Settings",
};
const ACTION_TONE = { create: "text-info", save: "text-ok", update: "text-warn", delete: "text-bad" };

export default function AuditLog() {
  const logs = useCollection(COL.auditLogs, [orderBy("at", "desc"), fbLimit(1000)], []).data;
  const users = useCollection(COL.users, [], []).data;
  const factories = useCollection(COL.factories, [], []).data;
  const modules = useCollection(COL.modules, [], []).data;
  const devices = useCollection(COL.devices, [], []).data;

  const [from, setFrom] = useState(ago(7));
  const [to, setTo] = useState(today());
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [source, setSource] = useState("");
  const [device, setDevice] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(200);

  const nameByUid = useMemo(() => Object.fromEntries(users.map((u) => [u.uid || u.id, u.name || u.email])), [users]);
  const deviceName = (id) => { const d = devices.find((x) => x.deviceId === id || x.id === id); return d?.name || (id ? id.slice(0, 8) : "—"); };
  const factoryName = (id) => factories.find((f) => f.id === id)?.name || id || "—";
  const moduleNum = (id) => modules.find((m) => m.id === id)?.number || id || "—";

  const fromTs = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const toTs = to ? new Date(to + "T23:59:59").getTime() : Infinity;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs
      .filter((l) => {
        const t = new Date(l.at || 0).getTime();
        if (t < fromTs || t > toTs) return false;
        if (actor && (l.actorUid || "public") !== actor) return false;
        if (action && l.action !== action) return false;
        if (entity && l.collection !== entity) return false;
        if (factoryId && l.factoryId !== factoryId) return false;
        if (moduleId && l.moduleId !== moduleId) return false;
        if (source && l.source !== source) return false;
        if (device && l.deviceId !== device) return false;
        if (needle) {
          const hay = `${l.summary} ${l.docId} ${l.actorEmail} ${l.data} ${l.collection}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [logs, fromTs, toTs, actor, action, entity, factoryId, moduleId, source, device, q]);

  const shown = filtered.slice(0, limit);

  const reset = () => {
    setFrom(ago(7)); setTo(today()); setActor(""); setAction(""); setEntity("");
    setFactoryId(""); setModuleId(""); setSource(""); setDevice(""); setQ(""); setLimit(200);
  };

  const exportColumns = [
    { key: "at", label: "Time" }, { key: "user", label: "User" },
    { key: "action", label: "Action" }, { key: "entity", label: "Entity" },
    { key: "docId", label: "Doc ID" }, { key: "factory", label: "Factory" },
    { key: "module", label: "Module" }, { key: "source", label: "Source" },
    { key: "data", label: "Details" },
  ];
  const rowsForExport = () => filtered.map((l) => ({
    at: new Date(l.at).toLocaleString(),
    user: l.actorUid ? (nameByUid[l.actorUid] || l.actorEmail) : "Public",
    action: l.action,
    entity: ENTITY_LABEL[l.collection] || l.collection,
    docId: l.docId,
    factory: l.factoryId ? factoryName(l.factoryId) : "",
    module: l.moduleId ? moduleNum(l.moduleId) : "",
    source: l.source,
    data: l.data,
  }));
  const doExcel = () => exportExcel(rowsForExport(), exportColumns, "audit-log");
  const doPDF = () => exportPDF(rowsForExport(), exportColumns, { filename: "audit-log", title: "Audit Log", meta: `${from} → ${to} · ${filtered.length} events` });

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Audit Log</h1>
          <p className="text-xs text-slate-400">Every data change, who made it, and when.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={doExcel}>Excel</button>
          <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={doPDF}>PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
        <div><label className="label">From</label><input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><label className="label">User</label>
          <select className="field" value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">All users</option>
            <option value="public">Public (module tab)</option>
            {users.map((u) => <option key={u.uid || u.id} value={u.uid || u.id}>{u.name || u.email}</option>)}
          </select></div>
        <div><label className="label">Action</label>
          <select className="field" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="create">Create</option><option value="save">Save</option>
            <option value="update">Update</option><option value="delete">Delete</option>
          </select></div>
        <div><label className="label">Entity</label>
          <select className="field" value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">All entities</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label className="label">Factory</label>
          <select className="field" value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
            <option value="">All factories</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label">Module</label>
          <select className="field" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">All modules</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.number}</option>)}
          </select></div>
        <div><label className="label">Source</label>
          <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            <option value="app">App</option><option value="recorder">Recorder</option>
            <option value="module-tab">Module tab</option><option value="public">Public</option>
          </select></div>
        <div><label className="label">Device</label>
          <select className="field" value={device} onChange={(e) => setDevice(e.target.value)}>
            <option value="">All devices</option>
            {devices.map((d) => <option key={d.id} value={d.deviceId || d.id}>{d.name || (d.id || "").slice(0, 8)}</option>)}
          </select></div>
        <div className="md:col-span-2"><label className="label">Search</label>
          <input className="field" placeholder="text, doc id, email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex items-end"><button className="btn bg-grid/60 hover:bg-grid" onClick={reset}>Reset</button></div>
      </div>

      <div className="text-xs text-slate-400">{filtered.length} event(s) · showing {shown.length}</div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Time</th><th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Factory / Module</th><th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-slate-500">No matching events.</td></tr>}
            {shown.map((l) => (
              <tr key={l.id} className="border-b border-grid/50 align-top">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-300">{new Date(l.at).toLocaleString()}</td>
                <td className="px-3 py-2">{l.actorUid ? (nameByUid[l.actorUid] || l.actorEmail || "—") : <span className="text-slate-400">Public</span>}</td>
                <td className={"px-3 py-2 font-semibold " + (ACTION_TONE[l.action] || "")}>{l.action}</td>
                <td className="px-3 py-2">{ENTITY_LABEL[l.collection] || l.collection}<div className="font-mono text-[10px] text-slate-500">{l.docId}</div></td>
                <td className="px-3 py-2 text-slate-400">
                  {l.factoryId ? factoryName(l.factoryId) : "—"}{l.moduleId ? ` · ${moduleNum(l.moduleId)}` : ""}
                </td>
                <td className="px-3 py-2"><span className="pill bg-grid/60 text-slate-300">{l.source}</span></td>
                <td className="px-3 py-2 text-slate-400" title={l.deviceId}>{l.deviceLabel || deviceName(l.deviceId)}</td>
                <td className="max-w-md px-3 py-2"><div className="truncate font-mono text-[11px] text-slate-400" title={l.data}>{l.data}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > shown.length && (
        <div className="text-center">
          <button className="btn bg-grid/60 hover:bg-grid" onClick={() => setLimit((n) => n + 200)}>Load more</button>
        </div>
      )}
    </div>
  );
}
