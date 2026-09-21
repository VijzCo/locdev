// src/firebase/userAdmin.js
// Create a Firebase Auth account from inside the app WITHOUT logging the admin
// out. We spin up a throwaway secondary Firebase app, create the user on it,
// grab the new UID, then sign out and dispose of that secondary app. The
// admin's primary session is never touched, so they can keep provisioning
// users. (Deleting Auth accounts still needs the Admin SDK, so removing a user
// here only removes their Firestore profile — see Users.jsx.)
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "./config.js";

export async function createAuthUser(email, password) {
  const name = "user-provision-" + Date.now();
  const secondary = initializeApp(firebaseConfig, name);
  const secAuth = getAuth(secondary);
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
    return cred.user.uid;
  } finally {
    await signOut(secAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}
