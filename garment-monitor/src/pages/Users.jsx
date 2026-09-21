// src/pages/Users.jsx
// User management. The admin enters Name / Email / Password / Role and the app
// creates BOTH the Firebase Auth account and the matching Firestore profile
// (id = the new Auth UID) in one step — no more hand-copying a UID from the
// Firebase console. Existing users can have their role/status/name edited;
// deleting removes the Firestore profile (the Auth login must be removed in the
// Firebase console, which requires the Admin SDK).
import { useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { upsertDoc, patchDoc, removeDoc } from "../firebase/db.js";
import { createAuthUser } from "../firebase/userAdmin.js";
import { ROLE_LABEL, DEFAULT_ROLES } from "../lib/roles.js";

const blank = { name: "", email: "", password: "", role: "", status: "Active", factories: [] };

export default function Users() {
  const users = useCollection(COL.users, [], []).data;
  const factories = useCollection(COL.factories, [], []).data;
  const rolesCol = useCollection(COL.roles, [], []).data;
  // Role options = built-in defaults merged with any custom roles in the DB.
  const roleOptions = (() => {
    const map = {};
    Object.entries(DEFAULT_ROLES).forEach(([id, r]) => { map[id] = r.name; });
    rolesCol.forEach((r) => { map[r.id] = r.name || r.id; });
    return Object.entries(map).map(([value, label]) => ({ value, label }));
  })();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);   // uid being edited
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => { setForm(blank); setEditing(null); setErr(""); setOpen(true); };
  const startEdit = (u) => {
    setForm({ name: u.name || "", email: u.email || "", password: "", role: u.role || "", status: u.status || "Active", factories: u.factories || [] });
    setEditing(u.uid || u.id); setErr(""); setOpen(true);
  };

  const save = async () => {
    setErr("");
    if (!form.name || !form.email || !form.role) { setErr("Name, email and role are required."); return; }
    if (!editing && (form.password || "").length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      if (editing) {
        await patchDoc(COL.users, editing, { name: form.name, role: form.role, status: form.status, factories: form.factories || [] });
      } else {
        const uid = await createAuthUser(form.email, form.password);
        await upsertDoc(COL.users, uid, {
          uid, name: form.name, email: form.email.trim(),
          role: form.role, status: form.status, factories: form.factories || [],
        });
      }
      setOpen(false); setForm(blank); setEditing(null);
    } catch (e) {
      const code = e?.code || "";
      setErr(
        code.includes("email-already-in-use") ? "That email already has an account."
        : code.includes("invalid-email") ? "That email address is invalid."
        : code.includes("weak-password") ? "Password is too weak (min 6 characters)."
        : "Could not create user. " + (e?.message || "")
      );
    } finally { setBusy(false); }
  };

  const del = async (u) => {
    if (!window.confirm(`Remove ${u.name || u.email}'s profile? Their login stays until removed in the Firebase console.`)) return;
    await removeDoc(COL.users, u.uid || u.id);
  };

  const factoryNames = (ids) =>
    !ids || !ids.length ? "All" : ids.map((id) => factories.find((f) => f.id === id)?.name || id).join(", ");

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Users</h1>
          <p className="text-xs text-slate-400">Creates the login + profile together — no Auth UID needed.</p>
        </div>
        <button className="btn-primary" onClick={startNew}>New User</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th><th className="px-3 py-2">Factories</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-slate-500">No users yet.</td></tr>}
            {users.map((u) => (
              <tr key={u.uid || u.id} className="border-b border-grid/50">
                <td className="px-3 py-2 font-semibold">{u.name || "—"}</td>
                <td className="px-3 py-2 text-slate-300">{u.email}</td>
                <td className="px-3 py-2">{(roleOptions.find((r) => r.value === u.role)?.label) || ROLE_LABEL[u.role] || u.role || "—"}</td>
                <td className="px-3 py-2 text-slate-400">{factoryNames(u.factories)}</td>
                <td className="px-3 py-2">
                  <span className={"pill " + (u.status === "Inactive" ? "bg-bad/20 text-bad" : "bg-ok/20 text-ok")}>{u.status || "Active"}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="btn-primary mr-1 px-2 py-1 text-xs" onClick={() => startEdit(u)}>Edit</button>
                  <button className="btn-danger px-2 py-1 text-xs" onClick={() => del(u)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold">{editing ? "Edit User" : "New User"}</h2>
            <div className="space-y-3">
              <div><label className="label">Name *</label>
                <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className="label">Email *</label>
                <input className="field" type="email" value={form.email} disabled={!!editing}
                  onChange={(e) => set("email", e.target.value)} />
                {editing && <p className="mt-1 text-[11px] text-slate-500">Email can't be changed here.</p>}</div>
              {!editing && (
                <div><label className="label">Password * <span className="text-slate-500">(min 6 chars)</span></label>
                  <input className="field" type="text" value={form.password} onChange={(e) => set("password", e.target.value)} /></div>
              )}
              <div><label className="label">Role *</label>
                <select className="field" value={form.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="">Select…</option>
                  {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select></div>
              <div><label className="label">Status</label>
                <select className="field" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="Active">Active</option><option value="Inactive">Inactive</option>
                </select></div>
              <div>
                <label className="label">Factories <span className="text-slate-500">(none = all, for admins)</span></label>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-grid bg-bg p-2">
                  {factories.length === 0 && <span className="text-xs text-slate-500">No factories yet.</span>}
                  {factories.map((f) => {
                    const on = (form.factories || []).includes(f.id);
                    return (
                      <label key={f.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-info" checked={on}
                          onChange={(e) => set("factories", e.target.checked
                            ? [...(form.factories || []), f.id]
                            : (form.factories || []).filter((x) => x !== f.id))} />
                        {f.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              {err && <p className="text-sm text-bad">{err}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn bg-grid/60 hover:bg-grid" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button className="btn-primary disabled:opacity-50" onClick={save} disabled={busy}>
                {busy ? "Saving…" : editing ? "Save" : "Create user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
