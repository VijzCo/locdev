import type { Role } from '@/types/domain';

/**
 * Capabilities, not roles, gate the interface. Roles are only a convenient
 * default set — §31 asked for this to be configurable rather than
 * permanently hardcoded, so a user document may carry its own list that
 * overrides the role default.
 */
export const CAPABILITIES = [
  'dashboard.view',
  'scan.in',
  'scan.out',
  'plan.manage',
  'wip.configure',
  'master.manage',
  'reports.view',
  'users.manage',
  'settings.manage',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  SYSTEM_ADMIN: [...CAPABILITIES],
  ADMIN: [...CAPABILITIES],
  MANAGER: [
    'dashboard.view',
    'scan.in',
    'scan.out',
    'plan.manage',
    'wip.configure',
    'master.manage',
    'reports.view',
  ],
  SUPERVISOR: ['dashboard.view', 'scan.in', 'scan.out', 'plan.manage', 'wip.configure', 'reports.view'],
  OPERATOR: ['dashboard.view', 'scan.in', 'scan.out'],
  VIEWER: ['dashboard.view', 'reports.view'],
};

/** Capabilities that write data, and are therefore blocked once a licence expires. */
export const WRITE_CAPABILITIES: Capability[] = [
  'scan.in',
  'scan.out',
  'plan.manage',
  'wip.configure',
  'master.manage',
  'users.manage',
  'settings.manage',
];

export function capabilitiesFor(role: Role, overrides?: string[]): Capability[] {
  const valid = (overrides ?? []).filter((c): c is Capability =>
    (CAPABILITIES as readonly string[]).includes(c),
  );

  // A list that contains nothing usable means "no override", not "no
  // access". Without this, a stray empty string in a profile document
  // silently locks a system administrator out of every screen, including
  // the one that would let them fix it.
  return valid.length > 0 ? valid : (ROLE_CAPABILITIES[role] ?? []);
}
