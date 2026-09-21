/**
 * Domain model. Mirrors the Firestore schema in Part G of the architecture
 * document. Firestore Timestamps are represented as ISO strings at the
 * application boundary so that calculations stay pure and testable.
 */

export type ISODate = string;

/* ------------------------------------------------------------------ */
/* Tenancy and licensing (Part K)                                      */
/* ------------------------------------------------------------------ */

export type LicensePlan = 'TRIAL' | 'PAID';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

/**
 * TRIAL and ACTIVE behave identically. GRACE is fully functional with a
 * warning. EXPIRED is read-only — dashboards, history and exports keep
 * working, only writes are blocked. SUSPENDED blocks sign-in entirely.
 */
export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED';

export interface LicenseLimits {
  maxFactories: number | null;
  maxModules: number | null;
  maxUsers: number | null;
  bundlesPerMonth: number | null;
  wallDisplay: boolean;
  reportExport: boolean;
}

export interface License {
  tenantId: string;
  plan: LicensePlan;
  status: LicenseStatus;
  billingCycle: BillingCycle | null;
  startsAt: ISODate;
  expiresAt: ISODate;
  graceUntil: ISODate;
  /** Epoch milliseconds, used by the security rules. */
  expiresAtMs?: number;
  graceUntilMs?: number;
  limits: LicenseLimits;
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Identity and access (Part F)                                        */
/* ------------------------------------------------------------------ */

/** VENDOR_ADMIN is deliberately absent — it lives outside the tenant. */
export type Role =
  | 'SYSTEM_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'VIEWER';

export type ScanAccess = 'IN' | 'OUT' | 'BOTH' | 'NONE';

export interface UserScope {
  factoryIds: string[];
  departmentIds: string[];
  sectionIds: string[];
  moduleIds: string[];
  shiftIds: string[];
}

export interface AppUser {
  uid: string;
  tenantId: string;
  displayName: string;
  /** What the person types to sign in. Unique within the tenant. */
  username?: string;
  /** Synthetic address behind the username. Never shown. */
  email: string;
  /** Optional real address, used only for password resets. */
  recoveryEmail?: string;
  /** Set at creation and after an administrator reset. */
  mustChangePassword?: boolean;
  passwordChangedAt?: ISODate;
  role: Role;
  disabled: boolean;
  scope: UserScope;
  scanAccess: ScanAccess;
  capabilities: string[];
}

/* ------------------------------------------------------------------ */
/* Factory hierarchy                                                   */
/* ------------------------------------------------------------------ */

export interface Factory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  timezone: string;
  active: boolean;
}

export interface Department {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  code: string;
  stage: ProductionStage;
  active: boolean;
}

