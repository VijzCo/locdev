import type { AppUser, License } from '@/types/domain';

/**
 * Fixtures for reviewing the interface before a Firebase project exists.
 * Only ever loaded when the environment is unconfigured *and* the build is
 * a development build — see AuthProvider.
 */

export const DEMO_USER: AppUser = {
  uid: 'demo-user',
  tenantId: 'demo-tenant',
  displayName: 'Demo Administrator',
  email: 'demo@meridian.local',
  role: 'SYSTEM_ADMIN',
  disabled: false,
  scope: {
    factoryIds: [],
    departmentIds: [],
    sectionIds: [],
    moduleIds: [],
    shiftIds: [],
  },
  scanAccess: 'BOTH',
  capabilities: [],
};

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_LICENCE: License = {
  tenantId: 'demo-tenant',
  plan: 'TRIAL',
  status: 'TRIAL',
  billingCycle: null,
  startsAt: new Date().toISOString(),
  expiresAt: inDays(21),
  graceUntil: inDays(28),
  limits: {
    maxFactories: 1,
    maxModules: 5,
    maxUsers: 10,
    bundlesPerMonth: 5000,
    wallDisplay: true,
    reportExport: true,
  },
};
