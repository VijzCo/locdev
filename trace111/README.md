# Trace

Apparel Product Lifecycle Management & Sample Development Management System.

Built for garment sourcing operations across multiple companies (RWD, DFS, Quantum) with country-specific working calendars (South Africa, Lesotho).

## Tech Stack

- **Frontend:** Next.js 15.1 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui style primitives
- **State:** Zustand, React Hook Form, Zod
- **Backend (zero-cost):** Firebase Authentication, Cloud Firestore, Firebase Storage — all on **Spark (free) plan**
- **Server logic:** Next.js API Routes (deployed on Vercel) — Cloud Functions deliberately avoided to stay on free tier
- **Charts:** Recharts
- **Gantt:** frappe-gantt
- **Deployment:** Vercel (Hobby) + Firebase Spark

## Zero-Cost Architecture Notes

This build deliberately stays on **Firebase Spark (free)** and **Vercel Hobby (free)**. That means:

- ❌ No Cloud Functions (requires Blaze paid plan since 2022)
- ✅ All server-side logic runs in **Next.js API Routes** instead
- ✅ Audit logs, notifications, SLA recalculation all happen transactionally inside the same write that triggered them
- ✅ "Overdue" flags computed on-read when dashboards load (no scheduled jobs)
- ⚠️ True background automation (e.g. "send email at 6am whether or not anyone is logged in") is **not available** — see `docs/upgrade-to-blaze.md` for what changes when you upgrade

Free-tier limits to watch:
- Firestore: 50K reads, 20K writes, 20K deletes per day
- Storage: 5 GiB total, 1 GiB/day downloads
- Auth: unlimited
- Vercel: 100 GB bandwidth/month

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up Firebase project at console.firebase.google.com
#    - Create project (Spark plan)
#    - Enable Authentication > Email/Password
#    - Create Firestore Database (production mode)
#    - Create Storage bucket
#    - Project Settings > General > add Web app, copy config
#    - Project Settings > Service Accounts > Generate Private Key

# 3. Configure environment
cp .env.example .env.local
# Fill in Firebase config + service account credentials

# 4. Run
npm run dev
```

## Module Roadmap

This codebase is built module-by-module. Each module is a complete, runnable layer.

| # | Module | Status |
|---|--------|--------|
| 1 | Project Foundation | ✅ |
| 2 | Firestore Schema & Types (all 19 collections, Zod) | ⏳ Next |
| 3 | Auth + Roles + Permissions | ⏳ |
| 4 | Calendar Engine (working days, holidays) | ⏳ |
| 5 | Company & Workflow Config | ⏳ |
| 6 | Style Creation + Pattern Making | ⏳ |
| 7 | Capacity Planning Engine (Gantt) | ⏳ |
| 8 | Costing + PO Management | ⏳ |
| 9 | Sample Workflow Engine | ⏳ |
| 10 | Revision Management (3rd-revision MD approval) | ⏳ |
| 11 | Dispatch Management | ⏳ |
| 12 | Notification Engine | ⏳ |
| 13 | Dashboard & Analytics | ⏳ |
| 14 | Audit Logs | ⏳ |
| 15 | Deployment Guide (Vercel + Firebase) | ⏳ |

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── (auth)/             # login, register
│   ├── (app)/              # protected app shell
│   │   ├── dashboard/
│   │   ├── styles/
│   │   ├── patterns/
│   │   ├── costing/
│   │   ├── po/
│   │   ├── samples/
│   │   ├── dispatch/
│   │   ├── capacity/
│   │   └── admin/
│   └── api/                # server-side routes (replaces Cloud Functions)
├── components/
│   ├── ui/                 # shadcn primitives
│   ├── layout/             # sidebar, header
│   └── providers/          # context providers
├── lib/                    # firebase clients, utils
├── services/               # business logic (calendar, workflow, capacity, ...)
├── hooks/                  # custom hooks
├── store/                  # Zustand stores
└── types/                  # TypeScript types + Zod schemas
```

## Configuration-Driven Design

Per the spec, the following are **NOT hardcoded** and live in Firestore:
- Workflow stages and per-step timelines (per company)
- Holidays and working-day rules (per company)
- Roles and permissions
- Daily capacity per team
- Style code generation formula
- Outwork options, departments, etc.

## License

Internal use.
