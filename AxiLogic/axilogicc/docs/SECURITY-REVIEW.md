# Security Review

A pass over the system looking for ways a signed-in user could do something
they should not. Four real holes, all closed. The interesting part is that
none of them were about breaking in — every one was about what a legitimate
account could do once inside.

---

# Closed in this pass

## 1 · Privilege escalation inside a tenant — **critical**

**What was possible.** The user update rule allowed `SYSTEM_ADMIN` and
`ADMIN` to write any user document in their tenant, including their own. An
ADMIN could therefore set their own role to SYSTEM_ADMIN. A disabled
administrator could also re-enable themselves, since the same rule let them
write the `disabled` flag.

**Why it mattered.** Roles are the only thing separating a supervisor from
someone who can change every threshold, add users and export the entire
production history. A role field anyone can write is not a role.

**Closed.** Only a SYSTEM_ADMIN may change a role, and nobody may change
their own — not even a SYSTEM_ADMIN. `tenantId` was already immutable.

## 2 · Scans could claim any quantity — **critical**

**What was possible.** A scan event carried its own `qty` and nothing
checked it against the bundle. An operator with a browser console could have
recorded a 25-piece bundle as 9,999 and inflated the factory's output,
efficiency and forecast in one write.

**Why it mattered.** Production figures are the entire product. A system
whose numbers can be typed by the person being measured is worse than a
clipboard, because it looks authoritative.

**Closed.** The rule now reads the bundle and requires the quantity to match.
Bundle quantity is fixed at creation and never changes, so the comparison is
safe.

## 3 · Audit log forgery — **high**

**What was possible.** Any signed-in user could create an audit entry
attributed to anybody. An operator could have logged a label reprint against
their supervisor.

**Why it mattered.** A forged entry is worse than no audit trail. An absent
trail is obviously absent; a forged one is believed.

**Closed.** An entry must name the person writing it. Entries were already
immutable and undeletable.

## 4 · Licence limits could be zeroed — **medium**

**What was possible.** Any tenant member could write the usage counter. Set
`factories` to 0 and the limit check passes indefinitely.

**Closed.** Only the roles that can create a counted record may write the
counter. A determined administrator can still edit it — that trade is
documented — but an operator cannot, and the vendor console shows the
counter beside a real document count so tampering is visible.

---

# Checked and found sound

**Tenant isolation.** Every collection filters on `tenantId`, the field is
immutable on user documents, and placing a user into another tenant is a
vendor-only action. Tested.

**Accounts without a profile.** An Auth account with no `users/{uid}`
document can read and write nothing. This is what makes it safe to leave
email/password sign-up enabled, which client-side account creation requires.

**Vendor access.** Granted by a `vendorAdmins/{uid}` document that no
customer role can read or write. Nobody can promote themselves from inside
the application.

**Historical production.** `scanEvents` is create-only. Bundles cannot be
deleted, counters cannot be deleted, audit entries cannot be edited.

**Sign-in enumeration.** Wrong username, wrong password and unknown account
all return the same message. Distinguishing them would tell an attacker
which usernames exist.

**Cross-site scripting.** React escapes by default and there is no
`dangerouslySetInnerHTML` anywhere. CSV export escapes formula characters,
so an export cannot execute in the recipient's spreadsheet.

**Browser storage.** Holds a station id, a theme, dismissed alerts and the
support-view flag. No credentials, no tokens, no production data.

**The Firebase API key** in the bundle is not a secret — it identifies the
project. Access is decided entirely by the security rules.

---

# Accepted, with reasons

**Offline writes are validated late.** A scan made offline that breaks a rule
is accepted on the device and refused when it syncs. Server-side correctness
never bends; the operator learns minutes later. The alternative is a factory
that stops scanning when the wifi drops.

**Time-slot restrictions are app-enforced.** Rules cannot do timezone
conversion or overnight-shift arithmetic. Every scan carries both device and
server time, so a violation is visible in the audit trail even though it is
not blocked.

**WIP counters are not value-checked.** They are written with increments,
and rules cannot see through a field transform. A scanner-capable account
could write a wrong figure. Mitigated by reconciliation, which rebuilds every
counter from the immutable ledger and reports the difference.

**No rate limiting of our own.** Firebase Auth throttles repeated sign-in
failures; there is nothing beyond that. A customer's own users are the only
people who can reach anything.

---

# Not addressed, and worth knowing

**No automated backups.** Deleting data is restricted, but there is no
restore. Scheduled Firestore exports need the Blaze plan and half an hour of
setup. Do this before the first paying customer, not after.

**No password reset without an email address.** An operator on a username-only
account who forgets their password cannot be recovered — the account must be
replaced. One Cloud Function using the Admin SDK fixes this properly.

**Sessions are advisory.** Single-session and idle timeout reduce ordinary
carelessness on a shared floor. Neither stops someone who already has
credentials and intent.

**No penetration test.** This review is a reading of the code and rules by
the person who wrote them, which is the weakest form of assurance. Before a
customer with a security questionnaire, get someone else to look.

---

# Run the rules tests

```bash
npm run test:rules
```

45 tests, including one for each hole above. They need Java and the Firebase
CLI and take about a minute. They are the only thing in this project that
exercises the file where every one of these problems lived.
