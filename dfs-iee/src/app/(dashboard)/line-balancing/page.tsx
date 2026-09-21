'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  autoBalance,
  type BalanceOperation,
} from '@/lib/ie-engine';
import { MACHINE_TYPES, type MachineType } from '@/types';
import { fmtMinutes, fmtNumber, fmtPct, cn } from '@/lib/utils';
import { Activity, AlertTriangle, Wand2 } from 'lucide-react';

const SAMPLE_OPS: BalanceOperation[] = [
  { id: 'o1', sequence: 1, description: 'Match panels', machineType: 'MANUAL', smv: 0.15 },
  { id: 'o2', sequence: 2, description: 'Attach front yoke', machineType: 'SNLS', smv: 0.4 },
  { id: 'o3', sequence: 3, description: 'Overlock shoulders', machineType: 'OL_4T', smv: 0.35 },
  { id: 'o4', sequence: 4, description: 'Attach collar', machineType: 'SNLS', smv: 0.55 },
  { id: 'o5', sequence: 5, description: 'Attach sleeves', machineType: 'OL_4T', smv: 0.6 },
  { id: 'o6', sequence: 6, description: 'Side seams', machineType: 'OL_4T', smv: 0.5 },
  { id: 'o7', sequence: 7, description: 'Hem sleeves', machineType: 'FOA', smv: 0.3 },
  { id: 'o8', sequence: 8, description: 'Hem bottom', machineType: 'FOA', smv: 0.3 },
  { id: 'o9', sequence: 9, description: 'Bartack stress points', machineType: 'BARTACK', smv: 0.2 },
  { id: 'o10', sequence: 10, description: 'Trim & inspect', machineType: 'MANUAL', smv: 0.2 },
];

export default function LineBalancingPage() {
  const [targetPph, setTargetPph] = useState('120');
  const [ops] = useState<BalanceOperation[]>(SAMPLE_OPS);

  const result = useMemo(() => {
    const pph = parseFloat(targetPph);
    if (!pph || pph <= 0 || !ops.length) return null;
    try {
      return autoBalance(ops, pph);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error' } as const;
    }
  }, [ops, targetPph]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Line Balancing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-balance operations into stations to hit your target output.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Target</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pph">Target pieces per hour</Label>
            <Input
              id="pph"
              type="number"
              step="10"
              value={targetPph}
              onChange={(e) => setTargetPph(e.target.value)}
              className="tabular-nums"
            />
          </div>
          {result && !('error' in result) && (
            <>
              <Stat label="Cycle time" value={fmtMinutes(result.metrics.targetCycleTime)} />
              <Stat
                label="Theoretical operators"
                value={result.metrics.operatorCount.toString()}
              />
            </>
          )}
        </CardContent>
      </Card>

      {result && 'error' in result && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{result.error}</CardContent>
        </Card>
      )}

      {result && !('error' in result) && (
        <>
          {/* Metrics row */}
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Balance efficiency"
              value={fmtPct(result.metrics.balanceEfficiencyPct / 100)}
              icon={<Activity className="h-4 w-4" />}
              accent={result.metrics.balanceEfficiencyPct >= 85}
            />
            <MetricCard
              label="Actual output / hr"
              value={fmtNumber(result.metrics.actualOutputPph, 0)}
              icon={<Wand2 className="h-4 w-4" />}
            />
            <MetricCard
              label="Bottleneck station"
              value={`#${result.metrics.bottleneckStation}`}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <MetricCard
              label="Bottleneck SMV"
              value={fmtMinutes(result.metrics.bottleneckSmv)}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card>
              <CardContent className="space-y-2 pt-6">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                    {w}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stations visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.stations.map((station) => {
                const isBottleneck = station.stationNumber === result.metrics.bottleneckStation;
                const cycleTime = result.metrics.targetCycleTime;
                const pct = (station.stationSmv / cycleTime) * 100;
                const overloaded = station.loadFactor > 1.0;
                const underloaded = station.loadFactor < 0.7;

                return (
                  <div
                    key={station.stationNumber}
                    className={cn(
                      'rounded-md border p-4',
                      isBottleneck && 'border-amber-500/50 bg-amber-500/5'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display text-sm font-semibold">
                          Station {station.stationNumber}{' '}
                          <span className="ml-2 inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {station.machineType}
                          </span>
                          {isBottleneck && (
                            <span className="ml-2 inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                              bottleneck
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {station.operationCount} operation
                          {station.operationCount !== 1 ? 's' : ''} ·{' '}
                          {fmtMinutes(station.stationSmv)} ·{' '}
                          <span
                            className={cn(
                              overloaded && 'text-destructive font-medium',
                              underloaded && 'text-muted-foreground'
                            )}
                          >
                            load {fmtPct(station.loadFactor)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Load bar */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all',
                          overloaded ? 'bg-destructive' : 'bg-accent'
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    {/* Operations in this station */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {station.operationIds.map((opId) => {
                        const op = ops.find((o) => o.id === opId);
                        if (!op) return null;
                        return (
                          <div
                            key={opId}
                            className="inline-flex items-center gap-1.5 rounded border bg-card px-2 py-1 text-xs"
                          >
                            <span className="font-mono text-muted-foreground">
                              #{op.sequence}
                            </span>
                            <span>{op.description}</span>
                            <span className="font-mono tabular-nums text-muted-foreground">
                              {op.smv.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Operations are loaded from a hardcoded sample. Wire this page to your operations
        collection — filter by <span className="font-mono">styleId</span> and{' '}
        <span className="font-mono">orderBy(&apos;sequence&apos;)</span>.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div
            className={cn(
              'grid h-7 w-7 place-items-center rounded',
              accent ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent'
            )}
          >
            {icon}
          </div>
        </div>
        <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
