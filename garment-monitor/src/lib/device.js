// src/lib/device.js
// Each device gets a persistent id used for the audit trail and the device
// registry. On the web this is a localStorage UUID; inside the Capacitor APK
// we upgrade it to the native install id + real model string via initDevice().
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { db, COL } from "../firebase/config.js";

const ID_KEY = "promis_device_id";
const LABEL_KEY = "promis_device_label";
const PLAT_KEY = "promis_device_platform";

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDeviceId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id); }
  return id;
}
export function getDeviceLabel() { return localStorage.getItem(LABEL_KEY) || ""; }
export function setDeviceLabel(v) { localStorage.setItem(LABEL_KEY, v || ""); heartbeat({ name: v || "" }); }

function platformHint() {
  const stored = localStorage.getItem(PLAT_KEY);
  if (stored) return stored;
  const ua = navigator.userAgent || "";
  const m = ua.match(/\(([^)]+)\)/);
  return (m ? m[1] : ua).slice(0, 80);
}

// Called once at startup. On a native device, adopt the stable install id and a
// real model string; on web it's a no-op beyond the heartbeat.
export async function initDevice() {
  try {
    if (Capacitor?.isNativePlatform?.()) {
      const { identifier } = await Device.getId();
      if (identifier) localStorage.setItem(ID_KEY, identifier);
      const info = await Device.getInfo();
      const label = `${info.manufacturer || ""} ${info.model || ""} · ${info.operatingSystem} ${info.osVersion}`.replace(/\s+/g, " ").trim();
      if (label) localStorage.setItem(PLAT_KEY, label);
    }
  } catch { /* never block startup */ }
  return heartbeat({ native: Capacitor?.isNativePlatform?.() || false });
}

// Lightweight presence ping — raw merge write, NOT audited (would flood the log).
export async function heartbeat(extra = {}) {
  const id = getDeviceId();
  try {
    await setDoc(doc(db, COL.devices, id), {
      deviceId: id,
      name: getDeviceLabel() || undefined,
      platform: platformHint(),
      lastActive: serverTimestamp(),
      lastActiveAt: new Date().toISOString(),
      ...extra,
    }, { merge: true });
  } catch { /* device tracking must never block the page */ }
  return id;
}

export async function getMyDevice() {
  try {
    const snap = await getDoc(doc(db, COL.devices, getDeviceId()));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}
