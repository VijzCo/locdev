# Security review — AxiLogic website

A pass over the previous build, what was wrong with it, and what changed. Findings are ordered by severity. Nine issues found, seven fixed in code, two need action from you before launch.

Severity uses the usual scale: **Critical** means data loss or full compromise, **High** means a realistic attack with real damage, **Medium** means it needs another weakness to be useful, **Low** means defence in depth.

---

## Critical — fixed

### 1. Admin authentication was fake

**Was:** the admin password sat in the JavaScript as `adminPw: 'axilogic'`. Anyone could open view-source, read it, and get into the panel. It also gated nothing real — the panel only touched local data — but it created a false sense of protection, which is worse than no lock at all.

**Now:** Firebase Authentication with email and password. There is no public sign-up; accounts are created by you in the console. Sessions use `browserSessionPersistence`, so closing the tab signs you out rather than leaving a live session on a shared machine.

**Still on you:** disable the email/password *sign-up* provider is not a setting Firebase exposes directly — instead, put your UID in the allowlist in `firestore.rules` (see finding 2). That is what actually stops a stranger who somehow creates an account.

### 2. Inquiries would have been readable by anyone

**Was:** inquiries lived in `localStorage`, so you never received them. The obvious fix — write them to Firestore — introduces a much worse problem if the rules are wrong. Your Firebase config is public by design and ships in the browser. Anyone can take it and call the Firestore REST API directly. With a default or careless rule, a competitor could download every lead you have ever received: names, email addresses, and a description of what is broken in their business. That is a competitive loss and a data breach in one.

**Now:** `firestore.rules` allows `create` on `inquiries` by anyone, and `read`, `update`, `delete` only by a UID on an explicit allowlist. Not "any signed-in user" — an explicit list, so that if an account is ever created by accident or by an attacker, it still cannot read your data.

**Still on you:** replace `REPLACE_WITH_YOUR_ADMIN_UID` with your real UID and deploy the rules. Until you do, the rules deny everything and the inbox stays empty.

---

## High — fixed

### 3. Content Security Policy permitted inline scripts

**Was:** all the JavaScript lived inside `index.html`, which forced `script-src 'unsafe-inline'`. That single directive removes most of the value of having a CSP — it is what turns a small content-injection bug into a working cross-site scripting attack.

**Now:** the code is split into `app.js` and `styles.css`, and `'unsafe-inline'` is gone from `script-src`. The inline `onclick` on the offline page moved to `offline.js` for the same reason. The policy also adds `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` and `upgrade-insecure-requests`.

`style-src` still allows `'unsafe-inline'`, because the rig animation writes transforms to `element.style` on every scroll frame. That is a much smaller risk than inline script and the alternative costs real performance.

### 4. No output encoding discipline

**Was:** the code built markup with `innerHTML` and an `esc()` helper. That works until someone forgets one call. Inquiry data written by a stranger and rendered into the admin panel is exactly the path a stored XSS attack takes — the attacker submits a payload through the public form and it fires in *your* browser, with your session, when you read the inbox.

**Now:** every dynamic node is built with `document.createElement` and `textContent`. There is no `innerHTML` anywhere in the codebase, so the class of bug cannot occur rather than being avoided by care.

### 5. Server-side validation did not exist

**Was:** the form validated in the browser only. A direct REST call skips the browser entirely, so an attacker could write documents of any size and shape — filling your database, and injecting fields your admin UI might later render.

**Now:** `firestore.rules` enforces the schema. `hasOnly()` rejects unexpected fields, every field is type-checked, lengths are capped, the email is pattern-matched, `handled` is forced to `false` so nobody can pre-mark their own entry as dealt with, and `createdAt` must equal `request.time` so the timestamp cannot be forged to bury an entry.

---

## Medium — fixed

### 6. The contact form was an open spam relay

**Was:** no bot protection of any kind. Automated form-fillers find endpoints like this within days of going live.

**Now:** three layers. A honeypot field hidden off-screen that a real person never fills. A timing check rejecting anything submitted within three seconds of page load. A thirty-second client throttle between submissions. The rules-level size caps mean even a determined bot cannot write much.

