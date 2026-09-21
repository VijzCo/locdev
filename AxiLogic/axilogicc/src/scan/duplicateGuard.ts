/**
 * Duplicate scan protection.
 *
 * Three different things get called "a duplicate" on a factory floor and
 * they need different answers:
 *
 *  1. The scanner fired twice. A held trigger, or a bundle passed under a
 *     fixed scanner twice in a second. The operator did one action and
 *     expects one result — this should be swallowed quietly, not shown as
 *     an error.
 *
 *  2. The scan is already queued. Offline, the same bundle scanned twice
 *     five minutes apart. The bundle document has already moved locally, so
 *     the validation chain catches it, but the outbox knows for certain.
 *
 *  3. It really was scanned before, at this module, in this direction. The
 *     deterministic document id makes this impossible to record twice, and
 *     the server refuses it outright.
 *
 * Cases 1 and 2 are handled here so the operator gets a warning rather than
 * a red rejection — being told "you already did that" is different from
 * being told "that is wrong", and conflating the two teaches people to
 * ignore red.
 */

export interface RecentScan {
  code: string;
  at: number;
}

export type DuplicateVerdict =
  | { duplicate: false }
  | { duplicate: true; reason: 'RAPID_REPEAT' | 'ALREADY_QUEUED'; secondsAgo: number };

/**
 * A scanner double-firing produces two reads milliseconds apart. A person
 * legitimately rescanning the same bundle does not do it within a couple of
 * seconds, so a short window separates the two cases cleanly.
 */
export function checkRapidRepeat(
  recent: RecentScan[],
  code: string,
  now: number,
  windowMs: number,
): DuplicateVerdict {
  const match = recent.find((r) => r.code === code && now - r.at < windowMs);
  if (!match) return { duplicate: false };
  return {
    duplicate: true,
    reason: 'RAPID_REPEAT',
    secondsAgo: Math.max(0, Math.round((now - match.at) / 1000)),
  };
}

/** Keeps the recent list bounded and drops entries past the window. */
export function rememberScan(
  recent: RecentScan[],
  code: string,
  now: number,
  windowMs: number,
  max = 50,
): RecentScan[] {
  return [{ code, at: now }, ...recent.filter((r) => now - r.at < windowMs * 4)].slice(0, max);
}

/**
 * Whether this exact scan is already sitting in the outbox.
 *
 * This is the check that works offline. The bundle document may not reflect
 * a queued scan if a previous write was rolled back, but the outbox is the
 * device's own record of what it has accepted.
 */
export function isAlreadyQueued(
  queuedScanIds: string[],
  scanId: string,
  queuedAt?: number,
  now = Date.now(),
): DuplicateVerdict {
  if (!queuedScanIds.includes(scanId)) return { duplicate: false };
  return {
    duplicate: true,
    reason: 'ALREADY_QUEUED',
    secondsAgo: queuedAt ? Math.max(0, Math.round((now - queuedAt) / 1000)) : 0,
  };
}

/** Wording for the operator. Specific about what happened, and not alarming. */
export function duplicateMessage(verdict: Extract<DuplicateVerdict, { duplicate: true }>): string {
  if (verdict.reason === 'RAPID_REPEAT') {
    return verdict.secondsAgo <= 1
      ? 'Scanned twice — counted once.'
      : `Scanned ${verdict.secondsAgo} seconds ago — counted once.`;
  }
  return 'Already recorded on this device and waiting to sync. Not counted again.';
}
