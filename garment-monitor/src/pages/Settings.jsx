// src/pages/Settings.jsx
import { useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { upsertDoc } from "../firebase/db.js";
import { seedDemoData } from "../lib/seed.js";

export default function Settings() {
  const settings = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const [form, setForm] = useState({ companyName: "", refreshSeconds: 30 });
  const [busy, setBusy] = useState("");
  const [log, setLog] = useState([]);

  const save = async () => {
    await upsertDoc(COL.settings, "system", {
      companyName: form.companyName || settings.companyName || "",
      companyDomain: (form.companyDomain ?? settings.companyDomain ?? "dutyfreesourcing.com").replace(/^@/, ""),
      refreshSeconds: Number(form.refreshSeconds) || 30,
      qcoBlinkEnabled: form.qcoBlinkEnabled ?? settings.qcoBlinkEnabled ?? true,
      qcoBlinkSeconds: Number(form.qcoBlinkSeconds ?? settings.qcoBlinkSeconds) || 2.6,
      downtimeCarryOver: form.downtimeCarryOver ?? settings.downtimeCarryOver ?? false,
    });
    setBusy("saved");
    setTimeout(() => setBusy(""), 1500);
  };

  const seed = async () => {
    if (!window.confirm("Load demo data into Firestore? This adds factories, modules, styles, a shift and today's production.")) return;
    setBusy("seeding"); setLog([]);
    try {
      await seedDemoData((step) => setLog((l) => [...l, step]));
      setBusy("seeded");
    } catch (e) {
      setLog((l) => [...l, "Error: " + e.message]);
      setBusy("");
    }
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">System Settings</h1>
        <p className="text-xs text-slate-400">Global configuration</p>
      </div>

      <div className="card max-w-lg space-y-4 p-5">
        <div>
          <label className="label">Company Name</label>
          <input className="field" defaultValue={settings.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </div>
        <div>
          <label className="label">Login domain (for username sign-in)</label>
          <input className="field" defaultValue={settings.companyDomain ?? "dutyfreesourcing.com"} onChange={(e) => setForm({ ...form, companyDomain: e.target.value })} placeholder="dutyfreesourcing.com" />
          <p className="mt-1 text-[11px] text-slate-500">Users sign in as <span className="font-mono">vijan.b</span> → <span className="font-mono">vijan.b@{form.companyDomain ?? settings.companyDomain ?? "dutyfreesourcing.com"}</span></p>
        </div>
        <div>
          <label className="label">Dashboard refresh (seconds)</label>
          <input type="number" className="field" defaultValue={settings.refreshSeconds ?? 30} onChange={(e) => setForm({ ...form, refreshSeconds: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <input id="qcoblink" type="checkbox"
            defaultChecked={settings.qcoBlinkEnabled ?? true}
            onChange={(e) => setForm({ ...form, qcoBlinkEnabled: e.target.checked })} />
          <label htmlFor="qcoblink" className="text-sm">Blink QCO modules on the board (slow fade)</label>
        </div>
        <div>
          <label className="label">QCO fade duration (seconds) — higher = slower</label>
          <input type="number" step="0.5" min="1" className="field"
            defaultValue={settings.qcoBlinkSeconds ?? 2.6}
            onChange={(e) => setForm({ ...form, qcoBlinkSeconds: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={save}>{busy === "saved" ? "Saved ✓" : "Save settings"}</button>
      </div>

      <div className="card max-w-lg space-y-3 p-5">
        <h2 className="font-bold">Downtime handling</h2>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1"
            defaultChecked={settings.downtimeCarryOver ?? false}
            onChange={(e) => setForm({ ...form, downtimeCarryOver: e.target.checked })} />
          <span className="text-sm">
            <span className="font-semibold">Carry open downtime into the next shift</span><br />
            <span className="text-slate-400">When a downtime is still open at shift end, continue it into the next shift <em>if that shift is allocated for the module</em>; otherwise the system auto-closes it at shift end. When unchecked, all open downtime is auto-closed at shift end.</span>
          </span>
        </label>
        <button className="btn-primary" onClick={save}>{busy === "saved" ? "Saved ✓" : "Save settings"}</button>
      </div>

      <div className="card max-w-lg space-y-3 p-5">
        <h2 className="font-bold">Demo data</h2>
        <p className="text-sm text-slate-400">
          Populate Firestore with 2 factories, 12 modules, styles, a full shift and simulated production
          for today, so you can see the board live before entering real data.
        </p>
        <button className="btn-ghost" onClick={seed} disabled={busy === "seeding"}>
          {busy === "seeding" ? "Loading…" : busy === "seeded" ? "Loaded ✓ — open the dashboard" : "Load demo data"}
        </button>
        {log.length > 0 && (
          <ul className="space-y-1 text-xs text-slate-400">
            {log.map((l, i) => <li key={i}>• {l}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
