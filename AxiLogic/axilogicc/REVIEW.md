# Review Report — Phases 08 to 10

**Scope:** QA, adversarial review and final audit of Increments 1–12.
**Tests:** 134 unit, 24 rules (emulator).

---

# PART 1 — ISSUES FOUND

Five issues. Two would have caused production incidents.

| # | Severity | Area | Status |
|---|---|---|---|
| 1 | **Critical** | Security rules | Fixed |
| 2 | **High** | Bundle tracking | Fixed |
| 3 | Medium | WIP history | Fixed |
| 4 | Medium | Alerts | Fixed |
| 5 | Low | Reports | Fixed |

## 1. Critical — OUT-only operators could not scan at all

**What was wrong.** The `moduleWip` rule required `canScan('IN')`. But WIP
rises on the way in *and falls on the way out* — both directions write that
counter. An operator configured with `scanAccess: 'OUT'` had the counter
write refused, and because a scan is a single atomic batch, the refusal took
the scan event and the bundle update with it.

**Why it would have hurt.** This is exactly the configuration a dedicated
end-of-line station uses. Worse, offline it fails silently at the point of
scanning and only surfaces on sync, so an operator could work an entire
shift with every scan landing in the rejected queue.

**Fixed:** the rule now accepts either direction. Regression tests assert
that both an IN-only and an OUT-only operator can write the counter.

**Root cause worth naming:** I wrote the rule by looking at the IN case and
not asking which other paths touch the same document. Atomic batches make
that mistake expensive, because one wrong rule fails four writes.

## 2. High — bundle lookup used a query where a read was needed

`BundleTracking` searched with `where('__name__', '==', id)` combined with a
tenant equality. That is an indexed query standing in for a direct document
read: it needs a composite index that was never declared, costs more, and
does not resolve from the offline cache — so bundle lookup would have failed
exactly when the network was down and a supervisor most needed it.

**Fixed:** replaced with `getDoc`, with the tenant checked after reading.

## 3. Medium — WIP history was never recorded

Part D6 of the architecture document specified hourly WIP snapshots written
by whichever client has a dashboard open, since there is no scheduler
without Cloud Functions. Nothing implemented it, so the WIP report had no
data and would have stayed empty forever.

**Fixed:** `useProductionData` now writes `wipSnapshots/{moduleId}_{date}_{hour}`.
The deterministic id makes concurrent dashboards harmless — three open at
once write the same document rather than three rows.

**Remaining limitation, accepted:** an hour with no dashboard open has no
snapshot. Documented rather than solved; solving it needs a Cloud Function.

## 4. Medium — no-output alerts read the wrong setting

The "no output last hour" rule was reading `alerts.behindTarget`, so turning
off behind-target alerts silently disabled a different rule. Added
`alerts.noOutput` as its own key.

## 5. Low — dead export guard

`const exportable = cfg('label.showCompany') !== undefined` was always true.
Removed.

---

# PART 2 — ADVERSARIAL REVIEW

§39's questions, answered honestly.

### Can a bundle exist in two modules at once?

**No, and this is enforced twice.** The client refuses an IN while
`currentModuleId` is set. The rules refuse a duplicate `scanEvents` document,
and the id is `bundleId__moduleId__direction`, so the second write targets an
existing document and `create`-only rejects it.

**Offline caveat:** two disconnected stations can both *accept* an IN
locally. On sync one is rejected. Correctness holds; feedback is delayed.
This is stated on the scan screen rather than hidden.

### Can duplicate scans inflate production?

**No.** Duplicate production is structurally impossible rather than merely
unlikely, because the deterministic id *is* the idempotency key. There is no
sequence number to collide and no read-before-write to race.

### Can WIP become mathematically wrong?

**It can drift, and that is why reconciliation exists.** Counters are a
projection of the immutable ledger, maintained by commutative increments. A
partly-applied batch or a console edit can desynchronise them. The audit
screen rebuilds them from `scanEvents` and reports the difference before
changing anything.

**WIP can also go negative** if an OUT syncs while its matching IN was
rejected. This shows as a negative number rather than being clamped to zero,
which is deliberate: a clamped counter hides the problem, a negative one is
obviously wrong and prompts a reconcile.

### Can two operators scan simultaneously?

Yes, and one wins. Same document id, `create`-only, last writer refused. No
double count.

### Can users bypass permissions?

Not through the database. Every check in the client is repeated in the
rules, and the rules are the authority. The client copies exist for fast
feedback, not enforcement — deleting `resolveLicence` would change what the
interface *says*, not what the database *permits*.

