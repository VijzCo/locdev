/**
 * Sign-in identity.
 *
 * Firebase Auth only does email and password, but nobody on a production
 * floor should type an email address to start a shift. So a username is
 * turned into an address behind the scenes and never shown.
 *
 *   m01  →  m01@loomline.login
 *
 * Nothing is ever delivered to that domain. It is an identifier.
 *
 * An input containing an @ is treated as a real address and passed through
 * untouched. That keeps two kinds of account working side by side: operators
 * with usernames, and administrators or vendor staff who signed up with a
 * real email and can therefore reset their own password.
 */

export const LOGIN_DOMAIN = 'loomline.login';

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,31}$/;

/** Usernames are lowercase, so `M01` and `m01` are the same person. */
export function normaliseUsername(value: string): string {
  // Outer whitespace is trimmed; inner is left so validation can object to
  // it rather than silently turning "john smith" into a different name.
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = normaliseUsername(value);
  if (!username) return 'A username is required.';
  if (/\s/.test(username)) {
    return 'A username cannot contain spaces. Try a dot instead, such as a.smith';
  }
  if (username.includes('@')) {
    return 'This is a username, not an email address. Leave out the @ part.';
  }
  if (username.length < 2) return 'A username needs at least 2 characters.';
  if (username.length > 32) return 'A username can be at most 32 characters.';
  if (!USERNAME.test(username)) {
    return 'Use letters, numbers, dots, hyphens and underscores only, starting with a letter or number.';
  }
  return null;
}

/** The address Firebase Auth sees for a username. Never shown to anyone. */
export function buildLoginEmail(username: string): string {
  return `${normaliseUsername(username).replace(/\s+/g, '')}@${LOGIN_DOMAIN}`;
}

/**
 * What the sign-in screen submits. Accepts either a username or a real
 * email, so one field serves both kinds of account.
 */
export function resolveLoginIdentifier(input: string): string {
  const value = input.trim().toLowerCase();
  return value.includes('@') ? value : buildLoginEmail(value);
}

/** True when this account signs in with a username rather than an email. */
export function isUsernameLogin(email: string): boolean {
  return email.endsWith(`@${LOGIN_DOMAIN}`);
}

/** What to show in a user list: the username, or the real address. */
export function displayLogin(email: string): string {
  return isUsernameLogin(email) ? email.slice(0, -(LOGIN_DOMAIN.length + 1)) : email;
}