export interface Section {
  id: string;
  tenantId: string;
  factoryId: string;
  departmentId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface Module {
  id: string;
  tenantId: string;
  factoryId: string;
  departmentId: string;
  sectionId: string;
  name: string;
  code: string;
  operatorCount: number;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Product and orders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Stage list is config-driven. MVP tracks CUTTING and SEWING only
 * (decision Q4); the remaining values exist so enabling them later is a
 * settings change rather than a migration.
 */
export type ProductionStage =
  | 'RM_IN'
  | 'CUTTING'
  | 'SEWING'
  | 'FINISHING'
  | 'PACKING';

export interface Style {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  /** Single SMV per style (decision Q9). Overridable on a daily plan. */
  smv: number;
  colours: string[];
  sizes: string[];
  routeStages: ProductionStage[];
  active: boolean;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  factoryId: string;
  poNumber: string;
  buyer: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  orderDate: ISODate;
  shipDate?: ISODate;
}

/** One line per style × colour × size. Colour is a label only (Q1). */
export interface PoLine {
  id: string;
  tenantId: string;
  poId: string;
  styleId: string;
  colour: string;
  size: string;
  orderQty: number;
  bundleQty: number;
  bundlesGenerated: boolean;
}

/* ------------------------------------------------------------------ */
/* Bundles and the scan ledger                                         */
/* ------------------------------------------------------------------ */

export type BundleStatus =
  | 'CREATED'
  | 'IN_MODULE'
  | 'BETWEEN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LOST';

export interface Bundle {
  id: string;
  tenantId: string;
  factoryId: string;
  poId: string;
  poLineId: string;
  styleId: string;
  colour: string;
  size: string;
  /** Fixed at creation and never changed (decision Q2). */
  qty: number;
  seq: number;
  status: BundleStatus;
  currentModuleId: string | null;
  currentStage: ProductionStage | null;
  createdAt: ISODate;
  lastScanAt: ISODate | null;
  /** Reprints are worth investigating, so the count is kept (§28). */
  printCount?: number;
  lastPrintedAt?: ISODate | null;
}

export type ScanDirection = 'IN' | 'OUT';

/**
 * Immutable append-only ledger. The document id is
 * `${bundleId}__${moduleId}__${direction}`, which makes a duplicate scan
 * structurally impossible rather than merely unlikely (Part C4).
 */
export interface ScanEvent {
  id: string;
  tenantId: string;
  factoryId: string;
  bundleId: string;
  moduleId: string;
  direction: ScanDirection;
  qty: number;
  userId: string;
  shiftId: string;
  slotIndex: number;
  /** Device clock at scan time — drives slot bucketing. */
  clientTime: ISODate;
  /** Server clock at write time. Diverges from clientTime for offline scans. */
  serverTime: ISODate | null;
}

/** Local outbox record. Never discarded without the operator seeing it. */
export type OutboxState = 'PENDING' | 'ACKNOWLEDGED' | 'REJECTED';

export interface OutboxEntry {
  scanId: string;
  state: OutboxState;
  queuedAt: ISODate;
  attempts: number;
  rejectionReason?: string;
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

/** Maintained by commutative increments inside the scan batch (Part D2). */
export interface ModuleWip {
  moduleId: string;
  tenantId: string;
  pieces: number;
  bundles: number;
  updatedAt: ISODate;
}

export interface HourlyProduction {
  id: string;
  tenantId: string;
  moduleId: string;
  date: string;
  slotIndex: number;
  pieces: number;
  bundles: number;
}

export interface DailyPlan {
  id: string;
  tenantId: string;
  factoryId: string;
  moduleId: string;
  shiftId: string;
  date: string;
  styleId: string;
  poId: string;
  operators: number;
  smv: number;
  plannedEfficiency: number;
  targetQty: number;
}

/* ------------------------------------------------------------------ */
/* Time structure                                                      */
/* ------------------------------------------------------------------ */

export interface ShiftSlot {
  index: number;
  /** Minutes from midnight, factory-local. */
  startMinute: number;
  endMinute: number;
  isBreak: boolean;
  /** Set on break slots, e.g. "Tea" or "Lunch". */
  name?: string;
  target?: number;
  active: boolean;
}

/**
 * A break of any length, at any time.
 *
 * Breaks used to be whole production slots marked as such, which meant they
 * had to be a full hour. Real factories take fifteen minutes for tea and an
 * hour for lunch, and a break entered as the wrong length changes every
 * target and efficiency figure the factory sees.
 */
export interface ShiftBreak {
  name: string;
  /** Minutes from factory-local midnight. */
  startMinute: number;
  endMinute: number;
  paid: boolean;
}

export interface Shift {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  startMinute: number;
  endMinute: number;
  crossesMidnight: boolean;
  /** Breaks of any length. Production slots are built around them. */
  breaks?: ShiftBreak[];
  /** Derived from the shift span, the slot length and the breaks. */
  slots: ShiftSlot[];
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Status semaphore                                                    */
/* ------------------------------------------------------------------ */

export type SignalStatus = 'GREEN' | 'AMBER' | 'RED' | 'GREY';

export interface WipThresholds {
  min: number;
  reorder: number;
  max: number;
}

export interface WipReading {
  pieces: number;
  bundles: number;
  status: SignalStatus;
  /** Distinguishes "no plan today" from "critically low" — both grey. */
  reason: 'OVER' | 'NORMAL' | 'REORDER' | 'LOW' | 'INACTIVE' | 'NO_PLAN';
}
