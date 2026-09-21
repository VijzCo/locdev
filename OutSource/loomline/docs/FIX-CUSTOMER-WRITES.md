# Fix — Customers Could Not Save Anything

**Read this before deploying. There are two manual steps.**

---

# The root cause

One line in `firestore.rules`:

```
request.time < licence().graceUntil
```

`request.time` is a Firestore **timestamp**. `graceUntil` is written by the
application as an ISO **string**. Comparing a timestamp to a string is a type
error: the expression fails to evaluate, and a rule that fails to evaluate
**denies**.

That condition sits inside `licenceAllowsWrite()`, which every customer write
passes through. So no customer could create a factory, a department, a style,
a shift or anything else. The refusal came back as "missing or insufficient
permissions", which names no cause.

**Your own account was never affected**, because `licenceAllowsWrite()` starts
with `isVendorAdmin() ||` and short-circuits before reaching the broken
comparison. That is precisely why it looked like a problem with the customer's
role, or their licence, or their limits — everything I checked on your side
worked, because your side never ran that line.

## What changed

Licence dates are now stored as **epoch milliseconds** alongside the ISO
strings, and the rule compares `request.time.toMillis()` against a number.
Numbers are unambiguous on both sides.

Licences written before this have no millisecond fields. Rather than lock
those customers out, the rule falls back to the status check alone for them.
Fail-open on the date is deliberate: a paying customer locked out of their own
system is worse than a few days of grace you can correct. The repair tool
backfills them.

---

# Vendor access no longer lives in the rules

You also asked why your UID had to be edited into `firestore.rules` every
time. It no longer does.

Vendor access is now granted by the presence of a **`vendorAdmins/{uid}`**
document. Create it once by hand; after that, adding a colleague is a database
write rather than a rules deploy.

The collection is unreadable and unwritable by every customer role, so nobody
can promote themselves from inside the application. If the last document is
deleted, recovery is through the Firebase console — the same position as
before, but without the environment-specific constant sitting in a file that
belongs in version control.

---

# Deploying

## Step 1 — Grant yourself vendor access

**This must be done before deploying the rules**, or you will lock yourself
out of the vendor console.

Firebase console → Firestore → Start collection:

- Collection ID: `vendorAdmins`
- Document ID: **your Firebase UID**, exactly as it appears under
  Authentication → Users
- One field: `grantedAt`, string, today's date

## Step 2 — Deploy

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

## Step 3 — Repair existing customers

Sign in, open **Vendor → Repair all customers**.

This converts every licence's dates to milliseconds and rebuilds each
customer's usage counters from what is actually in the database. Until it
runs, existing customers rely on the fallback and their counters may be wrong.

## Step 4 — Check it worked

Open the customer's system from the vendor console — **Open their system** —
then Administration → Licence. The diagnostics panel should show:

- Role: SYSTEM ADMIN
- Can save changes: yes
- Factories: counter and actual agreeing, under the licensed number

Then try creating a factory as their administrator. It should save and stay.

---

# Why this took so long to find

Worth stating plainly, because it says something about how to test this
system.

I wrote and revised these rules five times without ever executing them. The
Firestore emulator needs a file my environment cannot download, so the 31
rules tests have never run here. My unit tests passed throughout and told me
nothing, because they test pure functions and this was a type mismatch inside
a rules expression.

Each round I proposed a plausible cause — the licence limit, the role, a
missing counter, `increment()` transforms, dynamic map indexing. Several of
those were real problems and are genuinely fixed. None of them was the one
blocking you.

**Run `npm run test:rules` after deploying.** It needs Java and the Firebase
CLI, takes about a minute, and it is the only thing in this project that
actually exercises the file where all of these bugs lived. There are now
regression tests for the date comparison and for vendor access specifically.
