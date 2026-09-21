# Setting Up a Customer Trial

Start to finish, for one new customer. Roughly 40 minutes of your time plus
however long their data takes to enter.

Do this in one sitting. A half-configured tenant that a customer logs into is
worse than one they cannot log into yet.

---

# Before you start

You need:

- Their completed setup workbook, or at minimum their factory, departments,
  sections, modules and one style with a real SMV
- A contact name and email for their administrator
- Your vendor account signed in, with the **Vendor** link visible in the top bar

If the workbook is not back yet, do not start. Entering guessed data and
fixing it later means the trial clock runs on a system showing wrong numbers,
and their first impression is of a tool that lies.

---

# Step 1 — Create the customer and their administrator

**Vendor → New customer.** One form, one action.

- Organisation name and contact email
- **Their first factory** — name, code and timezone, created with the tenant
- Their administrator's name, **username**, and a password of at least 8
  characters
- Optionally a recovery email for the administrator
- What they are licensed for: trial days, and how many factories, modules
  and users

Save. The organisation, its licence, its usage counters and its first
administrator are all created together, and a **30-day trial starts
immediately**.

**Never create a customer's administrator from Administration → Users.**
That screen creates users inside *your own* tenant, so the account would land
in the vendor tenant with rights over your data and the customer would have
nobody in theirs. The vendor console is the only correct path, and the rules
now refuse the wrong one.

**Usernames are shared across all customers**, so `admin` will be taken
quickly. Use something specific such as `nf.admin`.

**Write the password down before you save.** It cannot be looked up
afterwards. Send it by a different channel to the sign-in link.

**Set a recovery email for the administrator.** Without one, a forgotten
password means that account has to be replaced — there is no reset path for
a username-only login.

**The limits you set here are enforced by the database**, not the interface.
A customer cannot create a sixth module on a five-module licence however they
try. Set them to what they are paying for.

The clock is now running, which is why everything else happens today. If
their data will not be ready for a week, create the customer in a week.

---

# Step 2 — Enter the master data

Sign in as their administrator, not as yourself, so you see what they will
see. Enter in this order — each step depends on the one before it:

| Order | Screen | From the workbook |
|---|---|---|
| 1 | Master data → Factories | Sheet 1 — the first one already exists |
| 2 | Master data → Departments | Sheet 2 |
| 3 | Master data → Sections | Sheet 3 |
| 4 | Master data → Modules | Sheet 4 |
| 5 | Master data → Styles | Sheet 5 |
| 6 | Planning → Shifts & slots | Sheet 6 |

**Check the hierarchy screen when you finish.** Master data → Hierarchy shows
the whole tree. A module attached to the wrong section is invisible
everywhere else until bundles start going to the wrong place.

## On shifts

Enter the times, then mark the break slots by tapping them. The timeline bar
turns grey where the breaks are — check it matches their actual day before
moving on.

Break minutes are excluded from production time, so a break in the wrong slot
changes every target and efficiency figure they will ever see.

---

# Step 3 — Settings

**Administration → Global settings**

| Set | To |
|---|---|
| Company name | Their name. It prints on labels and shows on the wall display |
| Timezone | Theirs, not yours |
| Default bundle quantity | Whatever they cut to now |
| Label width and height | Their label stock, before anything is printed |

**Administration → Factory settings** if a second factory differs.

**WIP configuration** — one set of thresholds for the whole factory from
sheet 7. Do not tune per module yet; that is a conversation after a week of
real data.

---

# Step 4 — Their users

Signed in as their administrator, **Administration → Users**, from sheet 8.

The screen shows how many accounts their licence covers and stops at that
number with a sentence explaining why, rather than a permission error.

Two things that matter more than they look:

**Scan access.** A dedicated end-of-line station should be **OUT** only. A
module where one person does both is **BOTH**. Getting this wrong is the
commonest setup fault.

**Module scope.** Empty means any module, which is right for a floating
supervisor and wrong for a fixed station. Fixed stations should be restricted
to their own module.

Operators sign in with the company code and a username such as `m01` or
`a.smith`. The form suggests one from their name. No email is needed.

