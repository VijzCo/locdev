'use client';

import { useMemo, useState } from 'react';
import { calculateSmvFromMotions } from '@/lib/ie-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtMinutes, fmtNumber } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

interface Row {
  code: string;
  description: string;
  tmu: string;
  frequency: string;
}

const initial: Row[] = [
  { code: 'GET_PART_S', description: 'Get part (short reach)', tmu: '10', frequency: '1' },
  { code: 'POSITION_M', description: 'Position part (medium accuracy)', tmu: '20', frequency: '1' },
  { code: 'SEW_10CM', description: 'Sew 10cm seam', tmu: '60', frequency: '1' },
  { code: 'TRIM', description: 'Trim thread', tmu: '8', frequency: '1' },
  { code: 'ASIDE', description: 'Set aside', tmu: '12', frequency: '1' },
];

export function MotionCalculator() {
  const [rows, setRows] = useState<Row[]>(initial);
  const [allowance, setAllowance] = useState('18');
  const [rating, setRating] = useState('1.00');

  const result = useMemo(() => {
    const motions = rows
      .filter((r) => r.code.trim())
      .map((r, i) => ({
        motionId: `m-${i}`,
        motionCode: r.code,
        description: r.description,
        tmu: parseFloat(r.tmu) || 0,
        frequency: parseFloat(r.frequency) || 0,
      }));
    const a = parseFloat(allowance) / 100;
    const pr = parseFloat(rating);
    if (!motions.length) return null;
    try {
      return calculateSmvFromMotions({
        motions,
        allowancePct: a,
        performanceRating: pr,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Calculation error' } as const;
    }
  }, [rows, allowance, rating]);

  const update = (i: number, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const addRow = () =>
    setRows((prev) => [...prev, { code: '', description: '', tmu: '', frequency: '1' }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm">Motion elements</Label>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Add motion
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">TMU</th>
                <th className="px-3 py-2 text-right">Freq</th>
                <th className="px-3 py-2 text-right">Total TMU</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const subtotal = (parseFloat(row.tmu) || 0) * (parseFloat(row.frequency) || 0);
                return (
                  <tr key={i} className="border-t">
                    <td className="p-1.5">
                      <Input
                        value={row.code}
                        onChange={(e) => update(i, 'code', e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={row.description}
                        onChange={(e) => update(i, 'description', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.tmu}
                        onChange={(e) => update(i, 'tmu', e.target.value)}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.frequency}
                        onChange={(e) => update(i, 'frequency', e.target.value)}
                        className="h-8 w-16 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                      {fmtNumber(subtotal, 1)}
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(i)}
                        disabled={rows.length <= 1}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rating-m">Performance rating</Label>
            <Input
              id="rating-m"
              type="number"
              step="0.01"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowance-m">Allowance (%)</Label>
            <Input
              id="allowance-m"
              type="number"
              step="0.5"
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              className="tabular-nums"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          You&apos;ll build your own motion library under{' '}
          <span className="font-mono">tenants/{'{tenantId}'}/motionLibrary</span>. Each tenant
          has its own library — most factories tune values from MTM-2 / general industrial
          engineering principles to their own equipment and methods.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Calculated SMV
        </div>
        {result && 'error' in result ? (
          <div className="mt-3 text-sm text-destructive">{result.error}</div>
        ) : result ? (
          <>
            <div className="mt-2 font-display text-4xl font-bold tabular-nums">
              {fmtNumber(result.smv, 4)}
            </div>
            <div className="text-sm text-muted-foreground">minutes per piece</div>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Motion count</dt>
                <dd className="font-medium tabular-nums">{result.motionCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total TMU</dt>
                <dd className="font-medium tabular-nums">{fmtNumber(result.totalTmu, 1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Basic time</dt>
                <dd className="font-medium tabular-nums">{fmtMinutes(result.basicTimeMinutes)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Normal time</dt>
                <dd className="font-medium tabular-nums">
                  {fmtMinutes(result.normalTimeMinutes)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Add a motion to calculate.</p>
        )}
      </div>
    </div>
  );
}
