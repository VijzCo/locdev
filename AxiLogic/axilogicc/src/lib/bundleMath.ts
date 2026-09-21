/**
 * Bundle arithmetic. Pure, dependency-free, and tested — because the one
 * thing this system must never do is lose or invent garments.
 */

export interface PlannedBundle {
  seq: number;
  qty: number;
  /** True for a final short bundle where the order does not divide evenly. */
  partial: boolean;
}

export class BundlePlanError extends Error {}

/**
 * Splits an order quantity into bundles.
 *
 * §7's worked example: 1,030 pieces at 20 per bundle gives 51 full bundles
 * of 20 (1,020) plus one bundle of 10 — 52 bundles, 1,030 pieces. The last
 * bundle is short rather than the shortfall being dropped or rounded up,
 * because a bundle is a physical stack of cut panels and you cannot conjure
 * ten more.
 *
 * The function asserts its own invariant before returning. A silent
 * arithmetic slip here would surface days later as a purchase order that
 * can never reach 100%, with no obvious cause.
 */
export function planBundles(orderQty: number, bundleQty: number): PlannedBundle[] {
  if (!Number.isInteger(orderQty) || orderQty <= 0) {
    throw new BundlePlanError('Order quantity must be a whole number above zero.');
  }
  if (!Number.isInteger(bundleQty) || bundleQty <= 0) {
    throw new BundlePlanError('Bundle quantity must be a whole number above zero.');
  }
  if (bundleQty > orderQty) {
    throw new BundlePlanError('Bundle quantity cannot be larger than the order quantity.');
  }

  const full = Math.floor(orderQty / bundleQty);
  const remainder = orderQty % bundleQty;

  const bundles: PlannedBundle[] = [];
  for (let i = 0; i < full; i++) {
    bundles.push({ seq: i + 1, qty: bundleQty, partial: false });
  }
  if (remainder > 0) {
    bundles.push({ seq: full + 1, qty: remainder, partial: true });
  }

  const total = bundles.reduce((sum, b) => sum + b.qty, 0);
  if (total !== orderQty) {
    throw new BundlePlanError(
      `Bundle plan does not conserve quantity: ${total} planned against ${orderQty} ordered.`,
    );
  }

  return bundles;
}

/** Summary for the confirmation step, before anything is written. */
export function summarisePlan(orderQty: number, bundleQty: number) {
  const bundles = planBundles(orderQty, bundleQty);
  const partial = bundles.find((b) => b.partial);
  return {
    bundles,
    count: bundles.length,
    fullCount: bundles.filter((b) => !b.partial).length,
    partialQty: partial?.qty ?? null,
    totalPieces: bundles.reduce((s, b) => s + b.qty, 0),
  };
}

export interface BundleIdParts {
  po: string;
  style: string;
  colour: string;
  size: string;
  seq: number;
}

/**
 * Renders the configured bundle id template. The printed barcode encodes
 * only the resulting id — everything else about a bundle is resolved from
 * the database, so a label never carries stale data.
 */
export function formatBundleId(
  template: string,
  parts: BundleIdParts,
  padding: number,
): string {
  const raw = template
    .replace(/\{PO\}/g, parts.po)
    .replace(/\{STYLE\}/g, parts.style)
    .replace(/\{COLOR\}/g, parts.colour)
    .replace(/\{COLOUR\}/g, parts.colour)
    .replace(/\{SIZE\}/g, parts.size)
    .replace(/\{SEQ\}/g, String(parts.seq).padStart(padding, '0'));

  return sanitiseId(raw);
}

/**
 * Firestore ids cannot contain slashes, and scanners handle a restricted
 * character set far more reliably. Anything outside that set collapses to a
 * hyphen.
 */
export function sanitiseId(value: string): string {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-_.]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  if (!cleaned) throw new BundlePlanError('Bundle id template produced an empty id.');
  if (cleaned.length > 200) throw new BundlePlanError('Bundle id is too long to print reliably.');
  return cleaned;
}

/**
 * Firestore caps a write batch at 500 operations. Bundle generation writes
 * one document per bundle plus a line update, so a 5,000-piece order at 25
 * per bundle needs several batches. Splitting is not optional.
 */
export const BATCH_LIMIT = 450;

export function chunk<T>(items: T[], size = BATCH_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
