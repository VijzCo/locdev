# Garment Production Tracking System
## Phase 02–05: Finalised Requirements, Architecture & Data Model

**Status:** Awaiting approval before implementation (Phase 07)
**Version:** 1.0

---

# PART A — DECISIONS LOCKED

| # | Decision | Outcome |
|---|---|---|
| Q1 | Colour | Colour is a first-class field on PO lines and bundles, but a bundle is **always single-colour**. No colour-splitting logic. Colour appears on the label and in all filters/reports. |
| Q2 | Bundle quantity | **Fixed** once created. Default **25**, operator-enterable per bundle-generation run. OUT quantity always equals IN quantity in MVP. |
| Q3 | Bundle splitting | **Not supported.** |
| Q4 | Tracking scope | Ends at **Sewing OUT** for MVP. Stage list is config-driven, so Finishing / Packing / RM-IN can be switched on later with no schema change. |
| Q5 | Routing | Fixed sequence per style — see open item **O1** below. |
| Q6 | Scanning | **Both IN and OUT** required at every tracked module. |
| Q7 | Rework | **Not supported.** A bundle never re-enters a module it has left. |
| Q8 | Hourly production | **Derived automatically from OUT scans.** No manual hourly entry in MVP. |
| Q9 | SMV | **One SMV per style.** Optional override on the daily plan. No per-stage SMV. |
| Q10 | WIP unit | **Pieces.** Bundle count is displayed alongside it at no extra cost. |
| Q11 | Network | **Unreliable — offline-first is mandatory.** This is the single most architecturally significant answer. |
| Q12 | Accounts | Admin creates accounts directly (client-side secondary-app method). Access control extends to module-level and scan-direction-level (IN-only / OUT-only / both). |
| Q13 | Scale | Unknown / configurable. Design assumes 1–10 factories, 10–100 modules, 2k–20k bundle movements per day, and must not degrade badly outside that. |

## A2 — Commercial requirements (added)

The system is now a **product sold to factories**, not a single-factory installation. This changes the tenancy model and the role hierarchy.

| # | Requirement | Outcome |
|---|---|---|
| C1 | Vendor super admin | **You** hold a cross-tenant `VENDOR_ADMIN` role. It is not visible or grantable inside any customer's application. |
| C2 | Customer admin | Each customer gets `SYSTEM_ADMIN` — full control of their own tenant, no visibility of any other tenant, no ability to alter their own licence. |
| C3 | Trial mode | New tenants start on a time-limited trial with configurable limits. |
| C4 | Purchase & activation | Trial converts to a paid licence, activated by you. |
| C5 | Billing cycle | Monthly or yearly terms, with expiry and renewal handling. |

See **Part K** for the full design and **Part B6** for the one thing this constraint cannot do.

---

# PART B — ISSUES FOUND IN THE ORIGINAL SPECIFICATION

## B1. Target formula double-counts operators — **must fix**

Section 18 of the brief states:

```
Available Minutes = Total production minutes × number of operators
Target Quantity   = Operators × Available Minutes × Planned Efficiency % / SMV
```

Substituting the first line into the second gives `Operators² × Minutes × Eff / SMV`. A 30-operator module would show a target 30× too high.

**Corrected and adopted:**

```
Available Minutes = Σ(production slot durations)          // per operator, excludes breaks
Operator Minutes  = Available Minutes × Operators
Target Quantity   = (Operator Minutes × Planned Efficiency %) / SMV
Efficiency %      = (Actual Qty × SMV) / Operator Minutes × 100
```

The Section 19 efficiency formula was already correct under this reading. Both now share the single `operatorMinutes` term, so target and efficiency are mathematically consistent: producing exactly the target always yields exactly the planned efficiency.

## B2. WIP colour bands overlapped

Section 12 defined green as `Min ≤ WIP ≤ Max`; Section 13's example (Min 50, Reorder 100, Normal 100–200, Max 250) left 50–99 in both green and yellow.

**Adopted band logic** (thresholds fully configurable, evaluated in this order):

| Condition | Status |
|---|---|
| Module inactive, or no daily plan for today | ⚪ GREY |
| `pieces > max` | 🔴 RED — over WIP |
| `pieces >= reorder` | 🟢 GREEN — normal |
| `pieces >= min` | 🟡 YELLOW — reorder soon |
| `pieces < min` | ⚪ GREY — critically low |

Note that both "no plan" and "critically low" resolve to grey but carry different `reason` codes, so the UI can label them differently.

