# Loomline — User Manual

Bundle tracking, WIP and production monitoring for garment factories.

This manual is organised by job. Find your role, read that section, and
ignore the rest.

---

# What the system does

Every bundle of cut panels gets a barcode label. Operators scan it into a
module and out again. From those two scans the system works out where every
bundle is, how much work is sitting at each line, how much each line has
produced this hour, and whether the order will finish on time.

Nothing is typed in twice. If the scanning is done, the numbers follow.

---

# Roles

| Role | What they do |
|---|---|
| **Operator** | Scans bundles in and out at a module |
| **Supervisor** | Watches WIP and output, plans the day, feeds the lines |
| **Manager** | Factory-wide dashboards, reports, planning |
| **Admin** | Everything above, plus users, settings and master data |
| **Viewer** | Read-only dashboards and reports |

Your administrator can also restrict you to specific modules, and to scanning
in only, out only, or both.

---

# For operators — scanning

This is the whole job. Two screens: **Production → Scan in** and
**Production → Scan out**.

## Setting up your station

Choose your module from **Station** at the top. The screen remembers it, so
you only do this once on that tablet.

## Scanning

Just scan. No box needs to be clicked first — the screen is listening.

**Listen rather than watch.** Three different sounds:

| Sound | Meaning |
|---|---|
| Rising two-note chirp | Accepted |
| Low buzz | Rejected — look at the screen |
| Two identical beeps | You already scanned that one. It was counted once |

There is a mute button if the floor is quiet enough to work without it.

The big banner across the middle shows the result: **green** accepted,
**amber** already scanned, **red** rejected.

## If a label is damaged

Type the bundle id into the box at the bottom and press Enter. The id is
printed under the barcode.

## Messages you might see

| Message | What to do |
|---|---|
| Barcode not found | Wrong label, or bundles were never generated for this order. Tell your supervisor |
| Bundle is already inside M04 | It was scanned in elsewhere. It must be scanned out there first |
| Bundle is inside M03, not M01 | You are at the wrong station, or someone scanned it in by mistake |
| Bundle must complete cutting before sewing | It skipped a stage. Tell your supervisor |
| You do not have permission for this module | Your account is not set up for this station |
| Production entry is closed | It is a break, or outside shift hours. The screen says when it reopens |
| Bundle was cancelled | The order line was cancelled. Set it aside |

## Working offline

If the network drops, **keep scanning**. The screen turns amber and says
"Offline". Everything is saved on the tablet and sent when the connection
returns.

Two things to watch:

**"3 scans waiting to sync"** — normal while offline. It should return to
zero within a minute of reconnecting.

**"The oldest unsent scan is 45 minutes old"** — not normal. Tell a
supervisor. The tablet has not reached the server in a while.

**Refused scans.** A scan that broke a rule while you were offline is only
refused when the connection returns. Those appear in a red box at the bottom
of the screen with the reason. Those pieces were **not** counted. Show a
supervisor before dismissing them.

Never turn off or reset a tablet showing scans waiting to sync.

---

# For supervisors

## Through the day

**WIP dashboard** is the screen to leave open. It lists modules with the most
urgent first.

| Colour | Meaning | Do |
|---|---|---|
| 🔴 Red | Over WIP | Stop feeding this module |
| 🟢 Green | Normal | Nothing |
| 🟡 Amber | Below reorder | Feed it soon |
| ⚪ Grey | Critically low, or no plan today | Feed it now, or set a plan |

**The bell** in the top bar collects everything needing attention: over WIP,
lines running out of work, modules behind target, forecasts landing short,
and any module that recorded nothing in the last hour.

An hour with no output usually means a missed OUT scan rather than a stopped
line. Both are worth chasing — both distort the numbers.

Dismissing an alert hides it on that device until tomorrow. It comes back if
the problem recurs.

## Daily plans

**Planning → Daily plans.** Each module needs one per day, or it has no
target and is not being measured.

A plan needs the module, shift, style, operator count, SMV and planned
efficiency. The target is calculated and shown as you type, so you can see
whether moving two operators is worth doing before you commit.

## Finding a bundle

**Production → Bundle tracking.** Scan or type the id. It shows everywhere
that bundle has been, with times.

---

# For planners — orders and bundles

## Purchase orders

**Planning → Purchase orders → New order.** PO number, buyer, factory, ship
date.

Then add a line for each style, colour and size combination, with the order
quantity and the bundle size.

Before you generate anything, the screen tells you exactly what you will get:

> 52 bundles · 51 × 20 plus one of 10 · 1,030 pieces total

When the quantity does not divide evenly the **last bundle is short**. The
system never rounds up or loses pieces — the total always matches the order
exactly.

## Generating bundles

Press **Generate bundles** on the line. This creates every bundle with its
own id. It can only be done once per line; to redo it, cancel the bundles
first.

Cancelling skips any bundle already scanned. Production history is never
rewritten.

