'use client';

import { useMemo, useState } from 'react';
import { calculateSmvFromStopwatch } from '@/lib/ie-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtMinutes, fmtNumber, fmtPct } from '@/lib/utils';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export function StopwatchCalculator() {
  const [observations, setObservations] = useState<string[]>(['', '', '', '', '']);
  const [rating, setRating] = useState('1.00');
  const [allowance, setAllowance] = useState('18');

  const result = useMemo(() => {
    const nums = observations
      .map((o) => parseFloat(o))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const r = parseFloat(rating);
    const a = parseFloat(allowance) / 100;
    if (!nums.length || Number.isNaN(r) || Number.isNaN(a)) return null;
    try {
      return calculateSmvFromStopwatch({
        observations: nums,
        performanceRating: r,
        allowancePct: a,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Calculation error' } as const;
    }
  }, [observations, rating, allowance]);

  const updateObservation = (i: number, value: string) => {
    setObservations((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const addRow = () => setObservations((prev) => [...prev, '']);
  const removeRow = (i: number) =>
    setObservations((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Observations table */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm">Observations (seconds)</Label>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Add row
          </Button>
        </div>
        <div className="space-y-2">
          {observations.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 text-right font-mono text-xs text-muted-foreground">
                #{i + 1}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => updateObservation(i, e.target.value)}
                placeholder="e.g. 30.5"
                className="tabular-nums"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(i)}
                disabled={observations.length <= 1}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Performance rating</Label>
            <Input
              id="rating"
              type="number"
              step="0.01"
              min="0.5"
              max="2"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              1.00 = standard pace · 1.10 = 10% above standard
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowance">Allowance (%)</Label>
            <Input
              id="allowance"
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Sewing: 18–22% · Heavy work: 25–30%
            </p>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="rounded-lg border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Calculated SMV
        </div>
        {result && 'error' in result ? (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{result.error}</span>
          </div>
        ) : result ? (
          <>
            <div className="mt-2 font-display text-4xl font-bold tabular-nums">
              {fmtNumber(result.smv, 4)}
            </div>
            <div className="text-sm text-muted-foreground">minutes per piece</div>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Observations</dt>
                <dd className="font-medium tabular-nums">{result.observationCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Basic time</dt>
                <dd className="font-medium tabular-nums">
                  {fmtMinutes(result.basicTimeMinutes)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Normal time</dt>
                <dd className="font-medium tabular-nums">
                  {fmtMinutes(result.normalTimeMinutes)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Std deviation</dt>
                <dd className="font-medium tabular-nums">{fmtNumber(result.stdDevSeconds)}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coeff. of variation</dt>
                <dd className="font-medium tabular-nums">
                  {fmtPct(result.coefficientOfVariation)}
                </dd>
              </div>
            </dl>

            {result.warnings.length > 0 && (
              <div className="mt-5 space-y-2">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Enter at least one observation to calculate.
          </p>
        )}
      </div>
    </div>
  );
}
