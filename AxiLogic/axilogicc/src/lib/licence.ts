import type { License, LicenseStatus } from '@/types/domain';

export interface LicenceState {
  status: LicenseStatus;
  /** Whether writes are permitted. Mirrors the Firestore rules check. */
  canWrite: boolean;
  /** Whether sign-in is permitted at all. */
  canSignIn: boolean;
  daysRemaining: number | null;
  /** Message shown in the banner, or null when nothing needs saying. */
  banner: { tone: 'info' | 'warn' | 'critical'; text: string } | null;
}

const DAY = 86_400_000;

function daysBetween(from: Date, to: string): number {
  return Math.ceil((new Date(to).getTime() - from.getTime()) / DAY);
}

/**
 * The single source of truth for licence behaviour on the client. It is
 * deliberately a mirror of the rules check in firestore.rules — the client
 * copy exists to explain the state to the user, not to enforce it. Removing
 * this function would change what the interface says, not what the database
 * permits.
 */
export function resolveLicence(licence: License | null, now = new Date()): LicenceState {
  if (!licence) {
    return {
      status: 'EXPIRED',
      canWrite: false,
      canSignIn: true,
      daysRemaining: null,
      banner: {
        tone: 'critical',
        text: 'No licence found for this organisation. Contact your supplier to activate it.',
      },
    };
  }

  if (licence.status === 'SUSPENDED') {
    return {
      status: 'SUSPENDED',
      canWrite: false,
      canSignIn: false,
      daysRemaining: null,
      banner: { tone: 'critical', text: 'This account is suspended. Contact your supplier.' },
    };
  }

  const expiryDays = daysBetween(now, licence.expiresAt);
  const withinGrace = now.getTime() < new Date(licence.graceUntil).getTime();
  const expired = expiryDays <= 0;

  // Expiry degrades to read-only rather than locking out. Dashboards,
  // history and exports keep working — see Part K5.
  if (expired && !withinGrace) {
    return {
      status: 'EXPIRED',
      canWrite: false,
      canSignIn: true,
      daysRemaining: 0,
      banner: {
        tone: 'critical',
        text: 'Licence expired. Reports and history remain available, but scanning and configuration are paused until it is renewed.',
      },
    };
  }

  if (expired && withinGrace) {
    const graceDays = daysBetween(now, licence.graceUntil);
    return {
      status: 'GRACE',
      canWrite: true,
      canSignIn: true,
      daysRemaining: graceDays,
      banner: {
        tone: 'critical',
        text: `Licence expired. Production continues for ${graceDays} more ${graceDays === 1 ? 'day' : 'days'}, then scanning pauses.`,
      },
    };
  }

  if (licence.plan === 'TRIAL') {
    return {
      status: 'TRIAL',
      canWrite: true,
      canSignIn: true,
      daysRemaining: expiryDays,
      banner:
        expiryDays <= 7
          ? {
              tone: 'warn',
              text: `Trial ends in ${expiryDays} ${expiryDays === 1 ? 'day' : 'days'}.`,
            }
          : null,
    };
  }

  return {
    status: 'ACTIVE',
    canWrite: true,
    canSignIn: true,
    daysRemaining: expiryDays,
    banner:
      expiryDays <= 14
        ? {
            tone: 'warn',
            text: `Licence renews in ${expiryDays} ${expiryDays === 1 ? 'day' : 'days'}.`,
          }
        : null,
  };
}

/** Short label for the top bar chip. */
export function licenceChipLabel(state: LicenceState): string {
  switch (state.status) {
    case 'TRIAL':
      return `Trial · ${state.daysRemaining ?? 0} days left`;
    case 'GRACE':
      return `Grace · ${state.daysRemaining ?? 0} days`;
    case 'EXPIRED':
      return 'Read only';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Licensed';
  }
}

/**
 * Vendor admins issue licences; they are not subject to one. Without this,
 * the vendor console is gated by the very mechanism it exists to operate.
 */
export function vendorLicence(): LicenceState {
  return {
    status: 'ACTIVE',
    canWrite: true,
    canSignIn: true,
    daysRemaining: null,
    banner: null,
  };
}
