import { describe, expect, it } from 'vitest';
import { evaluateAlerts, type AlertContext, type AlertSettings } from './rules';
import type { ModuleView } from '@/hooks/useProductionData';

const settings: AlertSettings = {
  overWip: true,
  lowWip: true,
  behindTarget: true,
  forecastShort: true,
  noOutput: true,
  minElapsedMinutes: 45,
  behindThresholdPct: 85,
};

const view = (over: Partial<ModuleView> = {}, metrics: Record<string, unknown> = {}): ModuleView =>
  ({
    module: { id: 'm1', code: 'M01', active: true } as ModuleView['module'],
    department: null,
    section: null,
    factory: null,
    plan: { id: 'p1', operators: 20, smv: 14.5 } as ModuleView['plan'],
    style: null,
    bySlot: { 8: 100, 9: 100 },
    metrics: {
      target: 500,
      actual: 450,
      achievement: 90,
      achievementBand: 'AMBER',
      efficiency: 70,
      efficiencyBand: 'GREEN',
      hourly: 100,
      forecast: 520,
      requiredRate: null,
      wip: { status: 'GREEN', reason: 'NORMAL' },
      wipPieces: 150,
      ...metrics,
    } as ModuleView['metrics'],
    ...over,
  }) as ModuleView;

const ctx = (over: Partial<AlertContext> = {}): AlertContext => ({
  views: [view()],
  settings,
  elapsedMinutes: 240,
  lastCompletedSlot: 9,
  dateKey: '2026-03-10',
  shiftRunning: true,
  ...over,
});

describe('suppression', () => {
  it('says nothing when no shift is running', () => {
    // Overnight, an idle factory is not a factory in trouble.
    expect(
      evaluateAlerts(
        ctx({
          shiftRunning: false,
          views: [view({}, { wip: { status: 'RED', reason: 'OVER' }, wipPieces: 400 })],
        }),
      ),
    ).toEqual([]);
  });

  it('does not call a module behind target in the first minutes of a shift', () => {
    // At 08:15 nothing has hit its daily target and saying so is noise.
    const alerts = evaluateAlerts(
      ctx({
        elapsedMinutes: 20,
        views: [view({}, { achievement: 5, achievementBand: 'RED' })],
      }),
    );
    expect(alerts.filter((a) => a.kind === 'BEHIND_TARGET')).toHaveLength(0);
  });

  it('still raises over-WIP immediately, before the suppression window', () => {
    // A module drowning at 08:10 needs feeding stopped at 08:10.
    const alerts = evaluateAlerts(
      ctx({
        elapsedMinutes: 10,
        views: [view({}, { wip: { status: 'RED', reason: 'OVER' }, wipPieces: 400 })],
      }),
    );
    expect(alerts.map((a) => a.kind)).toContain('OVER_WIP');
  });

  it('ignores inactive modules entirely', () => {
    const alerts = evaluateAlerts(
      ctx({
        views: [
          view(
            { module: { id: 'm1', code: 'M01', active: false } as ModuleView['module'] },
            { wip: { status: 'RED', reason: 'OVER' } },
          ),
        ],
      }),
    );
    expect(alerts).toEqual([]);
  });

  it('respects each rule being switched off', () => {
    const alerts = evaluateAlerts(
      ctx({
        settings: { ...settings, overWip: false },
        views: [view({}, { wip: { status: 'RED', reason: 'OVER' } })],
      }),
    );
    expect(alerts.filter((a) => a.kind === 'OVER_WIP')).toHaveLength(0);
  });

  it('does not report no-output before any slot has finished', () => {
    const alerts = evaluateAlerts(ctx({ lastCompletedSlot: null }));
    expect(alerts.filter((a) => a.kind === 'NO_OUTPUT')).toHaveLength(0);
  });

  it('stays silent on a module that is running well', () => {
    expect(evaluateAlerts(ctx())).toEqual([]);
  });
});

describe('detection', () => {
  it('reports low WIP before the line stops', () => {
    const alerts = evaluateAlerts(
      ctx({ views: [view({}, { wip: { status: 'GREY', reason: 'LOW' }, wipPieces: 20 })] }),
    );
    expect(alerts[0]).toMatchObject({ kind: 'LOW_WIP', severity: 'AMBER' });
  });

  it('reports behind target with the rate needed to recover', () => {
    const alerts = evaluateAlerts(
      ctx({
        views: [view({}, { achievement: 60, achievementBand: 'RED', requiredRate: 140 })],
      }),
    );
    const behind = alerts.find((a) => a.kind === 'BEHIND_TARGET');
    expect(behind?.severity).toBe('RED');
    expect(behind?.detail).toContain('140');
  });

  it('reports a forecast that lands short', () => {
    const alerts = evaluateAlerts(
      ctx({ views: [view({}, { forecast: 400, target: 500 })] }),
    );
    const short = alerts.find((a) => a.kind === 'FORECAST_SHORT');
    expect(short?.detail).toContain('100');
  });

  it('reports an hour with no output', () => {
    const alerts = evaluateAlerts(ctx({ views: [view({ bySlot: { 8: 100, 9: 0 } })] }));
    expect(alerts.map((a) => a.kind)).toContain('NO_OUTPUT');
  });

  it('reports a module with no plan, and stops there', () => {
    // Without a plan there is no target, so target-based rules would be
    // meaningless noise on top of the real problem.
    const alerts = evaluateAlerts(
      ctx({ views: [view({ plan: null }, { achievement: null, target: null })] }),
    );
    expect(alerts.map((a) => a.kind)).toEqual(['NO_PLAN']);
  });
});

describe('ordering', () => {
  it('puts the most severe first so the top of the list is what matters', () => {
    const alerts = evaluateAlerts(
      ctx({
        views: [
          view({ module: { id: 'm2', code: 'M02', active: true } as ModuleView['module'] },
            { wip: { status: 'GREY', reason: 'LOW' } }),
          view({ module: { id: 'm3', code: 'M03', active: true } as ModuleView['module'] },
            { wip: { status: 'RED', reason: 'OVER' } }),
        ],
      }),
    );
    expect(alerts[0]?.severity).toBe('RED');
  });
});

describe('alert ids', () => {
  it('are stable for the same module, rule and day', () => {
    const a = evaluateAlerts(ctx({ views: [view({}, { wip: { status: 'RED', reason: 'OVER' } })] }));
    const b = evaluateAlerts(ctx({ views: [view({}, { wip: { status: 'RED', reason: 'OVER' } })] }));
    expect(a[0]?.id).toBe(b[0]?.id);
    expect(a[0]?.id).toContain('2026-03-10');
  });
});
