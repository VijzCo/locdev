// src/lib/seed.js
// Writes a realistic demo dataset to Firestore so the dashboard renders fully.
import { upsertDoc } from "../firebase/db.js";
import { COL } from "../firebase/config.js";
import { distributeTargets, availableMinutes, dailyTarget } from "./calc.js";
import { DEFAULT_ROLES } from "./roles.js";

const today = () => new Date().toISOString().slice(0, 10);

const SLOTS = [
  ["H1", "08:00", "09:00", "Production"], ["H2", "09:00", "10:00", "Production"],
  ["Tea 1", "10:00", "10:15", "Break"], ["H3", "10:15", "11:15", "Production"],
  ["H4", "11:15", "12:15", "Production"], ["Lunch", "12:15", "13:00", "Break"],
  ["H5", "13:00", "14:00", "Production"], ["H6", "14:00", "15:00", "Production"],
  ["Tea 2", "15:00", "15:15", "Break"], ["H7", "15:15", "16:15", "Production"],
  ["H8", "16:15", "17:15", "Production"], ["OT1", "17:30", "18:30", "Overtime"],
];

export async function seedDemoData(onProgress = () => {}) {
  const date = today();

  // Roles (function-wise access defaults)
  for (const [id, r] of Object.entries(DEFAULT_ROLES)) {
    await upsertDoc(COL.roles, id, { name: r.name, capabilities: r.capabilities, builtin: true });
  }
  onProgress("Seeded roles");

  // Factories
  const factories = [
    { id: "fac_a", name: "Factory A", code: "FA", address: "Zone 1", status: "Active" },
    { id: "fac_b", name: "Factory B", code: "FB", address: "Zone 2", status: "Active" },
  ];
  for (const f of factories) await upsertDoc(COL.factories, f.id, f);
  onProgress("Factories");

  // Departments + sections (one Sewing dept per factory with two sections)
  for (const f of factories) {
    await upsertDoc(COL.departments, `dep_sew_${f.id}`, { code: "SEW", name: "Sewing", factoryId: f.id, status: "Active" });
    await upsertDoc(COL.departments, `dep_fin_${f.id}`, { code: "FIN", name: "Finishing", factoryId: f.id, status: "Active" });
    await upsertDoc(COL.departments, `dep_mtn_${f.id}`, { code: "MTN", name: "Maintenance", factoryId: f.id, status: "Active" });
    await upsertDoc(COL.departments, `dep_qa_${f.id}`, { code: "QA", name: "Quality", factoryId: f.id, status: "Active" });
    await upsertDoc(COL.sections, `sec_sewa_${f.id}`, { code: "SEW-A", name: "Sewing Line A", factoryId: f.id, departmentId: `dep_sew_${f.id}`, status: "Active" });
    await upsertDoc(COL.sections, `sec_sewb_${f.id}`, { code: "SEW-B", name: "Sewing Line B", factoryId: f.id, departmentId: `dep_sew_${f.id}`, status: "Active" });
  }
  onProgress("Departments & sections");

  // Downtime & Andon configuration (per factory)
  for (const f of factories) {
    const dep = { MC: `dep_mtn_${f.id}`, MT: `dep_sew_${f.id}`, MN: `dep_sew_${f.id}`, QC: `dep_qa_${f.id}` };
    const dCats = [["Machine", "MC"], ["Material", "MT"], ["Manpower", "MN"], ["Quality", "QC"]];
    for (const [name, code] of dCats) await upsertDoc(COL.downtimeCategories, `dc_${code}_${f.id}`, { name, code, factoryId: f.id, departmentId: dep[code], status: "Active" });
    const dReasons = [
      ["MC001", "Machine Breakdown", "MC"], ["MC002", "Needle Breakage", "MC"],
      ["MT001", "Fabric Not Available", "MT"], ["MN001", "Operator Absent", "MN"], ["QC001", "Quality Hold", "QC"],
    ];
    for (const [code, description, cc] of dReasons) await upsertDoc(COL.downtimeReasons, `dr_${code}_${f.id}`, { code, description, categoryId: `dc_${cc}_${f.id}`, factoryId: f.id, status: "Active" });
    const aDep = { MN: `dep_mtn_${f.id}`, QA: `dep_qa_${f.id}`, MA: `dep_sew_${f.id}` };
    const aCats = [["Maintenance", "MN"], ["Quality", "QA"], ["Material", "MA"]];
    for (const [name, code] of aCats) await upsertDoc(COL.andonCategories, `ac_${code}_${f.id}`, { name, code, factoryId: f.id, departmentId: aDep[code], status: "Active" });
    const aReasons = [["AN001", "Machine Assistance", "MN"], ["AN002", "Quality Assistance", "QA"], ["AN003", "Material Shortage", "MA"]];
    for (const [code, description, cc] of aReasons) await upsertDoc(COL.andonReasons, `ar_${code}_${f.id}`, { code, description, categoryId: `ac_${cc}_${f.id}`, factoryId: f.id, status: "Active" });
    await upsertDoc(COL.targets, `tgt_${f.id}`, { factoryId: f.id, departmentId: "", kind: "", attendTarget: 5, completeTarget: 15 });
  }
  onProgress("Downtime & Andon config");

  // Styles
  const styles = [
    { id: "sty_1", number: "ABC123", buyer: "H&M", productType: "T-Shirt", smv: 8.5, plannedEffPct: 70, status: "Active" },
    { id: "sty_2", number: "POL456", buyer: "Zara", productType: "Polo", smv: 12.2, plannedEffPct: 65, status: "Active" },
    { id: "sty_3", number: "JKT789", buyer: "Gap", productType: "Jacket", smv: 24.0, plannedEffPct: 55, status: "Active" },
  ];
  for (const s of styles) await upsertDoc(COL.styles, s.id, s);
  onProgress("Styles");

  // Shift + slots
  await upsertDoc(COL.shifts, "shift_a", { name: "Shift A", startTime: "08:00", endTime: "17:15" });
  const slotDocs = SLOTS.map(([name, startTime, endTime, slotType], i) => ({
    id: `slot_${i + 1}`, shiftId: "shift_a", name, startTime, endTime, slotType, order: i,
  }));
  for (const s of slotDocs) await upsertDoc(COL.shiftSlots, s.id, s);
  onProgress("Shift slots");

  const availMin = availableMinutes(slotDocs);

  // Modules + plans + production
  let m = 0;
  const modules = [];
  for (const fac of factories) {
    for (let i = 1; i <= 6; i++) {
      m += 1;
      const id = `mod_${fac.id}_${i}`;
      const number = `M${String(m).padStart(2, "0")}`;
      modules.push({ id, number, name: `Line ${number}`, factoryId: fac.id,
        departmentId: `dep_sew_${fac.id}`, sectionId: i <= 3 ? `sec_sewa_${fac.id}` : `sec_sewb_${fac.id}`,
        supervisor: "", floor: i <= 3 ? "Floor 1" : "Floor 2", status: "Active" });
    }
  }
  for (const mod of modules) await upsertDoc(COL.modules, mod.id, mod);
  onProgress("Modules");

  // Plans + simulated hourly production up to "now"
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  for (const mod of modules) {
    const style = styles[Math.floor(Math.random() * styles.length)];
    const team = 22 + Math.floor(Math.random() * 12);
    const target = dailyTarget({ availableMin: availMin, teamMembers: team, efficiencyPct: style.plannedEffPct, smv: style.smv });
    // Demonstrate the QCO attention-blink on one module.
    const mode = mod.number === modules[1]?.number ? "QCO" : "Production";
    await upsertDoc(COL.dailyPlans, `${date}_${mod.id}`, {
      date, factoryId: mod.factoryId, moduleId: mod.id, styleId: style.id, shiftId: "shift_a",
      smv: style.smv, plannedEffPct: style.plannedEffPct, teamCount: team, availableMin: availMin,
      mode, targetMode: "auto", dailyTarget: target,
    });
    await upsertDoc(COL.teamAllocations, `${date}_${mod.id}`, {
      date, factoryId: mod.factoryId, moduleId: mod.id, styleId: style.id, shiftId: "shift_a", teamCount: team,
    });

    const dist = distributeTargets(slotDocs, target);
    const perf = 0.7 + Math.random() * 0.45; // 70%–115% performer
    for (let i = 0; i < slotDocs.length; i++) {
      const slot = slotDocs[i];
      if (slot.slotType === "Break") continue;
      const endMin = Number(slot.endTime.slice(0, 2)) * 60 + Number(slot.endTime.slice(3));
      if (endMin > nowMin) continue; // only past slots have data
      const tgt = dist[i].target;
      const actual = Math.max(0, Math.round(tgt * (perf + (Math.random() - 0.5) * 0.2)));
      await upsertDoc(COL.hourlyProduction, `${date}_${mod.id}_${slot.id}`, {
        date, factoryId: mod.factoryId, moduleId: mod.id, slotId: slot.id,
        slotName: slot.name, slotType: slot.slotType, actualQty: actual, target: tgt,
      });
    }
  }
  onProgress("Production data");
  await upsertDoc(COL.settings, "system", { companyName: "Demo Garments Ltd", refreshSeconds: 30, seededAt: date });
  onProgress("Done");
}
