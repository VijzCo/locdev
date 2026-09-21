import { describe, expect, it } from 'vitest';
import {
  BundlePlanError,
  chunk,
  formatBundleId,
  planBundles,
  sanitiseId,
  summarisePlan,
} from './bundleMath';

describe('planBundles', () => {
  it('divides evenly when it can', () => {
    const b = planBundles(1000, 20);
    expect(b).toHaveLength(50);
    expect(b.every((x) => x.qty === 20)).toBe(true);
    expect(b.some((x) => x.partial)).toBe(false);
  });

  it('handles the worked example from the brief', () => {
    // 1,030 at 20 per bundle: 51 full plus one of 10.
    const b = planBundles(1030, 20);
    expect(b).toHaveLength(52);
    expect(b.filter((x) => !x.partial)).toHaveLength(51);
    expect(b.at(-1)).toMatchObject({ seq: 52, qty: 10, partial: true });
  });

  it('conserves quantity for every combination in a wide sweep', () => {
    // The property that actually matters: whatever the inputs, the pieces
    // planned equal the pieces ordered. Exhaustive beats spot-checking.
    for (let order = 1; order <= 400; order++) {
      for (let size = 1; size <= Math.min(order, 60); size++) {
        const total = planBundles(order, size).reduce((s, b) => s + b.qty, 0);
        expect(total).toBe(order);
      }
    }
  });

  it('numbers bundles from one with no gaps', () => {
    const b = planBundles(97, 10);
    expect(b.map((x) => x.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('treats an order smaller than a bundle as an error, not a silent partial', () => {
    expect(() => planBundles(10, 25)).toThrow(BundlePlanError);
  });

  it('rejects fractional and non-positive input', () => {
    expect(() => planBundles(100.5, 25)).toThrow(BundlePlanError);
    expect(() => planBundles(0, 25)).toThrow(BundlePlanError);
    expect(() => planBundles(100, 0)).toThrow(BundlePlanError);
    expect(() => planBundles(100, -5)).toThrow(BundlePlanError);
  });

  it('handles an order exactly one bundle long', () => {
    expect(planBundles(25, 25)).toEqual([{ seq: 1, qty: 25, partial: false }]);
  });
});

describe('summarisePlan', () => {
  it('reports the partial bundle so the operator sees it before committing', () => {
    const s = summarisePlan(1030, 20);
    expect(s).toMatchObject({ count: 52, fullCount: 51, partialQty: 10, totalPieces: 1030 });
  });

  it('reports no partial when the division is clean', () => {
    expect(summarisePlan(500, 25).partialQty).toBeNull();
  });
});

describe('formatBundleId', () => {
  const parts = { po: 'PO-9001', style: 'ST-1001', colour: 'Navy', size: 'M', seq: 7 };

  it('fills every placeholder and pads the sequence', () => {
    expect(formatBundleId('{PO}-{STYLE}-{COLOR}-{SIZE}-B{SEQ}', parts, 4)).toBe(
      'PO-9001-ST-1001-NAVY-M-B0007',
    );
  });

  it('accepts either spelling of colour', () => {
    expect(formatBundleId('{COLOUR}', parts, 4)).toBe('NAVY');
  });

  it('respects a different padding width', () => {
    expect(formatBundleId('B{SEQ}', parts, 6)).toBe('B000007');
  });
});

describe('sanitiseId', () => {
  it('strips characters that break Firestore ids or confuse scanners', () => {
    expect(sanitiseId('PO/9001 Navy Blue')).toBe('PO-9001-NAVY-BLUE');
  });

  it('collapses runs and trims stray hyphens', () => {
    expect(sanitiseId('  A///  B  ')).toBe('A-B');
  });

  it('refuses an id that would be empty or unprintably long', () => {
    expect(() => sanitiseId('///')).toThrow(BundlePlanError);
    expect(() => sanitiseId('A'.repeat(300))).toThrow(BundlePlanError);
  });
});

describe('chunk', () => {
  it('splits past the Firestore batch limit', () => {
    const parts = chunk(Array.from({ length: 1000 }, (_, i) => i));
    expect(parts).toHaveLength(3);
    expect(parts.flat()).toHaveLength(1000);
  });

  it('leaves a small list in one piece', () => {
    expect(chunk([1, 2, 3])).toHaveLength(1);
  });
});
