// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, COL } from "../firebase/config.js";
import { defaultCapsFor } from "../lib/roles.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null); // Firebase auth user
  const [profile, setProfile] = useState(null); // Firestore profile (role, factories)
  const [roleCaps, setRoleCaps] = useState(null); // capabilities from the role doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, COL.users, u.uid));
          setProfile(snap.exists() ? { id: u.uid, ...snap.data() } : null);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  // Live-resolve the role's capability list (falls back to built-in defaults).
  useEffect(() => {
    const role = profile?.role;
    if (!role) { setRoleCaps(null); return; }
    return onSnapshot(doc(db, COL.roles, role), (snap) => {
      setRoleCaps(snap.exists() && Array.isArray(snap.data().capabilities)
        ? snap.data().capabilities
        : defaultCapsFor(role));
    }, () => setRoleCaps(defaultCapsFor(role)));
  }, [profile?.role]);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  // The merged "user" the rest of the app consumes.
  const user = authUser
    ? {
        uid: authUser.uid, email: authUser.email, ...(profile || {}),
        capabilities: roleCaps || defaultCapsFor(profile?.role),
      }
    : null;

  return (
    <AuthCtx.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
