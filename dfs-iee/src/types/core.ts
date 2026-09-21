import type { Timestamp } from 'firebase/firestore';

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export const USER_ROLES = [
  'super_admin',
  'factory_admin',
  'ie_manager',
  'ie_officer',
  'planning_manager',
  'production_manager',
  'supervisor',
  'viewer',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Permission scopes. Each module has read/write/delete granularity.
 * Use these in security rules and route guards.
 */
export const PERMISSIONS = [
  // Tenant-level admin
  'tenant.manage',
  'tenant.billing',
  'users.manage',
  'users.invite',
  // Factory operations
  'factories.read',
  'factories.write',
  'factories.delete',
  // SMV
  'smv.read',
  'smv.write',
  'smv.approve',
  // Operation Bulletin
  'ob.read',
  'ob.write',
  'ob.approve',
  // Styles
  'styles.read',
  'styles.write',
  // Line balancing
  'lines.read',
  'lines.write',
  // Reports
  'reports.read',
  'reports.export',
  // Costing
  'costing.read',
  'costing.write',
  // Chat
  'chat.access',
  // Settings
  'settings.read',
  'settings.write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ============================================================================
// TENANT (Company / Customer Account)
// ============================================================================

export type SubscriptionPlan = 'free' | 'premium' | 'enterprise';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export interface PlanLimits {
  maxUsers: number;
  maxFactories: number;
  maxStylesPerMonth: number;
  maxOperationsPerStyle: number;
  aiSuggestions: boolean;
  excelImport: boolean;
  pdfExport: boolean;
  apiAccess: boolean;
  chatEnabled: boolean;
  advancedAnalytics: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerId: string; // userId of the account creator
  country: string;
  currency: string; // ISO 4217: USD, LKR, INR, etc.
  defaultLanguage: 'en' | 'si' | 'ta';
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Timestamp;
    trialEndsAt?: Timestamp;
    limits: PlanLimits;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

// ============================================================================
// USER
// ============================================================================

export interface AppUser {
  id: string; // matches Firebase Auth uid
  email: string;
  displayName: string;
  photoURL?: string;
  tenantId: string;
  role: UserRole;
  /** Factory IDs the user can access. Empty = all factories in tenant. */
  factoryAccess: string[];
  permissions: Permission[]; // computed from role + overrides
  status: 'pending' | 'active' | 'suspended';
  language: 'en' | 'si' | 'ta';
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  factoryAccess: string[];
  invitedBy: string;
  token: string;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp | null;
  createdAt: Timestamp;
}

// ============================================================================
// FACTORY HIERARCHY
// ============================================================================

export interface Factory {
  id: string;
  tenantId: string;
  name: string;
  code: string; // short code like "FAC01"
  address?: string;
  country: string;
  /**
   * Cost Per Minute at factory level. Used as default for costing
   * when a more granular department CPM isn't set.
   */
  cpm: number;
  /**
   * Target factory-wide efficiency, used to benchmark line performance.
   * Stored as decimal (0.65 = 65%).
   */
  targetEfficiency: number;
  /** Standard daily working minutes (e.g. 480 for an 8-hour shift) */
  workingMinutesPerDay: number;
  workingDaysPerMonth: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Department {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  type: 'cutting' | 'sewing' | 'finishing' | 'washing' | 'packing' | 'other';
  cpm?: number; // overrides factory CPM if set
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductionLine {
  id: string;
  tenantId: string;
  factoryId: string;
  departmentId: string;
  name: string;
  capacity: number; // number of operators
  supervisorId?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