## B3. "Bundle has not already entered this module" vs. rework

Resolved by Q7: no rework in MVP, so the strict rule stands. The validation is nonetheless implemented as *"no open IN without a matching OUT"* rather than *"never visited"*, because that is the form that stays correct when rework is enabled later.

## B4. Transactions cannot run offline — **resolved, see Part D**

`runTransaction()` requires a live server round-trip and **fails when offline**. Section 35's demand for transactions and Section 30's demand for offline scanning are directly incompatible as written. The resolution is atomic **write batches** plus commutative counter increments, which do queue offline. This is the core of the design.

## B5. Time-of-day enforcement in Security Rules

Firestore Rules can access `request.time` but cannot do IANA timezone conversion or overnight-shift arithmetic. Rules therefore enforce *scope* (factory / department / module / direction / role); *time-slot* restrictions are enforced in the app and made auditable by stamping every scan with both client time and server time. Any violation is detectable in the audit report even though it is not blocked at the database layer. This is a deliberate, documented trade-off.

## B6. Licensing splits into two problems with very different answers

**Enforcement is solvable and strong.** Rules can compare `request.time` against an expiry timestamp on a licence document that only you can write. A customer cannot edit their own licence, cannot patch the client to extend it, and cannot bypass it by calling the API directly — the database itself refuses the write. This is real enforcement, not an honour system.

**Payment confirmation is not solvable without a server.** Stripe, PayPal and every other processor confirm payment via a webhook to an endpoint you control. With no Cloud Functions there is no endpoint, so nothing can automatically flip a tenant from trial to paid. The options are manual activation by you, or one small Cloud Function.

At the customer counts a system like this realistically reaches in year one, manual activation is not a meaningful burden — see **K6**.

---

# PART C — BUSINESS RULES & STATE MACHINE

## C1. Bundle lifecycle

```
                 generate bundles
                        │
                        ▼
                    CREATED ──────────────┐
                        │ scan IN         │ cancel
                        ▼                 ▼
                   IN_MODULE ─────────► CANCELLED
                        │ scan OUT
                        ▼
                    BETWEEN ──── scan IN at next stage ──► IN_MODULE
                        │
                        │ OUT at final tracked stage
                        ▼
                   COMPLETED
```

**States:** `CREATED`, `IN_MODULE`, `BETWEEN`, `COMPLETED`, `CANCELLED`, `LOST`

**Invariants:**

1. A bundle has at most one open IN (an IN with no matching OUT) at any time. This is what makes "a bundle cannot be in two modules" true.
2. `scanEvents` are immutable and never deleted. Corrections are new compensating events with `type: CORRECTION` and a supervisor reference.
3. Quantity is conserved: bundle quantity is set at creation and never changes.
4. `Σ(bundle quantities for a PO line) === PO line order quantity`, always. Enforced at generation.

## C2. Bundle generation

Input: PO line (style, colour, size, order qty) + bundle qty.

```
fullBundles   = floor(orderQty / bundleQty)
remainder     = orderQty % bundleQty
totalBundles  = fullBundles + (remainder > 0 ? 1 : 0)
```

