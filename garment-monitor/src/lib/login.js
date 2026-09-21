// src/lib/login.js
// Lets people sign in with a short username (e.g. "vijan.b") instead of the
// full email. If the input already contains "@", it is used as-is. The company
// domain is configurable in Settings (companyDomain); this is the fallback.
export const DEFAULT_DOMAIN = "dutyfreesourcing.com";

export function toEmail(input, domain) {
  const v = (input || "").trim();
  if (!v) return v;
  if (v.includes("@")) return v;
  return `${v}@${(domain || DEFAULT_DOMAIN).replace(/^@/, "")}`;
}
