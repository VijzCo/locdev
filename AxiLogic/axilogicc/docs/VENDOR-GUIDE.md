# Loomline — Vendor Guide

**For the vendor super admin. Not for customers.**

This covers running Loomline as a product: creating customers, licensing
them, taking payment, and the things only you can do.

---

# 1. What you are

You hold **vendor admin**, which sits above every customer. It is not a role
inside the application — it deliberately does not appear in the role list any
customer administrator can edit, because if it did, any admin with user
management rights could grant it to themselves.

Your access comes from one place: a **`vendorAdmins/{your-uid}`** document in
Firestore. Customers cannot read that collection, so they cannot even tell it
exists, and no role inside a tenant can write to it — nobody can promote
themselves.

Adding a colleague is a database write, not a rules deploy.

If you lose the bootstrap account, recovery is through the Firebase console,
not through the app. That is intentional.

## Protecting it

- Use a real password manager and two-factor authentication on the Google
  account behind the Firebase project.
- Do not use the vendor account for day-to-day demos. Create a normal admin
  in a demo tenant instead.
- Never paste the bootstrap UID into a support ticket or a screen share.

---

# 2. First-time setup

Once per Firebase project.

1. Create the Firebase project. Enable **Firestore** and **Authentication →
   Email/Password**.
2. Sign up once through the app to create your own Auth account.
3. Copy your UID from **Authentication → Users**.
4. Create `vendorAdmins/{your-uid}` in Firestore with one field,
   `grantedAt`. This is what grants vendor access.
5. Deploy: `firebase deploy --only firestore:rules,firestore:indexes`
6. Create your own user profile document by hand in Firestore, at
   `users/{your-uid}`:

```
tenantId    : "vendor"
displayName : your name
email       : your email
role        : "SYSTEM_ADMIN"
disabled    : false
scanAccess  : "BOTH"
capabilities: []                      ← empty array, or omit the field
scope       : { factoryIds: [], departmentIds: [],
                sectionIds: [], moduleIds: [], shiftIds: [] }
```

Two traps here. The document id must be exactly your UID, not an auto-generated
one. And `capabilities` must be empty or absent — a list containing anything
unusable, including an empty string, is read as "these are my only
capabilities", which resolves to none and locks you out of every screen.

7. Sign in. A **Vendor** link appears in the top bar.

Email/password sign-up stays enabled because client-side account creation
needs it. That is safe: an Auth account with no profile document can read and
write nothing at all.

---

# 3. Onboarding a customer

**Vendor → New tenant.** Enter the organisation name and a contact email.
This creates the tenant and starts a 30-day trial automatically.

Then create their first administrator from **Users**, with role
`SYSTEM_ADMIN`. Write the password down before saving — you cannot look it up
afterwards, only trigger an email reset.

Hand over: the URL, their administrator credentials, the user manual, and the
onboarding checklist so they can gather their own data.

Expect setup to take a customer half a day if their data is ready and a week
if it is not. The checklist exists to move that work before the trial clock
starts.

---

# 4. How licensing works

## The licence document

Each tenant has one document at `licenses/{tenantId}`. Customers can **read**
it — the app shows them their status — but no role inside a tenant can write
it at any level. Only you can.

```
plan         TRIAL | PAID
status       TRIAL | ACTIVE | GRACE | EXPIRED | SUSPENDED
billingCycle MONTHLY | YEARLY | null
startsAt     when it began
expiresAt    when it runs out
graceUntil   when writes actually stop
limits       factories, modules, users, bundles per month, features
```

## What enforcement actually means

The check lives in the Firestore security rules, not in the client. A
customer cannot extend their own trial by editing the JavaScript, changing
their device clock, calling the API directly, or restoring a backup. The
database refuses the write. This is real enforcement.

## The states

| State | What the customer experiences |
|---|---|
| **TRIAL** | Everything works. A countdown banner appears in the last 7 days. |
| **ACTIVE** | Everything works. Renewal notice from 14 days out. |
| **GRACE** | Everything still works, with a warning banner. Default 7 days after expiry. |
| **EXPIRED** | **Read only.** Dashboards, bundle history and reports still work. Exports still work. Scanning and configuration stop. |
| **SUSPENDED** | Sign-in blocked entirely. For non-payment after grace, or abuse. |

**Expiry degrades rather than locking out, deliberately.** A factory that
suddenly cannot see yesterday's production has an emergency and blames you. A
factory that can see everything but cannot scan has an immediate reason to
renew and no reason to distrust you with their data. Never hold a customer's
production history hostage — it is both hostile and bad business.

Grace exists because a bank transfer taking three days should not stop a
production line.

## Taking payment

There is no payment webhook, because that needs a server endpoint and the
system runs without one. So:

