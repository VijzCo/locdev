# AssetFlow — Setup & Deployment Guide

## 🔥 Firebase Setup (Step-by-Step)

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `assetflow` → Continue
3. Disable Google Analytics (optional) → **Create project**

---

### 2. Enable Firebase Authentication
1. In Firebase console → **Build → Authentication**
2. Click **"Get started"**
3. Under "Sign-in method" → Enable **Email/Password**
4. Click **Save**

---

### 3. Create Firestore Database
1. **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **Production mode** → Select your region → **Done**
4. Go to **Rules** tab and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Authenticated users can read assets and inventory
    // Only admins can write (enforced in app logic)
    match /assets/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /inventory/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

---

### 4. Get Firebase Config
1. **Project Settings** (⚙️ icon) → **General** tab
2. Scroll to **"Your apps"** → Click **`</>`** (Web) icon
3. Register app name: `AssetFlow Web`
4. Copy the `firebaseConfig` object — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "assetflow-xxxx.firebaseapp.com",
  projectId: "assetflow-xxxx",
  storageBucket: "assetflow-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

---

### 5. Update index.html
Open `index.html` and find this block near the bottom:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};
```

Replace each value with your actual Firebase config values.

---

### 6. Create First Admin Account
1. Open `index.html` in a browser (or deploy first)
2. Click the **Register** tab
3. Set Role = **Admin**
4. Fill in name, email, password → **Create Account**
5. You're logged in as Admin!

---

## 🚀 Deploy to Firebase Hosting

### Option A: Firebase CLI (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (in the folder with index.html)
firebase init hosting

# When prompted:
# ✔ Use existing project → select your project
# ✔ Public directory: . (dot, current folder)
# ✔ Single-page app: No
# ✔ Don't overwrite index.html

# Deploy!
firebase deploy
```

Your app will be live at: `https://YOUR-PROJECT-ID.web.app`

---

### Option B: Manual Upload
1. Firebase Console → **Build → Hosting** → **Get started**
2. Follow the setup wizard
3. Drag and drop `index.html` into the hosting dashboard

---

## 📁 Project Structure

```
assetflow/
├── index.html      ← Complete application (single file)
└── SETUP.md        ← This guide
```

---

## 🗄️ Firestore Collections

| Collection  | Fields |
|-------------|--------|
| `assets`    | name, type, serialNumber, status, department, location, createdAt |
| `inventory` | name, category, quantity, minStock, location, createdAt |
| `users`     | name, email, role, createdAt |

---

## 👥 Roles

| Role  | Permissions |
|-------|-------------|
| **Admin** | View + Add + Edit + Delete all records |
| **User**  | View only (read-only access) |

---

## ✅ Features Included

- 🔐 Firebase Email/Password Authentication
- 👑 Role-based access (Admin / User)
- 💻 IT Assets — Full CRUD (Laptop, CCTV, Router, Switch, Tablet, etc.)
- 📦 Inventory — Full CRUD with low-stock alerts
- 📊 Dashboard — Stats, recent assets, low stock alerts
- 🔍 Search & filter on all tables
- ⚡ Real-time updates via Firestore listeners
- 📱 Fully responsive (desktop + tablet + mobile)
- 🍞 Toast notifications
- ✅ Form validation

---

## 🐛 Troubleshooting

**"Missing or insufficient permissions"**
→ Check your Firestore Security Rules and make sure they match the rules above.

**Login not working**
→ Verify Email/Password sign-in is enabled in Firebase Authentication.

**Data not showing**
→ Check browser console for errors. Ensure Firebase config values are correct.

**Deployed but shows blank**
→ Make sure the public directory is set to `.` (current folder) in firebase.json.
