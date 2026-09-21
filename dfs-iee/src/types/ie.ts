import type { Timestamp } from 'firebase/firestore';

// ============================================================================
// MACHINE & MOTION LIBRARY
// ============================================================================

/**
 * Machine types commonly found on apparel production floors.
 * This is a fixed enumeration so machine assignments stay normalized.
 */
export const MACHINE_TYPES = [
  'SNLS', // Single Needle Lockstitch
  'DNLS', // Double Needle Lockstitch
  'OL_3T', // 3-thread Overlock
  'OL_4T', // 4-thread Overlock
  'OL_5T', // 5-thread Overlock (safety stitch)
  'FOA', // Flat Lock / Cover Stitch
  'BARTACK',
  'BUTTONHOLE',
  'BUTTON_ATTACH',
  'KANSAI', // Multi-needle chainstitch
  'BLIND_HEM',
  'FEED_OF_ARM',
  'POCKET_WELT',
  'PRESS',
  'IRON',
  'CUTTING_STRAIGHT',
  'CUTTING_BAND',
  'FUSING',
  'MANUAL', // No machine — helper / hand work
  'OTHER',
] as const;

export type MachineType = (typeof MACHINE_TYPES)[number];

export interface Machine {
  id: string;
  tenantId: string;
  factoryId: string;
  code: string;
  type: MachineType;
  brand?: string;
  model?: string;
  /** Standard machine speed in stitches per minute */
  rpm?: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * GSD / PMTS-style motion element.
 *
 * Each motion has a TMU (Time Measurement Unit) value:
 *   1 TMU = 0.036 seconds = 0.0006 minutes
 *
 * Tenants build their own motion library (the GSD trademark is owned
 * by Coats Digital — your library must be your own work, based on
 * MTM-2 / general industrial engineering principles).
 */
export interface MotionElement {
  id: string;
  tenantId: string;
  code: string; // e.g. "GET_PART_S", "POSITION_M", "SEW_STRAIGHT_10CM"
  description: string;
  category:
    | 'get'
    | 'position'
    | 'sew'
    | 'align'
    | 'trim'
    | 'fold'
    | 'mark'
    | 'inspect'
    | 'aside'
    | 'machine'
    | 'other';
  /** Time Measurement Units. 1 TMU = 0.0006 min */
  tmu: number;
  /** Optional: machine type this motion is tied to */
  machineType?: MachineType;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// STYLE
// ============================================================================

export type GarmentCategory =
  | 'tshirt'
  | 'polo'
  | 'shirt'
  | 'blouse'
  | 'trouser'
  | 'jeans'
  | 'shorts'
  | 'dress'
  | 'skirt'
  | 'jacket'
  | 'underwear'
  | 'activewear'
  | 'other';

export interface Buyer {
  id: string;
  tenantId: string;
  name: string;
  contactEmail?: string;
  createdAt: Timestamp;
}

export interface Style {
  id: string;
  tenantId: string;
  factoryId: string;
  styleNumber: string;
  description: string;
  buyerId?: string;
  buyerName?: string; // denormalized for lists
  season?: string;
  category: GarmentCategory;
  /** Target SMV — what costing was based on */
  targetSmv?: number;
  /** Actual SMV calculated from operations (cached, recomputed on OB save) */
  calculatedSmv?: number;
  /** Total order quantity */
  orderQty: number;
  /** FOB price per unit in tenant currency */
  fobPrice?: number;
  /** Target CM (Cost of Make) per unit */
  targetCm?: number;
  thumbnailUrl?: string;
  status: 'draft' | 'in_development' | 'approved' | 'in_production' | 'completed';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

// ============================================================================
// OPERATION & SMV
// ============================================================================

export type OperationSection =
  | 'cutting'
  | 'preparation'
  | 'assembly'
  | 'finishing'
  | 'packing';

/**
 * A single operation in a garment's production sequence.
 * Operations belong to a Style and roll up into the Operation Bulletin.
 */
export interface Operation {
  id: string;
  tenantId: string;
  styleId: string;
  /** Sequence number — defines order on the bulletin */
  sequence: number;
  description: string;
  section: OperationSection;
  machineType: MachineType;
  /**
   * Calculated SMV in minutes. This is the SINGLE SOURCE OF TRUTH
   * for costing and capacity planning.
   */
  smv: number;
  /**
   * How the SMV was derived. Lets you audit and re-calculate.
   */
  smvMethod: 'manual' | 'stopwatch' | 'motion_analysis' | 'imported';
  /** Raw stopwatch observations if smvMethod = stopwatch */
  observations?: number[];
  /** Performance rating applied to stopwatch (0.85 - 1.20 typical) */
  performanceRating?: number;
  /** Allowance percentage applied (10-25% typical for sewing) */
  allowancePct?: number;
  /** If smvMethod = motion_analysis, the breakdown of motions used */
  motionBreakdown?: Array<{
    motionId: string;
    motionCode: string;
    description: string;
    tmu: number;
    frequency: number;
  }>;
  /** Whether this operation uses a helper (no machine, manual work) */
  isHelper: boolean;
  /** Quality checkpoint required after this operation */
  qualityCheckpoint?: string;
  /** Thread / consumables for this operation */
  threadDetails?: string;
  attachmentDetails?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// OPERATION BULLETIN (OB)
// ============================================================================

/**
 * The Operation Bulletin is the "shop floor instruction sheet" — it lists
 * all operations for a style in sequence, with their SMVs, machine
 * allocations, and operator counts. It's the foundation for both
 * line balancing and CM costing.
 */
export interface OperationBulletin {
  id: string;
  tenantId: string;
  styleId: string;
  version: number;
  status: 'draft' | 'approved' | 'archived';
  /**
   * Aggregated totals — denormalized for fast reads.
   * Recompute on save in the cloud function.
   */
  totals: {
    operationCount: number;
    totalSmv: number; // sum of all operation SMVs
    /** By section */
    smvBySection: Record<OperationSection, number>;
    /** By machine type */
    smvByMachine: Partial<Record<MachineType, number>>;
    /** Machine count (unique types used) */
    uniqueMachineCount: number;
    helperCount: number;
    machinistCount: number;
  };
  /** Target line output per hour at 100% efficiency */
  targetOutputPerHour?: number;
  /** Number of operators planned */
  plannedOperators?: number;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// LINE BALANCING
// ============================================================================

/**
 * A line balance plan groups operations into "stations" (operator workloads)
 * targeting a specific line output, then surfaces the bottleneck station.
 */
export interface LineBalance {
  id: string;
  tenantId: string;
  factoryId: string;
  lineId: string;
  styleId: string;
  obId: string;
  /** Target pieces per hour for this line */
  targetPph: number;
  /** Target station cycle time in minutes (60 / targetPph) */
  targetCycleTime: number;
  stations: Array<{
    stationNumber: number;
    operatorName?: string;
    operatorId?: string;
    machineType: MachineType;
    operationIds: string[];
    /** Sum of SMVs assigned to this station */
    stationSmv: number;
    /** Workload ratio: stationSmv / targetCycleTime. > 1 = bottleneck */
    loadFactor: number;
  }>;
  /** Computed metrics */
  metrics: {
    bottleneckStation: number;
    bottleneckLoad: number;
    balanceEfficiencyPct: number; // (sum SMV) / (stations × max station SMV) × 100
    theoreticalOutputPph: number;
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
