# Upgrade — Tenancy and Licence Limits

**Read this before deploying. There are repair steps for data already in your
database.**

---

# What was wrong

## 1. Tenants and users were never linked

The vendor console created an organisation. The Users screen created users —
into **the signed-in person's tenant**, always. There was no code path that
put a user into a *named* tenant.

So creating a customer and then creating their administrator produced:

- a customer organisation with nobody in it, and
- an administrator sitting inside the **vendor tenant**, as SYSTEM_ADMIN,
  with full rights over vendor data

Which is exactly what you saw: "he got every access I got."

The trial guide documented this broken sequence, so following the
instructions produced the fault.

## 2. Licence limits were decorative

`maxFactories`, `maxModules` and `maxUsers` were written onto the licence
document and read by nothing. A customer on a one-factory trial could create
fifty factories. Every one of them billable.

---

# What changed

**A tenant and its first administrator are now created in one operation.**
`Vendor → New customer` takes the organisation details, the administrator's
details and the licence limits together, and writes the tenant, licence,
usage counter and administrator profile in a single atomic batch. There is
one way to create a tenant and it always ends with somebody in it.

**Limits are enforced by the database.** Each tenant carries a counter at
`tenantUsage/{tenantId}`. A factory, module or user may only be created
inside a batch that also moves that counter by exactly one, and the rules
refuse the write if the result would exceed the licence. A create that skips
the counter is refused outright, so the limit cannot be bypassed by simply
not counting.

**Factories need the top role.** Creating one now requires SYSTEM_ADMIN, not
MANAGER, because it is the most expensive thing a customer can add.

**Placing a user into another tenant is a vendor action.** The rules refuse
it for every customer role, which makes the original fault impossible rather
than merely discouraged.

**The interface explains the wall.** Screens show "3 of 5 modules used" and,
at the limit, "Your licence covers 5 modules and all 5 are in use. Contact
your supplier to add more." A permission error would be accurate and
commercially useless.

---

# Deploying

```bash
npm install          # nothing new, but harmless
npm run build
firebase deploy --only firestore:rules
firebase deploy --only hosting
npm run test:rules   # 31 rules tests, 7 of them for limits
```

The rules deploy is not optional. Without it the counters exist and nothing
checks them.

---

# Repairing what is already there

Do these in order, signed in as the vendor.

## Step 1 — Rebuild the usage counters

**Vendor → Rebuild counters.**

Every tenant created before this upgrade has no counter document. The rules
compare against it on every limited create, so **until this is run, every
factory, module and user create will be refused.**

It counts what each tenant actually has and writes the counter to match. It
also lists any account sitting in the vendor tenant that is not you.

## Step 2 — Deal with the misplaced administrator

The report from step 1 names them. You have two options.

**If the customer has not started using the system** — the cleaner path.
Disable that account from Administration → Users, then create the customer
properly from `Vendor → New customer`, which creates a fresh administrator
inside their own tenant. Give them the new credentials.

**If they have already entered data** — that data is in the vendor tenant
too, so it is your data by tenancy and moving it is not supported. Realistically
you want to start again: create the customer properly and re-enter. On a trial
that has barely begun this costs less than it sounds.

## Step 3 — Check your own tenant is clean

Administration → Users while signed in as yourself. The only account in the
`vendor` tenant should be you. Anything else is a leftover from the old flow.

## Step 4 — Set real limits

For each existing customer, **Vendor → Change what they are licensed for.**
Set the factory, module and user counts to what they are actually paying for.
The defaults from the old code were trial values.

---

# The role model, stated plainly

| | Where they live | What they control |
|---|---|---|
| **You — vendor admin** | Outside every tenant. Your UID in `firestore.rules` | Every customer, their plans, expiry dates and licensed counts |
| **SYSTEM_ADMIN** | Inside one customer tenant | Everything in their own tenant: users, settings, master data, factories up to their licensed number |
| **ADMIN** | Inside one customer tenant | Same, except creating factories |
| **MANAGER and below** | Inside one customer tenant | Production work. No user management, no factories |

`VENDOR_ADMIN` deliberately does not appear in the role list a customer
administrator can edit. If it did, any admin with user-management rights
could grant it to themselves.

**You authorise factories by setting the number**, not by approving each one.
A customer who has paid for three factories can create three. Per-request
approval does not scale past ten customers and makes you the bottleneck on
their Saturday morning setup.
