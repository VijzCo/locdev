import type { ProductionStage } from '@/types/domain';

/**
 * The configuration surface. Adding a key here is all it takes for it to
 * appear in the settings screens, be overridable at the right levels, and
 * be readable through `cfg()` — there is no second place to register it.
 *
 * Nothing in this application reads a business threshold from anywhere
 * else. If a component wants a number that might vary by factory, it comes
 * from here.
 */
export interface ConfigValues {
  /* Bundles and barcode */
  'bundle.defaultQty': number;
  'bundle.barcodeTemplate': string;
  'bundle.sequencePadding': number;
  'bundle.allowReprint': boolean;
  'label.widthMm': number;
  'label.heightMm': number;
  'label.barcodeHeightMm': number;
  'label.showCompany': boolean;

  /* Routing */
  'routing.stages': ProductionStage[];
  'routing.enforcement': 'STRICT' | 'DEPARTMENT' | 'FREE';
  'routing.requireInScan': boolean;
  'routing.requireOutScan': boolean;
  'routing.finalStage': ProductionStage;

  /* WIP */
  'wip.min': number;
  'wip.reorder': number;
  'wip.max': number;
  'wip.unit': 'PIECES' | 'BUNDLES' | 'BOTH';

  /* Targets and thresholds */
  'target.plannedEfficiency': number;
  'achievement.greenPct': number;
  'achievement.amberPct': number;
  'efficiency.greenPct': number;
  'efficiency.amberPct': number;

  /* Time */
  'time.timezone': string;
  'time.dateFormat': string;
  'time.clockTickSeconds': number;

  /* Scanning */
  'scan.allowSupervisorOverride': boolean;
  'scan.clockSkewToleranceMinutes': number;
  'scan.outboxRetrySeconds': number;
  'scan.enforceTimeSlots': boolean;
  'scan.soundEnabled': boolean;
  'scan.duplicateWindowSeconds': number;

  /* Dashboards */
  'wall.rotateSeconds': number;
  'wall.modulesPerScreen': number;
  'forecast.minElapsedMinutes': number;

  /* Alerts */
  'alerts.overWip': boolean;
  'alerts.lowWip': boolean;
  'alerts.behindTarget': boolean;
  'alerts.forecastShort': boolean;
  'alerts.noOutput': boolean;

  /* System */
  'system.companyName': string;
}

export type ConfigKey = keyof ConfigValues;

/** Layer names, ordered from least to most specific. */
export type ScopeLevel =
  | 'SYSTEM'
  | 'TENANT'
  | 'FACTORY'
  | 'DEPARTMENT'
  | 'SECTION'
  | 'STYLE'
  | 'MODULE'
  | 'MODULE_STYLE';

export const DEFAULTS: ConfigValues = {
  'bundle.defaultQty': 25,
  'bundle.barcodeTemplate': '{PO}-{STYLE}-{COLOR}-{SIZE}-B{SEQ}',
  'bundle.sequencePadding': 4,
  'bundle.allowReprint': true,
  'label.widthMm': 50,
  'label.heightMm': 30,
  'label.barcodeHeightMm': 12,
  'label.showCompany': true,

  'routing.stages': ['CUTTING', 'SEWING'],
  'routing.enforcement': 'STRICT',
  'routing.requireInScan': true,
  'routing.requireOutScan': true,
  'routing.finalStage': 'SEWING',

  'wip.min': 50,
  'wip.reorder': 100,
  'wip.max': 250,
  'wip.unit': 'PIECES',

  'target.plannedEfficiency': 65,
  'achievement.greenPct': 95,
  'achievement.amberPct': 85,
  'efficiency.greenPct': 70,
  'efficiency.amberPct': 55,

  'time.timezone': 'Africa/Maseru',
  'time.dateFormat': 'dd MMM yyyy',
  'time.clockTickSeconds': 10,

  'scan.allowSupervisorOverride': false,
  'scan.clockSkewToleranceMinutes': 5,
  'scan.outboxRetrySeconds': 30,
  'scan.enforceTimeSlots': true,
  'scan.soundEnabled': true,
  'scan.duplicateWindowSeconds': 3,

  'wall.rotateSeconds': 20,
  'wall.modulesPerScreen': 8,
  'forecast.minElapsedMinutes': 45,

  'alerts.overWip': true,
  'alerts.lowWip': true,
  'alerts.behindTarget': true,
  'alerts.forecastShort': true,
  'alerts.noOutput': true,

  'system.companyName': 'Meridian Apparel',
};

