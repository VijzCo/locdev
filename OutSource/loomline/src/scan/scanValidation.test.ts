import { describe, expect, it } from 'vitest';
import { checkScan, scanEventId, slotIndexFor, type ScanCheckInput } from './scanValidation';
import type { Bundle, Module, Style } from '@/types/domain';

const bundle = (over: Partial<Bundle> = {}): Bundle => ({
  id: 'PO-1-ST-1001-NAVY-M-B0001',
  tenantId: 't',
  factoryId: 'f',
  poId: 'po',
  poLineId: 'line',
  styleId: 'style',
  colour: 'Navy',
  size: 'M',
  qty: 25,
  seq: 1,
  status: 'CREATED',
  currentModuleId: null,
  currentStage: null,
  createdAt: '2026-01-01T00:00:00Z',
  lastScanAt: null,
  ...over,
});

const module_ = (over: Partial<Module> = {}): Module => ({
  id: 'm1',
  tenantId: 't',
  factoryId: 'f',
  departmentId: 'd',
  sectionId: 's',
  name: 'Module 01',
  code: 'M01',
  operatorCount: 20,
  active: true,
  ...over,
});

const style = (over: Partial<Style> = {}): Style => ({
  id: 'style',
  tenantId: 't',
  code: 'ST-1001',
  description: '',
  smv: 14.5,
  colours: ['Navy'],
  sizes: ['M'],
  routeStages: ['CUTTING', 'SEWING'],
  active: true,
  ...over,
});

const base = (over: Partial<ScanCheckInput> = {}): ScanCheckInput => ({
  bundle: bundle(),
  module: module_(),
  style: style(),
  direction: 'IN',
  userScanAccess: 'BOTH',
  userModuleIds: [],
  moduleStage: 'CUTTING',
  slotOpen: true,
  enforceTimeSlots: true,
  routingEnforcement: 'STRICT',
  ...over,
});

describe('checkScan — rejections', () => {
  it('rejects an unknown barcode', () => {
    const r = checkScan(base({ bundle: null }));
    expect(r).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('rejects a cancelled bundle', () => {
    const r = checkScan(base({ bundle: bundle({ status: 'CANCELLED' }) }));
    expect(r.code).toBe('CANCELLED');
  });

  it('rejects a completed bundle', () => {
    const r = checkScan(base({ bundle: bundle({ status: 'COMPLETED' }) }));
    expect(r.code).toBe('COMPLETED');
  });

  it('rejects a module the user is not assigned to', () => {
    const r = checkScan(base({ userModuleIds: ['other'] }));
    expect(r.code).toBe('NO_MODULE_ACCESS');
    expect(r.message).toContain('M01');
  });

  it('treats an empty module list as unrestricted', () => {
    expect(checkScan(base({ userModuleIds: [] })).ok).toBe(true);
  });

  it('rejects a direction the user may not scan', () => {
    expect(checkScan(base({ userScanAccess: 'OUT', direction: 'IN' })).code).toBe(
      'NO_DIRECTION_ACCESS',
    );
    expect(checkScan(base({ userScanAccess: 'IN', direction: 'IN' })).ok).toBe(true);
  });

  it('rejects a closed slot only when enforcement is on', () => {
    expect(checkScan(base({ slotOpen: false })).code).toBe('SLOT_CLOSED');
    expect(checkScan(base({ slotOpen: false, enforceTimeSlots: false })).ok).toBe(true);
  });
});

describe('checkScan — IN', () => {
  it('rejects a duplicate scan into the same module', () => {
    const r = checkScan(base({ bundle: bundle({ currentModuleId: 'm1', status: 'IN_MODULE' }) }));
    expect(r.code).toBe('ALREADY_IN_MODULE');
  });

  it('refuses to let a bundle be in two modules at once', () => {
    const r = checkScan(
      base({
        bundle: bundle({ currentModuleId: 'm9', status: 'IN_MODULE' }),
        currentModuleCode: 'M09',
      }),
    );
    expect(r.code).toBe('IN_ANOTHER_MODULE');
    expect(r.message).toContain('M09');
  });

  it('rejects a stage the style does not pass through', () => {
    const r = checkScan(base({ moduleStage: 'PACKING' }));
    expect(r.code).toBe('WRONG_STAGE');
  });

  it('enforces route order under STRICT', () => {
    // Nothing done yet, so sewing before cutting is out of order.
    const r = checkScan(base({ moduleStage: 'SEWING' }));
    expect(r.code).toBe('WRONG_STAGE');
    expect(r.message).toContain('cutting');
  });

  it('accepts the next stage in order', () => {
    const r = checkScan(
      base({ bundle: bundle({ currentStage: 'CUTTING', status: 'BETWEEN' }), moduleStage: 'SEWING' }),
    );
    expect(r.ok).toBe(true);
  });

  it('accepts any stage on the route under DEPARTMENT', () => {
    const r = checkScan(base({ moduleStage: 'SEWING', routingEnforcement: 'DEPARTMENT' }));
    expect(r.ok).toBe(true);
  });

  it('accepts anything under FREE', () => {
    const r = checkScan(base({ moduleStage: 'PACKING', routingEnforcement: 'FREE' }));
    expect(r.ok).toBe(true);
  });
});

describe('checkScan — OUT', () => {
  it('rejects a bundle that was never scanned in', () => {
    const r = checkScan(base({ direction: 'OUT' }));
    expect(r.code).toBe('NOT_IN_THIS_MODULE');
  });

  it('rejects a bundle sitting in a different module', () => {
    const r = checkScan(
      base({
        direction: 'OUT',
        bundle: bundle({ currentModuleId: 'm9', status: 'IN_MODULE' }),
        currentModuleCode: 'M09',
      }),
    );
    expect(r.code).toBe('NOT_IN_THIS_MODULE');
    expect(r.message).toContain('M09');
  });

  it('accepts a bundle inside this module', () => {
    const r = checkScan(
      base({ direction: 'OUT', bundle: bundle({ currentModuleId: 'm1', status: 'IN_MODULE' }) }),
    );
    expect(r.ok).toBe(true);
  });
});

describe('scanEventId', () => {
  it('is deterministic, which is what makes duplicates impossible', () => {
    expect(scanEventId('B1', 'M1', 'IN')).toBe('B1__M1__IN');
    expect(scanEventId('B1', 'M1', 'IN')).toBe(scanEventId('B1', 'M1', 'IN'));
  });

  it('separates direction and module', () => {
    expect(scanEventId('B1', 'M1', 'OUT')).not.toBe(scanEventId('B1', 'M1', 'IN'));
    expect(scanEventId('B1', 'M2', 'IN')).not.toBe(scanEventId('B1', 'M1', 'IN'));
  });
});

describe('slotIndexFor', () => {
  it('buckets by hour of the factory day', () => {
    expect(slotIndexFor(0)).toBe(0);
    expect(slotIndexFor(8 * 60)).toBe(8);
    expect(slotIndexFor(8 * 60 + 59)).toBe(8);
    expect(slotIndexFor(9 * 60)).toBe(9);
  });
});
