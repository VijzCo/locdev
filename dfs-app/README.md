# Duty Free Sourcing Inc. — Web App

**Full-stack React + Firebase company profile web app with public website and admin CMS.**

---

## 🗂 Project Structure

```
dfs-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── public/
│   │   │   ├── Navbar.jsx / .css
│   │   │   ├── Footer.jsx / .css
│   │   │   └── PublicLayout.jsx
│   │   └── admin/
│   │       ├── AdminLayout.jsx / .css
│   │       └── AdminSidebar.jsx / .css
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Home.jsx / .css
│   │   │   ├── About.jsx / .css
│   │   │   ├── Leadership.jsx / .css
│   │   │   ├── Factories.jsx / .css
│   │   │   ├── Products.jsx / .css
│   │   │   └── Contact.jsx / .css
│   │   └── admin/
│   │       ├── Login.jsx / .css
│   │       ├── Dashboard.jsx
│   │       ├── AdminCompany.jsx
│   │       ├── AdminLeadership.jsx
│   │       ├── AdminFactories.jsx
│   │       ├── AdminProducts.jsx
│   │       ├── AdminServices.jsx
│   │       └── AdminSettings.jsx
│   ├── firebase/
│   │   ├── config.js
│   │   └── seedData.js
│   ├── services/
│   │   ├── firestoreService.js
│   │   └── storageService.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useFirestore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── firebase.json
├── firestore.rules
├── storage.rules
├── .firebaserc
├── .env.example
├── index.html
├── vite.config.js
└── package.json
```

---

## ⚡ Quick Start

### Step 1 — Prerequisites

- Node.js 18+ installed
- Firebase account at [console.firebase.google.com](https://console.firebase.google.com)
- Firebase CLI: `npm install -g firebase-tools`

---

### Step 2 — Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** → name it (e.g., `duty-free-sourcing`)
3. Enable **Google Analytics** (optional)
4. Click **Create Project**

**Enable Services:**

| Service | Steps |
|---------|-------|
| **Authentication** | Build → Authentication → Get Started → Email/Password → Enable |
| **Firestore** | Build → Firestore Database → Create Database → Start in Production mode → choose region (e.g., `us-central1`) |
| **Storage** | Build → Storage → Get Started → Start in Production mode |
| **Hosting** | Build → Hosting → Get Started |

**Create Admin User:**
- Authentication → Users → Add User
- Enter your admin email and a strong password

---

### Step 3 — Get Firebase Config

1. Firebase Console → Project Settings (⚙️ gear icon)
2. Scroll to **Your apps** → Click **Web** `</>`
3. Register app name → copy the `firebaseConfig` object

---

### Step 4 — Configure Environment

```bash
# In the project root
cp .env.example .env
```

Edit `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Also update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

---

### Step 5 — Install & Run Locally

```bash
cd dfs-app
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

### Step 6 — Seed the Database

1. Open the app in your browser
2. Log in at `/admin` with your Firebase admin credentials
3. On the Dashboard, click **"Seed Sample Data"**
4. All collections will be populated with realistic DFS data

---

### Step 7 — Deploy Firestore & Storage Rules

```bash
# Login to Firebase CLI
firebase login

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

### Step 8 — Build & Deploy to Firebase Hosting

```bash
# Build the production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your site will be live at:
```
https://your-project-id.web.app
```

---

## 🔐 Admin Access

| URL | Purpose |
|-----|---------|
| `/admin` | Admin login page |
| `/admin/dashboard` | Overview + quick links |
| `/admin/company` | Edit mission, vision, overview |
| `/admin/leadership` | Add/edit/delete team members |
| `/admin/factories` | Manage factory details & images |
| `/admin/products` | Product catalogue management |
| `/admin/services` | Manufacturing services |
| `/admin/settings` | Contact info, PDF uploads, password |

---

## 🌐 Public Pages

| URL | Page |
|-----|------|
| `/` | Home — hero, stats, products, services |
| `/about` | Company story, vision, mission, values |
| `/leadership` | Leadership team cards |
| `/factories` | Factory details and certifications |
| `/products` | Product catalogue with category filter |
| `/contact` | Contact form + office info |

---

## 🗄 Firestore Collections

| Collection | Fields |
|------------|--------|
| `company/overview` | name, tagline, description, vision, mission, values[], founded, employees, factories |
| `leadership` | name, role, bio, imageUrl, order |
| `factories` | name, location, employees, capacity, specialization, certifications[], imageUrl, order |
| `products` | name, category, description, moq, leadTime, imageUrl, featured, order |
| `services` | title, description, icon, order |
| `settings/contact` | address, phone, email, salesEmail, officeHours, companyProfileUrl, certDocUrl |

---

## 📦 Firebase Storage Structure

```
/leadership/      → Team member profile photos
/factories/       → Factory images
/products/        → Product images
/documents/       → Company profile PDFs, certificate documents
```

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Navy (primary) | `#0a1628` |
| Gold (accent) | `#c9a84c` |
| Body font | DM Sans |
| Display font | Playfair Display |
| Border radius | 4px–12px |

---

## 🔧 Common Customizations

### Change company colors
Edit CSS variables in `src/index.css`:
```css
:root {
  --navy: #0a1628;   /* Change primary dark color */
  --gold: #c9a84c;   /* Change accent color */
}
```

### Add a new admin section
1. Create `src/pages/admin/AdminNewSection.jsx`
2. Add Firestore service functions in `src/services/firestoreService.js`
3. Add route in `src/App.jsx`
4. Add nav link in `src/components/admin/AdminSidebar.jsx`

### Connect a contact form to email
Use [EmailJS](https://emailjs.com) (free tier):
```bash
npm install @emailjs/browser
```
In `Contact.jsx`, replace the `await new Promise(...)` mock with:
```js
await emailjs.send('SERVICE_ID', 'TEMPLATE_ID', data, 'PUBLIC_KEY');
```

---

## 🚀 Production Checklist

- [ ] Firebase project created and services enabled
- [ ] `.env` file configured with real Firebase keys
- [ ] `.firebaserc` updated with project ID
- [ ] Admin user created in Firebase Authentication
- [ ] Firestore + Storage rules deployed
- [ ] Database seeded via admin dashboard
- [ ] Company info updated in admin CMS
- [ ] Team photos uploaded for leadership
- [ ] Factory images uploaded
- [ ] Product images uploaded
- [ ] Company profile PDF uploaded in Settings
- [ ] Contact information verified
- [ ] Custom domain configured in Firebase Hosting (optional)
- [ ] Google Analytics enabled (optional)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5 |
| Routing | React Router v6 |
| Forms | React Hook Form |
| Notifications | React Hot Toast |
| Icons | Lucide React |
| Backend | Firebase Firestore |
| Auth | Firebase Authentication |
| Files | Firebase Storage |
| Hosting | Firebase Hosting |
| PDF Export | jsPDF + jsPDF-AutoTable |

---

## 📞 Support

For Firebase-specific help:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- [Vite Documentation](https://vitejs.dev)

---

*Built for Duty Free Sourcing Inc. (PTY) LTD — Maseru, Lesotho*