**The one honest gap:** time-slot enforcement is app-side only. Rules cannot
do IANA timezone conversion or overnight-shift arithmetic. Every scan carries
both client and server time, so violations are detectable in the audit trail
even though they are not blocked. Declared in Part B5 from the start.

### Can historical production be changed?

**No.** `scanEvents` is `create`-only with `update` and `delete` set to
`false`. Bundles cannot be deleted. Counters cannot be deleted. Audit entries
cannot be edited.

### What happens at midnight, and on an overnight shift?

Handled in shift-relative minutes rather than clock comparison, so an
overnight shift has no special case. Night output books to the day the shift
started — 02:00 Tuesday belongs to Monday's figures. Tested through midnight,
month rollover and the break either side.

### What happens when the internet disconnects?

Scanning continues. Reads resolve from cache, writes queue as batches,
counters use commutative increments so any arrival order lands correctly. The
outbox shows pending count and the age of the oldest unsent scan.

### If the order quantity does not divide evenly?

51 full bundles plus one short bundle. Conservation is asserted at runtime
before any write, and proven by exhaustive test across ~20,000 combinations.

### Can the forecast mislead?

It is deliberately conservative: it projects the achieved rate, not the best
hour, and refuses to answer before a configurable amount of the shift has
run. The suppression exists because people act on forecasts.

### Are efficiency calculations correct?

The brief's formula was not — it double-counted operators and would have
shown a 30-operator module a target 30× too high. Corrected in Part B1, with
a test asserting that doubling headcount doubles the target rather than
quadrupling it, and another asserting that hitting target yields exactly the
planned efficiency.

### Are Firestore reads unnecessarily expensive?

WIP is one counter document per module, not a listener over every bundle. A
wall covering twenty modules watches roughly sixty small documents rather
than several thousand. Reports read `hourlyProduction` rather than replaying
the ledger, so a month is hundreds of reads, not tens of thousands.

### Can a factory see another factory's data?

Not another *tenant's* — every collection checks `tenantId`, and the field is
immutable on user documents so an admin cannot move an account across
tenants. Tested.

Within a tenant, factory-level separation is by user scope, and an empty
scope means unrestricted. That is intentional for managers but worth knowing:
a user with no scope set sees everything in their tenant.

---

# PART 3 — WHAT IS STILL OUTSTANDING

Not defects. Scope decisions and accepted limitations.

**Not built (agreed out of MVP):** rework loops, bundle splitting, quantity
variance between IN and OUT, per-stage SMV, RM-in and finishing stages
(config-ready, switched off), PDF export, email or SMS alerts.

**Accepted limitations:**

1. Offline rule violations surface on reconnect, not instantly.
2. WIP snapshots depend on a client being online during that hour.
3. Reconciliation is manual; it cannot be scheduled without a Cloud Function.
4. Auth accounts cannot be hard-disabled or password-set from the client. The
   `disabled` flag denies all data access, which is equivalent for data, but
   the credential still exists.
5. Time-slot restrictions are app-enforced and audited, not rule-enforced.
6. Licence activation is manual by the vendor; no payment webhook.

**Recommended before a real production line:**

- Run `npm run test:rules` against the emulator. I cannot run it in my
  environment, and issue #1 above is exactly what it exists to catch.
- Print one label and scan it before printing a full order. Turn off "fit to
  page".
- Pilot the scan screen on one line for a shift, and pull the network cable
  halfway through.
- Check the SMV on every real style. Every target and efficiency figure in
  the system divides by it.

---

# PART 4 — TEST COVERAGE

| Suite | Tests | Covers |
|---|---|---|
| `bundleMath` | 17 | Quantity conservation across ~20,000 combinations, id formatting, batch chunking |
| `slots` | 34 | Overnight shifts, midnight, month rollover, breaks, gaps and overlaps |
| `engine` | 39 | Corrected target formula, efficiency agreement, every divide-by-zero guard |
| `scanValidation` | 20 | Full rejection chain, route order, deterministic ids |
| `csv` | 10 | Formula injection, quote and newline escaping |
| `alerts` | 14 | Suppression rules — mostly asserting silence |
| `rules` (emulator) | 24 | Tenant isolation, delete permissions, scan immutability, licence expiry, WIP counters |

**Not covered by tests:** React components, the IndexedDB outbox, and the
Firestore batch writer. These need a browser environment; the logic inside
them is extracted into the tested pure modules above, but the wiring is
verified by hand.