Recovery emails are optional for operators and worth setting for anyone whose
account would be awkward to replace.

Write down every password as you go. Hand over one sheet at the end.

---

# Step 5 — Load one real order

**Planning → Purchase orders → New order**, from sheet 9.

Use a genuine current order. A factory cannot evaluate a WIP system on
invented data, and a trial run on fiction proves nothing to anybody.

Add a line, check the preview reads what you expect —

> 52 bundles · 51 × 20 plus one of 10 · 1,030 pieces total

— then **Generate bundles**.

---

# Step 6 — Print and test one label

**Planning → Bundles & labels**, filter to that order, select one bundle,
print it.

In the printer dialog, turn **off** "fit to page". Scaling changes the
barcode width and can make it unscannable.

**Scan the printed label before printing anything else.** If it does not
read, the label size or the printer settings are wrong, and finding that out
after 500 labels is an expensive way to learn it.

Then print the rest of the order.

---

# Step 7 — Walk one bundle through

Before anyone else touches it, take a single bundle end to end yourself:

1. **Production → Scan in** at the cutting module — expect the rising chirp
2. **Scan out** — expect the chirp again
3. **Scan in** at a sewing module
4. Check the **WIP dashboard** shows that module's pieces going up
5. **Scan out**
6. Check **Hourly output** shows the pieces in the current slot
7. Look it up in **Bundle tracking** — the full journey should be there

If any step surprises you, stop and fix it now.

Then deliberately test two failures, so you know what they look like:

- Scan the same bundle twice → two identical beeps, amber banner, "counted
  once"
- Turn off the wifi and scan → keeps working, shows "waiting to sync", then
  clears when you reconnect

---

# Step 8 — Daily plans

**Planning → Daily plans**, one per module for tomorrow.

Without a plan a module has no target and is not measured — the dashboards
will show grey and em dashes, and the customer will think the system is
broken.

Set them for the first week at least. Show their supervisor how to do it
before you leave.

---

# Step 9 — Hand over

Give them:

- The URL
- Their administrator credentials, by a separate channel to the URL
- The password sheet for their operators
- **USER-MANUAL.md**
- The date the trial ends, in writing

Show them, in this order and in person if you can:

1. **The scan screen** — this is where the value is. Let an operator do it
2. **The WIP dashboard** — the colours, and what to do about each
3. **The alert bell**
4. **Daily plans** — because nothing works without them
5. **Reports and export**

Ten minutes on the scan screen is worth an hour on everything else. If the
scanning does not happen, no other screen has anything to show.

---

# Step 10 — Diary three dates

| When | Do |
|---|---|
| **Day 3** | Call. Are they actually scanning? Check the vendor console for activity |
| **Day 14** | Review the numbers with them. Do efficiency figures look right? If not, it is the SMV |
| **Day 25** | Renewal conversation, before the trial ends, not after |

A tenant that stops scanning in week one will not renew, and week one is when
you can still fix why.

---

# If the trial needs longer

**Vendor → the tenant → adjust the expiry.** Free and instant.

Extending is usually the right answer when the delay was setup rather than
disinterest. A customer who has not evaluated it properly will not buy it,
and a rushed no is harder to reverse than a slow yes.

---

# When they buy

**Vendor console → Activate monthly** or **Activate yearly**, once payment
has landed.

Their app updates within seconds. Nobody needs to sign out. Nothing is lost —
the trial data is their production data and it carries straight over.

---

# What to watch during the trial

Check the vendor console weekly.

| Sign | What it means |
|---|---|
| Scanning stopped after a few days | The workflow did not stick. Call now, not at renewal |
| WIP climbing on one module and never falling | Bundles scanned in but not out. Usually an OUT-access problem |
| No daily plans entered | Nobody was shown how, or nobody owns it |
| Efficiency figures nobody believes | Almost always the SMV |

The last one is worth stating plainly to them at handover: **if the
efficiency numbers look wrong after a week, check the SMV before anything
else.** It is the single input that silently distorts everything downstream,
and a customer who does not know that will blame the software.
