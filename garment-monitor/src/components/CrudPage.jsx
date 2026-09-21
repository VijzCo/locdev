// src/components/CrudPage.jsx
import { useMemo, useState } from "react";
import { useCollection } from "../hooks/useCollection.js";
import { createDoc, patchDoc, removeDoc, upsertDoc } from "../firebase/db.js";

/**
 * field: { key, label, type, options?, optionsCol?, optionLabel?, required?, step?, default? }
 * type: text | number | time | select | textarea | status
 */
function Input({ field, value, onChange, lookups }) {
  const set = (v) => onChange(field.key, v);
  if (field.type === "select" || field.type === "status") {
    const opts =
      field.type === "status"
        ? [["Active", "Active"], ["Inactive", "Inactive"]]
        : field.optionsCol
        ? (lookups[field.optionsCol] || []).map((o) => [o.id, field.optionLabel ? field.optionLabel(o) : o.name])
        : (field.options || []).map((o) => (Array.isArray(o) ? o : [o, o]));
    return (
      <select className="field" value={value ?? ""} onChange={(e) => set(e.target.value)}>
        <option value="">Select…</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  }
  if (field.type === "textarea")
    return <textarea className="field" rows={2} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
  return (
    <input
      className="field"
      type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
      step={field.step}
      value={value ?? ""}
      onChange={(e) => set(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
    />
  );
}

export default function CrudPage({ title, subtitle, col, fields, canEdit = true, extraLookups = [], renderExtra, idField }) {
  const { data, loading } = useCollection(col, [], []);
  const lookupCols = [...new Set([...fields.filter((f) => f.optionsCol).map((f) => f.optionsCol), ...extraLookups])];
  const lookupData = {};
  // eslint-disable-next-line react-hooks/rules-of-hooks
  lookupCols.forEach((c) => (lookupData[c] = useCollection(c, [], []).data));

  const [editing, setEditing] = useState(null); // {id?, ...values}
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const labelFor = (field, val) => {
    if (field.optionsCol) {
      const o = (lookupData[field.optionsCol] || []).find((x) => x.id === val);
      return o ? (field.optionLabel ? field.optionLabel(o) : o.name) : "—";
    }
    return val ?? "—";
  };

  const filtered = useMemo(() => {
    if (!q) return data;
    const t = q.toLowerCase();
    return data.filter((r) => fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(t)));
  }, [data, q, fields]);

  const save = async () => {
    const { id, ...vals } = editing;
    const missing = fields.filter((f) => f.required && (vals[f.key] === "" || vals[f.key] == null));
    if (missing.length) { setErr("Please fill: " + missing.map((f) => f.label).join(", ")); return; }
    setSaving(true); setErr("");
    try {
      if (id) {
        await patchDoc(col, id, vals);
      } else if (idField && vals[idField]) {
        await upsertDoc(col, String(vals[idField]).trim(), vals);
      } else {
        await createDoc(col, vals);
      }
      setEditing(null);
    } catch (e) {
      setErr(e?.code === "permission-denied"
        ? "Permission denied — the security rules for this collection may not be published yet. Re-deploy firestore.rules."
        : "Could not save: " + (e?.message || e));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <input className="field w-48" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          {canEdit && (
            <button className="btn-primary" onClick={() => { setErr(""); setEditing(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]))); }}>
              + New
            </button>
          )}
        </div>
      </div>

      {renderExtra && renderExtra({ data, lookupData })}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              {fields.map((f) => <th key={f.key} className="px-3 py-2.5 whitespace-nowrap">{f.label}</th>)}
              {canEdit && <th className="px-3 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={99}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={99}>No records yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-grid/50 hover:bg-grid/20">
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2.5">
                      {f.type === "status" ? (
                        <span className={"pill " + (r[f.key] === "Inactive" ? "bg-bad/20 text-bad" : "bg-ok/20 text-ok")}>
                          {r[f.key] || "Active"}
                        </span>
                      ) : (
                        <span className={f.type === "number" ? "font-mono" : ""}>{labelFor(f, r[f.key])}</span>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-3 py-2.5 text-right">
                      <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => { setErr(""); setEditing(r); }}>Edit</button>
                      <button className="btn-danger px-2 py-1 text-xs"
                        onClick={() => window.confirm("Delete this record?") && removeDoc(col, r.id)}>Del</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editing.id ? "Edit" : "New"} {title.replace(/s$/, "")}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="label">{f.label}{f.required && " *"}</label>
                  <Input field={f} value={editing[f.key]} lookups={lookupData}
                    onChange={(k, v) => setEditing((s) => ({ ...s, [k]: v }))} />
                </div>
              ))}
            </div>
            {err && <div className="mt-3 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{err}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button className="btn-primary disabled:opacity-50" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
