/**
 * Firestore collection paths.
 *
 * All collections live under a top-level `tenants/{tenantId}/...` namespace
 * EXCEPT for global collections (users, tenants themselves, invitations).
 *
 * This nesting strategy makes tenant isolation trivial to enforce in
 * security rules: you simply check `request.auth.uid` against the
 * tenant's user list at the path root.
 */

export const COLLECTIONS = {
  // Global
  users: 'users',
  tenants: 'tenants',
  invitations: 'invitations',
  activityLogs: 'activityLogs',

  // Per-tenant subcollections
  factories: (tenantId: string) => `tenants/${tenantId}/factories`,
  departments: (tenantId: string) => `tenants/${tenantId}/departments`,
  productionLines: (tenantId: string) => `tenants/${tenantId}/productionLines`,
  machines: (tenantId: string) => `tenants/${tenantId}/machines`,
  motionLibrary: (tenantId: string) => `tenants/${tenantId}/motionLibrary`,
  buyers: (tenantId: string) => `tenants/${tenantId}/buyers`,
  styles: (tenantId: string) => `tenants/${tenantId}/styles`,
  operations: (tenantId: string) => `tenants/${tenantId}/operations`,
  operationBulletins: (tenantId: string) => `tenants/${tenantId}/operationBulletins`,
  lineBalances: (tenantId: string) => `tenants/${tenantId}/lineBalances`,
  settings: (tenantId: string) => `tenants/${tenantId}/settings`,

  // Chat
  chatRooms: (tenantId: string) => `tenants/${tenantId}/chatRooms`,
  chatMessages: (tenantId: string, roomId: string) =>
    `tenants/${tenantId}/chatRooms/${roomId}/messages`,
} as const;
