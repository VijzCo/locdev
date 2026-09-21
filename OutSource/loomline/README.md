# Loomline — Garment Production Tracking

Bundle-level production tracking, real-time WIP and forecasting for garment factories.

Built against the architecture in `01-requirements-and-architecture.md`. This
repository is at **Increment 13 of 14**.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run preview`,
`npm test`, `npm run test:rules`.

`npm run test:rules` needs Java and the Firebase CLI; it starts the Firestore
emulator, runs the rules against it, and shuts down.

Without a Firebase project the app starts in **demo mode** so the interface
can be walked immediately. Demo mode only exists in development builds.

To connect it for real:

```bash
cp .env.example .env.local        # fill in from the Firebase console
firebase deploy --only firestore:rules,firestore:indexes
npm run build && firebase deploy --only hosting
```

Enable **Email/Password** sign-in in Firebase Authentication. This is
required by the client-side account creation described in Part F2, and is
safe because an Auth account with no profile document can read and write
nothing.

### Before you deploy the rules

Open `firestore.rules` and replace `REPLACE_WITH_VENDOR_BOOTSTRAP_UID` with
your own Firebase UID, then put the same value in `.env.local`. That
constant is the root of trust for vendor access — it can only be changed by
redeploying rules, so it survives a compromise of any application account.

### Creating your first tenant

1. Sign up once through the app to create your own Auth account.
2. In the Firebase console, note your UID and put it in the rules file and
   `.env.local`, then deploy the rules.
3. Sign in. The **Vendor** link appears in the top bar.
4. Create a tenant — it starts on a 30-day trial automatically.
5. Create that tenant's first administrator from **Users**.

## What exists now

| Area | State |
|---|---|
| Design system, tokens, light/dark | Complete |
| Navigation and route table (all of §37) | Complete, screens are stubs |
| App shell, sidebar, top bar | Complete |
| Live factory clock | Complete — ticks, does not sample at page load |
| Connection indicator | Complete — outbox depth added in Increment 7 |
| Error boundaries | Complete, per routed area |
| Domain types | Complete, mirrors the Firestore schema |
| Firebase auth and profile gate | Complete |
| Capability model and route guards | Complete |
| Multi-tenant isolation | Complete |
| Licensing: trial, grace, read-only expiry | Complete |
| Vendor console | Complete |
| User administration | Complete |
| Security rules and indexes | Complete |
| Offline persistence | Enabled, exercised in Increment 7 |
| Configuration engine and resolution chain | Complete |
| Global, factory and WIP configuration screens | Complete |
| Editable role capability matrix | Complete |
| Factory hierarchy master data | Complete |
| Styles with SMV, colours, sizes, route | Complete |
| Demo seed data | Complete |
| Purchase orders and order lines | Complete |
| Bundle generation with conserved quantity | Complete, tested |
| Code 128 labels and printing | Complete |
| Scan engine, outbox, scan in / scan out | Complete, tested |
| Bundle tracking | Complete |
| Rules test suite | Written — run with the emulator |
| Shifts, slots and the time engine | Complete, tested |
| Calculation engine | Complete, tested |
| Daily planning | Complete |
| Dashboards: factory, department, module, WIP, hourly | Complete |
| Wall display | Complete |
| Reports, charts and CSV export | Complete |
| Audit log and WIP reconciliation | Complete |
| Alerts and notifications | Complete, tested |
| Review passes (Phases 08–10) | Complete — see REVIEW.md |
| Everything else | Stubs naming the increment that fills them |

Each stub screen states which increment builds it, so the route table is
walkable end to end for review.

## Layout

```
src/
  components/
    common/      ErrorBoundary, empty / loading / error states
    layout/      AppShell, Sidebar, TopBar
    ui/          Button, Card, Metric, StatusChip
  hooks/         useFactoryClock, useConnection, useTheme
  lib/           utils, signal tokens, navigation
  pages/         screens
  routes/        route table
  types/         domain model
