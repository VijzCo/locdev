/**
 * ontrack.ts — PROMIS → OnTrack integration (client-to-client, no backend).
 *
 * PROMIS is a browser-only Firebase app. OnTrack is a SEPARATE browser-only Firebase app.
 * This file spins up a SECOND, named Firebase app inside PROMIS that points at OnTrack,
 * signs in as a dedicated OnTrack user (`promis-sync@...`), and reads/writes OnTrack's
 * Firestore directly — gated by OnTrack's security rules. No Admin SDK, no service-account
 * key, no server.
 *
 * Shared key = `poId` (OnTrack's order id). It travels in payloads only and is never shown
 * to PROMIS users — display the STYLE instead.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────────
 * 1. In OnTrack's Firebase project, create an Auth user (Authentication → Add user),
 *    e.g. promis-sync@dfs.co with a strong password. OnTrack's rules already let this
 *    identity write `productionProgress` and read `outbox` — and nothing else.
 * 2. Add these to PROMIS's .env (OnTrack's PUBLIC web config + the sync login):
 *
 *      VITE_ONTRACK_API_KEY=...
 *      VITE_ONTRACK_AUTH_DOMAIN=...            # e.g. ontrack-xxxx.firebaseapp.com
 *      VITE_ONTRACK_PROJECT_ID=...
 *      VITE_ONTRACK_STORAGE_BUCKET=...
 *      VITE_ONTRACK_SENDER_ID=...
 *      VITE_ONTRACK_APP_ID=...
 *      VITE_ONTRACK_SYNC_EMAIL=promis-sync@dfs.co
 *      VITE_ONTRACK_SYNC_PASSWORD=...
 *
 * 3. Import and use the functions below from PROMIS code (see examples at the bottom).
 * ───────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, type Auth } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs, onSnapshot,
  doc, setDoc, serverTimestamp, type Firestore,
} from "firebase/firestore";

const APP_NAME = "ontrack"; // named app so it never clashes with PROMIS's default app

const ontrackConfig = {
  apiKey: import.meta.env.VITE_ONTRACK_API_KEY as string,
  authDomain: import.meta.env.VITE_ONTRACK_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_ONTRACK_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_ONTRACK_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_ONTRACK_SENDER_ID as string,
  appId: import.meta.env.VITE_ONTRACK_APP_ID as string,
};

// Reuse the app if it already exists (hot-reload / repeated imports safe).
const ontrackApp: FirebaseApp =
  getApps().find((a) => a.name === APP_NAME) ?? initializeApp(ontrackConfig, APP_NAME);

export const ontrackAuth: Auth = getAuth(ontrackApp);
export const ontrackDb: Firestore = getFirestore(ontrackApp);

// Sign in once; cache the promise so concurrent callers share a single login.
let signInPromise: Promise<unknown> | null = null;
export function ontrackReady(): Promise<unknown> {
  if (ontrackAuth.currentUser) return Promise.resolve();
  if (!signInPromise) {
    signInPromise = signInWithEmailAndPassword(
      ontrackAuth,
      import.meta.env.VITE_ONTRACK_SYNC_EMAIL as string,
      import.meta.env.VITE_ONTRACK_SYNC_PASSWORD as string,
    ).catch((e) => { signInPromise = null; throw e; });
  }
  return signInPromise;
}

// ── Types ──────────────────────────────────────────────────────────────────────

/** An order OnTrack has queued for production (Flow 1). PROMIS shows style/qty/target. */
export interface OutboxOrder {
  poId: string;        // shared key — store HIDDEN, do not display
  styleNo: string;
  styleName: string;
  colour: string;
  plannedQty: number;
  targetDate: string;  // YYYY-MM-DD
  unit: string;
  channel: string;
  status: "pending" | "cancelled";
  updatedAt: number;
}