export interface FieldMeta {
  group: string;
  label: string;
  help?: string;
  control: 'number' | 'toggle' | 'text' | 'select' | 'stages';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  /** Levels at which this key may be overridden. */
  scopes: ScopeLevel[];
}

const ALL_SCOPES: ScopeLevel[] = [
  'TENANT',
  'FACTORY',
  'DEPARTMENT',
  'SECTION',
  'STYLE',
  'MODULE',
  'MODULE_STYLE',
];

const WIP_SCOPES: ScopeLevel[] = ['TENANT', 'FACTORY', 'DEPARTMENT', 'SECTION', 'MODULE', 'STYLE', 'MODULE_STYLE'];

const STAGE_OPTIONS = [
  { value: 'RM_IN', label: 'Raw material in' },
  { value: 'CUTTING', label: 'Cutting' },
  { value: 'SEWING', label: 'Sewing' },
  { value: 'FINISHING', label: 'Finishing' },
  { value: 'PACKING', label: 'Packing' },
];

/**
 * Typed as a total record, so the compiler refuses to build if a key is
 * added to ConfigValues without describing how it is presented.
 */
export const FIELDS: Record<ConfigKey, FieldMeta> = {
  'bundle.defaultQty': {
    group: 'Bundles & barcode',
    label: 'Default bundle quantity',
    help: 'Pre-filled when generating bundles. Operators can change it per run.',
    control: 'number',
    min: 1,
    max: 500,
    unit: 'pieces',
    scopes: ALL_SCOPES,
  },
  'bundle.barcodeTemplate': {
    group: 'Bundles & barcode',
    label: 'Bundle ID format',
    help: 'Placeholders: {PO} {STYLE} {COLOR} {SIZE} {SEQ}. The printed barcode encodes only the bundle ID; this controls the readable line.',
    control: 'text',
    scopes: ['TENANT', 'FACTORY', 'STYLE'],
  },
  'bundle.sequencePadding': {
    group: 'Bundles & barcode',
    label: 'Sequence digits',
    help: 'Zero-padding on {SEQ}. Four digits allows 9,999 bundles per order line.',
    control: 'number',
    min: 2,
    max: 8,
    scopes: ['TENANT', 'FACTORY'],
  },
  'bundle.allowReprint': {
    group: 'Bundles & barcode',
    label: 'Allow label reprints',
    help: 'Reprints are always recorded in the audit log.',
    control: 'toggle',
    scopes: ['TENANT', 'FACTORY'],
  },

  'label.widthMm': {
    group: 'Bundles & barcode',
    label: 'Label width',
    help: 'Match your label stock. Most thermal bundle labels are 50 × 30 mm.',
    control: 'number',
    min: 20,
    max: 150,
    unit: 'mm',
    scopes: ['TENANT', 'FACTORY'],
  },
  'label.heightMm': {
    group: 'Bundles & barcode',
    label: 'Label height',
    control: 'number',
    min: 15,
    max: 150,
    unit: 'mm',
    scopes: ['TENANT', 'FACTORY'],
  },
  'label.barcodeHeightMm': {
    group: 'Bundles & barcode',
    label: 'Barcode height',
    help: 'Under 8 mm scans unreliably on worn thermal labels.',
    control: 'number',
    min: 5,
    max: 40,
    unit: 'mm',
    scopes: ['TENANT', 'FACTORY'],
  },
  'label.showCompany': {
    group: 'Bundles & barcode',
    label: 'Print company name',
    control: 'toggle',
    scopes: ['TENANT', 'FACTORY'],
  },

  'routing.stages': {
    group: 'Routing',
    label: 'Tracked stages',
    help: 'Which stages bundles are scanned through, in order.',
    control: 'stages',
    options: STAGE_OPTIONS,
    scopes: ['TENANT', 'FACTORY', 'STYLE'],
  },
  'routing.enforcement': {
    group: 'Routing',
    label: 'Route enforcement',
    help: 'Strict follows the exact stage order. Department allows any module within the right department. Free records wherever a bundle is scanned.',
    control: 'select',
    options: [
      { value: 'STRICT', label: 'Strict — exact sequence' },
      { value: 'DEPARTMENT', label: 'Department — any module in stage' },
      { value: 'FREE', label: 'Free — record anywhere' },
    ],
    scopes: ['TENANT', 'FACTORY', 'STYLE'],
  },
  'routing.requireInScan': {
    group: 'Routing',
    label: 'Require scan in',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'routing.requireOutScan': {
    group: 'Routing',
    label: 'Require scan out',
    help: 'Hourly output is derived from out scans, so turning this off stops hourly production for that module.',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'routing.finalStage': {
    group: 'Routing',
    label: 'Tracking ends at',
    help: 'A bundle is complete once it leaves this stage.',
    control: 'select',
    options: STAGE_OPTIONS,
    scopes: ['TENANT', 'FACTORY', 'STYLE'],
  },

  'wip.min': {
    group: 'WIP thresholds',
    label: 'Minimum WIP',
    help: 'Below this the module shows grey — critically low.',
    control: 'number',
    min: 0,
    unit: 'pieces',
    scopes: WIP_SCOPES,
  },
  'wip.reorder': {
    group: 'WIP thresholds',
    label: 'Reorder level',
    help: 'Between minimum and this, the module shows amber. Feed it soon.',
    control: 'number',
    min: 0,
    unit: 'pieces',
    scopes: WIP_SCOPES,
  },
  'wip.max': {
    group: 'WIP thresholds',
    label: 'Maximum WIP',
    help: 'Above this the module shows red — over WIP.',
    control: 'number',
    min: 0,
    unit: 'pieces',
    scopes: WIP_SCOPES,
  },
  'wip.unit': {
    group: 'WIP thresholds',
    label: 'Measure WIP in',
    control: 'select',
    options: [
      { value: 'PIECES', label: 'Pieces' },
      { value: 'BUNDLES', label: 'Bundles' },
      { value: 'BOTH', label: 'Both' },
    ],
    scopes: ['TENANT', 'FACTORY'],
  },

  'target.plannedEfficiency': {
    group: 'Targets',
    label: 'Planned efficiency',
    help: 'Used to calculate daily targets when a plan does not set its own.',
    control: 'number',
    min: 1,
    max: 150,
    unit: '%',
    scopes: ALL_SCOPES,
  },
  'achievement.greenPct': {
    group: 'Targets',
    label: 'Achievement — green at',
    control: 'number',
    min: 0,
    max: 200,
    unit: '%',
    scopes: ALL_SCOPES,
  },
  'achievement.amberPct': {
    group: 'Targets',
    label: 'Achievement — amber at',
    help: 'Below this, achievement shows red.',
    control: 'number',
    min: 0,
    max: 200,
    unit: '%',
    scopes: ALL_SCOPES,
  },
  'efficiency.greenPct': {
    group: 'Targets',
    label: 'Efficiency — green at',
    control: 'number',
    min: 0,
    max: 200,
    unit: '%',
    scopes: ALL_SCOPES,
  },
  'efficiency.amberPct': {
    group: 'Targets',
    label: 'Efficiency — amber at',
    control: 'number',
    min: 0,
    max: 200,
    unit: '%',
    scopes: ALL_SCOPES,
  },

  'time.timezone': {
    group: 'Time',
    label: 'Factory timezone',
    help: 'All shifts, slots and production dates are calculated in this zone.',
    control: 'text',
    scopes: ['TENANT', 'FACTORY'],
  },
  'time.dateFormat': {
    group: 'Time',
    label: 'Date format',
    control: 'text',
    scopes: ['TENANT', 'FACTORY'],
  },
  'time.clockTickSeconds': {
    group: 'Time',
    label: 'Clock refresh',
    help: 'How often the live clock and current slot re-evaluate.',
    control: 'number',
    min: 1,
    max: 60,
    unit: 'seconds',
    scopes: ['TENANT', 'FACTORY'],
  },

  'scan.allowSupervisorOverride': {
    group: 'Scanning',
    label: 'Supervisor override',
    help: 'Lets a supervisor record a scan outside an open time slot. Always audited.',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'scan.clockSkewToleranceMinutes': {
    group: 'Scanning',
    label: 'Clock skew tolerance',
    help: 'Offline scans are bucketed by device time. Devices drifting more than this are flagged.',
    control: 'number',
    min: 1,
    max: 120,
    unit: 'minutes',
    scopes: ['TENANT', 'FACTORY'],
  },
  'scan.outboxRetrySeconds': {
    group: 'Scanning',
    label: 'Sync retry interval',
    control: 'number',
    min: 5,
    max: 600,
    unit: 'seconds',
    scopes: ['TENANT', 'FACTORY'],
  },
  'scan.enforceTimeSlots': {
    group: 'Scanning',
    label: 'Enforce time slots',
    help: 'Blocks scanning outside production slots. Enforced in the app and recorded either way.',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },

  'scan.soundEnabled': {
    group: 'Scanning',
    label: 'Scan sounds',
    help: 'Different tones for accepted, rejected and repeated scans, so an operator need not watch the screen.',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'scan.duplicateWindowSeconds': {
    group: 'Scanning',
    label: 'Ignore repeat scans within',
    help: 'Catches a scanner firing twice on a held trigger. A genuine rescan after this is treated normally.',
    control: 'number',
    min: 0,
    max: 30,
    unit: 'seconds',
    scopes: ALL_SCOPES,
  },

  'wall.rotateSeconds': {
    group: 'Dashboards',
    label: 'Wall display rotation',
    control: 'number',
    min: 5,
    max: 300,
    unit: 'seconds',
    scopes: ['TENANT', 'FACTORY'],
  },
  'wall.modulesPerScreen': {
    group: 'Dashboards',
    label: 'Modules per screen',
    control: 'number',
    min: 1,
    max: 24,
    scopes: ['TENANT', 'FACTORY'],
  },
  'forecast.minElapsedMinutes': {
    group: 'Dashboards',
    label: 'Forecast after',
    help: 'Forecasts are hidden until this much of the shift has run. A forecast built on twelve minutes of data is worse than none.',
    control: 'number',
    min: 0,
    max: 480,
    unit: 'minutes',
    scopes: ['TENANT', 'FACTORY'],
  },

  'alerts.overWip': { group: 'Alerts', label: 'Over WIP', control: 'toggle', scopes: ALL_SCOPES },
  'alerts.lowWip': { group: 'Alerts', label: 'Low WIP', control: 'toggle', scopes: ALL_SCOPES },
  'alerts.behindTarget': {
    group: 'Alerts',
    label: 'Behind target',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'alerts.forecastShort': {
    group: 'Alerts',
    label: 'Forecast below order quantity',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },
  'alerts.noOutput': {
    group: 'Alerts',
    label: 'No output in the last hour',
    help: 'Usually a stopped line or a missed out scan.',
    control: 'toggle',
    scopes: ALL_SCOPES,
  },

  'system.companyName': {
    group: 'System',
    label: 'Company name',
    help: 'Printed on bundle labels and shown on the wall display.',
    control: 'text',
    scopes: ['TENANT', 'FACTORY'],
  },
};

export const GROUP_ORDER = [
  'System',
  'Time',
  'Bundles & barcode',
  'Routing',
  'WIP thresholds',
  'Targets',
  'Scanning',
  'Dashboards',
  'Alerts',
];

/** Keys available for override at a given level, grouped for display. */
export function fieldsForScope(scope: ScopeLevel): ConfigKey[] {
  return (Object.keys(FIELDS) as ConfigKey[]).filter((k) => FIELDS[k].scopes.includes(scope));
}