```

## Design rules

Three rules hold the interface together. Breaking any of them is a review
comment, not a preference.

**Colour is data.** Green, amber, red and grey mean production status and
nothing else. They never appear as decoration, branding or emphasis. This is
what lets a supervisor read a wall of modules from across the floor before
any text resolves. All four come from `lib/signal.ts`; nothing hardcodes a
status colour.

**Every number is tabular.** All figures render in IBM Plex Mono with
tabular figures so digits hold their column as counters tick. Numbers go
through `formatMetric()`, which renders an em dash for null or non-finite
input — NaN and Infinity can never reach the screen.

**Factory time comes from one place.** `useFactoryClock` is the only source
of the current time. Nothing else calls `new Date()` to decide which
production slot is active.

## Notes on the shell

The sidebar is deep navy in both themes. It is the one fixed surface in the
interface, so it stays put when the content area switches between light and
dark — desks tend to run light, floor tablets and wall panels run dark, and
the navigation should look the same on both.

Dark is the default theme because most installations of this screen live on
a production floor or a wall-mounted panel. The dark background is deep navy
rather than black; cheap wall panels bleed badly on true black.

## Access model

Three layers, and only one of them is enforcement.

**Rules decide.** `firestore.rules` checks tenancy, role, scan direction and
licence state on every write. Nothing else is enforcement.

**Capabilities gate screens.** Route guards and the sidebar filter on
capabilities rather than roles, so §31's matrix stays configurable. Hiding a
menu item is a convenience — a user who types the URL still hits the guard,
and a user who bypasses the guard still hits the rules.

**Licence degrades rather than locks.** An expired tenant keeps dashboards,
history and exports; scanning and configuration stop. `resolveLicence()`
mirrors the rules check so the interface can explain the state, but removing
that function would change what the app *says*, not what the database
*permits*.

## What the client-side account creation cannot do

Creating users without a backend uses a secondary Firebase App instance
(`src/lib/userAdmin.ts`). Two limits come with it:

- Accounts cannot be hard-deleted or disabled. The `disabled` flag on the
  profile is treated by the rules as a global deny, which is equivalent for
  data access, but the credential still exists.
- Administrators cannot set a password after creation, only trigger an email
  reset. The create form warns about this.

Lifting either needs one Cloud Function.

## Configuration

Adding a key to `src/config/schema.ts` is the whole job. It then appears on
the right settings screens, becomes overridable at the levels it declares,
and is readable through `cfg()`. There is no second place to register it,
and the metadata record is typed as total — the build fails if a key is
added without describing how it is presented.

### Two different "global"

- **Built-in defaults** ship in `DEFAULTS`, with an optional vendor-wide
  layer in `globalSettings/system` that only you can write.
- **Global settings** in the app are the *customer's* organisation-wide
  layer, sitting above their factories.

### Precedence

```
module + style → module → style → section → department
  → factory → organisation → built-in default
