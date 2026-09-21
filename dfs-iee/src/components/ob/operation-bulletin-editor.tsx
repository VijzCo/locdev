'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { totalStyleSmv } from '@/lib/ie-engine';
import { calculateCm } from '@/lib/ie-engine';
import { MACHINE_TYPES, type MachineType, type OperationSection } from '@/types';
import { fmtMinutes, fmtNumber, fmtCurrency, cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface OpRow {
  id: string;
  sequence: number;
  description: string;
  section: OperationSection;
  machineType: MachineType;
  smv: string;
  isHelper: boolean;
}

const SECTIONS: OperationSection[] = [
  'cutting',
  'preparation',
  'assembly',
  'finishing',
  'packing',
];

let _id = 0;
const newId = () => `op-${++_id}-${Date.now()}`;

const STARTER: OpRow[] = [
  {
    id: newId(),
    sequence: 1,
    description: 'Match & stack body panels',
    section: 'preparation',
    machineType: 'MANUAL',
    smv: '0.15',
    isHelper: true,
  },
  {
    id: newId(),
    sequence: 2,
    description: 'Attach front yoke',
    section: 'assembly',
    machineType: 'SNLS',
    smv: '0.40',
    isHelper: false,
  },
  {
    id: newId(),
    sequence: 3,
    description: 'Overlock shoulder seams',
    section: 'assembly',
    machineType: 'OL_4T',
    smv: '0.35',
    isHelper: false,
  },
  {
    id: newId(),
    sequence: 4,
    description: 'Attach collar',
    section: 'assembly',
    machineType: 'SNLS',
    smv: '0.55',
    isHelper: false,
  },
  {
    id: newId(),
    sequence: 5,
    description: 'Hem bottom',
    section: 'finishing',
    machineType: 'FOA',
    smv: '0.30',
    isHelper: false,
  },
  {
    id: newId(),
    sequence: 6,
    description: 'Trim threads & inspect',
    section: 'finishing',
    machineType: 'MANUAL',
    smv: '0.20',
    isHelper: true,
  },
];

export function OperationBulletinEditor() {
  const [styleNumber, setStyleNumber] = useState('DEMO-001');
  const [styleDescription, setStyleDescription] = useState('Sample polo shirt');
  const [rows, setRows] = useState<OpRow[]>(STARTER);
  const [cpm, setCpm] = useState('0.05');
  const [efficiency, setEfficiency] = useState('60');
  const [currency] = useState('USD');

  // Aggregations
  const totals = useMemo(() => {
    const ops = rows.map((r) => ({ smv: parseFloat(r.smv) || 0 }));
    const totalSmv = totalStyleSmv(ops);
    const helperCount = rows.filter((r) => r.isHelper).length;
    const machinistCount = rows.length - helperCount;

    const smvBySection: Record<OperationSection, number> = {
      cutting: 0,
      preparation: 0,
      assembly: 0,
      finishing: 0,
      packing: 0,
    };
    const smvByMachine: Partial<Record<MachineType, number>> = {};
    for (const r of rows) {
      const smv = parseFloat(r.smv) || 0;
      smvBySection[r.section] += smv;
      smvByMachine[r.machineType] = (smvByMachine[r.machineType] || 0) + smv;
    }

    return {
      operationCount: rows.length,
      totalSmv,
      helperCount,
      machinistCount,
      uniqueMachineCount: Object.keys(smvByMachine).filter(
        (m) => m !== 'MANUAL' && (smvByMachine[m as MachineType] || 0) > 0
      ).length,
      smvBySection,
      smvByMachine,
    };
  }, [rows]);

  // Live CM calculation
  const cmResult = useMemo(() => {
    const cpmN = parseFloat(cpm);
    const effN = parseFloat(efficiency) / 100;
    if (!totals.totalSmv || Number.isNaN(cpmN) || !effN) return null;
    try {
      return calculateCm({ smv: totals.totalSmv, cpm: cpmN, efficiency: effN });
    } catch {
      return null;
    }
  }, [totals.totalSmv, cpm, efficiency]);

  // Row operations
  const update = (id: string, patch: Partial<OpRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: newId(),
        sequence: prev.length + 1,
        description: '',
        section: 'assembly',
        machineType: 'SNLS',
        smv: '',
        isHelper: false,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) =>
      prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, sequence: i + 1 }))
    );
  };

  const move = (id: string, direction: -1 | 1) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next.map((r, i) => ({ ...r, sequence: i + 1 }));
    });
  };

  const exportCsv = () => {
    const header = ['Seq', 'Operation', 'Section', 'Machine', 'SMV', 'Helper'];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.sequence,
          `"${r.description.replace(/"/g, '""')}"`,
          r.section,
          r.machineType,
          r.smv,
          r.isHelper ? 'Y' : 'N',
        ].join(',')
      ),
      '',
      `Total SMV,,,,${totals.totalSmv},`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${styleNumber}-ob.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      {/* Style header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Style</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="styleNumber">Style number</Label>
            <Input
              id="styleNumber"
              value={styleNumber}
              onChange={(e) => setStyleNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="styleDescription">Description</Label>
            <Input
              id="styleDescription"
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operations table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Operations</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" /> Add operation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Seq</th>
                  <th className="px-3 py-2 text-left">Operation</th>
                  <th className="px-3 py-2 text-left">Section</th>
                  <th className="px-3 py-2 text-left">Machine</th>
                  <th className="px-3 py-2 text-right">SMV</th>
                  <th className="px-3 py-2 text-center">Helper</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono text-xs tabular-nums">
                      {row.sequence}
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={row.description}
                        onChange={(e) => update(row.id, { description: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="Operation description"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={row.section}
                        onChange={(e) =>
                          update(row.id, { section: e.target.value as OperationSection })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {SECTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <select
                        value={row.machineType}
                        onChange={(e) =>
                          update(row.id, { machineType: e.target.value as MachineType })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {MACHINE_TYPES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={row.smv}
                        onChange={(e) => update(row.id, { smv: e.target.value })}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.isHelper}
                        onChange={(e) => update(row.id, { isHelper: e.target.checked })}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => move(row.id, -1)}
                          disabled={i === 0}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => move(row.id, 1)}
                          disabled={i === rows.length - 1}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeRow(row.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total SMV
                  </td>
                  <td className="px-3 py-2 text-right font-display text-base font-bold tabular-nums">
                    {fmtNumber(totals.totalSmv, 4)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Aggregations + Costing */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aggregations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Operations" value={totals.operationCount.toString()} />
              <Stat label="Machinists" value={totals.machinistCount.toString()} />
              <Stat label="Helpers" value={totals.helperCount.toString()} />
              <Stat label="Unique machines" value={totals.uniqueMachineCount.toString()} />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                SMV by section
              </div>
              <div className="space-y-1.5">
                {SECTIONS.map((s) => {
                  const smv = totals.smvBySection[s];
                  if (!smv) return null;
                  const pct = totals.totalSmv > 0 ? (smv / totals.totalSmv) * 100 : 0;
                  return (
                    <div key={s} className="text-xs">
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="capitalize text-muted-foreground">{s}</span>
                        <span className="font-mono tabular-nums">
                          {fmtMinutes(smv)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live costing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live costing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpm" className="text-xs">CPM (cost per minute)</Label>
                <Input
                  id="cpm"
                  type="number"
                  step="0.001"
                  value={cpm}
                  onChange={(e) => setCpm(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eff" className="text-xs">Line efficiency (%)</Label>
                <Input
                  id="eff"
                  type="number"
                  step="1"
                  min="10"
                  max="120"
                  value={efficiency}
                  onChange={(e) => setEfficiency(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-4">
              {cmResult ? (
                <>
                  <div className="text-xs text-muted-foreground">Labor CM / unit</div>
                  <div className="mt-1 font-display text-3xl font-bold tabular-nums">
                    {fmtCurrency(cmResult.totalCm, currency, 4)}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Add overhead, trims, and other costs in the full Costing page to get the
                    total CM.
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Set CPM and efficiency to see live cost.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          This editor works fully in-memory. Persistence to Firestore is the next step — wire
          up <span className="font-mono">setDoc()</span> calls in this component to save.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info('Wire to Firestore.setDoc()')}>
            Save draft
          </Button>
          <Button onClick={() => toast.info('Wire to Cloud Function approveOb()')}>
            <CheckCircle2 className="h-4 w-4" /> Submit for approval
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-md border bg-muted/40 p-3')}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 font-display text-2xl font-bold tabular-nums',
          accent && 'text-accent'
        )}
      >
        {value}
      </div>
    </div>
  );
}
