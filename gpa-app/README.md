# GPA Calculator — Firebase Deployment Guide

## Project Structure
```
gpa-app/
├── public/
│   ├── index.html          # Login / Landing page
│   ├── app.html            # Main GPA Calculator (protected)
│   ├── admin.html          # Admin Portal (admin-only)
│   ├── style.css           # Shared design system
│   └── firebase-config.js  # Firebase config + shared helpers
├── firebase.json           # Firebase Hosting + Firestore config
├── firestore.rules         # Firestore security rules
└── firestore.indexes.json  # Firestore composite indexes
```

---

## Step 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `gpa-calculator`)
3. Disable Google Analytics (optional) → **Create project**

---

## Step 2 — Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable:
   - **Google** (click, enable, add your support email, Save)
   - **Email/Password** (enable, Save)

---

## Step 3 — Enable Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → select your region → **Done**

---

## Step 4 — Add Firebase Config to Your App

1. Firebase Console → **Project Settings** (gear icon) → **Your apps** → **</>** (Web)
2. Register app name → copy the config object
3. Open `public/firebase-config.js` and replace:

```js
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

## Step 5 — Install Firebase CLI & Deploy

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Navigate to your project folder
cd gpa-app

# Initialize Firebase (select your project)
firebase use --add
# Select your project ID from the list

# Deploy Firestore rules + indexes + hosting
firebase deploy
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

---

## Step 6 — Make Yourself Admin

1. Open your app → Sign in with Google
2. Go to Firebase Console → **Authentication** → copy your **UID**
3. Go to **Firestore** → `users` collection → find your document
4. Edit the document → set `role` to `"admin"` and `isPremium` to `true`
5. Refresh the app — you now have admin access at `/admin.html`

---

## Step 7 — Add Authorized Domain for Google Auth

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Your `*.web.app` domain is added automatically
3. If using a custom domain, add it here

---

## Features Summary

### User Roles
| Role    | Access |
|---------|--------|
| Free    | 1 free calculation, then blocked |
| Premium | Unlimited calculations, history, saved subjects |
| Admin   | Everything + Admin Portal |

### Admin Portal (`/admin.html`)
- 📊 Overview dashboard (user stats)
- 👥 User management (grant/revoke premium, change role, assign faculty)
- 🏫 Faculty management (create faculties with default subjects)

### App Features (`/app.html`)
- 🧮 GPA Calculator — By Subjects & By Semesters
- 📚 Faculty-wise subject organization
- 💾 Save subjects per semester (Premium)
- 🕒 Full calculation history (Premium)
- 👤 User profile with faculty assignment

### Security
- All routes protected by `onAuthStateChanged`
- Firestore rules enforce role-based access
- Admin routes verified server-side via Firestore role field
- XSS and clickjacking headers configured

---

## Granting Premium to a User (Admin)

**Via Admin Portal:**
1. Go to `/admin.html` → Users tab
2. Find the user → click **⭐ Grant**

**Via Firestore Console:**
1. Firestore → `users` → find user doc → set `isPremium: true`

---

## Local Development

```bash
# Install Firebase tools
npm install -g firebase-tools

# Run local emulator
firebase emulators:start --only hosting,firestore,auth

# App runs at http://localhost:5000
```
