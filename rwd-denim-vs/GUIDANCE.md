# RW DESIGN — OPERATING GUIDE

Everything needed to run the digital denim showroom: set it up once, use it daily, fix it when it breaks.

---

## 1 · WHAT YOU HAVE

```
rwd-denim-vs/
├── firebase.json        hosting config, security headers, caching, rules paths
├── .firebaserc          project alias
├── firestore.rules      who can read and write content and enquiries
├── storage.rules        who can upload images
├── README.md            deployment reference
├── GUIDANCE.md          this file
└── public/
    ├── index.html       the entire site — no build step, no dependencies
    ├── 404.html
    ├── favicon.svg
    ├── robots.txt
    └── sitemap.xml
```

One HTML file is the whole website. Firestore holds the content, Storage holds the images, Auth guards the admin. There is nothing to compile and nothing to install.

**Live at:** `https://rwd-denimshow.web.app` · **Admin at:** `https://rwd-denimshow.web.app/#admin`

---

## 2 · FIRST-TIME SETUP — in this order

Order matters. Each step depends on the one before it.

| # | Step | Where |
|---|---|---|
| 1 | Enable **Firestore** — production mode, pick a region | Console → Build → Firestore Database |
| 2 | **Skip Storage** — it needs the paid Blaze plan | Images go into Firestore instead, automatically |
| 3 | Enable **Authentication** → Email/Password | Console → Build → Authentication |
| 4 | Create your admin user (email + password) | Authentication → Users → Add user |
| 5 | Deploy everything | `firebase deploy --only hosting,firestore:rules` |
| 6 | Sign in at `/#admin` and publish once | The browser |

**The region is permanent.** Choose one near your buyers — `eur3` for Europe, `asia-south1` for the subcontinent. It cannot be changed later without rebuilding the project.

Step 6 matters more than it looks: until you publish once, Firestore has no content document and every visitor sees the built-in defaults.

---

## 3 · USING THE ADMIN

Go to `/#admin`, sign in with the email and password from step 4. Eight tabs.

| Tab | Controls |
|---|---|
| **Home** | Hero headline, lede, brand statement |
| **Catalogue** | Fabrics, products, collections, capability stages |
| **Gallery** | Showroom photographs, ordered and captioned |
| **Quality** | Metrics, bar percentages, decision ledger |
| **Sustainability** | Pillars, values, nature panel, certifications |
| **Company** | Story, vision, figures, values |
| **Contact** | Email, phone, address, enquiry interest options |
| **Enquiries** | Everything buyers have submitted |

### Every list works the same way

| Control | Does |
|---|---|
| **↑ ↓** | Move the item up or down. Order on screen is order in the list. |
| **⧉** | Duplicate — the fastest way to add a similar style |
| **✕** | Delete, with a confirmation naming the item |
| **+ Add** | New item at the bottom, pre-filled, ready to edit |

**Editing is live.** Type into a field and the site behind the panel updates instantly. Nothing is saved until you press **Publish** — then it goes live for everyone, and any open tab updates itself without a refresh.

If you close the panel without publishing, your edits are discarded. That is deliberate: it makes experimenting safe.

### Adding a product

Catalogue → Products → **+ Add product** → fill in name, style code, category, fabric tag → set the swatch colour with the picker → **Upload** an image → Publish. It appears on the rail immediately, and buyers can clip it to their selection.

### The gallery

Gallery tab → drag photographs onto the panel, or click to choose. Multiple at once is fine. They resize to 1600px in your browser before upload, so a 12MB camera file becomes roughly 300KB.

They cross-dissolve as the buyer scrolls, which means **shoot them as a set**: same distance, same exposure, same height. A sequence shot consistently reads as one continuous take. A mixed set reads as a slideshow.

Captions are optional. Order is the arrows.

---

### Where images actually live

Firebase Storage now requires the Blaze plan even for its free tier, so the site does not
depend on it. Uploads try Storage first and, when it isn't available, store each image as
its own Firestore document instead — public to read, admin-only to write, exactly like the
content. Everything stays on the free Spark plan.

The practical consequences:

- Firestore caps a document at 1 MB, so uploads are compressed until they fit — typically
  1400px at quality 0.72, around 200–350 KB. Quality is fine at showroom sizes.
- Spark gives 1 GiB of storage: roughly 3,000 images. Not a real ceiling here.
- Spark gives 50,000 reads a day. Each visitor costs one read for the content plus one per
  image, so a 20-image gallery is 21 reads — about 2,300 visitors a day before the cap.
  Comfortable for a trade show, worth watching if the site goes viral.

If you ever do upgrade to Blaze, nothing needs changing: uploads will silently start using
Storage again, and existing Firestore-held images keep working.