Worked example from the brief: `1030 / 20` → 51 full bundles of 20 (= 1020) + 1 partial bundle of 10 = **52 bundles, 1030 pieces**. (The brief's own example said "51 × 20 + 1 × 10 = 1030", which is 1030 but only if 51 full bundles is read as 51 — it is, and 51×20+10 = 1030. Confirmed correct.)

Generation runs as a single batched write; if the batch fails, no bundles are created. Re-running generation for a PO line that already has bundles is blocked unless the previous set is cancelled.

## C3. Scan validation order

Every scan runs these checks in order, failing fast with a specific message:

| # | Check | Failure message |
|---|---|---|
| 1 | Barcode resolves to a bundle | "Barcode not found." |
| 2 | Bundle not cancelled/lost | "Bundle B00123 was cancelled." |
| 3 | User has this module in scope | "You do not have permission to record production for Module 04." |
| 4 | User has this direction (IN/OUT) | "You are not authorised to scan OUT at this station." |
| 5 | Current slot is a production slot and module is open | "Production entry is closed for the current time slot." |
| 6 | *(IN)* Bundle has no open IN | "Bundle B00123 is already inside Module 03." |
| 7 | *(IN)* This module is the next stage on the route | "Bundle B00123 must complete Cutting before Sewing." |
| 8 | *(OUT)* Bundle's open IN is at this module | "Bundle B00123 is not inside this module." |
| 9 | Duplicate — identical scan already recorded | "Bundle B00123 has already been scanned OUT here at 11:30." |

Checks 1–9 run locally against cached data (works offline). Checks 3, 4, 6, 7, 8, 9 are **re-enforced server-side by Security Rules** when the write syncs.

## C4. Duplicate prevention — the deterministic ID

Because there is no rework and no splitting, the tuple `(bundleId, moduleId, direction)` occurs **exactly once** in the entire life of a bundle. That tuple therefore *is* the document ID:

```
scanEvents/{bundleId}__{moduleId}__{IN|OUT}
```

Consequences:

- A duplicate scan writes to the same document ID. Rules allow `create` only, never `update` — so the second write is rejected server-side. Not "usually" rejected: **structurally impossible** to double-count.
- Two operators scanning the same bundle at the same instant produce the same ID; one wins, one is rejected.
- A scan replayed after a reconnect is the same document — idempotent by construction.
- No sequence numbers, no server-generated IDs, no read-before-write. This is what makes offline scanning safe.

---

# PART D — OFFLINE-FIRST SCAN ARCHITECTURE

This section exists because of Q11. It is the part of the system most likely to be got wrong.

## D1. Why not transactions

| Approach | Works offline? | Atomic? | Verdict |
|---|---|---|---|
| `runTransaction()` | **No** — throws when offline | Yes | Rejected |
| Sequential `setDoc()` calls | Yes | **No** — partial state on failure | Rejected |
| `writeBatch()` | **Yes** — queues offline | Yes | **Adopted** |

Write batches are atomic, are validated by Security Rules on arrival, and are held in the SDK's persistence layer while offline. Rules can validate across documents inside a batch using `getAfter()`, which gives cross-document consistency without a transaction.

## D2. The scan batch

Every scan is one batch containing four writes:

```ts
batch.set(scanEventRef, event)                    // create-only, deterministic ID
batch.update(bundleRef, { currentModuleId, status, lastScanAt })
batch.set(moduleWipRef,  { pieces: increment(±qty), bundles: increment(±1) }, { merge: true })
batch.set(hourlySlotRef, { pieces: increment(qty)  }, { merge: true })   // OUT only
```

`increment()` is **commutative** — it carries the delta, not the result. Ten scans made offline on three tablets apply in any order and land on the correct total. This is why WIP counters remain accurate under unreliable connectivity, and why dashboards can read one small counter document per module instead of listening to hundreds of bundle documents.

The hourly slot document ID is `{moduleId}_{yyyyMMdd}_{slotIndex}`, bucketed by the **client-recorded scan time**, not sync time. A scan taken at 09:15 and synced at 11:00 lands in the 09:00 slot where it belongs.

## D3. The outbox

Firestore's own queue is not sufficient on its own: while offline the write promise never settles, and a rules rejection silently rolls the local write back. Section 30 says a scan must never be silently lost, so the app maintains its own **outbox in IndexedDB**:

```
scan → write to outbox (PENDING) → optimistic UI → commit batch
                                                       │
                          ┌────────────────────────────┼──────────────┐
                          ▼                            ▼              ▼
                      ACKNOWLEDGED                 REJECTED         still PENDING
                    (remove from outbox)      (surface to operator)  (retry w/ backoff)
```

The scan screen shows a persistent counter: **"3 scans pending sync."** Rejected scans open a review queue showing bundle, module, time and reason. Nothing is ever discarded without the operator seeing it.

Firestore's built-in offline persistence stays enabled for **reads**, so bundle lookup and validation work with no connection.

## D4. What offline genuinely costs you

Stated plainly, because it should not be discovered during a factory trial:

- **Feedback is delayed, not absent.** An offline scan that violates a rule (unauthorised module, bundle already elsewhere) is accepted locally and rejected on reconnect. The operator learns minutes later, not instantly. Server-side correctness is never compromised; operator-side immediacy is.
- **Cross-station conflicts are possible while partitioned.** Two disconnected stations can both accept an IN for the same bundle. On sync, the deterministic ID and rules reject one. The reconciliation report lists these.
- **Clock skew.** Slot bucketing uses device time. Every event stores `clientTime` and `serverTime`; the health screen flags devices whose skew exceeds a configurable tolerance.
- **A device that never reconnects holds its scans hostage.** The outbox counter and an "oldest pending scan" age indicator make this visible to supervisors.

## D5. Aggregate reconciliation

`scanEvents` is the immutable source of truth; counters are a fast projection. A **Reconcile** function (admin-triggered, and offered automatically when drift is suspected) recomputes WIP and hourly totals for a date range directly from `scanEvents` and reports any divergence before applying corrections. Without Cloud Functions this cannot be scheduled server-side; it is a manual/on-open operation. Documented as a known limitation.

## D6. Historical WIP snapshots

WIP reports (average / max / min / over-WIP periods) need a time series, but counters only hold *current* values and there is no server-side scheduler.

Approach: any online dashboard client writes `wipSnapshots/{moduleId}_{yyyyMMddHH}` on the hour — a deterministic ID, so concurrent writers are harmless and it costs one small write per module per hour. If no client is online for an hour, that snapshot is missing; the report falls back to reconstructing from `scanEvents` for the affected window, which is slower but exact. Limitation documented.

---

# PART E — CONFIGURATION ARCHITECTURE

You asked for everything possible to be configurable, at global and factory level. This is the mechanism.

## E1. Resolution chain

Every configurable value resolves through one service, `resolveConfig(key, context)`, walking from most specific to least:

```
module + style  →  module  →  section  →  department  →  style  →  factory  →  global (system default)
```

The first layer that defines the key wins. Every resolved value carries provenance, so the admin UI can show **"Max WIP = 250 — inherited from Factory"** with a button to override at the current level. No value is ever hardcoded in a component; there is no fallback path that bypasses this function.

## E2. Configurable surface

| Group | Keys |
|---|---|
| **Bundles & barcode** | Default bundle qty (25), barcode format template, ID padding, label size, label fields, logo, reprint policy |
| **Routing** | Stage list & order, routing enforcement mode, IN/OUT requirement per stage, final tracked stage |
| **WIP** | min, reorder, max, unit display (pieces/bundles/both), band colours |
| **Targets** | Planned efficiency %, achievement thresholds (green/yellow/red), efficiency thresholds |
| **Time** | Factory IANA timezone, date & time format, week start, shift definitions, slot definitions, break flags, per-slot targets |
| **Access** | Role→capability matrix, module access windows, scan-direction rules, supervisor override policy |
| **Dashboards** | Wall display rotation interval, modules per screen, refresh behaviour, visible metrics |
| **Alerts** | Which alerts are enabled, thresholds, mute windows |
| **System** | Company name, currency, clock-skew tolerance, outbox retry policy |

Barcode format is a template string — `{PO}-{STYLE}-{COLOR}-{SIZE}-B{SEQ:4}` — validated for uniqueness and printable-length at save time. The **encoded** barcode payload remains the bundle ID alone; the template governs the human-readable line.

## E3. Admin screens

- **Global Settings** — system defaults, applies to all factories
- **Factory Settings** — per factory, with an inheritance indicator on every field
- **Scoped Overrides** — a single table of department / section / module / style overrides, filterable, showing exactly which keys are overridden where
- **Shifts & Slots** — visual timeline editor with overnight-shift support
- **Routing** — stage sequence per style, with a validity check
- **Roles & Capabilities** — editable matrix
- **Users** — see Part F

---

# PART F — SECURITY & USER MANAGEMENT

## F1. Access model

The `users/{uid}` document is the authority:

```ts
{
  uid, displayName, email,
  tenantId: string,            // never editable by the customer
  role: 'SYSTEM_ADMIN'|'ADMIN'|'MANAGER'|'SUPERVISOR'|'OPERATOR'|'VIEWER',
  disabled: boolean,
  scope: {
    factoryIds: string[],
    departmentIds: string[],   // empty = all within factory scope
    sectionIds: string[],
    moduleIds: string[],
    shiftIds: string[],
  },
  scanAccess: 'IN' | 'OUT' | 'BOTH' | 'NONE',
  capabilities: string[],      // overrides derived from role
}
```

Rules read this document to authorise every write. It is cached per request by Firestore, so the cost is one read per rule evaluation chain, not per condition.

`VENDOR_ADMIN` deliberately does **not** appear in this enum. If it were a value in the tenant role field, any customer admin who could edit user roles could grant it to themselves. It lives in a separate collection that no tenant user can read or write — see **K2**.

## F2. Creating users without Cloud Functions (Q12 = A)

The admin app initialises a **secondary Firebase App instance**, calls `createUserWithEmailAndPassword` on it, writes the `users/{uid}` profile, then discards the secondary app. The admin's own session is untouched.

Constraints this imposes, all worth knowing before you commit:

1. **Email/password sign-up must stay enabled** in Firebase Auth, so anyone could in principle create an Auth account. Mitigation: Rules deny *everything* to any UID without an admin-created `users/{uid}` document. A self-registrant gets an account that can read and write nothing.
2. **Accounts cannot be truly deleted or disabled** from the client. `disabled: true` in the profile is enforced by Rules as a global deny — functionally equivalent for data access, but the Auth credential still exists.
3. **Passwords cannot be set by the admin after creation** — only reset by email.
4. **Operators often have no email.** Recommended pattern: synthetic addresses such as `m01.operator@northfield.local`, which are never delivered to and exist only as login identifiers.

If (2) or (3) is unacceptable in practice, the minimal fix is a single Cloud Function for user administration — a small, contained exception to the no-backend constraint. Flagging it now rather than at delivery.

## F3. Rules structure

- Deny by default at the root.
- `isActiveUser()` — profile exists and `disabled != true`.
- `inScope(factoryId, moduleId)` — scope containment check.
- `scanEvents` — `create` only. No `update`, no `delete`, ever. Validates direction access, module scope, and (via `getAfter()`) that the accompanying bundle update is consistent with the event.
- `bundles` — updates restricted to movement fields, and only within a batch containing a valid scan event.
- Counter documents — writable only with a delta matching the referenced bundle's quantity.
- `auditLogs` — create only, never readable by non-admins.
- Master data & config — role-gated writes, factory-scoped reads.

---

# PART G — FIRESTORE DATA MODEL

Collections are top-level with denormalised `factoryId` on every document, which keeps rules simple and enables collection-group queries where useful.

Every document additionally carries `tenantId`. Rules check it on every read and write, which is what keeps one customer's data invisible to another.

| Collection | Doc ID | Purpose | Key fields |
|---|---|---|---|
| `vendorAdmins` | uid | Cross-tenant vendor access | grantedAt, grantedBy |
| `tenants` | auto | Customer organisation | name, country, contact, createdAt, status |
| `licenses` | `{tenantId}` | **Vendor-writable only** | plan, status, startsAt, expiresAt, graceUntil, limits, billingCycle |
| `licenseEvents` | auto | Immutable licence history | tenantId, action, before, after, byUid, at |
| `globalSettings` | `system` | Tier-1 config | one document |
| `factories` | auto | Factory + tier-2 config | name, timezone, config |
| `departments` / `sections` / `modules` | auto | Hierarchy | factoryId, parentId, name, code, active, operatorCount |
| `configOverrides` | `{scope}_{scopeId}` | Tier-3 overrides | scope, scopeId, factoryId, values |
| `users` | uid | Identity & access | see F1 |
| `roles` | role code | Capability matrix | capabilities[] |
| `styles` | auto | Style master | code, description, smv, colours[], sizes[], routeStages[] |
| `purchaseOrders` | auto | PO header | poNumber, buyer, factoryId, status, dates |
| `poLines` | auto | Style × colour × size × qty | poId, styleId, colour, size, orderQty, bundleQty, bundlesGenerated |
| `bundles` | `{barcodeId}` | Bundle master + current state | poId, poLineId, styleId, colour, size, qty, seq, status, currentModuleId, currentStage, timestamps |
| `scanEvents` | `{bundleId}__{moduleId}__{DIR}` | **Immutable ledger** | bundleId, moduleId, direction, qty, userId, shiftId, slotIndex, clientTime, serverTime |
| `moduleWip` | `{moduleId}` | Live counters | pieces, bundles, updatedAt |
| `hourlyProduction` | `{moduleId}_{date}_{slot}` | Output per slot | pieces, bundles, target |
| `wipSnapshots` | `{moduleId}_{yyyyMMddHH}` | Historical WIP | pieces, bundles |
| `dailyPlans` | `{moduleId}_{date}_{shiftId}` | Plan & target | styleId, poId, operators, smv, plannedEff, targetQty |
| `shifts` / `shiftSlots` | auto | Time structure | factoryId, start, end, crossesMidnight, slots[] |
| `auditLogs` | auto | Change trail | userId, action, entity, before, after, at |
| `notifications` | auto | In-app alerts | type, severity, scope, read |

**Deliberately omitted** from the brief's list: `productionOrders` (poLines covers it), `sizes` (an array on style), `productionEntries` (scanEvents is the ledger), `bundleTransactions` (same), `forecasts` (computed, never stored), `reports` (computed).

**Composite indexes required:** `bundles(factoryId, currentModuleId, status)`, `bundles(poLineId, seq)`, `scanEvents(moduleId, serverTime desc)`, `scanEvents(bundleId, serverTime)`, `hourlyProduction(factoryId, date)`, `dailyPlans(factoryId, date)`.

**Cost profile.** A wall display covering 20 modules listens to 20 `moduleWip` docs + 20 `hourlyProduction` docs + 20 `dailyPlans` = 60 documents on load, then only deltas. Not 20 × 200 bundle documents. At 20k movements/day the dominant cost is writes (4 per scan × 2 scans per bundle), which stays comfortably inside a low-cost tier.

---

# PART H — CALCULATION ENGINE

One module, `src/lib/calc/`, pure functions, no Firestore imports, fully unit-tested. Nothing anywhere else in the codebase computes any of these.

```ts
availableMinutes(slots, now?)      // production slots only, breaks excluded, clipped to elapsed time
operatorMinutes(slots, operators)
targetQty(operatorMinutes, plannedEff, smv)
achievementPct(actual, target)
efficiencyPct(actual, smv, operatorMinutes)
wipStatus(pieces, thresholds, moduleActive)
forecast(actual, elapsedMinutes, remainingMinutes)
requiredHourlyRate(remaining, remainingMinutes)
orderCompletionPct(produced, orderQty)
```

**Guards.** Every function returns `null` — never `NaN`, never `Infinity` — when a divisor is zero or an input is missing. The UI renders `null` as an em dash. There is a single `formatMetric()` helper that no component bypasses.

**Forecast** uses *remaining production minutes* from the slot definitions, so breaks and shift end are respected automatically. It is deliberately conservative: it uses the rate achieved so far rather than the best hour, and it is suppressed entirely (shown as "—") until a configurable minimum of elapsed production time has passed, because a forecast built on twelve minutes of data is worse than no forecast. Section 21's own example (600 + 120 × 4 = 1080) is reproduced exactly by this implementation.

**Order completion outlook** compares forecast against remaining order quantity: 🟢 expected to complete / 🟡 at risk / 🔴 will not complete, thresholds configurable.

---

# PART K — TENANCY, TRIAL & LICENSING

## K1. Role hierarchy

```
VENDOR_ADMIN          ← you. Cross-tenant. Invisible inside customer apps.
  │  creates tenants, sets licences, extends trials, suspends
  ▼
SYSTEM_ADMIN          ← the customer's top administrator
  │  full control of their own tenant only; cannot touch their licence
  ▼
ADMIN → MANAGER → SUPERVISOR → OPERATOR → VIEWER
```

The critical separation: `SYSTEM_ADMIN` can create users, edit every configuration value, and manage all factories **inside their tenant** — but the licence document is not writable by them at any role level, and no UI path exposes it. From inside the customer application, the licensing layer is invisible except for a status badge and, near expiry, a renewal notice.

## K2. How vendor access is secured

Two layers, because one is not enough:

1. **Bootstrap in the rules file.** Your UID is written directly into `firestore.rules` as a constant. This cannot be edited from any client, only by redeploying rules — which requires Firebase project access. It is the root of trust and it cannot be revoked by anyone who compromises the application.
2. **`vendorAdmins/{uid}` collection.** Writable only by the bootstrap UID or an existing vendor admin, letting you add colleagues later. Unreadable by every tenant user, so its existence is undetectable from inside a customer's app.

```
function isVendorAdmin() {
  return request.auth.uid == 'YOUR_BOOTSTRAP_UID'
      || exists(/databases/$(db)/documents/vendorAdmins/$(request.auth.uid));
}
```

If you ever lose the bootstrap account, recovery is through the Firebase console, not through the app. That's intentional.

## K3. The licence document

```ts
licenses/{tenantId} = {
  plan: 'TRIAL' | 'STANDARD' | 'PRO',
  status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED',
  billingCycle: 'MONTHLY' | 'YEARLY' | null,
  startsAt, expiresAt, graceUntil,       // timestamps
  limits: {
    maxFactories, maxModules, maxUsers,
    bundlesPerMonth,                      // null = unlimited
    wallDisplay: boolean,
    reportExport: boolean,
  },
  notes,                                  // vendor-only
}
```

Rules permit `read` to users of that tenant (the app needs to show status and limits) and `write` only to `isVendorAdmin()`. Every change also appends an immutable `licenseEvents` record, so there is a complete audit trail of what was granted, when, and by whom.

## K4. Enforcement — what actually blocks the write

The licence check sits in the Rules helper that every business write already passes through:

```
function licenceAllowsWrite() {
  let lic = get(/databases/$(db)/documents/licenses/$(tenantId())).data;
  return lic.status in ['TRIAL', 'ACTIVE', 'GRACE']
      && request.time < lic.graceUntil;
}
```

This is genuine server-side enforcement. A customer cannot extend their trial by editing the client bundle, changing their device clock, calling the REST API directly, or restoring a backup — Firestore itself rejects the write. Limit checks (`maxModules`, `maxUsers`) run against counter documents maintained the same way as WIP counters, so they are also rule-enforceable rather than advisory.

**The one deliberate exception:** reads are never blocked. See K5.

## K5. Expiry behaviour — degrade, don't lock out

When a licence lapses the system moves through states rather than slamming shut:

| State | Duration | Behaviour |
|---|---|---|
| `TRIAL` | Configurable, default 30 days | Full function within trial limits. Countdown banner from day 7 remaining. |
| `ACTIVE` | Paid term | Normal. Renewal notice from 14 days out. |
| `GRACE` | Configurable, default 7 days | **Fully functional**, persistent warning banner. Covers a late bank transfer without disrupting a live production floor. |
| `EXPIRED` | — | **Read-only.** Dashboards, bundle history and reports all still work. Exports still work. Scanning and configuration are blocked. |
| `SUSPENDED` | Vendor action | Login blocked entirely. Reserved for non-payment after grace, or abuse. |

The read-only expiry state matters commercially as much as technically. A factory that suddenly cannot see yesterday's production has an emergency and an angry customer; a factory that can see everything but cannot scan has a strong, immediate reason to renew — and no reason to distrust you with their data. Never hold a customer's own production history hostage.

**Offline interaction:** the licence document is cached, and its expiry is evaluated locally so an expired tenant sees the read-only state even without a connection. A device scanning offline past expiry has its writes rejected on sync and surfaced through the existing rejected-scan queue. The mechanism from Part D handles this with no extra machinery.

## K6. Purchase and activation flow

```
Trial signup  →  30 days  →  customer decides to buy
                                     │
                          Stripe Payment Link / invoice / bank transfer
                                     │
                          you confirm payment received
                                     │
                          Vendor Console → set plan, cycle, expiry
                                     │
                          status: ACTIVE, licenceEvent written
                                     │
                          customer's app reflects it within seconds
```

Activation is one form in your vendor console: pick plan, pick monthly/yearly, set expiry, save. Firestore's realtime listener means the customer sees the change without logging out. For a monthly customer that's twelve actions a year; at even twenty customers it's a few minutes a month, and it gives you a natural checkpoint to notice churn risk.

**When to automate.** Once you pass roughly 20–30 paying tenants, or want self-service card payment, add **one** Cloud Function as a Stripe webhook that writes the licence document. That is a contained, ~80-line exception to the no-backend constraint — it touches nothing else in the architecture, and everything above is designed so it can be dropped in without rework. I'd advise against building it now: it costs real time, requires a billing account on Firebase, and solves a problem you don't yet have.

## K7. Vendor console

A separate route (`/vendor`) that returns 404 for anyone who is not a vendor admin — not a hidden menu item, an actually unreachable route:

- **Tenants** — list, status, plan, expiry, days remaining, last activity
- **Create tenant** — name, contact, trial length, initial `SYSTEM_ADMIN` account (using the secondary-app method from F2)
- **Licence editor** — plan, cycle, expiry, limits, extend trial, suspend, reactivate
- **Usage** — factories, modules, users, bundles this month, against plan limits
- **Licence history** — the immutable `licenseEvents` trail
- **Health** — tenants expiring within 30 days, tenants with no activity in 7 days

Usage counters double as churn signals: a tenant whose scan volume drops to zero two weeks before renewal is a conversation to have early.

## K8. Trial limits — proposed defaults

All configurable per tenant, these are just the starting values:

| Limit | Trial | Standard | Pro |
|---|---|---|---|
| Duration | 30 days | Monthly / yearly | Monthly / yearly |
| Factories | 1 | 1 | Unlimited |
| Modules | 5 | 25 | Unlimited |
| Users | 10 | 50 | Unlimited |
| Bundles / month | 5,000 | Unlimited | Unlimited |
| Wall display | ✓ | ✓ | ✓ |
| Report export | ✓ | ✓ | ✓ |

Two notes on the shape of this. First, the trial should be **generous enough to run one real production line for a full month** — a garment factory cannot evaluate a WIP system on toy data, and a trial that can't handle a real line proves nothing. Second, I'd avoid crippling exports during the trial: a factory that cannot get its data out will not trust the system with a year of production history.

The demo seed data from Section 41 doubles as trial onboarding — a new tenant can optionally load it, click through the whole workflow in ten minutes, then wipe it and start on real POs.

---

# PART I — IMPLEMENTATION PLAN

Twelve increments. Each ends in a state that runs, has seed data, and can be demonstrated.

| # | Increment | Delivers |
|---|---|---|
| 1 | Foundation | Vite + React + TS + Tailwind + shadcn/ui, routing, layout shell, dark/light, error boundaries |
| 2 | Firebase & auth | Auth, `users` profile gate, protected routes, role context, login screen |
| 2b | **Tenancy & licensing** | `tenantId` on every model, licence document, rules helpers, trial/grace/expired states, read-only degradation, vendor console |
| 3 | Config engine | `resolveConfig`, global + factory settings screens, inheritance indicators |
| 4 | Master data | Factory hierarchy, styles (SMV, colours, sizes), CRUD with scoping |
| 5 | PO & bundles | PO header/lines, bundle generation with quantity-conservation tests |
| 6 | Barcode & printing | Format templates, label layout, print single/selected/all/range/reprint |
| 7 | **Scan engine** | Outbox, batch writer, deterministic IDs, validation chain, IN & OUT screens, online/offline/pending indicators |
| 8 | Security rules | Full ruleset + emulator test suite covering every rule |
| 9 | Time engine | Shifts, slots, live ticking current-slot hook, overnight handling, timezone |
| 10 | Planning & calc | Daily plans, calculation engine, unit tests |
| 11 | Dashboards | WIP, module, section, department, factory, wall display |
| 12 | Reports & audit | Filters, charts (Recharts), CSV export, audit log viewer, reconciliation |

Increments 7 and 8 are the critical path and will take the largest share of the effort. I'd suggest a factory pilot on the scan screen alone, before the dashboards are built, because that's where reality will disagree with the design.

**Seed data** (per Section 41): factories Northfield Mill & Riverside Plant, departments Cutting/Sewing/Finishing, sections A/B, modules M01–M03, styles ST-1001 & ST-1002, two POs with colour×size lines, ~200 bundles, a day of realistic scan history, daily plans and users at every role.

---

# PART J — ASSUMPTIONS & KNOWN LIMITATIONS

**Assumptions** (challenge any of these):

1. Keyboard-wedge USB scanners at fixed stations; camera scanning as a tablet fallback.
2. One scanning station per module, shared login per station is permitted.
3. Barcode encodes only the bundle ID; everything else is resolved from Firestore.
4. Code 128 symbology, thermal labels, browser printing.
5. Cutting IN happens at bundle creation (bundles are created already cut).
6. Operator counts come from the daily plan, not from attendance.

**Limitations accepted for MVP:**

1. No rework, no bundle splitting, no quantity variance.
2. Offline rule violations surface on reconnect, not instantly (D4).
3. WIP snapshots depend on a client being online; gaps fall back to event reconstruction (D6).
4. Reconciliation is manual, not scheduled (D5).
5. Auth accounts cannot be hard-disabled or password-set from the client (F2).
6. Time-slot restrictions are app-enforced and audited, not rule-enforced (B5).
7. CSV export only; no PDF.
8. In-app notifications only; no email or SMS.
9. Licence activation is manual by the vendor; no automated payment webhook (K6).
10. No self-service signup — you create each tenant. Prevents trial farming, but does mean a customer cannot start at 2am without you.
11. Renewal reminders appear in-app only; no automated email, so you'll want a calendar reminder against each expiry date.

**Phase 2 licensing candidates:** Stripe webhook via one Cloud Function, self-service trial signup, automated renewal emails, per-tenant usage billing, white-label branding per tenant.

**Phase 2 candidates:** rework loops, bundle splitting, RM-IN and finishing/packing stages, per-stage SMV, operator-level efficiency, mobile PWA install, PDF export, scheduled reconciliation via one Cloud Function, line balancing.