## Printing labels

**Planning → Bundles & labels.** Filter down to what you need — by order,
style, size, status, or a bundle number range — then print. Selecting nothing
prints everything shown.

**Before printing a full order, print one label and scan it.** In the printer
dialog, turn **off** "fit to page". Scaling changes the barcode width and can
make it unreadable.

A bundle printed before is marked **RE** on the label and shows a count in
the list. A bundle printed four times usually means the physical bundle is
lost, or someone is making duplicate tickets for the same work.

---

# For managers — dashboards and reports

**Factory dashboard** — every module, live.
**Department dashboard** — the same, narrowed.
**Module dashboard** — one line in detail, hour by hour.
**Wall display** — fullscreen for a TV on the floor. Rotates through modules.

## Reading the numbers

**Target** comes from the daily plan: operators × production minutes ×
planned efficiency, divided by SMV.

**Achievement** is actual against target.

**Efficiency** is the standard minutes produced against the minutes worked
*so far*, not the whole shift. That is why a good line reads near 100% at
mid-morning rather than 50%.

**Forecast** projects the rate achieved so far across the hours remaining. It
stays blank early in the shift on purpose — a forecast from twelve minutes of
data is worse than none, because people act on it.

**An em dash (—) means no data, not zero.** No plan means no target, and the
system will not invent one.

## Reports

Production, efficiency, WIP, bundle history and PO completion, all with a
date range and CSV export for Excel.

The bundle report flags bundles sitting in one module for more than a day.

---

# For administrators

## Setting up, in order

Each step needs the one before it.

1. **Factories** — name, code, timezone
2. **Departments** — cutting, sewing, finishing; each mapped to a stage
3. **Sections** — groups of modules
4. **Modules** — the production lines, with operator counts
5. **Styles** — code, SMV, colours, sizes, route
6. **Shifts** — hours, hourly slots, and which are breaks
7. **Users**
8. **WIP thresholds**

**Master data → Hierarchy** shows the whole tree, which is the quickest way
to catch a module attached to the wrong section — a mistake that stays
invisible until bundles start going to the wrong place.

## SMV deserves care

Every target and efficiency figure in the system divides by the style's SMV.
A wrong SMV does not look wrong; it just makes a good line look bad or a poor
line look excellent. Check them against your own time studies.

## Users

**Administration → Users → Add user.**

People sign in with a **username and password**, not an email. Usernames are
lowercase with no spaces — `m01`, `a.smith`, `cutting.01`. The form suggests
one from the person's name.

Usernames are shared across every customer of this system, so a common one
may already be taken. Something specific — `nf.admin` rather than `admin` —
avoids that.

Anyone with a real email address on their account can sign in with that
instead, and can reset their own password.

Set a **recovery email** for administrators at least. Without one there is no
way to reset a forgotten password, and the account has to be replaced.

**Write the password down before saving.** It cannot be looked up afterwards,
only reset by email.

Set **scan access** to IN, OUT or BOTH. Leaving module scope empty means the
user can work at any module, which is right for a floating supervisor and
wrong for a fixed station.

## Settings

**Global settings** apply to your whole organisation. **Factory settings**
override them for one factory. WIP thresholds can also be set per module.

Every field says where its current value came from — "From Organisation",
"From Factory", or "Set here". Changing a value here creates an override that
applies to this level and everything below it. Clearing an override returns
it to whatever it inherits.

## Shifts and breaks

A break in the wrong place is not a cosmetic error. Break time is excluded
from production minutes, which changes every target, efficiency and forecast
figure in the factory. The timeline bar on the shift screen exists so a
misplaced break is obvious at a glance.

Shifts crossing midnight are handled properly: a night shift starting Monday
at 22:00 books its 02:00 output to **Monday**, not Tuesday.

## Checking WIP is correct

**Administration → Audit log → Check for drift.** This rebuilds every WIP
counter from the scan records and reports any difference.

Scan records are what actually happened; the counters are a fast copy. They
should always agree. If they do not, the check shows exactly which modules
and by how much before anything is changed.

Worth running weekly, and after any incident where tablets were offline for a
long time.

---

# Common problems

**A module shows no target.** No daily plan for today, or the plan has no
SMV or operator count.

**Efficiency looks impossibly high or low.** Check the style's SMV, then the
operator count on the plan.

**A bundle cannot be scanned anywhere.** Look it up in bundle tracking. It is
probably still shown as inside a module, so it needs scanning out there
first.

**WIP keeps climbing on one module.** Bundles are being scanned in but not
out. Check whether that station's operator has OUT access.

**Everything reads zero.** Check a shift is running and it is not a break
slot. Outside shift hours the system correctly shows nothing.

**A tablet keeps saying scans are waiting to sync.** It is not reaching the
server. Check its network before the shift ends — the scans are safe on the
device, but they are not in the system until they sync.
