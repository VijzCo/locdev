/**
 * Role-Based Access Control (RBAC) permission matrix.
 *
 * Permissions are computed at user creation / role change and stored
 * on the user document for fast checks. Server-side, Cloud Functions
 * recompute these from the role to prevent client tampering.
 *
 * To add a custom permission for a specific user, the admin can append
 * to the user's `permissions` array — it's an additive override.
 */

import type { Permission, UserRole } from '@/types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'tenant.manage',
    'tenant.billing',
    'users.manage',
    'users.invite',
    'factories.read',
    'factories.write',
    'factories.delete',
    'smv.read',
    'smv.write',
    'smv.approve',
    'ob.read',
    'ob.write',
    'ob.approve',
    'styles.read',
    'styles.write',
    'lines.read',
    'lines.write',
    'reports.read',
    'reports.export',
    'costing.read',
    'costing.write',
    'chat.access',
    'settings.read',
    'settings.write',
  ],
  factory_admin: [
    'tenant.billing',
    'users.manage',
    'users.invite',
    'factories.read',
    'factories.write',
    'smv.read',
    'smv.write',
    'smv.approve',
    'ob.read',
    'ob.write',
    'ob.approve',
    'styles.read',
    'styles.write',
    'lines.read',
    'lines.write',
    'reports.read',
    'reports.export',
    'costing.read',
    'costing.write',
    'chat.access',
    'settings.read',
    'settings.write',
  ],
  ie_manager: [
    'factories.read',
    'smv.read',
    'smv.write',
    'smv.approve',
    'ob.read',
    'ob.write',
    'ob.approve',
    'styles.read',
    'styles.write',
    'lines.read',
    'lines.write',
    'reports.read',
    'reports.export',
    'costing.read',
    'costing.write',
    'chat.access',
    'settings.read',
  ],
  ie_officer: [
    'factories.read',
    'smv.read',
    'smv.write',
    'ob.read',
    'ob.write',
    'styles.read',
    'styles.write',
    'lines.read',
    'lines.write',
    'reports.read',
    'costing.read',
    'chat.access',
  ],
  planning_manager: [
    'factories.read',
    'smv.read',
    'ob.read',
    'styles.read',
    'styles.write',
    'lines.read',
    'lines.write',
    'reports.read',
    'reports.export',
    'costing.read',
    'chat.access',
  ],
  production_manager: [
    'factories.read',
    'smv.read',
    'ob.read',
    'styles.read',
    'lines.read',
    'lines.write',
    'reports.read',
    'chat.access',
  ],
  supervisor: [
    'factories.read',
    'smv.read',
    'ob.read',
    'styles.read',
    'lines.read',
    'reports.read',
    'chat.access',
  ],
  viewer: [
    'factories.read',
    'smv.read',
    'ob.read',
    'styles.read',
    'lines.read',
    'reports.read',
  ],
};

export function permissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function userHasPermission(
  userPermissions: Permission[] | undefined,
  required: Permission
): boolean {
  return userPermissions?.includes(required) ?? false;
}

export function userHasAnyPermission(
  userPermissions: Permission[] | undefined,
  required: Permission[]
): boolean {
  if (!userPermissions) return false;
  return required.some((p) => userPermissions.includes(p));
}

export function userHasAllPermissions(
  userPermissions: Permission[] | undefined,
  required: Permission[]
): boolean {
  if (!userPermissions) return false;
  return required.every((p) => userPermissions.includes(p));
}

/** Friendly role display names — extend per-language in i18n files */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  factory_admin: 'Factory Admin',
  ie_manager: 'IE Manager',
  ie_officer: 'IE Officer',
  planning_manager: 'Planning Manager',
  production_manager: 'Production Manager',
  supervisor: 'Supervisor',
  viewer: 'Viewer',
};
