# 🌙 NikahConnect

A modern, responsible, privacy-first matrimonial platform built with Next.js and Firebase.

## ✨ Features

### Core
- 🔐 Google Authentication via Firebase Auth
- 👤 Individual & Parent/Guardian account types
- 📋 Multi-step onboarding with profile completion tracker
- 🔍 Smart search with age, location, education, religion filters
- 💞 Match request system (send, accept, reject)
- 💬 Real-time messaging (matched users only)
- 🔔 Firebase notifications
- 🛡️ Full privacy controls & profile pausing
- 🔒 Verified profile badges
- 🚩 Block & report functionality

### Admin Panel
- 👥 User management (view, activate/suspend accounts)
- 📊 Analytics overview (users, matches, reports)
- 🗂️ Report handling & moderation queue

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS + Custom CSS |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google) |
| Storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Notifications | Firebase Cloud Messaging |

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Firebase Project

1. Go to console.firebase.google.com
2. Create a new project
3. Enable: Authentication (Google), Firestore, Storage, Hosting

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
# Fill in your Firebase credentials
```

### 4. Deploy Firebase Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

### 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

## 🗂️ Project Structure

```
src/
├── components/layout/   # Sidebar navigation & layout wrapper
├── contexts/            # Firebase Auth context
├── lib/firebase.ts      # Firebase initialization
├── pages/
│   ├── index.tsx        # Landing page
│   ├── onboarding.tsx   # 6-step profile setup wizard
│   ├── dashboard.tsx    # Main dashboard with stats
│   ├── search.tsx       # Browse & filter profiles
│   ├── matches.tsx      # Match requests & accepted matches
│   ├── messages.tsx     # Real-time chat interface
│   ├── notifications.tsx
│   ├── settings.tsx     # Privacy & account settings
│   ├── profile/         # My profile view & edit
│   ├── profiles/[uid]   # Public profile view
│   └── admin/           # Admin moderation panel
└── types/index.ts       # TypeScript types
```

## 🗄️ Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | User profiles, privacy settings |
| `matches` | Match requests and accepted pairs |
| `messages` | Chat messages (per match) |
| `notifications` | Activity notifications |
| `reports` | User reports for moderation |

## 🔧 Admin Access

Set `isAdmin: true` on a user document in Firestore Console to grant admin privileges.

## 📱 Roadmap

- Phone number verification
- AI compatibility matching
- Video profile introductions
- Premium membership tier
- Mobile app (React Native)
