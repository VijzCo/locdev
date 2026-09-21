# SMV Platform

**Industrial Engineering SaaS for apparel manufacturing.** SMV generation, GSD/SAM analysis, CM costing, line balancing, and operation bulletins — multi-tenant, RBAC-secured, i18n-ready (EN / SI / TA).

This repo is the **MVP foundation**. The IE calculation engine and the SMV/OB modules are fully working. The remaining modules (Styles CRUD, Reports, Chat, Admin, Billing) are scaffolded with TODOs.

---

## What's actually working

| Module | Status | Notes |
|--------|--------|-------|
| **IE Engine** (`src/lib/ie-engine/`) | ✅ Done | SMV (3 methods), CPM, CM, line balancing, all unit-tested |
| **SMV Calculator** (`/smv`) | ✅ Done | Stopwatch, motion analysis, machine-based — live calculation |
| **Operation Bulletin** (`/operation-bulletin`) | ✅ Done | Add/edit/reorder ops, live SMV roll-up, CSV export, live costing preview |
| **Line Balancing** (`/line-balancing`) | ✅ Done | Auto-balance with bottleneck detection (sample ops — wire to your style) |
| **Auth** (`/login`, `/register`) | ✅ Done | Firebase Auth + Firestore user/tenant doc creation via API route |
| **Dashboard layout, sidebar, topbar** | ✅ Done | Role-aware nav using permissions array |
| **Firestore security rules** | ✅ Done | Tenant isolation + RBAC enforced in rules |
| **Cloud Functions** | ✅ Done | onUserCreate (custom claims), onOperationWrite (OB recompute), Stripe webhook |
| **Tenant + RBAC types/data model** | ✅ Done | 8 roles × 24 permissions matrix |
| **Subscription plan limits** | ✅ Done | Free / Premium / Enterprise — limits enforced server-side |
| **i18n** (EN/SI/TA) | ✅ Setup | Base strings translated; wire `useTranslation` into components as you build |
| Dashboard charts | 🟡 Sample data | Wire to live production data |
| Styles CRUD | 🟡 Scaffold | Stub page with TODOs |
| Reports | 🟡 Scaffold | Stub page with TODOs |
| Admin (users, tenants, billing, settings) | 🟡 Scaffold | Stub pages with TODOs |
| Chat | 🟡 Scaffold | Schema + rules done; UI not built |
| Stripe checkout UI | 🟡 Webhook done | Add `/api/stripe/create-checkout-session` |
| Motion library UI | 🟡 Schema done | Build CRUD in Settings page |

---

## Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict, noUncheckedIndexedAccess)
- **Styling:** Tailwind CSS + custom industrial design tokens
- **State:** Zustand (auth) + TanStack Query (server state)
- **Forms:** React Hook Form + Zod validators
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Billing:** Stripe
- **Charts:** Recharts
- **i18n:** i18next + react-i18next
- **Testing:** Vitest

---

## Setup (developer onboarding)

### 1. Install dependencies

```bash
npm install
cd functions && npm install && cd ..
```

> The IE engine itself only needs `vitest` — you can run tests without setting up Firebase.

### 2. Create a Firebase project

