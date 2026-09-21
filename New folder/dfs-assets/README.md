# DutyFreeSourcing — IT Asset Management System

Enterprise-grade IT Asset & Inventory Management built with **React + Vite + Tailwind CSS + Firebase**.

---

## ✦ Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Stats, charts, overdue alerts, low stock alerts, activity feed |
| **IT Assets** | Full CRUD, search, filter by dept/status/category, CSV export |
| **Inventory** | Stock levels, stock-in/out movements, transaction log |
| **Issuance** | Issue assets to employees with accessories checklist, return workflow |
| **QR Labels** | Generate & print labels with Brand, Model, Asset ID, Serial Number |
| **Audit Logs** | Full immutable action history, filterable, exportable |
| **Users & Roles** | Admin/Staff/Viewer RBAC, department-scoped access |

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd dfs-assets
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create Project
2. Enable **Authentication** → Email/Password
3. Enable **Firestore Database** (start in production mode)
4. Enable **Storage** (optional, for future attachments)

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your Firebase project credentials in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore, Hosting (choose existing project)
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Create Your First Admin User

In Firebase Console → Authentication → Add user manually, then:

In Firestore → Create document in `users/` collection with the UID:

```json
{
  "uid": "<firebase-auth-uid>",
  "name": "Alex Kim",
  "email": "admin@dfs.io",
  "employeeNumber": "EMP-0001",
  "department": "IT",
  "role": "admin"
}
```

### 6. Run Locally

```bash
npm run dev
# Open http://localhost:5173
```

---

## 🚀 Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://<your-project-id>.web.app`

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── AppLayout.jsx        # Sidebar + topbar shell
│   └── ui/
│       ├── index.jsx            # Badge, Modal, FormGroup, Tabs, etc.
│       └── LoadingScreen.jsx
├── context/
│   └── AuthContext.jsx          # Firebase Auth state provider
├── pages/
│   ├── LoginPage.jsx
│   ├── Dashboard.jsx
│   ├── AssetsPage.jsx
│   ├── InventoryPage.jsx
│   ├── IssuancePage.jsx
│   ├── QRPage.jsx
│   ├── LogsPage.jsx
│   └── UsersPage.jsx
├── services/firebase/
│   ├── config.js                # Firebase app init
│   ├── auth.js                  # Login, logout, createUser
│   ├── assets.js                # Asset CRUD
│   ├── inventory.js             # Inventory + stock movements
│   ├── issuance.js              # Issue/return workflow
│   ├── logs.js                  # Audit log reads/writes
│   └── users.js                 # User management
├── utils/
│   ├── idGenerator.js           # Auto asset ID (LP-XXXX, TB-XXXX, etc.)
│   └── export.js                # CSV export
├── App.jsx                      # Router + route guards
├── main.jsx                     # Entry point
└── index.css                    # Tailwind + global styles
```

---

## 🔐 Role Permissions

| Action | Admin | Staff | Viewer |
|---|:---:|:---:|:---:|
| View assets/inventory | ✓ | ✓ (own dept) | ✓ (own dept) |
| Create assets/items | ✓ | ✓ | ✗ |
| Update assets/items | ✓ | ✓ | ✗ |
| Delete assets | ✓ | ✗ | ✗ |
| Issue/return assets | ✓ | ✓ | ✗ |
| View all departments | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |

---

## 🔥 Firestore Collections

| Collection | Description |
|---|---|
| `users` | User profiles with role + department |
| `assets` | IT asset records |
| `inventory` | Stock items |
| `stockLogs` | Stock movement history |
| `issuance` | Asset issuance records |
| `logs` | Immutable audit trail |

---

## 🖨 QR Label

The printed label includes:
- **DutyFreeSourcing Inc.** company header
- QR code (links to asset detail URL)
- **Brand**, **Model**, **Asset ID**, **Serial Number**

Print via QR Labels page → Select Asset → Print Label.

---

## 🛠 Tech Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** (dark mode, custom design tokens)
- **Firebase 10** (Auth, Firestore, Storage)
- **React Router v6**
- **Recharts** (dashboard charts)
- **qrcode.react** (QR generation)
- **date-fns** (date formatting)
- **react-hot-toast** (notifications)
- **xlsx + file-saver** (CSV/Excel export)

---

## 📝 License

Internal use — DutyFreeSourcing Inc. All rights reserved.
