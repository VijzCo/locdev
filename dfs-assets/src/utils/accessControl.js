// src/utils/accessControl.js
// ═══════════════════════════════════════════════════════════════════
// DutyFreeSourcing — Access Control Rules
//
// ROLES:
//   super_admin → You only. Full access everywhere. Only one who deletes.
//   staff       → IT Staff. See + manage everything. Cannot delete.
//   viewer      → Other dept staff. See own dept only. Read-only.
//
// VISIBILITY:
//   super_admin → ALL departments
//   IT staff    → ALL departments
//   viewer      → OWN department only
//
// ISSUANCE:
//   super_admin → can issue to any department
//   IT staff    → can issue to any department
//   viewer      → cannot issue
//
// DELETE:
//   super_admin ONLY — no one else
// ═══════════════════════════════════════════════════════════════════

/** Can this user see records from all departments? */
export function canSeeAll(user) {
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.role === 'staff' && user.department === 'IT') return true
  return false
}

/** Can this user create and edit records? */
export function canWrite(user) {
  if (!user) return false
  return user.role === 'super_admin' || user.role === 'staff'
}

/** Can this user issue assets/inventory to employees? */
export function canIssue(user) {
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.role === 'staff' && user.department === 'IT') return true
  return false
}

/** ONLY super_admin can delete — anywhere in the system */
export function canDelete(user) {
  return user?.role === 'super_admin'
}

/** Label shown in UI for this user's access level */
export function accessLabel(user) {
  if (!user) return ''
  if (user.role === 'super_admin') return 'Super Admin'
  if (user.role === 'staff' && user.department === 'IT') return 'IT Staff · All-Access'
  if (user.role === 'staff') return `Staff · ${user.department}`
  return `Viewer · ${user.department}`
}