```

The first layer defining a key wins. Layers are sparse, so overriding one
WIP threshold at factory level does not shadow the other two.

Module beats style because a module's physical constraint — how many pieces
fit on the rack beside it — does not change when the line switches style.
Style still beats section, since a style-level override usually expresses a
property of the garment.

Every field states where its value came from, and clearing an override
removes the key rather than writing a blank, so the value falls back through
the chain instead of shadowing its parent.

## Demo data

**Master data → Hierarchy → Load demo data** creates the §41 fixture: two
factories, four departments, four sections, five modules and two styles,
plus one module-level WIP override so the configuration screens have real
inheritance to show.

Every seeded record carries `seeded: true`, and **Remove demo data** deletes
only those — real production records are never touched. Ids are
deterministic, so running it twice replaces the same records instead of
creating a second copy of the factory.

Module `M01` deliberately exists in both factories, because §32 requires the
system to tell identical module codes apart across factories.

## Bundle generation

`npm test` runs the arithmetic that decides whether garments get lost.

The guarantee is that pieces planned always equal pieces ordered. An order
of 1,030 at 20 per bundle produces 51 full bundles plus one of 10 — 52
bundles, 1,030 pieces. The last bundle is short rather than the shortfall
being rounded away, because a bundle is a physical stack of cut panels.

`planBundles` asserts this invariant before any document is written, and the
test suite proves it exhaustively across every order size up to 400 against
every bundle size up to 60 — around 20,000 combinations rather than a
handful of spot checks.

Bundle ids are deterministic, built from the configured template. Re-running
an interrupted generation targets the same documents instead of creating a
second set. Generation also refuses to run if the template would produce
colliding ids, which happens when `{SIZE}` or `{COLOR}` is left out of an
order that has several.

Firestore caps a write batch at 500 operations, so generation splits into
chunks of 450. A 10,000-piece order at 25 per bundle is 400 bundles in one
batch; at 5 per bundle it is 2,000 bundles across five.

Cancelling a line's bundles sets them to CANCELLED rather than deleting
them, and skips any that have already been scanned — production history is
never rewritten.

## Labels

§8 asked for printing by single, selection, all, PO, style, size and range.
Those are all the same operation — filter, then select — so the filters do
the work and printing acts on the current selection. Selecting nothing
prints everything shown, which is the common case after filtering to one PO.

Label size, barcode height and whether to print the company name are
configuration, under **Bundles & barcode**. Defaults are 50 × 30 mm, which
is standard bundle-label stock.

Encoding is Code 128 via JsBarcode, rendered as SVG rather than canvas so
thermal printers rasterise at their own head resolution. A canvas bitmap
scaled to a small label gives soft bar edges that scan badly once a label
picks up cutting-room chalk.

**Before printing a full order, print one label and scan it.** Turn off
"fit to page" in the printer dialog — scaling changes the barcode width and
can make it unreadable.

Reprints are counted on the bundle and marked "RE" on the label, and the
count shows in the browser. A bundle printed four times usually means the
physical bundle is lost, or that someone is producing duplicate tickets for
the same work. Reprints can be turned off entirely in settings.

## The scan engine

The part that has to work when nothing else does.

**Batches, never transactions.** `runTransaction` needs a live round trip and
throws when offline, so scanning would stop the moment the network blinked.
A `writeBatch` is atomic, is validated by the rules on arrival, and queues
while offline.

**Counters use `increment()`.** It carries a delta, not a computed result, so
ten scans made offline on three tablets apply in any order and still land on
the right total. That commutativity is why WIP survives an outage.

**The commit is not awaited.** Offline the promise never settles, so awaiting
would freeze the screen. The outbox records the scan first; the promise
updates it later.

**The outbox is IndexedDB, not Firestore's queue.** Firestore rolls a
rejected write back silently, and §30 says a scan must never be lost without
the operator seeing it. Pending, acknowledged and rejected are all visible,
and rejections stay on screen until dismissed.

### What offline costs

An invalid scan made offline is accepted locally and refused when it syncs.
Server-side correctness never breaks — the rules still reject it — but the
operator finds out minutes later, and the pieces were never counted. Those
appear in the rejected list on the scan screen. A tablet holding scans for
more than 30 minutes raises a warning.

### Scanners

Keyboard-wedge scanners are captured globally: they type fast and end with
Enter, and anything under 120 ms between keystrokes is treated as a scan
rather than typing. No input needs focus. The manual entry box is for
damaged labels, and typing into it is not intercepted.

## Time and shifts

All times are minutes from factory-local midnight. The hard part is the
overnight shift, and it is handled by working in *shift-relative* minutes —
how far into the shift a moment is — rather than comparing against the clock.
An overnight shift then behaves exactly like a day shift, with no special
case anywhere.

Two consequences worth knowing:

**Elapsed production time is not elapsed wall time.** A shift half over does
not mean half its production minutes have passed, because a lunch break sits
in the middle. Getting this wrong flows straight into every target,
efficiency and forecast on the wall display, so `elapsedProductionMinutes`
walks the slots and excludes breaks.

**Night-shift output belongs to the day the shift started.** A shift that
begins at 22:00 on Monday is still Monday's production at 02:00 on Tuesday.
Booking those pieces to Tuesday would leave Monday short and credit Tuesday
with output it never made.

`src/time/slots.test.ts` covers both, plus midnight boundaries, month
rollover, gaps and overlaps — 34 tests.

The scan screen now enforces slots for real. A station left open across a
break locks itself as the break begins, without a refresh, and says when it
reopens.

## The calculation engine

`src/calc/engine.ts` owns every derived number in the product. Nothing else
computes a target, an efficiency, an achievement or a forecast — duplicating
one of these in a component is how two screens end up disagreeing about the
same module.

**The brief's target formula was wrong.** It defined available minutes as
`minutes × operators`, then multiplied by operators again in the target, so a
30-operator module would show a target 30× too high. The corrected version is
in Part B1 of the architecture document, and there is a test asserting that
doubling headcount doubles the target rather than quadrupling it.

Target and efficiency now share one `operatorMinutes` term, which makes them
consistent by construction: hitting target yields exactly the planned
efficiency, and there is a test for that too.

**Efficiency measures time worked so far, not the whole shift.** Dividing by
the full shift would make every module read badly at nine in the morning.

**Forecasts stay silent early.** They project the rate achieved so far rather
than the best hour, and refuse to answer until a configurable amount of the
shift has run. A forecast built on twelve minutes of data is worse than none,
because people act on it.

Everything returns `null` rather than NaN or Infinity — zero SMV, zero
operators, zero elapsed time are all real states, and they render as an em
dash.

Daily plan ids are `{moduleId}_{date}_{shiftId}`, which is what enforces
§18's rule against duplicate plans for the same module, shift and day.

## Dashboards

Every dashboard reads `useProductionData`, which assembles the figures once
and runs them through the calculation engine. Screens filter that rather than
querying and computing for themselves — the moment two screens build their
own numbers they start disagreeing, and a wall display and a manager's laptop
showing different output for the same module is worse than either being
slightly wrong.

Reads stay cheap because WIP is a counter document per module rather than a
listener over every bundle. A wall covering twenty modules watches around
sixty small documents, not several thousand.

**The wall display is a different design problem** from the desk dashboards:
read from fifteen metres by someone walking past, not studied up close. So
the figures are enormous, labels are small, there is no navigation, and the
andon rail runs the full height of each card instead of sitting as a thin
edge. Colour does the work — which modules are in trouble should register
before any number resolves.

It paginates when there are more modules than fit and rotates on an interval,
both configurable under Dashboards.

**The WIP dashboard sorts by urgency, not by module code.** A supervisor
opening it wants the problems first.

## Reports and export

**Redeploy the indexes with this increment** — the reports filter a date
range against a tenant, which Firestore cannot serve without a composite
index:

```bash
firebase deploy --only firestore:indexes
```

Historical figures come from `hourlyProduction`, written as scans arrive,
rather than from re-reading the scan ledger. A month-long report is a few
hundred document reads instead of tens of thousands.

### CSV export has a security trap

A cell beginning with `=`, `+`, `-` or `@` is treated as a formula by Excel
and Sheets. These exports carry user-typed values — buyer names, style
descriptions — and get opened on someone else's laptop, so every such value
is prefixed with an apostrophe. Excel strips it on display and does not
execute it. `src/lib/csv.test.ts` covers this along with quote, comma and
newline escaping.

### Charts

Drawn as plain SVG rather than adding a charting library, which would cost
roughly a hundred kilobytes for bars and a polyline and would style itself
rather than obeying the andon rule.

Null is not zero on the trend line: a day with no records breaks the line
instead of dropping to the floor, because a day nobody scanned is not a day
the factory made nothing.

### Reconciliation

The audit screen can rebuild every WIP counter from the scan ledger and
report the difference. Scan events are what happened; counters are a fast
copy. Checking and applying are separate steps — a manager should see what
would change before it changes.

Without Cloud Functions this cannot be scheduled, so it is run by hand.

## Alerts

The hard part of an alerting system is staying quiet. A wall of red at 08:15
because nothing has hit its daily target yet teaches everyone to ignore the
panel, and after that a real over-WIP alert is invisible too. So every rule
has a suppression condition and each one is tested:

- Nothing fires when no shift is running.
- Target-based rules wait until enough of the shift has run, using the same
  threshold that gates forecasts.
- Over-WIP is the exception and fires immediately — a module drowning at
  08:10 needs feeding stopped at 08:10.
- A module with no plan reports that and stops, since target rules against a
  missing target are noise on top of the real problem.
- "No output last hour" checks the last *finished* slot, because a module
  twenty minutes into an hour has legitimately not scanned anything yet.

Alerts are derived from current state, not stored. Notification documents
would add writes on every dashboard load, need cleaning up, and go stale —
an over-WIP notice still showing after the module was fed is worse than no
notice. Dismissing one silences it on that device until tomorrow.

## Scan sounds and duplicate protection

Tones are generated with the Web Audio API rather than loaded as files —
nothing to download, and it works on the first scan of the day on a tablet
that has been offline since yesterday. The three tones are deliberately
unlike each other, because an operator working a trolley is listening rather
than looking: a rising chirp for accepted, a low buzz for rejected, and a
repeated mid note for a repeat scan. There is a mute button on the scan
screen and a setting under Scanning.

Duplicates are now handled at four layers, because "duplicate" means four
different things:

1. **Scanner double-fire** — the same barcode within a few seconds. Swallowed
   with a warning tone and an amber banner reading "counted once", not a
   rejection. Telling an operator "rejected" for their own held trigger
   teaches them to distrust every rejection. The window is configurable.
2. **Already in the outbox** — this device has accepted the scan and it is
   waiting to sync. This is the check that works offline, since the bundle
   document may not have caught up.
3. **Bundle state** — the validation chain refuses an IN for a bundle already
   inside a module, and an OUT for one that is not.
4. **The database** — the scan event id is `bundleId__moduleId__direction`
   and the rules allow `create` only, so a repeat targets a document that
   already exists and is refused. Duplicate production is structurally
   impossible, not merely unlikely.

Layers 1 and 2 exist for the operator's benefit. Layers 3 and 4 are what
actually guarantee the numbers.

## Review

`REVIEW.md` is the Phase 08–10 deliverable: the QA pass, the adversarial
review and a graded issue list.

Five issues were found and fixed. One was critical: the `moduleWip` rule
required IN access, but WIP falls on the way out as well as rising on the way
in, so an OUT-only operator had their entire scan batch rejected — silently
while offline. That is the configuration a dedicated end-of-line station
uses, so it would have shown up on day one of a pilot.

**Redeploy the rules with this increment.**

```bash
firebase deploy --only firestore:rules
npm run test:rules
```

Please run the rules suite. I cannot run the emulator in my environment, and
the critical issue above is precisely what those tests exist to catch.

## Next

**Increment 14 — deployment and handover.** Setup guide, operator
documentation, and the deployment checklist.
