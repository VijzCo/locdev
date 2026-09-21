// src/hooks/useDashboardData.js
import { useEffect, useMemo, useState } from "react";
import { where } from "../firebase/db.js";
import { COL } from "../firebase/config.js";
import { useCollection } from "./useCollection.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";
import {
  availableMinutes, breakMinutes, dailyTarget, distributeTargets,
  achievementPct, efficiencyPct, rollupKpis,
} from "../lib/calc.js";
import { annotateSlots, nowMinutes, pickShiftByTime } from "../lib/time.js";
import { cellColor } from "../lib/colors.js";

/** Ticks every `ms` so time-dependent UI (active slot, KPIs) auto-refreshes. */
function useTicker(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return nowMinutes();
}

export function useDashboardData({ date, factoryId, shiftId, floor, moduleId, publicView = false }) {
  const { user } = useAuth();
  const liveNow = useTicker(30000);
  // Slot state must reflect the VIEWED date, not just the clock: a past date is
  // fully complete (all slots "past" → colored by actual vs target); a future
  // date is all upcoming; today uses the live clock.
  const todayStr = new Date().toISOString().slice(0, 10);
  const current = date < todayStr ? 1440 : date > todayStr ? -1 : liveNow;

  const factories = useCollection(COL.factories, [], []).data;
  const modulesRaw = useCollection(COL.modules, [], []).data;
  const styles = useCollection(COL.styles, [], []).data;
  const shifts = useCollection(COL.shifts, [], []).data;
  const slotsRaw = useCollection(COL.shiftSlots, [], []).data;
  const plans = useCollection(
    COL.dailyPlans, [where("date", "==", date)], [date]
  ).data;
  const production = useCollection(
    COL.hourlyProduction, [where("date", "==", date)], [date]
  ).data;

  const styleById = useMemo(
    () => Object.fromEntries(styles.map((s) => [s.id, s])), [styles]
  );

  // Slots for the chosen shift, ordered.
  const shiftSlots = useMemo(() => {
    const eff = shiftId || pickShiftByTime(shifts, slotsRaw, current) || shifts[0]?.id;
    return slotsRaw
      .filter((s) => s.shiftId === eff)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [slotsRaw, shiftId, shifts, current]);

  const annotated = useMemo(
    () => annotateSlots(shiftSlots, current), [shiftSlots, current]
  );

  // Modules in scope after role + filters.
  const modules = useMemo(() => {
    // Public display pages have no signed-in user: show all modules
    // (optionally narrowed by the factory/floor/module filters below).
    let m = publicView ? modulesRaw : scopeFactories(user, modulesRaw, "factoryId");
    if (factoryId) m = m.filter((x) => x.factoryId === factoryId);
    if (floor) m = m.filter((x) => String(x.floor) === String(floor));
    if (moduleId) m = m.filter((x) => x.id === moduleId);
    return m
      .filter((x) => x.status !== "Inactive")
      .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  }, [modulesRaw, user, factoryId, floor, moduleId, publicView]);

  // Build one board row per module.
  const rows = useMemo(() => {
    return modules.map((mod) => {
      const plan = plans.find((p) => p.moduleId === mod.id);
      const style = plan ? styleById[plan.styleId] : null;
      const availMin = availableMinutes(annotated);
      const team = plan?.teamCount || 0;
      const smv = plan?.smv || style?.smv || 0;
      const effPct = plan?.plannedEffPct ?? style?.plannedEffPct ?? 0;
      const target =
        plan?.dailyTarget ??
        dailyTarget({ availableMin: availMin, teamMembers: team, efficiencyPct: effPct, smv });

      const dist = distributeTargets(annotated, target);
      const cells = annotated.map((slot, i) => {
        const prod = production.find(
          (pr) => pr.moduleId === mod.id && pr.slotId === slot.id
        );
        const actual = prod?.actualQty ?? null;
        const t = dist[i]?.target ?? 0;
        return {
          slotId: slot.id,
          slotName: slot.name,
          slotType: slot.slotType,
          state: slot.state,
          target: t,
          actual,
          color: cellColor({ actual: actual ?? 0, plan: t, slotType: slot.slotType, state: slot.state }),
          hasData: actual != null,
        };
      });

      const actualTotal = cells.reduce((a, c) => a + (c.actual || 0), 0);
      const overtime = production
        .filter((pr) => pr.moduleId === mod.id)
        .reduce((a, pr) => {
          const s = annotated.find((x) => x.id === pr.slotId);
          return a + (s?.slotType === "Overtime" ? pr.actualQty || 0 : 0);
        }, 0);

      return {
        moduleId: mod.id,
        moduleNumber: mod.number,
        moduleName: mod.name,
        factoryId: mod.factoryId,
        floor: mod.floor,
        styleNumber: style?.number || "—",
        buyer: style?.buyer || "—",
        teamCount: team,
        mode: plan?.mode || "Production",
        smv,
        target,
        actual: actualTotal,
        overtime,
        achievement: achievementPct(actualTotal, target),
        efficiency: efficiencyPct({ actual: actualTotal, smv, availableMin: availMin, teamMembers: team }),
        cells,
      };
    });
  }, [modules, plans, production, annotated, styleById]);

  const kpis = useMemo(() => {
    const base = rollupKpis(rows);
    const availMin = availableMinutes(annotated);
    const totalManMin = rows.reduce((a, r) => a + availMin * r.teamCount, 0);
    const producedMin = rows.reduce((a, r) => a + r.actual * r.smv, 0);
    base.efficiency = totalManMin ? Math.round((producedMin / totalManMin) * 100) : 0;
    base.factories = factoryId ? 1 : new Set(rows.map((r) => r.factoryId)).size || factories.length;
    return base;
  }, [rows, annotated, factories, factoryId]);

  // Alerts derived from board state.
  const alerts = useMemo(() => {
    const out = [];
    rows.forEach((r) => {
      const pastWithData = r.cells.filter((c) => c.state === "past" && c.slotType === "Production");
      const noUpdate = pastWithData.length > 0 && pastWithData.every((c) => !c.hasData);
      if (noUpdate) out.push({ level: "bad", module: r.moduleNumber, msg: "No production update" });
      else if (r.target > 0 && r.achievement < 80)
        out.push({ level: "bad", module: r.moduleNumber, msg: `Behind plan — ${r.achievement}%` });
      else if (r.target > 0 && r.achievement < 100)
        out.push({ level: "warn", module: r.moduleNumber, msg: `Achievement ${r.achievement}%` });
      if (r.target > 0 && r.efficiency > 0 && r.efficiency < 40)
        out.push({ level: "warn", module: r.moduleNumber, msg: `Low efficiency ${r.efficiency}%` });
    });
    return out;
  }, [rows]);

  return {
    current, factories, shifts, slots: annotated, modules,
    rows, kpis, alerts,
    breakMin: breakMinutes(annotated),
    availMin: availableMinutes(annotated),
  };
}