/** Production progress PROMIS sends back to OnTrack (Flow 2). Facts only — no prediction. */
export interface ProgressUpdate {
  poId: string;                 // echo the value received in the outbox
  producedQty: number;          // CUMULATIVE good output to date (not per-day)
  dailyProduction?: number;     // recent actual units/day (optional; improves the forecast)
  currentOperation?: string;    // e.g. "Sewing"
  productionStartDate?: string; // YYYY-MM-DD
  status: "in_production" | "completed";
  completionDate?: string;      // YYYY-MM-DD — set when the PO is completed
}

// ── Flow 1: read orders from OnTrack ─────────────────────────────────────────────

/** One-shot: fetch all pending orders. Handle each, then call markOrderSynced(poId). */
export async function pullOrders(): Promise<OutboxOrder[]> {
  await ontrackReady();
  const snap = await getDocs(query(collection(ontrackDb, "outbox"), where("status", "==", "pending")));
  return snap.docs.map((d) => d.data() as OutboxOrder);
}

/**
 * Live: subscribe to pending orders. `handler` is called with the current pending set
 * whenever it changes. Returns an unsubscribe function.
 */
export function watchOrders(handler: (orders: OutboxOrder[]) => void): () => void {
  let unsub = () => {};
  ontrackReady().then(() => {
    unsub = onSnapshot(
      query(collection(ontrackDb, "outbox"), where("status", "==", "pending")),
      (snap) => handler(snap.docs.map((d) => d.data() as OutboxOrder)),
      (err) => console.error("[ontrack] watchOrders error:", err),
    );
  });
  return () => unsub();
}

/** Mark an order as consumed so it won't be picked up again. */
export async function markOrderSynced(poId: string): Promise<void> {
  await ontrackReady();
  await setDoc(doc(ontrackDb, "outbox", poId), { syncedAt: Date.now() }, { merge: true });
}

// ── Flow 2: write production progress to OnTrack ─────────────────────────────────

/**
 * Upsert production progress for one PO. Call this right after PROMIS saves a production
 * update to its own Firestore. Idempotent (keyed on poId); safe to call repeatedly.
 */
export async function pushProgress(p: ProgressUpdate): Promise<void> {
  await ontrackReady();
  const payload: Record<string, unknown> = {
    poId: p.poId,
    producedQty: p.producedQty,
    status: p.status,
    updatedAt: Date.now(),          // MUST increase each write — OnTrack detects new data by this
    updatedAtServer: serverTimestamp(),
  };
  if (p.dailyProduction !== undefined) payload.dailyProduction = p.dailyProduction;
  if (p.currentOperation !== undefined) payload.currentOperation = p.currentOperation;
  if (p.productionStartDate !== undefined) payload.productionStartDate = p.productionStartDate;
  if (p.completionDate !== undefined) payload.completionDate = p.completionDate;

  await setDoc(doc(ontrackDb, "productionProgress", p.poId), payload, { merge: true });
}

/* ── Usage examples ───────────────────────────────────────────────────────────────

// A) When PROMIS starts / on a screen that lists production orders:
import { watchOrders, markOrderSynced } from "./ontrack";

const stop = watchOrders(async (orders) => {
  for (const o of orders) {
    await upsertPromisStyle(o);       // your code: create/update the style keyed on o.poId (hidden)
    await markOrderSynced(o.poId);    // don't fetch it again
  }
});
// call stop() on unmount

// B) Inside your existing "save production update" handler:
import { pushProgress } from "./ontrack";

await savePromisProductionUpdate(record);   // your existing Firestore write
await pushProgress({
  poId: record.poId,
  producedQty: record.cumulativeGoodOutput,
  dailyProduction: record.lastDayOutput,
  currentOperation: record.operation,
  productionStartDate: record.startDate,     // "YYYY-MM-DD"
  status: record.isDone ? "completed" : "in_production",
  completionDate: record.isDone ? record.completedOn : undefined,
});

──────────────────────────────────────────────────────────────────────────────── */
