/**
 * Firebase project configuration.
 *
 * These values are PUBLIC by design. Firebase expects them to ship in the
 * browser — they identify your project, they do not authorise anything.
 * All real access control lives in firestore.rules and Firebase Auth.
 *
 * Get these from: Firebase console -> Project settings -> Your apps -> Web app
 *
 * Leave the placeholders in place and the site still works: the admin panel
 * stays local-only and inquiries fall back to browser storage. See SECURITY.md.
 */

export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

/**
 * App Check protects Firestore from clients that are not your website.
 * Register a reCAPTCHA v3 site key in the Firebase console under App Check,
 * then paste it here. Leave empty to skip App Check during setup.
 */
export const recaptchaSiteKey = "";

export const isConfigured = () =>
  firebaseConfig.apiKey !== "REPLACE_ME" && firebaseConfig.projectId !== "REPLACE_ME";
