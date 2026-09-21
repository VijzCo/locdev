# RWD DENIM VS — Firebase Hosting

Deployable package for the RW Design digital denim showroom.

```
rwd-denim-vs/
├── firebase.json          hosting config, headers, caching, rewrites
├── .firebaserc            project alias
├── .gitignore
└── public/                ← everything in here is served
    ├── index.html         the whole site (84 KB, no build step)
    ├── 404.html
    ├── favicon.svg
    ├── robots.txt
    └── sitemap.xml
```

No build step, no dependencies, no framework. `public/` is the site.

---

## 1 · Deploy

```bash
npm install -g firebase-tools     # once
firebase login

# create the project first at console.firebase.google.com,
# using the project ID rwd-denim-vs (or edit .firebaserc to match yours)

cd rwd-denim-vs
firebase deploy --only hosting
```

Live at `https://rwd-denim-vs.web.app`.

To preview before going live:

```bash
firebase hosting:channel:deploy preview --expires 7d
```

That gives a temporary URL — the right way to show a client something without touching production.

## 2 · Custom domain

Firebase console → Hosting → Add custom domain → follow the DNS records. TLS is provisioned automatically, usually within an hour. Add both the apex and `www`, and redirect one to the other.

After the domain is live, update these three places, all of which currently point at `rwd-denim-vs.web.app`:

- `public/index.html` — `<link rel="canonical">` and the four `og:` tags
- `public/robots.txt` — the sitemap line
- `public/sitemap.xml` — the `<loc>`

## 3 · What's already configured

| Setting | Value |
|---|---|
| HTML caching | `no-cache` — content changes go live on refresh |
| Images, fonts | `max-age=31536000, immutable` |
| Security headers | HSTS, `nosniff`, `SAMEORIGIN`, Referrer-Policy, Permissions-Policy |
| Clean URLs | on, no trailing slash |
| 404 | branded page, not Firebase's default |
| SEO | canonical, description, Open Graph, Twitter card, Organization JSON-LD |

## 4 · Backend setup — do this once, before the admin works

The site now uses Firestore for content, Storage for images and Auth for the admin.
No API keys live in the source: `/__/firebase/init.js` is injected by Hosting itself.

**a. Turn the three services on** (console.firebase.google.com → your project)

| Service | Where | Notes |
|---|---|---|
| Firestore | Build → Firestore Database → Create | Start in **production mode**, pick a region close to your buyers. The region is permanent. |
| ~~Storage~~ | — | **Skip it.** Needs the paid Blaze plan. Images go to Firestore automatically. |
| Authentication | Build → Authentication → Get started → Email/Password → Enable | Leave "Email link" off. |

**b. Create your admin account**

Authentication → Users → **Add user**. Enter an email and password. That's your login —
there is no public sign-up, and adding users is the only way to grant access.

**c. Deploy the rules with the site**

```bash
firebase deploy --only hosting,firestore:rules
```

The rules are in `firestore.rules` and `storage.rules`:

- Site content is **publicly readable** — it is the website — and writable only when signed in.
- Enquiries can be **created by anyone** but read only by an admin. Buyer contact details never leak.
- Images are publicly readable, uploadable only when signed in, capped at 8 MB and images only.

**d. Sign in**

Go to `/#admin`, use the email and password from step b. Publish, and the change is live
for everyone immediately — open tabs update themselves without a refresh.

### If the backend isn't reachable

The site detects it and falls back to `localStorage`, showing a red note on the sign-in
screen and accepting the old `rw2026` passcode. Edits then stay in that browser. This is
what you'll see when opening `index.html` as a local file rather than through Hosting.

## 5 · Notes on the admin

The admin panel is at **`/#admin`**, passcode **`rw2026`**.

On Firebase Hosting the content saves to **`localStorage`** — meaning it persists in *your browser only*. Another person opening the site sees the default content. This is fine for demoing the editing workflow and completely wrong for a real site, for two reasons:

1. **It isn't shared.** Edits don't reach visitors.
2. **It isn't secure.** The passcode is in client-side JavaScript. Anyone can read it in DevTools.

Making it real means adding Firebase Auth and Firestore. The structure is already shaped for it — `sGet()` and `sSet()` in `index.html` are the only two functions that touch storage:

```js
async function sGet(k){ /* → firestore doc read  */ }
async function sSet(k,v){ /* → firestore doc write */ }
```

Point those at Firestore, gate the admin behind Auth with a role claim, and move writes into Cloud Functions. Everything above that line — the CRUD, the field schemas, the live preview — stays as it is. See §09 and §34 of the blueprint.

**Until that's done, don't put a real email address or real business figures in the admin panel and publish it.** The content is not private.

## 6 · Images

Uploaded gallery and product images are stored per-key. `localStorage` caps at roughly 5–10 MB per origin, so about 15–25 photos at 1600px. Past that, saving fails silently.

The real fix is Firebase Storage: upload the file, store the URL rather than the image data. Small change, big headroom.

## 7 · Content checklist before launch

- [ ] Replace every `—` placeholder figure with audited data, or leave it as `—`. Do not invent numbers.
- [ ] Real product photography at 1200 × 1600
- [ ] Real gallery photography at 2400 × 1350
- [ ] Real certifications — only ones actually held
- [ ] Real contact details
- [ ] `og.png` at 1200 × 630 added to `public/`
- [ ] Custom domain and the three URL updates from §2
