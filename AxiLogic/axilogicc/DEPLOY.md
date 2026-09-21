# AxiLogic — deployment guide

From an empty machine to a live, secured site. Follow it in order.

---

## What is in the box

```
axilogic/
├── public/                       everything that gets published
│   ├── index.html                markup only, no inline scripts
│   ├── styles.css
│   ├── app.js                    the site
│   ├── firebase-config.js        your project keys go here
│   ├── offline.html / .css / .js shown when there is no signal
│   ├── sw.js                     service worker
│   ├── manifest.webmanifest      makes it installable
│   └── icon-*.png                app icons
├── firestore.rules               ← the actual security. Read SECURITY.md.
├── firestore.indexes.json
├── firebase.json                 hosting, CSP and security headers
├── .firebaserc                   your project ID
├── worker/                       AI assistant proxy (Cloudflare, free)
├── functions/                    same proxy for Firebase (Blaze plan)
├── SECURITY.md                   audit findings and setup steps
└── DEPLOY.md                     this file
```

The site works with no Firebase at all — it just cannot receive inquiries or sign anyone into admin. Firebase turns it from a brochure into something that runs your lead flow.

---

## Step 1 — Tools

Node.js 20 or later. Check with `node -v`.

```bash
npm install -g firebase-tools
firebase --version
```

## Step 2 — Look at it locally

```bash
cd axilogic
npx serve public
```

Scroll past the hero: twelve panels should converge and lock into a live board. Click through the business types under **Custom builds** — the panel swaps to show what a build looks like for each one. Press **Ctrl + Shift + A** for admin; it will say Firebase is not configured, which is correct at this stage.

The service worker will not register over `http://`. That is expected — it needs HTTPS.

## Step 3 — Create the Firebase project

1. https://console.firebase.google.com → **Add project**, name it `axilogic`
2. Copy the **Project ID** from project settings
3. Put it in `.firebaserc` replacing `REPLACE-WITH-YOUR-FIREBASE-PROJECT-ID`

## Step 4 — Authentication

Authentication → Get started → enable **Email/Password**.

Users → **Add user** → create your account. There is no sign-up form on the site, so this is the only way an account can exist.

Copy your **User UID** from the users table.

## Step 5 — Firestore

Firestore Database → Create database → **Production mode**. Never test mode: it leaves your database open to the internet for 30 days.

Region: `europe-west1` or `africa-south1`.

Now open `firestore.rules` and replace `REPLACE_WITH_YOUR_ADMIN_UID` with the UID from step 4.

## Step 6 — Config

Project settings → Your apps → **Web app** (create one if needed) → copy the config object into `public/firebase-config.js`.

Those values are public by design. They identify your project; they do not authorise anything. Your security comes entirely from `firestore.rules`.

## Step 7 — Deploy

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

**Do not run `firebase init`.** Everything is already configured, and init would overwrite `index.html` with a placeholder. This is the most common way this goes wrong.

## Step 8 — Verify the lock holds

Not optional. Signed out, run:

```bash
curl "https://firestore.googleapis.com/v1/projects/YOUR-PROJECT-ID/databases/(default)/documents/inquiries"
```

You want **403 Missing or insufficient permissions**.

If you get documents back, your rules did not deploy and every inquiry you ever receive is public. Fix that before doing anything else.

## Step 9 — End-to-end test

1. Open the live site, submit the contact form
2. **Ctrl + Shift + A**, sign in with the account from step 4
3. The Inquiries tab should show what you just submitted

If the form says "Not delivered", the Firebase config is wrong. If sign-in fails, the account does not exist. If sign-in works but the inbox errors, your UID is not in the rules.

## Step 10 — Install as an app

On your phone: Android shows an install banner, iOS uses Share → Add to Home Screen. It opens without browser chrome and still works in aeroplane mode.

---

## Optional — the AI assistant

The assistant answers from a keyword script by default. It works, costs nothing, and cannot say anything you did not write.

To connect a real model you need a server-side proxy, because an API key in browser JavaScript is published to the world.

```bash
npm install -g wrangler
wrangler login
cd worker
# edit ALLOWED_ORIGINS first
wrangler deploy
wrangler secret put ANTHROPIC_API_KEY
```

Paste the printed URL into admin → Assistant → Endpoint URL, set Mode to Live, Save.

Cloudflare Workers is free for 100,000 requests a day with no card. The Firebase Functions version in `functions/` does the same thing but needs the Blaze plan.

---

## Custom domain

Firebase console → Hosting → **Add custom domain**, add the DNS records it gives you. SSL is automatic and free.

Then add the domain to `ALLOWED_ORIGINS` in `worker/index.js` and redeploy the Worker.

---

## Every time you deploy

Bump `CACHE_VERSION` in `public/sw.js` (`axilogic-v2` → `v3`). Without it, returning visitors keep the cached old build and your changes appear not to have worked.

---

## Costs

| Item | Plan | Cost |
|---|---|---|
| Firebase Hosting | Spark | free |
| Firestore | Spark | free — 50k reads, 20k writes a day |
| Firebase Auth | Spark | free |
| SSL and custom domain | included | free |
| Cloudflare Worker | free tier | free — 100k requests/day |
| Anthropic API | pay per use | only if you connect the live assistant |

Set a budget alert in Google Cloud console anyway.

---

## Before you print the URL anywhere

**Change the placeholders.** Phone and email live in the `DEFAULTS` object near the top of `public/app.js`.

**Read SECURITY.md.** It documents nine findings from the audit, seven fixed in code and two needing decisions from you.

**Add a privacy notice.** The form collects names, work emails and business details. The line under the form is a start, not a policy.

**Settle the name.** Still unverified: OBFC search in Lesotho, CIPC search in South Africa, `axilogic.com` and `.co.za` availability, and trademark searches in Nice class 9 and class 42 in both jurisdictions.

---

## Common problems

**Firebase welcome page after deploy** — `firebase init` overwrote `index.html`. Restore from the zip.

**Changes not showing** — bump `CACHE_VERSION` in `sw.js`, redeploy, hard refresh.

**Blank page, console shows CSP errors** — you added an inline `<script>` or `onclick`. The policy blocks both deliberately. Put the code in a `.js` file.

**`this index is not necessary` during deploy** — `firestore.indexes.json` is intentionally empty. Firestore indexes every single field automatically, so declaring one on a single field is redundant and gets rejected. You only need entries here if you add a query that filters on one field *and* sorts by another.

**Form says "Not delivered"** — `firebase-config.js` still has placeholders, or the rules were not deployed.

**Sign-in fails** — create the user in the Firebase console. There is no sign-up.

**Inbox shows a permissions error** — your UID is not in `firestore.rules`, or the rules were not deployed.
