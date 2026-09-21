// src/firebase/audit.js
// Lightweight, append-only audit trail. Every create/save/update/delete that
// goes through the db helpers records an entry here, tagged with who did it,
// when, which collection/doc, and a trimmed snapshot of the data so the Audit
// Log page can filter by user, action, entity, factory, module and date.
//
// Entries are written with a raw addDoc (NOT the instrumented helpers) so we
// never recurse. The auditLogs collection itself is excluded from logging.
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth, COL } from "./config.js";
import { getDeviceId, getDeviceLabel } from "../lib/device.js";

// Pages can tag where an action came from (defaults to "app").
let SOURCE = "app";
export function setAuditSource(src) { SOURCE = src || "app"; }

const SKIP = new Set([COL.auditLogs, COL.reports, COL.devices]);

const trim = (data) => {
  if (data == null) return "";
  try {
    const clean = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "function") continue;
      clean[k] = v;
    }
    let s = JSON.stringify(clean);
    if (s.length > 600) s = s.slice(0, 600) + "…";
    return s;
  } catch { return ""; }
};

export async function writeAudit(action, col, docId, data) {
  if (SKIP.has(col)) return;                       // never log the log
  const u = auth.currentUser;
  try {
    await addDoc(collection(db, COL.auditLogs), {
      ts: serverTimestamp(),
      at: new Date().toISOString(),               // client time for sort/filter
      action,                                       // create | save | update | delete
      collection: col,
      docId: docId || "",
      actorUid: u?.uid || "",
      actorEmail: u?.email || "",
      deviceId: getDeviceId(),
      deviceLabel: getDeviceLabel(),
      source: u ? SOURCE : "public",                // unauthenticated = public tab
      factoryId: data?.factoryId || "",
      moduleId: data?.moduleId || "",
      summary: `${action} · ${col}${docId ? " · " + docId : ""}`,
      data: trim(data),
    });
  } catch {
    // Auditing must never break the underlying operation — swallow errors.
  }
}
