// src/pages/RolesAccess.jsx
// Super-admin screen to manage roles and assign function-wise access.
// Roles live in the `roles` collection: { name, capabilities:[], builtin }.
// Built-in roles can be re-permissioned (except Super Admin, which always has
// everything to prevent lock-out); custom roles can be created and deleted.
import { useEffect, useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { upsertDoc, removeDoc } from "../firebase/db.js";
import { CAPABILITIES, ALL_CAPS, DEFAULT_ROLES, ROLES } from "../lib/roles.js";

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function RolesAccess() {
  const stored = useCollection(COL.roles, [], []).data;
  const [draft, setDraft] = useState({});         // roleId -> Set(caps) while editing
  const [newName, setNewName] = useState("");
  const [savedFlash, setSavedFlash] = useState("");

  // Merge built-in defaults with stored docs so the screen is populated even
  // before anything is saved.
  const roles = useMemo(() => {
    const map = {};
    Object.entries(DEFAULT_ROLES).forEach(([id, r]) => { map[id] = { id, ...r }; });
    stored.forEach((r) => { map[r.id] = { id: r.id, name: r.name || r.id, builtin: !!r.builtin, capabilities: r.capabilities || [] }; });
    return Object.values(map).sort((a, b) => (b.builtin ? 1 : 0) - (a.builtin ? 1 : 0) || a.name.localeCompare(b.name));
  }, [stored]);

  const capsOf = (role) => draft[role.id] || new Set(role.id === ROLES.SUPER_ADMIN ? ALL_CAPS : role.capabilities);

  const toggle = (role, cap) => {
    if (role.id === ROLES.SUPER_ADMIN) return;     // protected
    setDraft((d) => {
      const cur = new Set(d[role.id] || role.capabilities);
      cur.has(cap) ? cur.delete(cap) : cur.add(cap);
      return { ...d, [role.id]: cur };
    });
  };

  const save = async (role) => {
    const caps = [...(draft[role.id] || new Set(role.capabilities))];
    await upsertDoc(COL.roles, role.id, { name: role.name, capabilities: caps, builtin: !!role.builtin });
    setDraft((d) => { const n = { ...d }; delete n[role.id]; return n; });
    setSavedFlash(role.id); setTimeout(() => setSavedFlash(""), 1200);
  };

  const addRole = async () => {
    const id = slug(newName);
    if (!id) return;
    await upsertDoc(COL.roles, id, { name: newName.trim(), capabilities: ["view_dashboard"], builtin: false });
    setNewName("");
  };

  const del = async (role) => {
    if (role.builtin) return;
    if (!window.confirm(`Delete role "${role.name}"? Users with this role lose access until reassigned.`)) return;
    await removeDoc(COL.roles, role.id);
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Roles &amp; Access</h1>
        <p className="text-xs text-slate-400">Define roles and grant function-wise access. Super Admin always has full access.</p>
      </div>

      {/* New role */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="grow"><label className="label">New role name</label>
          <input className="field" placeholder="e.g. Line Leader" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
        <button className="btn-primary disabled:opacity-40" onClick={addRole} disabled={!slug(newName)}>Create role</button>
      </div>

      {/* Matrix */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grid">
              <th className="sticky left-0 bg-card px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">Function</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-2 text-center">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-[10px] text-slate-500">{r.builtin ? "built-in" : "custom"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((grp) => (
              <FragmentGroup key={grp.group} group={grp} roles={roles} capsOf={capsOf} toggle={toggle} />
            ))}
            {/* Action row */}
            <tr className="border-t border-grid">
              <td className="sticky left-0 bg-card px-3 py-3 font-semibold">Save</td>
              {roles.map((r) => (
                <td key={r.id} className="px-3 py-3 text-center">
                  {r.id === ROLES.SUPER_ADMIN ? (
                    <span className="text-[11px] text-slate-500">all access</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <button className="btn-primary px-3 py-1 text-xs" onClick={() => save(r)}>
                        {savedFlash === r.id ? "Saved ✓" : (draft[r.id] ? "Save*" : "Save")}
                      </button>
                      {!r.builtin && <button className="text-[11px] text-bad underline" onClick={() => del(r)}>delete</button>}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Changes apply to users with that role the next time their session refreshes (usually immediately).</p>
    </div>
  );
}

function FragmentGroup({ group, roles, capsOf, toggle }) {
  return (
    <>
      <tr className="bg-bg/40">
        <td colSpan={roles.length + 1} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">{group.group}</td>
      </tr>
      {group.items.map((cap) => (
        <tr key={cap.key} className="border-b border-grid/40">
          <td className="sticky left-0 bg-card px-3 py-2">{cap.label}</td>
          {roles.map((r) => {
            const on = capsOf(r).has(cap.key);
            const locked = r.id === ROLES.SUPER_ADMIN;
            return (
              <td key={r.id} className="px-3 py-2 text-center">
                <input type="checkbox" checked={on} disabled={locked}
                  onChange={() => toggle(r, cap.key)} className="h-4 w-4 accent-info" />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
