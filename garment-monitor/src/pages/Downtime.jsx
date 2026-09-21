// src/pages/Downtime.jsx
// Downtime & Andon operations board. Raise an event, then move it through
// Raised → Attended → Completed → Verified, each stage capturing user, EPF,
// timestamp and computed durations. Live escalation colouring against SLA
// targets. Downtime and Andon share this identical workflow (tabbed).
import { useEffect, useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where, createDoc, patchDoc } from "../firebase/db.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";
import { nextRef, minutesBetween, getTarget, escalation, writeNotification, isOpen, reconcileDowntime } from "../lib/downtime.js";

const nowIso = () => new Date().toISOString();
const fmtMin = (m) => (m == null ? "—" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);
const tone = { ok: "text-ok", warn: "text-warn", bad: "text-bad" };

export default function Downtime() {
  const { user } = useAuth();
  const [kind, setKind] = useState("downtime");
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 15000); return () => clearInterval(id); }, []);

  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const departments = scopeFactories(user, useCollection(COL.departments, [], []).data, "factoryId");
  const sections = useCollection(COL.sections, [], []).data;
  const modules = scopeFactories(user, useCollection(COL.modules, [], []).data, "factoryId");
  const targets = useCollection(COL.targets, [], []).data;
  const dCats = useCollection(COL.downtimeCategories, [], []).data;
  const dReasons = useCollection(COL.downtimeReasons, [], []).data;
  const aCats = useCollection(COL.andonCategories, [], []).data;
  const aReasons = useCollection(COL.andonReasons, [], []).data;
  const downtimes = useCollection(COL.downtimes, [], []).data;
  const andons = useCollection(COL.andons, [], []).data;
  const slotsAll = useCollection(COL.shiftSlots, [], []).data;
  const _today = new Date().toISOString().slice(0, 10);
  const _tmrw = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const plansWin = useCollection(COL.dailyPlans, [where("date", ">=", _today), where("date", "<=", _tmrw)], [_today, _tmrw]).data;
  const settingsDoc = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};

  // Backstop cross-shift reconciliation for downtimes (in case a line tablet is off).
  useEffect(() => {
    const run = () => {
      const carryOver = !!settingsDoc.downtimeCarryOver;
      downtimes.forEach((d) => {
        const patch = reconcileDowntime(d, { carryOver, slots: slotsAll, modulePlans: plansWin.filter((p) => p.moduleId === d.moduleId) });
        if (!patch) return;
        const { __carry, ...p } = patch;
        patchDoc(COL.downtimes, d.id, p);
      });
    };
    run();
    const id = setInterval(run, 30000);
    return () => clearInterval(id);
  }, [downtimes, slotsAll, plansWin, settingsDoc.downtimeCarryOver]);

  const isDowntime = kind === "downtime";
  const col = isDowntime ? COL.downtimes : COL.andons;
  const cats = isDowntime ? dCats : aCats;
  const reasons = isDowntime ? dReasons : aReasons;
  const items = isDowntime ? downtimes : andons;
  const facIds = new Set(factories.map((f) => f.id));

  const [fFactory, setFFactory] = useState("");
  const [fStatus, setFStatus] = useState("open");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [action, setAction] = useState(null); // { item, stage }

  const nameOf = (arr, id) => arr.find((x) => x.id === id);
  const moduleNum = (id) => modules.find((m) => m.id === id)?.number || "—";
  const deptName = (id) => departments.find((d) => d.id === id)?.name || "";

  const rows = useMemo(() => {
    void tick;
    return items
      .filter((i) => facIds.has(i.factoryId) || user?.role === "super_admin")
      .filter((i) => (!fFactory || i.factoryId === fFactory))
      .filter((i) => fStatus === "all" ? true : fStatus === "open" ? isOpen(i.status) : i.status === fStatus)
      .map((i) => ({ ...i, esc: escalation(i, getTarget(targets, kind, i.factoryId, i.departmentId), nowIso()) }))
      .sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1));
  }, [items, facIds, fFactory, fStatus, targets, kind, user, tick]);

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Downtime &amp; Andon</h1>
          <p className="text-xs text-slate-400">Raise → Attend → Complete → Verify</p>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn bg-grid/60 text-xs hover:bg-grid" href="/downtime/display" target="_blank" rel="noreferrer">⛶ Open TV</a>
          <button className="btn-primary" onClick={() => setRaiseOpen(true)}>+ Raise {isDowntime ? "Downtime" : "Andon"}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["downtime", "andon"].map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={"rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition " + (kind === k ? "bg-info text-white" : "bg-grid/40 text-slate-300 hover:bg-grid")}>{k}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <select className="field h-9 w-40" value={fFactory} onChange={(e) => setFFactory(e.target.value)}>
            <option value="">All factories</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="field h-9 w-36" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="open">Open</option><option value="Raised">Raised</option><option value="Attended">Attended</option>
            <option value="Completed">Completed</option><option value="Verified">Verified</option><option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Category / Reason</th>
              <th className="px-3 py-2">Raised</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Elapsed / SLA</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-slate-500">No {kind} events.</td></tr>}
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-grid/50 align-top">
                <td className="px-3 py-2 font-mono text-xs">{i.ref}</td>
                <td className="px-3 py-2 font-semibold">{moduleNum(i.moduleId)}</td>
                <td className="px-3 py-2">
                  <div>{nameOf(cats, i.categoryId)?.name || "—"}{deptName(i.departmentId) && <span className="ml-1 text-[10px] text-info">· {deptName(i.departmentId)}</span>}</div>
                  <div className="text-[11px] text-slate-500">{nameOf(reasons, i.reasonId)?.description || i.description || ""}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">{new Date(i.raisedAt).toLocaleTimeString()}<div className="text-[10px]">{i.raisedByName || i.raisedByEpf}</div></td>
                <td className="px-3 py-2"><StatusPill s={i.status} /></td>
                <td className="px-3 py-2">
                  {isOpen(i.status) ? (
                    <div className={tone[i.esc.color]}>
                      <span className="font-mono font-bold">{fmtMin(i.esc.elapsed)}</span>
                      <span className="text-[10px]"> / {i.esc.limit}m · {i.esc.status}{i.esc.owner ? ` → ${i.esc.owner}` : ""}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">resolved {fmtMin(i.fullResolutionTime ?? i.totalDowntime)}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {i.status === "Raised" && <button className="btn-primary px-2 py-1 text-xs" onClick={() => setAction({ item: i, stage: "attend" })}>Attend</button>}
                  {i.status === "Attended" && <button className="btn-primary px-2 py-1 text-xs" onClick={() => setAction({ item: i, stage: "complete" })}>Complete</button>}
                  {i.status === "Completed" && <button className="btn-primary px-2 py-1 text-xs" onClick={() => setAction({ item: i, stage: "verify" })}>Verify</button>}
                  {i.status === "Verified" && <span className="text-xs text-ok">✓ done</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {raiseOpen && (
        <RaiseModal kind={kind} col={col} user={user} factories={factories} departments={departments}
          sections={sections} modules={modules} cats={cats} reasons={reasons}
          onClose={() => setRaiseOpen(false)} />
      )}
      {action && (
        <ActionModal action={action} col={col} kind={kind} user={user}
          onClose={() => setAction(null)} />
      )}
    </div>
  );
}

function StatusPill({ s }) {
  const m = { Raised: "bg-bad/20 text-bad", Attended: "bg-warn/20 text-warn", Completed: "bg-info/20 text-info", Verified: "bg-ok/20 text-ok" };
  return <span className={"pill " + (m[s] || "bg-grid/60")}>{s}</span>;
}

function RaiseModal({ kind, col, user, factories, departments, sections, modules, cats, reasons, onClose }) {
  const [f, setF] = useState({ factoryId: "", departmentId: "", sectionId: "", moduleId: "", categoryId: "", reasonId: "", description: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const deps = departments.filter((d) => d.factoryId === f.factoryId && d.status !== "Inactive");
  const secs = sections.filter((s) => !f.factoryId || s.factoryId === f.factoryId);
  const mods = modules.filter((m) => m.factoryId === f.factoryId);
  const cs = f.departmentId
    ? cats.filter((c) => c.factoryId === f.factoryId && c.status !== "Inactive" && (!c.departmentId || c.departmentId === f.departmentId))
    : [];
  const rs = reasons.filter((r) => r.categoryId === f.categoryId && r.status !== "Inactive");

  const submit = async () => {
    if (!f.factoryId || !f.moduleId || !f.categoryId) return;
    setBusy(true);
    try {
      const prefix = kind === "downtime" ? "DT" : "AN";
      const ref = await nextRef(prefix);
      const id = await createDoc(col, {
        ref, kind, ...f, status: "Raised",
        raisedByUid: user?.uid || "", raisedByName: user?.name || user?.email || "",
        raisedAt: nowIso(),
      });
      await writeNotification({ type: `${kind}_raised`, title: `${prefix} raised: ${ref}`,
        body: `${kind} raised on module`, factoryId: f.factoryId, refId: id, ref, kind });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal title={`Raise ${kind}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Sel label="Factory" value={f.factoryId} onChange={(v) => setF({ ...f, factoryId: v, departmentId: "", sectionId: "", moduleId: "", categoryId: "", reasonId: "" })} opts={factories.map((x) => [x.id, x.name])} />
        <Sel label="Module (location)" value={f.moduleId} onChange={(v) => set("moduleId", v)} opts={mods.map((x) => [x.id, x.number])} />
        <Sel label="Section" value={f.sectionId} onChange={(v) => set("sectionId", v)} opts={secs.map((x) => [x.id, x.name])} />
        <Sel label="Responsible Department" value={f.departmentId} onChange={(v) => setF({ ...f, departmentId: v, categoryId: "", reasonId: "" })} opts={deps.map((x) => [x.id, x.name])} />
        <Sel label="Category" value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v, reasonId: "" })} opts={cs.map((x) => [x.id, x.name])} />
        <Sel label="Reason" value={f.reasonId} onChange={(v) => set("reasonId", v)} opts={rs.map((x) => [x.id, `${x.code} — ${x.description}`])} />
      </div>
      <label className="label mt-3">Description</label>
      <textarea className="field" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
      <ModalButtons busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Raise" disabled={!f.factoryId || !f.moduleId || !f.categoryId} />
    </Modal>
  );
}

function ActionModal({ action, col, kind, user, onClose }) {
  const { item, stage } = action;
  const [f, setF] = useState({ epf: "", completionNotes: "", rootCause: "", correctiveAction: "", verificationNotes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const prefix = kind === "downtime" ? "DT" : "AN";

  const submit = async () => {
    setBusy(true);
    const at = nowIso();
    try {
      let patch = {};
      if (stage === "attend") {
        patch = { status: "Attended", attendedByEpf: f.epf, attendedByUid: user?.uid || "", attendedAt: at,
          timeToAttend: minutesBetween(item.raisedAt, at) };
      } else if (stage === "complete") {
        patch = { status: "Completed", completedByEpf: f.epf, completedByUid: user?.uid || "", completedAt: at,
          completionNotes: f.completionNotes, rootCause: f.rootCause, correctiveAction: f.correctiveAction,
          timeToComplete: minutesBetween(item.attendedAt, at), totalDowntime: minutesBetween(item.raisedAt, at) };
      } else {
        patch = { status: "Verified", verifiedByEpf: f.epf, verifiedByUid: user?.uid || "", verifiedAt: at,
          verificationNotes: f.verificationNotes, verificationTime: minutesBetween(item.completedAt, at),
          fullResolutionTime: minutesBetween(item.raisedAt, at) };
      }
      await patchDoc(col, item.id, patch);
      await writeNotification({ type: `${kind}_${patch.status.toLowerCase()}`, title: `${item.ref} ${patch.status}`,
        body: `${kind} ${patch.status.toLowerCase()}`, factoryId: item.factoryId, refId: item.id, ref: item.ref, kind });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal title={`${stage[0].toUpperCase() + stage.slice(1)} · ${item.ref}`} onClose={onClose}>
      {stage === "attend" && <Field label="EPF Number"><input className="field" value={f.epf} onChange={(e) => set("epf", e.target.value)} /></Field>}
      {stage === "complete" && <>
        <Field label="Completion Notes"><textarea className="field" rows={2} value={f.completionNotes} onChange={(e) => set("completionNotes", e.target.value)} /></Field>
        <Field label="Root Cause"><input className="field" value={f.rootCause} onChange={(e) => set("rootCause", e.target.value)} /></Field>
        <Field label="Corrective Action"><input className="field" value={f.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} /></Field>
        <Field label="EPF Number (optional)"><input className="field" value={f.epf} onChange={(e) => set("epf", e.target.value)} /></Field>
      </>}
      {stage === "verify" && <Field label="Verification Notes"><textarea className="field" rows={2} value={f.verificationNotes} onChange={(e) => set("verificationNotes", e.target.value)} /></Field>}
      <ModalButtons busy={busy} onClose={onClose} onSubmit={submit} submitLabel={stage[0].toUpperCase() + stage.slice(1)}
        disabled={stage === "attend" && !f.epf} />
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">{title}</h2>{children}
      </div>
    </div>
  );
}
function ModalButtons({ busy, onClose, onSubmit, submitLabel, disabled }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button className="btn bg-grid/60 hover:bg-grid" onClick={onClose} disabled={busy}>Cancel</button>
      <button className="btn-primary disabled:opacity-40" onClick={onSubmit} disabled={busy || disabled}>{busy ? "Saving…" : submitLabel}</button>
    </div>
  );
}
function Field({ label, children }) { return <div className="mb-2"><label className="label">{label}</label>{children}</div>; }
function Sel({ label, value, onChange, opts }) {
  return <div><label className="label">{label}</label>
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select></div>;
}
