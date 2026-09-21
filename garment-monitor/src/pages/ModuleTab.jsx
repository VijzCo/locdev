// src/pages/ModuleTab.jsx
// Public, login-less per-module tab for floor recorders.
//   • If no shift is allocated for the module/date → a clear notice to contact
//     the Production team (entry/config are not available).
//   • Entry view: slot-wise colored NUMBER TILES on one scrolling row; the live
//     slot only; CUMULATIVE add (5 then 10 → 15); past/future locked.
//   • A "⚙ Config" button opens a config panel pre-filled with the LAST DAY's
//     values: Style, TM count, SMV, Target qty. Date / Module / Shift are auto
//     and locked. Setting the target locks it — after that it can only be
//     changed from the system (Production) side.
//   • Live clock with seconds.
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { where, upsertDoc, createDoc, patchDoc } from "../firebase/db.js";
import { setAuditSource } from "../firebase/audit.js";
import { heartbeat, getMyDevice, getDeviceId } from "../lib/device.js";
import { nextRef, writeNotification, minutesBetween, escalation, getTarget, reconcileDowntime } from "../lib/downtime.js";
import { useAuth } from "../context/AuthContext.jsx";
import { can } from "../lib/roles.js";
import { toEmail, DEFAULT_DOMAIN } from "../lib/login.js";
import { distributeTargets, achievementPct, availableMinutes, dailyTarget } from "../lib/calc.js";
import { annotateSlots, to12h, nowMinutes, findActiveSlot, pickShiftByTime } from "../lib/time.js";

const today = () => new Date().toISOString().slice(0, 10);
const prodId = (date, m, s) => `${date}_${m}_${s}`;
const planId = (date, m) => `${date}_${m}`;
const clampInt = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

function useTicker(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((n) => n + 1), ms); return () => clearInterval(id); }, [ms]);
  return nowMinutes();
}

