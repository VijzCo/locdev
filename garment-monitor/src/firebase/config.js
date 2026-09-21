// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collection name constants (single source of truth).
export const COL = {
  users: "users",
  factories: "factories",
  departments: "departments",
  sections: "sections",
  modules: "modules",
  devices: "devices",
  styles: "styles",
  shifts: "shifts",
  shiftSlots: "shiftSlots",
  teamAllocations: "teamAllocations",
  dailyPlans: "dailyPlans",
  hourlyProduction: "hourlyProduction",
  reports: "reports",
  settings: "settings",
  auditLogs: "auditLogs",
  roles: "roles",
  downtimeCategories: "downtimeCategories",
  downtimeReasons: "downtimeReasons",
  andonCategories: "andonCategories",
  andonReasons: "andonReasons",
  downtimes: "downtimes",
  andons: "andons",
  targets: "targets",
  notifications: "notifications",
  counters: "counters",
  dashboardLinks: "dashboardLinks",
};
