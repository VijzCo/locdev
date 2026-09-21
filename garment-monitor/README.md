# PROMIS — Production Monitoring Information System

*(Garment factory edition.)*

## Downtime & Andon (Phase 2)

A second application (live from the launcher). Downtime and Andon share one
workflow: **Raised → Attended → Completed → Verified**. Raising auto-generates a
sequential reference (`DT-YYYYMMDD-000001` / `AN-…`) via a Firestore transaction
and captures who/when; each later stage captures the EPF, user and timestamp and
computes the durations (time-to-attend, time-to-complete, total downtime,
verification time, full resolution time). A live **escalation engine** colours
open events green/amber/red against per-factory/department **SLA targets** and
names the escalation owner (Supervisor → Dept Manager → Factory Manager).

Screens: **Operations** (`/downtime`) to raise and action events; **Dashboard**
(`/downtime/dashboard`) with open counts, MTTA, MTTR, SLA %, live escalations,
a top-reasons Pareto and department ranking; **Config** (`/downtime/config`) for
categories, reasons and targets; and a **Notification Center** that records every
stage transition in realtime.

Events can be **raised straight from the login-less module tab** (a ⚠ Raise
button on every line's tablet): pick downtime/andon, category, reason, optional
description and EPF — it generates the reference, files the event and notifies
the team. Attend/complete/verify remain signed-in actions on the Operations board.

## Platform foundation (Phase 1)

PROMIS is becoming a multi-application Digital Factory Platform. The signed-in
**Home** screen (`/`) is an **application launcher** — it shows a factory
selector, a live KPI summary, the applications this device + user is authorised
for (PROMIS Production now; Downtime & Andon and Quality are staged for upcoming
phases), and quick-access tiles. The production board moved to `/promis`.

Structure is now a full hierarchy: **Factory → Department → Section → Module**,
each a master screen. **Device Management** lets tablets/TVs/phones self-register
on first open (via a heartbeat), after which an admin can name them, assign
factory/department/module, authorise which applications appear on each device,
and disable / force-logout them. Every device is stamped onto the **audit log**
(new Device column + filter), so public-page changes are traceable to a device.

A real-time, module-wise hourly production board for garment manufacturing,
built with **React (Vite) + Tailwind CSS + Firebase** (Auth, Firestore,
Hosting). All target/efficiency/achievement maths run in the browser and are
stored in Firestore — no Cloud Functions, no paid services, no external server.

The dashboard mimics an electronic factory production board: modules as rows,
hourly slots as columns, each cell showing **actual / planned** with automatic
color coding (green = on/above plan, amber = 80–99%, red = below 80%, grey =
future or break, blue = the currently active slot).

---

## 1. Prerequisites

- **Node.js 18+** and npm
- A free **Firebase** project (https://console.firebase.google.com)

---

## 2. Install

```bash
npm install
```

---

## 3. Configure Firebase

1. In the Firebase console, create a project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database (start in production mode).
4. Under **Project settings → Your apps**, register a Web app and copy the
   SDK config values.
5. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=...
VITE_FB_PROJECT_ID=...
VITE_FB_STORAGE_BUCKET=...
VITE_FB_MESSAGING_SENDER_ID=...
VITE_FB_APP_ID=...
```

---

## 4. Create the first admin user

Firestore documents drive roles, so the first user must be wired up by hand:

1. **Firebase console → Authentication → Users → Add user.** Enter an email and
   password. Copy the generated **User UID**.
2. **Firestore → Start collection `users`.** Add a document whose **Document ID
   is exactly that UID**, with fields:

   | Field       | Type   | Value                       |
   |-------------|--------|-----------------------------|
   | `email`     | string | the admin's email           |
   | `name`      | string | e.g. `System Admin`         |
   | `role`      | string | `super_admin`               |
   | `factories` | array  | `[]` (admins see all)       |
   | `status`    | string | `active`                    |

3. You can now sign in. From there, the in-app **Users** screen creates every
   other user for you — enter Name / Email / Password / Role and it provisions
   the Firebase Auth login **and** the matching profile together (no Auth UID to
   copy). Only this very first admin has to be wired up by hand, because there's
   no admin yet to use the in-app creator. (Deleting a user in-app removes their
   profile; their Auth login is removed from the Firebase console, since that
   needs the Admin SDK, which this no-backend build intentionally avoids.)

Roles and their permissions (see `src/lib/roles.js`):

- **super_admin** — everything
- **factory_manager** — plans, allocation, modules, styles, production entry, dashboards, reports (scoped to assigned factories)
- **supervisor** — hourly production entry, dashboards, reports
- **viewer** — read-only dashboards and reports

`factories` is an array of factory document IDs the user may access. Leave it
empty for super admins.

---

## 5. Run locally

```bash
npm run dev
```

Open the printed URL, sign in with the admin account.

### Load demo data (optional)

Sign in as the admin, go to **Settings → Load demo data**. This seeds two
factories, a dozen modules, three styles, a full Shift A (H1–H8 with tea/lunch
breaks + one overtime slot), today's daily plans and team allocations, and
simulated hourly production up to the current time — enough to see the board
fully lit up immediately.

---

## 6. Deploy Firestore rules

The repo ships with role-based rules in `firestore.rules` (factory-scoped
writes, master data locked to admins/managers, etc.). Deploy with the Firebase
CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules
```

---

## 7. Build & deploy hosting

```bash
npm run build             # outputs to dist/
firebase deploy --only hosting
```

`firebase.json` is preconfigured to serve `dist/` with SPA rewrites so client
routing works on refresh.

---

## 8. Project structure

```
src/
  firebase/      config.js (env-driven init, COL names), db.js (Firestore helpers)
  lib/           calc.js (target/efficiency/achievement engine, verified vs spec)
                 time.js (slot timing, active-slot detection)
                 colors.js (cell color logic), roles.js (RBAC matrix)
                 exports.js (Excel + PDF), seed.js (demo data)
  context/       AuthContext.jsx (Firebase user + Firestore profile)
  hooks/         useCollection.js, useDashboardData.js (board model + KPIs + alerts)
  components/    Layout, ProtectedRoute, KpiCard, ShiftMonitor, CrudPage, Loader
  pages/         Dashboard, HourlyEntry, Reports, Factories, Modules, Styles,
                 Shifts, TeamAllocation, Plans, Users, Settings, Login
  App.jsx        routes (each guarded by capability + wrapped in Layout)
  main.jsx       entrypoint (Router + AuthProvider)
firestore.rules  role-based security rules
firebase.json    hosting + rules config
```

---

## 9. The calculation engine (`src/lib/calc.js`)

Matches the spec's worked examples exactly:

- **Available minutes** = shift production minutes − break minutes
- **Daily target** = (Available Minutes × Team Members × Efficiency%) ÷ SMV
- **Slot targets** are distributed *proportionally to each production slot's
  duration* (a 60-min slot gets more than a 45-min slot; break slots get 0),
  with rounding drift absorbed by the last production slot so the slots always
  re-sum to the daily target.
- **Achievement %** = actual ÷ target × 100; **efficiency %**, **variance** and
  a four-way **loss analysis** (efficiency / manpower / break / downtime) are
  also provided.

Verified examples: 800 ÷ 8 slots = 100/slot; 60-min = 100, 45-min = 75, break =
0; daily-target formula and achievement rollups all check out.

---

## 10. What's complete vs. what extends the same pattern

**Fully built and wired:**

- Email/password auth + Firestore-profile roles + route guards + factory scoping
- The real-time production board (the centerpiece): modules × hourly slots,
  sticky module column, horizontal scroll, color-coded cells, active-slot
  highlight, 30s auto-refresh, KPI cards, filters, shift monitor, alerts
- Hourly production entry (slot-wise, breaks disabled, live achievement)
- Full CRUD for Factories, Modules, Styles, Users (in-app login provisioning),
  plus the two-level Shift & Slot manager, the **editable Daily Plans table**
  (every module inline — team allocation + manual Style + **Production/QCO mode**
  + auto-or-manual **daily plan qty**), and **bulk Shift Allocation** across a
  date range and many modules at once
- A **QCO (change-over) blink**: any module set to QCO has its whole column
  blink amber on the board so it gets attention
- **Configurable roles & access** (Super Admin): a **Roles & Access** matrix to
  create roles and grant function-wise capabilities; Super Admin always retains
  full access. **Factory-wise access** too — each user is assigned factories on
  the Users screen, and non-admins only see/work with their factories across the
  board, plans, allocation, entry and reports (admins see all).
- **Reports** with a full filter bar (date, factory, shift, floor, module) plus
  Excel/PDF/print export, across Daily Production, Hourly, Factory Performance
  and Loss Analysis.
- **Shift Allocation**: bulk-allocate a shift to many modules across a date
  range, plus a filterable list of allocations with an **editable team-per-
  module** field and delete — **past shifts can't be deleted** (history kept).
- A **full Audit Log** (admins/managers): every create/save/update/delete is
  recorded with who/when/what and filterable by date range, user, action,
  entity, factory, module, source, and free text, with Excel/PDF export
- Reports hub with four working report types — Daily Production, Hourly
  Production (color-coded), Factory Performance (chart + table) and Production
  Loss Analysis (chart) — each with Excel / PDF / Print export
- Demo data seeder, Firestore security rules, hosting config

**Follows the established pattern to extend** (the spec lists eight report types;
four are implemented as above, the rest reuse the exact same `moduleRows()` +
`ExportBar` structure already in `src/pages/Reports.jsx`):

- Module Performance (avg efficiency / total production / best & worst day)
- Style Performance (per-style target vs actual & efficiency)
- Supervisor Performance (modules managed, target vs actual)
- Attendance vs Production (planned vs actual team count vs output)

Each is a new tab in `Reports.jsx`: group the same data by the relevant key and
feed it through the existing table + export helpers. Happy to flesh any of these
out in full on request.

---

## 11. Public display URLs (TV walls & floor phones)

Two pages are **public — no login** — so a TV browser or a phone can open them
directly. They live outside the auth layer and read live data straight from
Firestore.

### Live display board — `/display`
A clean, full-screen production board: **hourly slots down the rows, modules
across the columns**, break slots removed, cells colored **green = target met /
red = behind or missed / dim = upcoming**, plus a rightmost **Total column**
(hourly totals) and a bottom **Total row** (per-module + grand total). The
module headers show just the module code. Any module in **QCO** mode fades
slowly in/out (keeping its red/green colour) to draw attention — the fade can be
toggled and its speed set in **Settings**. The clock shows **seconds**. On
`/display` the board also tries to go **full-screen automatically** (browsers
require a tap/click first, so the first interaction triggers it). It fills a TV
and scrolls on a phone, auto-refreshes live, **auto-tracks today**, and
**auto-selects the shift from the clock**. The **same layout is the signed-in
root page (`/`)**, with a KPI strip. Bookmark with URL parameters:

```
https://<your-app>.web.app/display
https://<your-app>.web.app/display?factory=<factoryId>&shift=<shiftId>
https://<your-app>.web.app/display?date=2026-06-07&bare=1
```

- `factory`, `shift` — pin to one factory/shift (omit `shift` to auto-pick by time).
- `date` — pin a specific day (omit to auto-track today).
- `bare=1` — hide the settings bar for a pure kiosk display. There's also a
  **⛶ Fullscreen** button. Signed-in users get an **Open TV Display** link in
  the sidebar.

### Per-module entry tab — `/module`
A login-less, touch-first entry page scoped to **one module**, opened by a
direct link per production line:

```
https://<your-app>.web.app/module?module=Q01
https://<your-app>.web.app/module?module=Q01&date=2026-06-07
```

`module` matches the module **number** (e.g. `Q01`) or its document id.

If **no shift is allocated** for that module/date, the tab shows *"Shift
allocation not done — please contact the Production Team"* and entry/config are
unavailable. Allocate a shift first (Shift Allocation or Daily Plans).

When a shift **is** allocated, the entry view shows **slot-wise colored number
tiles on a single scrolling row** (green at/above target, red below, live slot
uncolored, future locked), the **live slot's running total**, and a **numeric
keypad**. Entry is **cumulative** (type an amount, **Add**, it adds to the live
slot total, e.g. `5` then `10` → `15`); only the live slot is editable; a **live
clock with seconds** is in the header.

A **⚙ Config** button opens the daily configuration, pre-filled with the **last
day's** values: **Style, TM count, SMV, Target qty** (and Production/QCO mode).
**Date, Module and Shift are auto and locked.** Press **Set target & lock** to
finalise — after that the target is **locked on the tab and can only be changed
from the system side** (the Daily Plans page, where a 🔒 *unlock* control
reopens it). There is no slot-level target editing here.

### ⚠️ Security tradeoff — read this

To make these pages work without a login, `firestore.rules` opens **public read**
on factories, modules, styles, shifts, slots, daily plans and hourly production,
and a **public write** path on `hourlyProduction` (shape-validated, but
unauthenticated) so the `/module` tab can record output. That means:

- Anyone who knows your app URL can **read** production data.
- Anyone who knows the URL can **submit** hourly entries.

This is the usual tradeoff for a no-login factory display, and is generally fine
when the URL only circulates inside the plant / on the local network. If you
need it locked down, you have two easy options without adding any paid services:

1. **Anonymous auth** — enable Authentication → Anonymous, call
   `signInAnonymously(auth)` once on app start, then change the `if true` reads
   (and the public write path) back to `signedIn()`. The pages stay login-less
   to the user but every client is an authenticated anonymous session.
2. **Display-only** — if you don't need login-less *entry*, keep `/display`
   public-read but remove the public write path from `hourlyProduction` so all
   entry goes through the signed-in recorder / authenticated `/module` users.

The relevant rules are commented in `firestore.rules` to make either change a
one-line edit.