export default function ModuleTab() {
  const nowMin = useTicker(30000);
  useEffect(() => { setAuditSource("module-tab"); heartbeat(); return () => setAuditSource("app"); }, []);

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const appMode = params.get("app");                 // "downtime" → downtime-only app
  const downtimeOnly = appMode === "downtime";
  const isNative = Capacitor?.isNativePlatform?.() || false;
  const { user, login } = useAuth();
  const canConfig = can(user, "manage_devices");   // only these users set up / configure devices
  const [deviceModuleId, setDeviceModuleId] = useState("");
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);
  const urlModule = (params.get("module") || "").trim();
  const date = params.get("date") || today();
  // Effective "now" for slot state: live minutes today; a past date is fully
  // complete, a future date fully upcoming (so entry locks correctly).
  const effNow = date < today() ? 1440 : date > today() ? -1 : nowMin;

  const modules = useCollection(COL.modules, [], []).data;
  const styles = useCollection(COL.styles, [], []).data;
  const shiftsRaw = useCollection(COL.shifts, [], []).data;
  const slotsAll = useCollection(COL.shiftSlots, [], []).data;
  const plans = useCollection(COL.dailyPlans, [where("date", "==", date)], [date]).data;
  const production = useCollection(COL.hourlyProduction, [where("date", "==", date)], [date]).data;
  const dCats = useCollection(COL.downtimeCategories, [], []).data;
  const dReasons = useCollection(COL.downtimeReasons, [], []).data;
  const aCats = useCollection(COL.andonCategories, [], []).data;
  const aReasons = useCollection(COL.andonReasons, [], []).data;
  const departmentsAll = useCollection(COL.departments, [], []).data;
  const settingsDoc = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const targets = useCollection(COL.targets, [], []).data;

  // This device's assigned module (set by an admin in setup or Device Management).
  useEffect(() => {
    if (params.get("module")) { setDeviceLoaded(true); return; }
    getMyDevice().then((d) => { setDeviceModuleId(d?.moduleId || ""); setDeviceLoaded(true); })
      .catch(() => setDeviceLoaded(true));
  }, []);
  // Device setup (manage_devices only): assign this device to a module.
  const domain = settingsDoc.companyDomain || DEFAULT_DOMAIN;
  const [setupLogin, setSetupLogin] = useState({ user: "", pass: "", err: "", busy: false });
  const doSetupLogin = async () => {
    setSetupLogin((s) => ({ ...s, busy: true, err: "" }));
    try { await login(toEmail(setupLogin.user, domain), setupLogin.pass); setSetupLogin((s) => ({ ...s, busy: false, pass: "" })); }
    catch { setSetupLogin((s) => ({ ...s, busy: false, err: "Invalid username or password." })); }
  };
  const assignModule = async (m) => {
    try { await upsertDoc(COL.devices, getDeviceId(), { factoryId: m.factoryId, departmentId: m.departmentId || "", moduleId: m.id }); } catch { /* keep going */ }
    setDeviceModuleId(m.id);
    setForceSetup(false);
  };

  const styleById = useMemo(() => Object.fromEntries(styles.map((s) => [s.id, s])), [styles]);

  const mod = useMemo(() => {
    const k = urlModule.toLowerCase();
    if (k) return modules.find((m) => String(m.number).toLowerCase() === k) || modules.find((m) => m.id === urlModule) || null;
    if (deviceModuleId) return modules.find((m) => m.id === deviceModuleId) || null;
    return null;
  }, [modules, urlModule, deviceModuleId]);
  const moduleKey = urlModule || mod?.number || "";

  // all plans for this module (for "last day" defaults)
  const modAllPlans = useCollection(
    COL.dailyPlans, mod ? [where("moduleId", "==", mod.id)] : [where("moduleId", "==", "__none__")], [mod?.id]
  ).data;
  const myDowntimes = useCollection(COL.downtimes, mod ? [where("moduleId", "==", mod.id)] : [where("moduleId", "==", "__none__")], [mod?.id]).data;
  const myAndons = useCollection(COL.andons, mod ? [where("moduleId", "==", mod.id)] : [where("moduleId", "==", "__none__")], [mod?.id]).data;

  // Cross-shift downtime reconciliation for this module (carry over / auto-close).
  useEffect(() => {
    const run = () => {
      const carryOver = !!settingsDoc.downtimeCarryOver;
      myDowntimes.forEach((d) => {
        const patch = reconcileDowntime(d, { carryOver, slots: slotsAll, modulePlans: modAllPlans });
        if (!patch) return;
        const { __carry, ...p } = patch;
        patchDoc(COL.downtimes, d.id, p);
      });
    };
    run();
    const id = setInterval(run, 30000);
    return () => clearInterval(id);
  }, [myDowntimes, slotsAll, modAllPlans, settingsDoc.downtimeCarryOver]);
  const lastDayPlan = useMemo(() => {
    return modAllPlans.filter((p) => p.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  }, [modAllPlans, date]);

  const modPlans = useMemo(() => (mod ? plans.filter((p) => p.moduleId === mod.id) : []), [plans, mod]);
  const plan = useMemo(() => {
    if (modPlans.length <= 1) return modPlans[0] || null;
    const planShifts = shiftsRaw.filter((s) => modPlans.some((p) => p.shiftId === s.id));
    const pickId = pickShiftByTime(planShifts, slotsAll, effNow < 0 ? 0 : effNow);
    return modPlans.find((p) => p.shiftId === pickId) || modPlans[0];
  }, [modPlans, shiftsRaw, slotsAll, effNow]);

  const shiftAllocated = !!(plan && plan.shiftId);

  const slots = useMemo(() => {
    if (!plan) return [];
    const ordered = slotsAll.filter((s) => s.shiftId === plan.shiftId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return annotateSlots(ordered, effNow);
  }, [slotsAll, plan, effNow]);
  const prodSlots = useMemo(() => slots.filter((s) => s.slotType !== "Break"), [slots]);
  const dist = useMemo(() => distributeTargets(slots, plan?.dailyTarget || 0), [slots, plan]);
  const targetFor = (slot) => dist[slots.indexOf(slot)]?.target ?? 0;
  const availMin = useMemo(() => availableMinutes(slots), [slots]);

  const savedTotal = (slotId) => production.find((p) => p.moduleId === mod?.id && p.slotId === slotId)?.actualQty ?? 0;

  // live clock with seconds
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => { const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000); return () => clearInterval(id); }, []);

  // ---- entry (live slot only, cumulative) ----
  const activeSlot = useMemo(() => findActiveSlot(prodSlots, effNow), [prodSlots, effNow]);
  const locked = !activeSlot;
  const [entry, setEntry] = useState("");
  useEffect(() => { setEntry(""); }, [activeSlot?.id, mod?.id, date]);
  const [flash, setFlash] = useState(false);
  const persistTotal = async (slot, newTotal) => {
    await upsertDoc(COL.hourlyProduction, prodId(date, mod.id, slot.id), {
      date, factoryId: mod.factoryId, moduleId: mod.id, slotId: slot.id,
      slotName: slot.name, slotType: slot.slotType, actualQty: clampInt(newTotal), target: targetFor(slot),
    });
    setFlash(true); setTimeout(() => setFlash(false), 900);
  };
  const addQty = async () => {
    if (locked) return;
    const delta = clampInt(entry);
    if (delta <= 0) return;
    await persistTotal(activeSlot, savedTotal(activeSlot.id) + delta);
    setEntry("");
  };
  const press = (dch) => !locked && setEntry((e) => (e === "0" ? dch : (e + dch)).slice(0, 6));

  // ---- config panel ----
  const [showConfig, setShowConfig] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cfg, setCfg] = useState(null);

  // ---- open issues for this module + attend/complete/verify (login-less) ----
  const issues = useMemo(() => {
    const tag = (arr, col) => arr.map((i) => ({ ...i, _col: col }));
    return [...tag(myDowntimes, COL.downtimes), ...tag(myAndons, COL.andons)]
      .filter((i) => i.status !== "Verified")
      .sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1));
  }, [myDowntimes, myAndons]);
  const [showIssues, setShowIssues] = useState(false);
  const [act, setAct] = useState(null);
  const NEXT = { Raised: "attend", Attended: "complete", Completed: "verify" };
  const submitAct = async () => {
    if (!act) return;
    setAct((a) => ({ ...a, busy: true }));
    const at = new Date().toISOString();
    const it = act.item;
    let patch = {};
    if (act.stage === "attend") {
      patch = { status: "Attended", attendedByEpf: act.epf || "", attendedAt: at, timeToAttend: minutesBetween(it.raisedAt, at) };
    } else if (act.stage === "complete") {
      patch = { status: "Completed", completedByEpf: act.epf || "", completedAt: at,
        completionNotes: act.completionNotes || "", rootCause: act.rootCause || "", correctiveAction: act.correctiveAction || "",
        timeToComplete: minutesBetween(it.attendedAt, at), totalDowntime: minutesBetween(it.raisedAt, at) };
    } else {
      patch = { status: "Verified", verifiedByEpf: act.epf || "", verifiedAt: at,
        verificationNotes: act.verificationNotes || "", verificationTime: minutesBetween(it.completedAt, at),
        fullResolutionTime: minutesBetween(it.raisedAt, at) };
    }
    try {
      await patchDoc(it._col, it.id, patch);
      await writeNotification({ type: `${it.kind}_${patch.status.toLowerCase()}`, title: `${it.ref} ${patch.status}`,
        body: `${it.kind} ${patch.status.toLowerCase()} at module ${mod.number}`, factoryId: it.factoryId, refId: it.id, ref: it.ref, kind: it.kind });
      setAct(null);
    } catch { setAct((a) => ({ ...a, busy: false, err: true })); }
  };

  // ---- raise downtime / andon (login-less, from the floor) ----
  const [raise, setRaise] = useState(null); // null | { kind, departmentId, categoryId, reasonId, description, epf, busy, done }
  // Machine is "down" while a downtime is Raised or Attended (not yet Completed).
  const activeDowntime = useMemo(() => myDowntimes.find((d) => d.status === "Raised" || d.status === "Attended"), [myDowntimes]);
  const downtimeBlocked = downtimeOnly ? !!activeDowntime : (!shiftAllocated || !!activeDowntime);
  const downtimeBlockReason = (!shiftAllocated && !downtimeOnly)
    ? "Shift allocation not done — downtime can't be raised. Use Andon."
    : activeDowntime ? "A downtime is already active on this module. Use Andon for any further issue." : "";
  // Default to the Andon tab on the production app; the Downtime app defaults to downtime.
  const openRaise = () => setRaise({ kind: downtimeOnly ? "downtime" : "andon", departmentId: "", categoryId: "", reasonId: "", description: "", epf: "", busy: false, done: "" });
  const raiseDepts = departmentsAll.filter((d) => d.factoryId === mod?.factoryId && d.status !== "Inactive");
  const raiseCats = (raise?.kind === "andon" ? aCats : dCats).filter((c) =>
    c.factoryId === mod?.factoryId && c.status !== "Inactive" &&
    (!raise?.departmentId || !c.departmentId || c.departmentId === raise.departmentId));
  const raiseReasons = (raise?.kind === "andon" ? aReasons : dReasons).filter((r) => r.categoryId === raise?.categoryId && r.status !== "Inactive");
  const submitRaise = async () => {
    if (!mod || !raise?.categoryId) return;
    if (raise.kind === "downtime" && downtimeBlocked) return;
    setRaise((r) => ({ ...r, busy: true }));
    try {
      const prefix = raise.kind === "andon" ? "AN" : "DT";
      const ref = await nextRef(prefix);
      const id = await createDoc(raise.kind === "andon" ? COL.andons : COL.downtimes, {
        ref, kind: raise.kind, factoryId: mod.factoryId,
        departmentId: raise.departmentId || "", sectionId: mod.sectionId || "",
        moduleId: mod.id, shiftId: plan?.shiftId || "", date,
        categoryId: raise.categoryId, reasonId: raise.reasonId || "",
        description: raise.description || "", status: "Raised", raisedByEpf: raise.epf || "",
        raisedByName: raise.epf ? `EPF ${raise.epf}` : "Floor", raisedAt: new Date().toISOString(),
      });
      await writeNotification({ type: `${raise.kind}_raised`, title: `${prefix} raised: ${ref}`,
        body: `${raise.kind} raised at module ${mod.number}`, factoryId: mod.factoryId, refId: id, ref, kind: raise.kind });
      setRaise((r) => ({ ...r, busy: false, done: ref }));
    } catch (e) {
      setRaise((r) => ({ ...r, busy: false, done: "ERR" }));
    }
  };
  const targetLocked = !!plan?.targetLocked;
  const openConfig = () => {
    const src = plan || {};
    const ld = lastDayPlan || {};
    setCfg({
      styleId: src.styleId ?? ld.styleId ?? "",
      teamCount: src.teamCount ?? ld.teamCount ?? "",
      smv: src.smv ?? ld.smv ?? "",
      target: src.dailyTarget ?? ld.dailyTarget ?? "",
      mode: src.mode ?? "Production",
    });
    setShowConfig(true);
  };
  const setC = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const onCfgStyle = (styleId) => {
    const st = styleById[styleId];
    setCfg((c) => ({ ...c, styleId, smv: st?.smv ?? c.smv }));
  };
  const saveConfig = async (lock) => {
    if (!plan || !mod) return;
    const team = Math.max(0, Number(cfg.teamCount) || 0);
    const smv = Number(cfg.smv) || 0;
    const st = styleById[cfg.styleId];
    const eff = st?.plannedEffPct ?? plan.plannedEffPct ?? 75;
    const tgt = Math.max(0, Number(cfg.target) || 0);
    await upsertDoc(COL.dailyPlans, planId(date, mod.id), {
      date, factoryId: mod.factoryId, moduleId: mod.id, shiftId: plan.shiftId,
      styleId: cfg.styleId || "", smv, plannedEffPct: eff, teamCount: team,
      availableMin: availMin, mode: cfg.mode || "Production",
      targetMode: "manual", dailyTarget: tgt, targetLocked: lock ? true : (plan.targetLocked || false),
    });
    await upsertDoc(COL.teamAllocations, planId(date, mod.id), {
      date, factoryId: mod.factoryId, moduleId: mod.id, shiftId: plan.shiftId,
      styleId: cfg.styleId || "", teamCount: team,
    });
    if (lock) setShowConfig(false);
  };

  const setDate = (val) => { const next = new URLSearchParams(params); next.set("date", val); setParams(next, { replace: true }); };

  // ---- guards ----
  // Wait until we know the device's assignment and modules have loaded, so we
  // never flash the setup screen on an already-configured device.
  if ((!urlModule && !deviceLoaded) || modules.length === 0) return <Shell><Msg>Loading…</Msg></Shell>;
  const needsSetup = !urlModule && !deviceModuleId;       // truly unassigned device
  if (needsSetup || forceSetup) return (
    <Shell>
      <div className="mx-auto w-full max-w-md p-4">
        <div className="mb-4 text-center">
          <div className="text-xl font-extrabold">Device setup</div>
          <p className="text-sm text-slate-400">Assign this device to a module. Only authorised users (Manage Devices) can do this.</p>
        </div>

        {!canConfig ? (
          <div className="card space-y-3 p-5">
            <p className="text-sm text-slate-300">An administrator must sign in to set up this device.</p>
            <div>
              <label className="label">Username</label>
              <input className="field" value={setupLogin.user} autoCapitalize="none" autoCorrect="off"
                onChange={(e) => setSetupLogin((s) => ({ ...s, user: e.target.value }))} placeholder="e.g. vijan.b" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="field" type="password" value={setupLogin.pass}
                onChange={(e) => setSetupLogin((s) => ({ ...s, pass: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && doSetupLogin()} />
            </div>
            {setupLogin.err && <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{setupLogin.err}</p>}
            {user && !canConfig && <p className="rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">This account isn’t allowed to set up devices.</p>}
            <button className="btn-primary w-full" onClick={doSetupLogin} disabled={setupLogin.busy}>{setupLogin.busy ? "Signing in…" : "Sign in to set up"}</button>
          </div>
        ) : modules.length === 0 ? (
          <Msg>Loading modules…</Msg>
        ) : (
          <>
            <p className="mb-2 text-center text-xs text-slate-400">Signed in as {user?.email}. Choose the module for this device.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...modules].sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })).map((m) => (
                <button key={m.id} onClick={() => assignModule(m)}
                  className="rounded-xl border border-grid bg-card px-3 py-4 text-lg font-extrabold hover:border-info">{m.number}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
  if (!mod) return <Shell><Msg>This device’s module wasn’t found. {canConfig ? <button className="text-info underline" onClick={() => setForceSetup(true)}>Set up device</button> : "Contact an administrator."}</Msg></Shell>;

  const shiftName = shiftsRaw.find((s) => s.id === plan?.shiftId)?.name || "—";
  const dayTarget = plan?.dailyTarget || 0;
  const total = prodSlots.reduce((a, s) => a + savedTotal(s.id), 0);
  const ach = achievementPct(total, dayTarget);
  const liveTotal = activeSlot ? savedTotal(activeSlot.id) : 0;
  const liveTarget = activeSlot ? targetFor(activeSlot) : 0;
  const preview = liveTotal + clampInt(entry);

  const tileClass = (s) => {
    if (s.state === "future") return "bg-grid/30 text-slate-600";
    if (s.state === "active") return "bg-card text-ink ring-2 ring-info";
    const t = targetFor(s);
    return savedTotal(s.id) >= t && t > 0 ? "bg-ok text-[#06281d]" : "bg-bad text-[#2b0606]";
  };

  return (
    <Shell wide>
      {/* Slim header */}
      <div className="flex items-center justify-between border-b border-grid px-3 py-1.5">
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-2xl font-extrabold leading-none">{mod.number}</span>
          <span className="truncate text-xs text-slate-500">{mod.name}</span>
          {!downtimeOnly && <span className="hidden text-xs text-slate-500 sm:inline">· {shiftName}{plan?.mode === "QCO" && <b className="ml-1 text-warn">QCO</b>}</span>}
          {downtimeOnly && <span className="pill bg-warn/20 text-xs text-warn">Downtime</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot h-2 w-2 rounded-full bg-ok" />
          <span className="font-mono text-sm font-bold tabular-nums text-slate-300">{clock}</span>
          <button className="btn bg-grid/60 px-2.5 py-1 text-base leading-none hover:bg-grid" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">☰</button>
        </div>
      </div>
      {menuOpen && (
        <div className="flex flex-wrap justify-end gap-2 border-b border-grid bg-card/70 px-3 py-2">
          {isNative && <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={() => { setMenuOpen(false); navigate("/device?pick=1"); }}>⌂ Home</button>}
          {downtimeOnly && <button className="btn bg-bad/80 text-xs font-bold text-white hover:bg-bad" onClick={() => { setMenuOpen(false); openRaise(); }}>⚠ Raise</button>}
          {downtimeOnly && <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={() => { setMenuOpen(false); setShowIssues(true); }}>🛠 Issues {issues.length > 0 ? `(${issues.length})` : ""}</button>}
          {canConfig && shiftAllocated && !downtimeOnly && (
            <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={() => { setMenuOpen(false); showConfig ? setShowConfig(false) : openConfig(); }}>
              ⚙ {showConfig ? "Close config" : "Config"}
            </button>
          )}
        </div>
      )}

      {/* body */}
      {downtimeOnly ? (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <button className="btn w-full bg-bad py-4 text-lg font-extrabold text-white hover:bg-bad/90" onClick={openRaise}>⚠ Raise Downtime / Andon</button>
          <div className="card p-4">
            <div className="mb-2 text-sm font-bold">Open issues at {mod.number} ({issues.length})</div>
            {issues.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No open issues. 👍</p>}
            <div className="space-y-2">
              {issues.map((i) => {
                const stage = NEXT[i.status];
                return (
                  <div key={i.id} className="flex items-center justify-between rounded-xl border border-grid bg-bg p-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-400">{i.ref} · <span className="capitalize">{i.kind}</span></div>
                      <div className="font-semibold">{i.status}</div>
                    </div>
                    {stage && (
                      <button className="btn-primary px-3 py-1.5 text-sm capitalize"
                        onClick={() => setAct({ item: i, stage, epf: "", completionNotes: "", rootCause: "", correctiveAction: "", verificationNotes: "", busy: false })}>{stage}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : !shiftAllocated ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="card p-10 text-center">
            <div className="text-lg font-bold text-warn">Shift allocation not done</div>
            <p className="mt-2 text-sm text-slate-400">Please contact the Production Team.</p>
          </div>
        </div>
      ) : showConfig ? (
        /* ---- CONFIG PANEL ---- */
        <div className="card m-3 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Daily configuration</h2>
            {targetLocked && <span className="pill bg-ok/20 text-ok">Target locked</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* auto / locked context */}
            <Field label="Date (auto)"><div className="field flex h-9 items-center bg-bg/60">{date}</div></Field>
            <Field label="Module (auto)"><div className="field flex h-9 items-center bg-bg/60 font-mono">{mod.number}</div></Field>
            <Field label="Shift (blocked)"><div className="field flex h-9 items-center bg-bg/60">{shiftName}</div></Field>

            <Field label="Style">
              <select className="field h-9" disabled={targetLocked} value={cfg.styleId} onChange={(e) => onCfgStyle(e.target.value)}>
                <option value="">Select…</option>
                {styles.map((s) => <option key={s.id} value={s.id}>{s.number} — {s.buyer}</option>)}
              </select>
            </Field>
            <Field label="TM count">
              <input type="number" min="0" className="field h-9" disabled={targetLocked}
                value={cfg.teamCount} onChange={(e) => setC("teamCount", e.target.value)} />
            </Field>
            <Field label="SMV">
              <input type="number" step="0.01" min="0" className="field h-9" disabled={targetLocked}
                value={cfg.smv} onChange={(e) => setC("smv", e.target.value)} />
            </Field>
            <Field label="Target qty">
              <input type="number" min="0" className={"field h-9 font-mono font-bold " + (targetLocked ? "" : "text-info")}
                disabled={targetLocked} value={cfg.target} onChange={(e) => setC("target", e.target.value)} />
            </Field>
            <Field label="Mode">
              <select className={"field h-9 " + (cfg.mode === "QCO" ? "text-warn" : "")} disabled={targetLocked}
                value={cfg.mode} onChange={(e) => setC("mode", e.target.value)}>
                <option value="Production">Production</option>
                <option value="QCO">QCO (change-over)</option>
              </select>
            </Field>
            {lastDayPlan && (
              <div className="self-end text-xs text-slate-500">
                Last day ({lastDayPlan.date}): tgt <b className="font-mono text-slate-300">{(lastDayPlan.dailyTarget || 0).toLocaleString()}</b>, team{" "}
                <b className="font-mono text-slate-300">{lastDayPlan.teamCount ?? "—"}</b>
              </div>
            )}
          </div>

          {targetLocked ? (
            <p className="mt-4 text-sm text-slate-400">
              Target is locked. It can now only be changed from the system by the Production team.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn bg-grid/60 hover:bg-grid" onClick={() => saveConfig(false)}>Save (unlocked)</button>
              <button className="btn-primary" onClick={() => saveConfig(true)}>Set target &amp; lock</button>
              <button className="btn bg-grid/40 hover:bg-grid" onClick={() => setShowConfig(false)}>Close</button>
            </div>
          )}
        </div>
      ) : (
        /* ---- ENTRY VIEW (full-space tablet layout) ---- */
        <div className="grid min-h-0 flex-1 gap-2 p-2 lg:grid-cols-2">
          {/* LEFT COLUMN — divided vertically */}
          <div className="flex min-h-0 flex-col gap-2">
            {/* Module Display — embedded live TV view */}
            <div className="card min-h-0 flex-1 overflow-hidden p-0">
              <iframe title="Module display"
                src={`https://dfs-promis.web.app/module/tv?module=${encodeURIComponent(mod.number)}&embed=1`}
                className="h-full w-full border-0" />
            </div>

            {/* reserved feature icons (disabled) */}
            <div className="card flex shrink-0 items-center justify-around gap-2 overflow-hidden p-2">
              {[["◬", "Downtime"], ["✓", "Quality"], ["◫", "Carton"], ["▤", "Reports"]].map(([ic, lbl]) => (
                <div key={lbl} className="flex cursor-not-allowed flex-col items-center justify-center rounded-xl border border-grid bg-bg/40 px-4 py-2 opacity-40">
                  <span className="text-xl">{ic}</span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: big keypad */}
          <div className="flex min-h-0 flex-col gap-2">
            <div className={"flex items-center justify-end gap-3 rounded-xl bg-card px-4 py-3 " + (locked ? "opacity-40" : "")}>
              {activeSlot && <span className="text-xs text-slate-500">{activeSlot.name} · live {liveTotal}</span>}
              <span className="font-mono text-4xl font-extrabold tabular-nums">{entry === "" ? "0" : entry}</span>
              {clampInt(entry) > 0 && activeSlot && <span className="font-mono text-base text-info">→ {preview}</span>}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button key={n} onClick={() => press(n)} disabled={locked}
                  className="rounded-2xl bg-info text-4xl font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-30">{n}</button>
              ))}
              <button onClick={() => setEntry((e) => e.slice(0, -1))} disabled={locked}
                className="flex items-center justify-center rounded-2xl bg-bad text-3xl font-extrabold text-white transition active:scale-95 disabled:opacity-30">⌫</button>
              <button onClick={() => press("0")} disabled={locked}
                className="rounded-2xl bg-info text-4xl font-extrabold text-white transition active:scale-95 disabled:opacity-30">0</button>
              <button onClick={addQty} disabled={locked || clampInt(entry) <= 0}
                className="rounded-2xl bg-ok text-2xl font-extrabold text-[#06281d] transition active:scale-95 disabled:opacity-30">OK</button>
            </div>
            {locked && <p className="text-center text-[11px] text-slate-500">Entry opens during the live hour only.</p>}
          </div>
        </div>
      )}

      {showIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowIssues(false)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Issues · {mod.number}</h2>
              <button className="text-sm text-slate-400" onClick={() => setShowIssues(false)}>✕</button>
            </div>
            {issues.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No open issues. 👍</p>}
            <div className="space-y-2">
              {issues.map((i) => {
                const esc = escalation(i, getTarget(targets, i.kind, i.factoryId, i.departmentId));
                const stage = NEXT[i.status];
                return (
                  <div key={i.id} className="rounded-xl border border-grid bg-bg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-slate-400">{i.ref} · <span className="capitalize">{i.kind}</span></div>
                        <div className="font-semibold">{i.status}</div>
                        {i.description && <div className="truncate text-xs text-slate-500">{i.description}</div>}
                      </div>
                      <div className={"text-right text-xs " + (esc.color === "bad" ? "text-bad" : esc.color === "warn" ? "text-warn" : "text-ok")}>
                        {i.status === "Completed" ? "awaiting verify" : `${esc.elapsed ?? 0}m`}
                      </div>
                    </div>
                    {stage && (
                      <button className="btn-primary mt-2 w-full py-2 text-sm capitalize"
                        onClick={() => { setShowIssues(false); setAct({ item: i, stage, epf: "", completionNotes: "", rootCause: "", correctiveAction: "", verificationNotes: "", busy: false }); }}>
                        {stage}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {act && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setAct(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold capitalize">{act.stage} · {act.item.ref}</h2>
            {act.stage === "attend" && (
              <Field label="Your EPF Number"><input className="field" value={act.epf} onChange={(e) => setAct((a) => ({ ...a, epf: e.target.value }))} inputMode="numeric" /></Field>
            )}
            {act.stage === "complete" && <>
              <Field label="Completion Notes"><textarea className="field" rows={2} value={act.completionNotes} onChange={(e) => setAct((a) => ({ ...a, completionNotes: e.target.value }))} /></Field>
              <Field label="Root Cause"><input className="field" value={act.rootCause} onChange={(e) => setAct((a) => ({ ...a, rootCause: e.target.value }))} /></Field>
              <Field label="Corrective Action"><input className="field" value={act.correctiveAction} onChange={(e) => setAct((a) => ({ ...a, correctiveAction: e.target.value }))} /></Field>
              <Field label="Your EPF (optional)"><input className="field" value={act.epf} onChange={(e) => setAct((a) => ({ ...a, epf: e.target.value }))} inputMode="numeric" /></Field>
            </>}
            {act.stage === "verify" && (
              <Field label="Verification Notes"><textarea className="field" rows={2} value={act.verificationNotes} onChange={(e) => setAct((a) => ({ ...a, verificationNotes: e.target.value }))} /></Field>
            )}
            {act.err && <p className="mt-2 text-xs text-bad">Could not save. Please try again.</p>}
            <div className="mt-4 flex gap-2">
              <button className="btn flex-1 bg-grid/60 hover:bg-grid" onClick={() => setAct(null)} disabled={act.busy}>Cancel</button>
              <button className="btn-primary flex-1 capitalize disabled:opacity-40" onClick={submitAct} disabled={act.busy || (act.stage === "attend" && !act.epf)}>{act.busy ? "Saving…" : act.stage}</button>
            </div>
          </div>
        </div>
      )}

      {raise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setRaise(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            {raise.done && raise.done !== "ERR" ? (
              <div className="text-center">
                <div className="text-4xl">✅</div>
                <div className="mt-2 text-lg font-bold text-ok">Raised</div>
                <div className="font-mono text-sm text-slate-300">{raise.done}</div>
                <p className="mt-1 text-xs text-slate-400">The team has been notified.</p>
                <button className="btn-primary mt-4 w-full" onClick={() => setRaise(null)}>Done</button>
              </div>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-bold">Raise at module {mod.number}</h2>
                <div className="mb-2 flex gap-2">
                  {["downtime", "andon"].map((k) => {
                    const disabled = k === "downtime" && downtimeBlocked;
                    return (
                      <button key={k} disabled={disabled}
                        onClick={() => setRaise((r) => ({ ...r, kind: k, categoryId: "", reasonId: "" }))}
                        className={"flex-1 rounded-lg px-3 py-2 text-sm font-bold capitalize " + (raise.kind === k ? "bg-info text-white" : "bg-grid/50 text-slate-300") + (disabled ? " cursor-not-allowed opacity-40" : "")}>{k}</button>
                    );
                  })}
                </div>
                {downtimeBlocked && <p className="mb-3 rounded-lg bg-warn/15 px-3 py-2 text-xs text-warn">{downtimeBlockReason}</p>}
                <label className="label">Responsible Department</label>
                <select className="field" value={raise.departmentId} onChange={(e) => setRaise((r) => ({ ...r, departmentId: e.target.value, categoryId: "", reasonId: "" }))}>
                  <option value="">Select department…</option>{raiseDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <label className="label mt-2">Category</label>
                <select className="field disabled:opacity-50" disabled={!raise.departmentId} value={raise.categoryId} onChange={(e) => setRaise((r) => ({ ...r, categoryId: e.target.value, reasonId: "" }))}>
                  <option value="">{raise.departmentId ? "Select…" : "Pick a department first"}</option>{raiseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <label className="label mt-2">Reason</label>
                <select className="field" value={raise.reasonId} onChange={(e) => setRaise((r) => ({ ...r, reasonId: e.target.value }))}>
                  <option value="">Select…</option>{raiseReasons.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.description}</option>)}
                </select>
                <label className="label mt-2">Description (optional)</label>
                <textarea className="field" rows={2} value={raise.description} onChange={(e) => setRaise((r) => ({ ...r, description: e.target.value }))} />
                <label className="label mt-2">Your EPF (optional)</label>
                <input className="field" value={raise.epf} onChange={(e) => setRaise((r) => ({ ...r, epf: e.target.value }))} inputMode="numeric" />
                {raise.done === "ERR" && <p className="mt-2 text-xs text-bad">Could not raise. Please try again.</p>}
                <div className="mt-4 flex gap-2">
                  <button className="btn flex-1 bg-grid/60 hover:bg-grid" onClick={() => setRaise(null)} disabled={raise.busy}>Cancel</button>
                  <button className="btn-primary flex-1 disabled:opacity-40" onClick={submitRaise} disabled={raise.busy || !raise.categoryId || (raise.kind === "downtime" && downtimeBlocked)}>{raise.busy ? "Raising…" : "Raise"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, wide }) {
  return <div className={"w-full bg-bg text-ink " + (wide ? "flex h-screen flex-col overflow-hidden" : "mx-auto min-h-screen max-w-lg")}>{children}</div>;
}
function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function Msg({ children }) { return <div className="card m-3 p-8 text-center text-sm text-slate-400">{children}</div>; }
function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Stat({ label, value, accent }) {
  const c = accent === "ok" ? "text-ok" : accent === "warn" ? "text-warn" : accent === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-lg bg-bg py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={"font-mono text-lg font-bold " + c}>{value}</div>
    </div>
  );
}
function Key({ children, onClick, tone, disabled }) {
  const base = "h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 ";
  const cls = tone === "muted" ? "bg-grid/40 text-slate-300 active:bg-grid" : "bg-grid/70 text-ink active:bg-info/30";
  return <button onClick={onClick} disabled={disabled} className={base + cls}>{children}</button>;
}