**Worth adding when you have traffic:** Firebase App Check with reCAPTCHA v3, which refuses Firestore requests that did not come from your actual site. `firebase-config.js` has a slot for the site key and `app.js` initialises it if present.

### 7. Remote config was trusted blindly

**Was:** not applicable to the old build, but the new one reads site copy from Firestore. If that document were ever tampered with, unexpected values would flow straight into the page.

**Now:** `sanitiseConfig()` accepts only known keys, requires strings, validates colours against a hex pattern, and requires `chatUrl` and `formUrl` to be `https://`. Anything else is dropped. This means a compromised config document cannot point the assistant at an attacker's endpoint over plain HTTP, or inject a `javascript:` URL.

---

## Low — fixed

### 8. Missing transport and framing headers

**Now added:** `Strict-Transport-Security` with a one-year max-age and `preload`, so a downgrade attack on a returning visitor is not possible. `X-Frame-Options: DENY` plus `frame-ancestors 'none'` blocks clickjacking — relevant because the admin panel has destructive buttons. `Cross-Origin-Opener-Policy` isolates the browsing context. `X-Permitted-Cross-Domain-Policies: none` closes a legacy Flash-era hole.

### 9. Service worker cached indiscriminately

**Was:** the worker cached cross-origin responses. Auth traffic and API responses could end up written to disk, where another user of the same device could read them.

**Now:** same-origin GET requests only. Firebase auth paths and `firebase-config.js` are on an explicit never-cache list. Opaque responses are rejected by checking `res.type === "basic"`.

---

## Not fixed — decisions for you

### The assistant proxy trusts the Origin header

The Cloudflare Worker checks `Origin` against an allowlist. Browsers set that header honestly, so this stops other *websites* using your endpoint. It does **not** stop someone with curl, because a non-browser client can send any Origin it likes.

What actually limits the damage is the rate limit, the token cap and the input length cap already in the Worker. If abuse becomes real, add a Firebase App Check token to the request and verify it in the Worker. I have not built that because it is meaningful work for a threat that may never arrive.

### There is no audit log

If two people ever have admin access you will not be able to tell who changed what. The config document records `updatedBy` and `updatedAt`, which is enough for one admin. Add an append-only `audit` collection when a second person gets access.

---

## Setting it up

**1. Enable Authentication**

Firebase console → Authentication → Get started → enable **Email/Password**. Under Users, click **Add user** and create your account. There is no sign-up form on the site, so this is the only way an account can exist.

**2. Get your UID**

Authentication → Users → copy the User UID column.

**3. Put it in the rules**

Open `firestore.rules` and replace `REPLACE_WITH_YOUR_ADMIN_UID` with that UID. Keep the array syntax — it takes more than one entry later.

**4. Create the database**

Firebase console → Firestore Database → Create database → **Production mode** (never test mode, which is open to the world for 30 days). Pick a region near you: `europe-west1` or `africa-south1`.

**5. Fill in the config**

Project settings → Your apps → Web app → copy the config object into `public/firebase-config.js`.

**6. Deploy everything**

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

**7. Verify the lock actually holds**

This step is not optional. Open a private window, signed out, and run:

```bash
curl "https://firestore.googleapis.com/v1/projects/YOUR-PROJECT-ID/databases/(default)/documents/inquiries"
```

You want a **403 Missing or insufficient permissions**. If you get a list of documents back, your rules did not deploy and your leads are public. Fix that before anything else.

---

## Ongoing

- Set a **budget alert** in Google Cloud console. Firestore free tier is generous, but a bot hammering your form still costs something eventually.
- Bump `CACHE_VERSION` in `sw.js` on every deploy.
- Rotate the admin password if a device is lost. Firebase has account-level rate limiting on sign-in attempts, so brute force is already impractical.
- Add a **privacy notice page** before serious traffic. The form collects names, work emails and business details; the short line under the form is a start, not a policy.
- Review the rules whenever you add a collection. The default-deny catch-all means new collections are locked until you write a rule, which is the safe direction to fail.
