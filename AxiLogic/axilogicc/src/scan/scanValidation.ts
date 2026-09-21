import type {
  Bundle,
  Module,
  ProductionStage,
  ScanAccess,
  ScanDirection,
  Style,
} from '@/types/domain';

export type ScanRejection =
  | 'NOT_FOUND'
  | 'CANCELLED'
  | 'LOST'
  | 'COMPLETED'
  | 'NO_MODULE_ACCESS'
  | 'NO_DIRECTION_ACCESS'
  | 'SLOT_CLOSED'
  | 'ALREADY_IN_MODULE'
  | 'IN_ANOTHER_MODULE'
  | 'NOT_IN_THIS_MODULE'
  | 'WRONG_STAGE'
  | 'ALREADY_SCANNED';

export interface ScanCheckInput {
  bundle: Bundle | null;
  module: Module;
  style: Style | null;
  direction: ScanDirection;
  userScanAccess: ScanAccess;
  userModuleIds: string[];
  /** Stage this module belongs to, from its department. */
  moduleStage: ProductionStage;
  slotOpen: boolean;
  enforceTimeSlots: boolean;
  routingEnforcement: 'STRICT' | 'DEPARTMENT' | 'FREE';
  /** Module code used in messages, so operators read names not ids. */
  currentModuleCode?: string;
}

export interface ScanCheckResult {
  ok: boolean;
  code?: ScanRejection;
  /** Plain, actionable, and specific — §29. */
  message?: string;
}

const OK: ScanCheckResult = { ok: true };

/**
 * The validation chain from Part C3, in order, failing fast.
 *
 * Pure and synchronous so it runs identically offline and online, and so it
 * can be tested without a database. Every check here is enforced again by
 * the security rules when the write reaches the server — this copy exists
 * to tell the operator immediately, not to be the authority.
 */
export function checkScan(input: ScanCheckInput): ScanCheckResult {
  const {
    bundle,
    module,
    style,
    direction,
    userScanAccess,
    userModuleIds,
    moduleStage,
    slotOpen,
    enforceTimeSlots,
    routingEnforcement,
    currentModuleCode,
  } = input;

  if (!bundle) {
    return { ok: false, code: 'NOT_FOUND', message: 'Barcode not found.' };
  }

  if (bundle.status === 'CANCELLED') {
    return { ok: false, code: 'CANCELLED', message: `Bundle ${bundle.id} was cancelled.` };
  }

  if (bundle.status === 'LOST') {
    return {
      ok: false,
      code: 'LOST',
      message: `Bundle ${bundle.id} is marked lost. A supervisor must restore it first.`,
    };
  }

  if (bundle.status === 'COMPLETED') {
    return {
      ok: false,
      code: 'COMPLETED',
      message: `Bundle ${bundle.id} has already finished production.`,
    };
  }

  // Empty scope means unrestricted, which is how a floating supervisor works.
  if (userModuleIds.length > 0 && !userModuleIds.includes(module.id)) {
    return {
      ok: false,
      code: 'NO_MODULE_ACCESS',
      message: `You do not have permission to record production for ${module.code}.`,
    };
  }

  if (userScanAccess !== 'BOTH' && userScanAccess !== direction) {
    return {
      ok: false,
      code: 'NO_DIRECTION_ACCESS',
      message: `You are not authorised to scan ${direction} at this station.`,
    };
  }

  if (enforceTimeSlots && !slotOpen) {
    return {
      ok: false,
      code: 'SLOT_CLOSED',
      message: `Production entry is closed for ${module.code} in the current time slot.`,
    };
  }

  if (direction === 'IN') {
    if (bundle.currentModuleId === module.id) {
      return {
        ok: false,
        code: 'ALREADY_IN_MODULE',
        message: `Bundle ${bundle.id} is already inside ${module.code}.`,
      };
    }

    if (bundle.currentModuleId) {
      return {
        ok: false,
        code: 'IN_ANOTHER_MODULE',
        message: `Bundle ${bundle.id} is currently inside ${currentModuleCode ?? 'another module'}. Scan it out there first.`,
      };
    }

    /* Routing. STRICT requires the exact next stage on the style's route;
       DEPARTMENT accepts any module at a stage the route contains; FREE
       records the movement wherever it happens. */
    if (routingEnforcement !== 'FREE' && style) {
      const route = style.routeStages ?? [];

      if (!route.includes(moduleStage)) {
        return {
          ok: false,
          code: 'WRONG_STAGE',
          message: `${style.code} does not pass through ${moduleStage.replace('_', ' ').toLowerCase()}.`,
        };
      }

      if (routingEnforcement === 'STRICT') {
        const doneIndex = bundle.currentStage ? route.indexOf(bundle.currentStage) : -1;
        const expected = route[doneIndex + 1];
        if (expected && expected !== moduleStage) {
          return {
            ok: false,
            code: 'WRONG_STAGE',
            message: `Bundle ${bundle.id} must complete ${expected.replace('_', ' ').toLowerCase()} before ${moduleStage.replace('_', ' ').toLowerCase()}.`,
          };
        }
      }
    }

    return OK;
  }

  // direction === 'OUT'
  if (!bundle.currentModuleId) {
    return {
      ok: false,
      code: 'NOT_IN_THIS_MODULE',
      message: `Bundle ${bundle.id} has not been scanned in anywhere. Scan it in first.`,
    };
  }

  if (bundle.currentModuleId !== module.id) {
    return {
      ok: false,
      code: 'NOT_IN_THIS_MODULE',
      message: `Bundle ${bundle.id} is inside ${currentModuleCode ?? 'another module'}, not ${module.code}.`,
    };
  }

  return OK;
}

/**
 * The deterministic scan id from Part C4. Because there is no rework and no
 * splitting, this tuple occurs exactly once in a bundle's life, so the id
 * itself makes a duplicate structurally impossible rather than merely
 * unlikely.
 */
export function scanEventId(
  bundleId: string,
  moduleId: string,
  direction: ScanDirection,
): string {
  return `${bundleId}__${moduleId}__${direction}`;
}

/**
 * Which hourly slot a scan belongs to.
 *
 * Bucketing uses the time on the device that took the scan, not the time the
 * write reached the server. A scan taken at 09:15 and synced at 11:00 belongs
 * in the 09:00 hour, or the hourly production figures would show a phantom
 * spike whenever a tablet reconnects.
 *
 * Increment 9 replaces the hour-of-day fallback with configured shift slots.
 */
export function slotIndexFor(minuteOfDay: number): number {
  return Math.floor(minuteOfDay / 60);
}

export function productionDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
