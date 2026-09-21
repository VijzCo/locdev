// src/pages/Shifts.jsx
import { useMemo, useState } from "react";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { createDoc, patchDoc, removeDoc } from "../firebase/db.js";
import { to12h, slotDuration } from "../lib/time.js";
import { availableMinutes, breakMinutes, PRODUCTION, BREAK, OVERTIME } from "../lib/calc.js";

const SLOT_TYPES = [PRODUCTION, BREAK, OVERTIME];
const typeColor = { Production: "bg-ok/20 text-ok", Break: "bg-slate-500/20 text-slate-300", Overtime: "bg-info/20 text-info" };

export default function Shifts() {
  const shifts = useCollection(COL.shifts, [], []).data;
  const allSlots = useCollection(COL.shiftSlots, [], []).data;
  const [sel, setSel] = useState(null);
  const [shiftForm, setShiftForm] = useState(null);
  const [slotForm, setSlotForm] = useState(null);

  const current = sel || shifts[0]?.id;
  const slots = useMemo(
    () => allSlots.filter((s) => s.shiftId === current).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allSlots, current]
  );

  const saveShift = async () => {
    const { id, ...v } = shiftForm;
    if (id) await patchDoc(COL.shifts, id, v);
    else { const nid = await createDoc(COL.shifts, v); setSel(nid); }
    setShiftForm(null);
  };
  const saveSlot = async () => {
    const { id, ...v } = slotForm;
    v.shiftId = current;
    v.order = Number(v.order) || slots.length;
    if (id) await patchDoc(COL.shiftSlots, id, v);
    else await createDoc(COL.shiftSlots, v);
    setSlotForm(null);
  };

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Shifts &amp; Slots</h1>
          <p className="text-xs text-slate-400">Define shifts and their hourly / break / overtime slots</p>
        </div>
        <button className="btn-primary" onClick={() => setShiftForm({ name: "", startTime: "08:00", endTime: "17:00" })}>+ Shift</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        {/* Shift list */}
        <div className="card divide-y divide-grid/60">
          {shifts.length === 0 && <p className="p-4 text-sm text-slate-500">No shifts yet.</p>}
          {shifts.map((s) => (
            <button key={s.id} onClick={() => setSel(s.id)}
              className={"flex w-full items-center justify-between px-4 py-3 text-left text-sm " + (current === s.id ? "bg-info/10" : "hover:bg-grid/20")}>
              <span>
                <span className="font-semibold">{s.name}</span>
                <span className="block text-xs text-slate-400">{to12h(s.startTime)} – {to12h(s.endTime)}</span>
              </span>
              <span className="text-xs text-slate-500" onClick={(e) => { e.stopPropagation(); setShiftForm(s); }}>✎</span>
            </button>
          ))}
        </div>

        {/* Slots */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid px-4 py-3">
            <div className="flex gap-3 text-sm">
              <span className="text-slate-400">Working: <b className="font-mono text-ok">{availableMinutes(slots)}m</b></span>
              <span className="text-slate-400">Break: <b className="font-mono text-slate-300">{breakMinutes(slots)}m</b></span>
              <span className="text-slate-400">Slots: <b className="font-mono">{slots.length}</b></span>
            </div>
            <button className="btn-primary" disabled={!current}
              onClick={() => setSlotForm({ name: "", startTime: "", endTime: "", slotType: PRODUCTION, order: slots.length })}>
              + Slot
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-grid text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">#</th><th className="px-3 py-2">Slot</th><th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Mins</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s.id} className="border-b border-grid/50">
                  <td className="px-3 py-2 font-mono text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-slate-300">{to12h(s.startTime)}–{to12h(s.endTime)}</td>
                  <td className="px-3 py-2 font-mono">{slotDuration(s)}</td>
                  <td className="px-3 py-2"><span className={"pill " + typeColor[s.slotType]}>{s.slotType}</span></td>
                  <td className="px-3 py-2 text-right">
                    <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => setSlotForm(s)}>Edit</button>
                    <button className="btn-danger px-2 py-1 text-xs" onClick={() => window.confirm("Delete slot?") && removeDoc(COL.shiftSlots, s.id)}>Del</button>
                  </td>
                </tr>
              ))}
              {slots.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-slate-500">No slots. Add H1, breaks, etc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {shiftForm && (
        <Modal title="Shift" onClose={() => setShiftForm(null)} onSave={saveShift}>
          <Field label="Shift Name"><input className="field" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} /></Field>
          <Field label="Start"><input type="time" className="field" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></Field>
          <Field label="End"><input type="time" className="field" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></Field>
        </Modal>
      )}
      {slotForm && (
        <Modal title="Slot" onClose={() => setSlotForm(null)} onSave={saveSlot}>
          <Field label="Slot Name"><input className="field" placeholder="H1 / Tea Break / OT1" value={slotForm.name} onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })} /></Field>
          <Field label="Order"><input type="number" className="field" value={slotForm.order} onChange={(e) => setSlotForm({ ...slotForm, order: e.target.value })} /></Field>
          <Field label="Start"><input type="time" className="field" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} /></Field>
          <Field label="End"><input type="time" className="field" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} /></Field>
          <Field label="Type">
            <select className="field" value={slotForm.slotType} onChange={(e) => setSlotForm({ ...slotForm, slotType: e.target.value })}>
              {SLOT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Modal({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        <div className="grid grid-cols-2 gap-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
