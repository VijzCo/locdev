# Onboarding Checklist

**What to collect from a factory before setting up Loomline.**

Give this to the customer at the first meeting. Setting up takes half a day
if this is ready and a week if it is not — and on a 30-day trial, that week
comes out of their evaluation.

Everything here must exist before a single bundle can be scanned, because
each item depends on the one above it.

---

# 1. Factories

| Field | Notes |
|---|---|
| Name | As people say it: "Northfield Mill", not "Northfield Mill Manufacturing (Pty) Ltd" |
| Short code | 2–4 characters, appears on labels |
| Timezone | The IANA name, e.g. `Africa/Maseru`, `Asia/Dhaka` |

**Ask:** how many factories, and will they ever be viewed together? A group
with two plants under one management usually wants one tenant with two
factories, not two accounts.

---

# 2. Departments

One per production stage they want tracked.

| Field | Notes |
|---|---|
| Name | Cutting, Sewing, Finishing |
| Code | CUT, SEW, FIN |
| Stage | Which stage of the route it represents |
| Factory | Which factory it belongs to |

**Ask: where should tracking start and stop?** The usual answer is cutting
out to sewing out. Tracking further costs more scanning, and every extra scan
is time an operator is not sewing. It can be extended later without rebuilding
anything.

---

# 3. Sections

Groups of modules within a department. Some factories do not use them — if
so, create one section per department and move on.

| Field | Notes |
|---|---|
| Name | "Section A", "Line 1–6" |
| Code | S01 |
| Department and factory | |

---

# 4. Modules — the production lines

This is the list that matters most. Get it exactly right.

| Field | Notes |
|---|---|
| Code | M01, M02 — must match what is painted on the floor |
| Name | Full name if different |
| Section, department, factory | |
| Operator count | Typical headcount when running normally |

**Ask:**

- How many modules in total?
- Do module codes repeat across factories? They may — the system handles it,
  but you need to know.
- Which modules are seasonal or idle? Set them inactive rather than deleting.

**The codes must match the floor.** A supervisor reading M04 on a screen and
M4 on a wall will not trust either.

---

# 5. Styles — and SMV

Every target and efficiency figure divides by SMV. This is the single most
important number to get right, and the one most often guessed.

| Field | Notes |
|---|---|
| Style code | ST-1001, or their own numbering |
| Description | "Long sleeve polo" |
| **SMV** | Standard minutes per garment, for the whole garment |
| Colours | Every colour ordered in this style |
| Sizes | Every size |
| Route | Which stages this style passes through, in order |

**Ask:**

- Where do their SMVs come from? A time study, a buyer's spec, or an
  estimate? An estimated SMV will make a good line look bad, and nobody will
  know why.
- Do they hold SMV per operation or per garment? The system uses one figure
  per garment.
- How many active styles at any one time? Ten is manageable to enter by hand;
  two hundred needs a conversation about import.

**Start with the five styles running next month, not the whole catalogue.**

---

# 6. Shifts and breaks

| Field | Notes |
|---|---|
| Shift name | Shift A, Day, Night |
| Start and end times | |
| Hourly slots | Usually one per hour |
| Which slots are breaks | Tea, lunch |

**Ask:**

- How many shifts, and do any cross midnight? Overnight shifts are handled,
  but confirm which night a shift belongs to in their own reporting — the
  system books a Monday-night shift's 02:00 output to Monday.
- Are break times the same every day and for every module?
- Do different factories have different shifts?

**Break times must be exact.** Break minutes are excluded from production
time, so a break entered in the wrong place changes every target and
efficiency number in the factory.

---

# 7. WIP thresholds

Per module, or one set for all of them to start with.

| Field | Meaning |
|---|---|
| Minimum | Below this the module is critically low (grey) |
| Reorder | Below this it needs feeding soon (amber) |
| Maximum | Above this it is over WIP (red) |

**Ask:** how many pieces normally wait at a line before it is considered
overloaded? Most supervisors know this instinctively even if it has never
been written down. Sit with one and get real numbers.

Start with a single set for the whole factory and tune per module after a
week of real data. Precision here before go-live is guesswork.

---

# 8. People

| Field | Notes |
|---|---|
| Name | |
| Email | Operators may not have one — use `name@factory.local` |
| Role | Admin, Manager, Supervisor, Operator, Viewer |
| Modules | Which they may scan at. Empty means all |
| Scan access | IN, OUT, or BOTH |

**Ask:**

- One login per person, or one per scanning station? Shared station logins
  are common and supported, but then the audit trail shows the station, not
  the person.
- Who is the administrator? They need to be someone who will still be there
  in six months.

**Scan access matters.** A dedicated end-of-line station should be OUT only.

---

# 9. Orders

To scan anything they need at least one real order loaded.

| Field | Notes |
|---|---|
| PO number | |
| Buyer | |
| Ship date | |
| Lines | Style, colour, size, order quantity |
| Bundle size | Default 25, changeable per line |

**Ask:** what bundle size do they cut to now? Do not change their habits for
the system.

**Get one real, current order for the trial.** A factory cannot evaluate a
WIP system on invented data.

---

# 10. Hardware and network

Not data, but it decides whether any of this works.

**Scanners.** USB keyboard-wedge scanners are the assumption — they type the
barcode and press Enter. Tablets can use their camera as a fallback. Confirm
what they have or intend to buy.

**One scanning device per module**, at minimum. Two if a module scans IN and
OUT at physically separate points.

**Label printer and stock.** Thermal, 50 × 30 mm by default. Confirm the
label size before printing anything — it is configurable, but the barcode
must fit.

**Network.** Ask honestly how reliable wifi is on the floor. The answer is
usually "mostly fine", and the honest answer is usually worse. The system
works offline either way, but it changes what you tell operators to expect.

**A screen for the wall display**, if they want one. Any TV with a browser,
or a cheap stick PC.

---

# 11. Before go-live

- [ ] All of the above entered and checked on the hierarchy screen
- [ ] SMVs verified against their own time studies, not estimated
- [ ] One label printed and scanned successfully
- [ ] One bundle scanned all the way through: cutting in, cutting out,
      sewing in, sewing out
- [ ] Network deliberately disconnected mid-shift to see offline behaviour
- [ ] Daily plans entered for tomorrow
- [ ] Supervisors shown the WIP dashboard and the alert bell
- [ ] Operators shown the three scan sounds
- [ ] Administrator knows how to add a user and run the WIP drift check

---

# What good looks like after a week

- Every module has a daily plan every day
- WIP counts match what a supervisor sees on the floor
- No tablet holding unsynced scans at end of shift
- Efficiency figures that supervisors recognise as roughly true

If efficiency looks wrong after a week, it is almost always the SMV.
