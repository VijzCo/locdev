/**
 * Platform settings — the vendor's own controls, applying to every tenant.
 *
 * These sit above the per-customer configuration chain. A customer can
 * change their WIP thresholds; only the vendor can decide whether the
 * reports area exists at all, how long a session may idle, or what the
 * footer says.
 *
 * One document, `platformSettings/global`, readable by everyone signed in
 * and writable only by a vendor admin.
 */

export type Stage = 'PRODUCTION' | 'STAGING' | 'MAINTENANCE';

/** Areas that can be switched off across the whole platform. */
export const FEATURE_KEYS = [
  'dashboards',
  'wallDisplay',
  'scanning',
  'planning',
  'wip',
  'masterData',
  'reports',
  'administration',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, { name: string; note: string }> = {
  dashboards: { name: 'Dashboards', note: 'Factory, department and module views' },
  wallDisplay: { name: 'Wall display', note: 'Fullscreen board for the production floor' },
  scanning: { name: 'Scanning', note: 'Scan in, scan out and bundle tracking' },
  planning: { name: 'Planning', note: 'Purchase orders, bundles, labels, daily plans, shifts' },
  wip: { name: 'WIP', note: 'WIP dashboard and thresholds' },
  masterData: { name: 'Master data', note: 'Factories, departments, sections, modules, styles' },
  reports: { name: 'Reports', note: 'Production, efficiency, WIP, bundle history, exports' },
  administration: { name: 'Administration', note: 'Users, roles, settings, audit log' },
};

export interface PlatformSettings {
  stage: Stage;
  /** Shown to every customer while the stage is MAINTENANCE. */
  maintenanceMessage: string;

  branding: {
    productName: string;
    footerText: string;
    showFooter: boolean;
    /** Also shown on the sign-in screen. */
    showOnLogin: boolean;
    supportEmail: string;
  };

  security: {
    /** Sign out after this long with no activity. 0 disables it. */
    idleTimeoutMinutes: number;
    /** Warn this many seconds before signing out. */
    idleWarningSeconds: number;
    /** One active session per account; a new sign-in ends the old one. */
    singleSession: boolean;
  };

  /** Areas switched off platform-wide. Absent means on. */
  features: Partial<Record<FeatureKey, boolean>>;
}

export const PLATFORM_DEFAULTS: PlatformSettings = {
  stage: 'PRODUCTION',
  maintenanceMessage:
    'The system is briefly unavailable for maintenance. Scanning already recorded on your devices is safe and will sync when we are back.',

  branding: {
    productName: 'Loomline',
    footerText: 'Designed & developed by AxiLogic',
    showFooter: true,
    showOnLogin: true,
    supportEmail: 'hello@axilogic.com',
  },

  security: {
    // Factory terminals are shared and often left signed in on the floor,
    // so a default timeout matters more here than in an office product.
    idleTimeoutMinutes: 60,
    idleWarningSeconds: 60,
    singleSession: false,
  },

  features: {},
};

export function isFeatureOn(settings: PlatformSettings, key: FeatureKey): boolean {
  return settings.features?.[key] !== false;
}