```
Customer decides to buy
   ↓
You invoice them — Stripe payment link, bank transfer, whatever suits
   ↓
Payment lands. You confirm it.
   ↓
Vendor console → Activate monthly / Activate yearly
   ↓
Their app updates within seconds. No sign-out needed.
```

For a monthly customer that is twelve actions a year. At twenty customers it
is a few minutes a month, and it gives you a natural checkpoint to notice
churn risk before renewal.

**When to automate.** Past roughly 20–30 paying tenants, or when you want
self-service card payment, add one Cloud Function as a Stripe webhook that
writes the licence document. It is a contained change — around eighty lines —
and everything above was designed so it drops in without rework. Building it
now would cost real time and solve a problem you do not have.

## Every change is recorded

Licence changes append to `licenseEvents`, which is create-only and readable
only by you. If a customer disputes what they were sold, the trail is there.

## Offline and licensing

The licence is cached, so an expired tenant sees read-only even without a
connection. A device scanning offline past expiry has its writes refused on
sync, and those appear in the operator's rejected-scan list.

---

# 5. Trial limits

Defaults, all adjustable per tenant:

| | Trial | Paid |
|---|---|---|
| Duration | 30 days | Monthly or yearly |
| Factories | 1 | Set per customer |
| Modules | 5 | Set per customer |
| Users | 10 | Set per customer |
| Bundles per month | 5,000 | Unlimited |
| Wall display | Yes | Yes |
| Report export | Yes | Yes |

Two things worth holding to. **The trial must run one real production line
for a full month** — a factory cannot evaluate a WIP system on toy data, and
a trial that cannot handle a real line proves nothing. And **do not cripple
exports during the trial**: a factory that cannot get its data out will not
trust you with a year of production history.

---

# 6. Day-to-day vendor work

**Vendor console** shows every tenant with status, plan, expiry and days
remaining.

Watch for:

- **Tenants expiring in the next 30 days** — invoice before, not after.
- **Tenants with no activity for a week** — a factory that has stopped
  scanning has stopped getting value, and will not renew. Better to find out
  now than at renewal.
- **Usage against limits** — a customer pressed against their module limit is
  a customer ready for a bigger plan.

## Suspending

Use it for non-payment after grace has run out, or for abuse. It blocks
sign-in entirely, which is a much blunter instrument than expiry. Warn first;
reactivating is one click but the relationship damage is not.

---

# 7. Looking at a customer's system

**Vendor → their card → Open their system.**

You then see their factories, dashboards, WIP, bundles and reports exactly as
they see them, without needing their password. A loud banner sits across the
top the whole time, and it cannot be dismissed.

**It opens read-only.** Support changes are off until you press *Allow
changes* in the banner, which turns it red. Editing a customer's shift times
while believing you are in your own account is a mistake that only has to
happen once.

**Press Leave** to return to the vendor console. Support access is held in
session storage, so closing the tab drops it — it cannot be left on
overnight by accident.

This replaces the old habit of signing in with the customer's own
credentials. That worked, but it left no way to tell their actions from
yours, and it broke the moment they changed their password.

---

# 8. Support tasks only you can do

**Extend a trial.** Vendor console, adjust the expiry. Free, instant,
and often the right answer when a customer's setup slipped.

**Fix a locked-out administrator.** If a customer's only admin loses access,
you can edit their `users/{uid}` document directly in Firestore. Check
`disabled` is false and `capabilities` is empty or absent.

**Move a factory between tenants.** Do not. `tenantId` is immutable on user
documents specifically to prevent it, and there is no supported path. Create
fresh records instead.

**Delete a customer.** There is no automated teardown. Delete the tenant's
documents from the Firestore console, or leave them and suspend the licence —
which is usually better, since customers return.

---

# 9. Backups

Firestore does not back itself up on the Spark plan. Before you have paying
customers this does not matter. After that it does.

Options: enable scheduled exports on the Blaze plan, or export manually with
`gcloud firestore export` on a schedule you keep.

A customer losing a month of production history is the failure that ends the
business relationship. Decide your position on this before the first paying
customer, not after.

---

# 10. Known limitations to be honest about

Tell customers these up front rather than letting them discover them:

1. Accounts cannot be permanently deleted from the app. Disabling denies all
   data access, but the credential still exists.
2. Administrators cannot set a password after creating an account, only
   trigger an email reset.
3. Time-slot restrictions are enforced in the app and recorded in the audit
   trail, but not blocked at the database level.
4. An invalid scan made offline is accepted on the device and refused when it
   syncs — correctness holds, but feedback is delayed.
5. WIP history depends on someone having a dashboard open during that hour.
6. Reconciliation is manual, not scheduled.

Items 1, 2 and 6 are all solved by adding one Cloud Function, if a customer's
requirements make them blocking.