## 4 · CONTENT RULES

**Never invent a number.** Every figure defaults to `—` with "Awaiting audited data". That is not a placeholder to be filled with something plausible — it is the honest state until RW Design measures it. A buyer who catches one invented statistic discounts every other claim on the site, and sourcing teams check.

The same applies to certifications. List only what is actually held.

### Image specifications

| Use | Ratio | Size | Notes |
|---|---|---|---|
| Product | 3:4 | 1200 × 1600 | Same background and lighting across the whole catalogue. Consistency reads as quality more than any single shot. |
| Collection | 3:4 | 1600 × 2133 | Campaign imagery |
| Gallery | 16:9 | 2400 × 1350 | Landscape, shot as a set |
| Facility | 16:9 | 2400 × 1350 | Wide, machinery in motion |

Upload full quality — the browser handles compression. JPEG or PNG, sRGB.

---

## 5 · SECURITY — what the rules actually do

| Data | Public can | Admin can |
|---|---|---|
| Site content | Read | Read and write |
| Images | Read | Upload, admin only |
| **Enquiries** | **Create only** | Read, update, delete |

That enquiries line is the important one. Buyers can submit, but nobody can read the list back without signing in. Without that rule, anyone could pull your entire lead list — names, companies, email addresses — from the browser console in about ten seconds.

**Do:** create a separate user account per person who edits. Remove them in the console when they leave.

**Don't:** share one login, put the password in a shared document, or loosen `firestore.rules` to "make it work". If something is denied, the rule is doing its job and the fix is elsewhere.

There is no public sign-up. Adding a user in the Firebase console is the only route in.

---

## 6 · TROUBLESHOOTING

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to get Firebase project` | Project doesn't exist, or you're on the wrong Google account | `firebase login:list`, then `firebase use --add` |
| `Assertion failed: resolving hosting target` | No site name in config | Add `"site": "rwd-denimshow"` as the first line of the hosting block |
| `ConnectTimeoutError` on deploy | Node preferring unroutable IPv6 on Windows | `node --dns-result-order=ipv4first <path-to>\firebase.js deploy --only hosting`, or deploy from a phone hotspot |
| Images don't appear on other devices | Not signed in, so the upload never reached Storage | Sign in at `/#admin` first; check the red offline note isn't showing |
| Red "Offline mode" note on sign-in | Backend unreachable — usually opening the file locally instead of via Hosting | Use the live URL, not `file://` |
| `Missing or insufficient permissions` | Rules not deployed | `firebase deploy --only firestore:rules,storage` |
| Published but the site looks unchanged | Cached HTML | Hard refresh, Ctrl+F5. HTML is set to `no-cache`, so this should be rare. |
| Enquiries tab empty | Firestore not enabled, or none submitted yet | Check Console → Firestore for an `enquiries` collection |

**Before asking anyone for help,** run `firebase deploy --debug` and read the last twenty lines. The HTTP status tells you which category you're in: 403 is permissions, 401 is a stale token (`firebase logout` then `login`), a timeout is network.

---

## 7 · BEFORE THE SHOW

- [ ] Real product photography replacing every slate placeholder
- [ ] Real gallery photographs, shot as a consistent set
- [ ] Real contact details — email, phone, stand number
- [ ] Certifications: only those actually held
- [ ] Every `—` either replaced with audited data or left as `—`
- [ ] Custom domain attached; update canonical, OG tags, `robots.txt`, `sitemap.xml`
- [ ] `og.png` at 1200 × 630 in `public/`
- [ ] Tested on a real phone over mobile data, not office wifi
- [ ] A second admin account created, so one person leaving doesn't lock you out
- [ ] Submitted a test enquiry end to end and confirmed it lands in the Enquiries tab

---

## 8 · WHAT THIS IS AND ISN'T

**It is** a complete, working, hosted B2B showroom with live content management, a buyer selection flow, an enquiry pipeline and real security rules. It is enough to run a show with.

**It isn't** the full platform from the blueprint. Still absent: QR short links for physical garments, catalogue PDF downloads, meeting booking, product comparison, multi-language, role-based admin permissions, an audit log, and draft-versus-published states. Every editor currently has full access to everything.

The natural next step is roles — `SUPER_ADMIN`, `CONTENT_ADMIN`, `PRODUCT_ADMIN` — via Firebase custom claims, so a merchandiser can add products without being able to change company figures or read the lead list. That's a small change to `firestore.rules` plus a claim on each user. See §09 and §33 of the blueprint.

**One structural limit worth knowing:** all content lives in a single Firestore document. That is fast and simple, and it holds comfortably to roughly 400 products. Past that, products need their own collection with pagination — a rewrite of the content layer, not of the site.
