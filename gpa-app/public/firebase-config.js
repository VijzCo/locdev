// ── REPLACE WITH YOUR FIREBASE PROJECT CONFIG ──
// Go to: Firebase Console → Project Settings → Your apps → SDK setup
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC67aXMhOvLfryyd3siAwSViihKDUbWUW0",
  authDomain:        "gpasl-f51d6.firebaseapp.com",
  projectId:         "gpasl-f51d6",
  storageBucket:     "gpasl-f51d6.firebasestorage.app",
  messagingSenderId: "952035461106",
  appId:             "1:952035461106:web:8b6a8570a89130e5e5cd6b",
  measurementId:     "G-2W9W90EHGL"
};

// ── Admin UIDs ──
// After first login, copy your UID from Firebase Console → Authentication
// and paste it here. Also set role:"admin" in Firestore users/{uid}
const ADMIN_UIDS = [
  // "UID_OF_ADMIN_USER_1",
];

// ── Grade scale ──
const GRADES = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "E": 0.0
};
const GRADE_KEYS = Object.keys(GRADES);

// ── Classification ──
function classifyGPA(gpa) {
  if (gpa >= 3.70) return { label: "First Class",   cls: "cls-first", icon: "🥇", color: "#fcd34d" };
  if (gpa >= 3.30) return { label: "Second Upper",  cls: "cls-upper", icon: "🥈", color: "#34d399" };
  if (gpa >= 3.00) return { label: "Second Lower",  cls: "cls-lower", icon: "🥉", color: "#7dd3fc" };
  if (gpa >= 2.00) return { label: "Pass",          cls: "cls-pass",  icon: "✅", color: "#a5b4fc" };
  return               { label: "Fail",             cls: "cls-fail",  icon: "❌", color: "#fca5a5" };
}

// ── GPA helpers ──
function computeSemGPA(subjects) {
  let pts = 0, cr = 0;
  subjects.forEach(s => {
    const c = parseFloat(s.credits);
    if (!isNaN(c) && c > 0 && GRADES[s.grade] !== undefined) {
      pts += GRADES[s.grade] * c; cr += c;
    }
  });
  return cr > 0 ? { gpa: pts / cr, credits: cr } : null;
}

function computeOverallGPA(semesters) {
  // semesters: [{gpa, credits}]
  let p = 0, c = 0;
  semesters.forEach(s => { if (s && s.gpa !== null && s.credits > 0) { p += s.gpa * s.credits; c += s.credits; } });
  return c > 0 ? p / c : null;
}

// ── Toast ──
function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = "", 3500);
}

// ── Format date ──
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