1. Go to [firebase.google.com](https://firebase.google.com) → Create project
2. **Enable Email/Password auth** in Authentication → Sign-in methods
3. **Create a Firestore database** (start in production mode — we'll deploy rules)
4. **Enable Storage** (also production mode)
5. In Project Settings:
   - Get your Web SDK config (paste into `.env.local`)
   - Generate a Service Account JSON key (Project Settings → Service Accounts)
6. Upgrade to the **Blaze plan**. Cloud Functions require it. Budget: $25–100/month for an SME factory.

### 3. Configure env

```bash
cp .env.example .env.local
# Fill in the values from your Firebase project
```

### 4. Deploy Firestore rules + indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # pick your project
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### 5. Run locally with emulators (recommended for development)

```bash
# Terminal 1 — Firebase emulators (Auth, Firestore, Storage, Functions)
npm run firebase:emulators

# Terminal 2 — Next.js dev server
npm run dev
```

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` to connect to local emulators.

Visit `http://localhost:3000`. The Firebase emulator UI is at `http://localhost:4000`.

### 6. Run tests

```bash
npm test            # watch mode
npm run test:run    # single run, CI mode
```

The IE engine tests verify all the math (TMU conversion, SMV calculation, CPM, CM, line balancing) against worked IE textbook examples. **If you change the engine, re-run these.**

---

## Architecture notes

### Multi-tenancy model

All tenant data lives under a `tenants/{tenantId}/...` subcollection. Top-level collections are limited to `users`, `tenants` themselves, `invitations`, and `activityLogs`.

Why nested? It makes security rules trivial:
```
match /tenants/{tenantId}/styles/{styleId} {
  allow read: if userTenantId() == tenantId && hasPermission('styles.read');
}
```

### RBAC

Permissions are stored as a string array on the user doc. A user's permissions are computed from their role server-side (in `permissionsForRole()`) when their role changes — clients can't elevate themselves because `users/*` is `allow write: if false`.

8 roles, 24 permissions. See `src/lib/utils/rbac.ts`. To check a permission in the UI:
```tsx
const hasPermission = useAuthStore((s) => s.hasPermission);
if (!hasPermission('smv.approve')) return null;
```

### IE Engine

The single most important folder is `src/lib/ie-engine/`. All other code is plumbing — this is the value.

- `smv.ts` — three SMV calculation methods (stopwatch, motion, machine)
- `costing.ts` — CPM, CM, profitability
- `balancing.ts` — auto-balance, validation

The math has been verified against worked IE examples. If you change a formula, **re-run the tests**.

### Operation Bulletin lifecycle

```
User edits Operations (CRUD on /tenants/{tenantId}/operations)
       ↓
onOperationWrite Cloud Function fires
       ↓
1. Sums all SMVs for the style
2. Updates style.calculatedSmv
3. Updates/creates the OB doc with denormalized totals
```

Why denormalize? OB reads happen ~100× more than writes. Recomputing on the client every time would be wasteful, and computing in Firestore queries is impossible (no SUM).

---

## Project structure

```
smv-platform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                  # Public auth pages
│   │   ├── (dashboard)/             # Protected dashboard
│   │   ├── api/                     # API routes
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                      # Primitive components
│   │   ├── layout/                  # Sidebar, Topbar
│   │   ├── smv/                     # Three SMV calculators
│   │   ├── ob/                      # OB editor
│   │   └── shared/                  # AuthProvider, QueryProvider, etc.
│   ├── lib/
│   │   ├── ie-engine/               # ★ CORE: SMV, costing, balancing
│   │   ├── firebase/                # client, admin, collections
│   │   ├── validators/              # Zod schemas
│   │   ├── stores/                  # Zustand auth store
│   │   ├── utils/                   # cn, formatters, RBAC
│   │   └── hooks/                   # i18n
│   ├── types/                       # Core + IE type definitions
│   ├── config/                      # Plans, constants
│   └── locales/                     # en, si, ta
├── functions/                       # Cloud Functions (separate package)
├── firestore.rules                  # Security rules
├── firestore.indexes.json           # Composite indexes
├── storage.rules
├── firebase.json
└── package.json
```

---

## Things you should know before going to market

1. **GSD trademark.** Coats Digital owns the GSD trademark for motion analysis. **Don't use the GSD name in your product**, and **don't ship a copy of their motion library**. Build your own motion library based on MTM-2 / general industrial engineering principles. The data model in `src/types/ie.ts` is designed for tenants to build their own.

2. **Firebase costs.** Free tier won't sustain even one factory. Budget $25–100/month per tenant on Blaze (Cloud Functions + Firestore reads). At scale, consider read caching and aggressive denormalization.

3. **Pricing tested for South Asia.** Sri Lankan/Indian SME factories typically have a $50–200/month software budget. The default plan prices ($0/$49/$199) are aggressive — validate with customer interviews before locking in.

4. **Test in real factories.** Stopwatch SMV and CM costing are the bread and butter — get them in front of an IE manager and ask them to break it. Their feedback is worth more than any feature you can imagine.

5. **Multi-currency is harder than it looks.** The tenant doc has a currency field, but all CM/FOB calculations assume one currency. If you serve buyers in USD but pay workers in LKR, you'll need an FX layer. Not built — add when you have a real customer who needs it.

---

## Next steps in priority order

1. Replace the in-memory OB editor with Firestore reads/writes (it's literally `setDoc(doc(...), {...})`)
2. Build the Styles CRUD page (the scaffold lists every step)
3. Wire the dashboard chart to a `dailyProductionRecords` collection (you'll need a Cloud Function to aggregate)
4. Build the Settings page → Motion Library tab so users can build their own library
5. Stripe checkout flow (webhook is already deployed)
6. Add a `/api/users/invite` route + invitation accept flow
7. PWA service worker (manifest is already in `/public/manifest.json`)

---

## License

Proprietary. Contact the maintainer.
