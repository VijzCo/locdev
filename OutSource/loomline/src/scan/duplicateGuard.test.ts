import { describe, expect, it } from 'vitest';
import {
  checkRapidRepeat,
  duplicateMessage,
  isAlreadyQueued,
  rememberScan,
} from './duplicateGuard';

const NOW = 1_700_000_000_000;
const WINDOW = 3000;

describe('checkRapidRepeat', () => {
  it('catches a scanner firing twice on a held trigger', () => {
    const recent = [{ code: 'B1', at: NOW - 120 }];
    expect(checkRapidRepeat(recent, 'B1', NOW, WINDOW)).toMatchObject({
      duplicate: true,
      reason: 'RAPID_REPEAT',
    });
  });

  it('allows the same bundle again once the window has passed', () => {
    // A person genuinely rescanning does not do it inside three seconds.
    const recent = [{ code: 'B1', at: NOW - 5000 }];
    expect(checkRapidRepeat(recent, 'B1', NOW, WINDOW).duplicate).toBe(false);
  });

  it('does not block a different bundle scanned immediately after', () => {
    // The common case: an operator working quickly through a trolley.
    const recent = [{ code: 'B1', at: NOW - 100 }];
    expect(checkRapidRepeat(recent, 'B2', NOW, WINDOW).duplicate).toBe(false);
  });

  it('reports how long ago, so the message can be specific', () => {
    const recent = [{ code: 'B1', at: NOW - 2000 }];
    const v = checkRapidRepeat(recent, 'B1', NOW, WINDOW);
    expect(v.duplicate && v.secondsAgo).toBe(2);
  });

  it('is clean on an empty history', () => {
    expect(checkRapidRepeat([], 'B1', NOW, WINDOW).duplicate).toBe(false);
  });
});

describe('rememberScan', () => {
  it('puts the newest first', () => {
    const list = rememberScan([{ code: 'B1', at: NOW - 100 }], 'B2', NOW, WINDOW);
    expect(list[0]?.code).toBe('B2');
  });

  it('drops entries well past the window so the list cannot grow', () => {
    const stale = [{ code: 'OLD', at: NOW - WINDOW * 10 }];
    expect(rememberScan(stale, 'B1', NOW, WINDOW)).toHaveLength(1);
  });

  it('caps the list length', () => {
    let list = [] as { code: string; at: number }[];
    for (let i = 0; i < 200; i++) list = rememberScan(list, `B${i}`, NOW, WINDOW);
    expect(list.length).toBeLessThanOrEqual(50);
  });
});

describe('isAlreadyQueued', () => {
  it('catches a scan already sitting in the outbox', () => {
    expect(isAlreadyQueued(['B1__M1__IN'], 'B1__M1__IN')).toMatchObject({
      duplicate: true,
      reason: 'ALREADY_QUEUED',
    });
  });

  it('lets the opposite direction through', () => {
    // Scanning OUT after IN at the same module is normal, not a duplicate.
    expect(isAlreadyQueued(['B1__M1__IN'], 'B1__M1__OUT').duplicate).toBe(false);
  });

  it('lets the same bundle through at a different module', () => {
    expect(isAlreadyQueued(['B1__M1__OUT'], 'B1__M2__IN').duplicate).toBe(false);
  });
});

describe('duplicateMessage', () => {
  it('says counted once, not rejected', () => {
    // The distinction matters: an operator told "rejected" for their own
    // double-press learns to distrust every rejection.
    const msg = duplicateMessage({ duplicate: true, reason: 'RAPID_REPEAT', secondsAgo: 0 });
    expect(msg).toContain('counted once');
  });

  it('mentions the delay when there was one', () => {
    const msg = duplicateMessage({ duplicate: true, reason: 'RAPID_REPEAT', secondsAgo: 2 });
    expect(msg).toContain('2 seconds');
  });

  it('explains a queued duplicate differently', () => {
    const msg = duplicateMessage({ duplicate: true, reason: 'ALREADY_QUEUED', secondsAgo: 60 });
    expect(msg).toContain('waiting to sync');
  });
});
