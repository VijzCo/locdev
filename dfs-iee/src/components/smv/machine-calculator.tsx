'use client';

import { useMemo, useState } from 'react';
import { calculateSmvFromMachine } from '@/lib/ie-engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtMinutes, fmtNumber } from '@/lib/utils';

export function MachineCalculator() {
  const [stitchesPerCm, setStitchesPerCm] = useState('4');
  const [seamLengthCm, setSeamLengthCm] = useState('25');
  const [machineRpm, setMachineRpm] = useState('4000');
  const [utilization, setUtilization] = useState('60');
  const [handling, setHandling] = useState('0.10');
  const [allowance, setAllowance] = useState('18');

  const result = useMemo(() => {
    try {
      return calculateSmvFromMachine({
        stitchesPerCm: parseFloat(stitchesPerCm) || 0,
        seamLengthCm: parseFloat(seamLengthCm) || 0,
        machineRpm: parseFloat(machineRpm) || 0,
        machineUtilization: (parseFloat(utilization) || 0) / 100,
        handlingTimeMinutes: parseFloat(handling) || 0,
        allowancePct: (parseFloat(allowance) || 0) / 100,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Calculation error' } as const;
    }
  }, [stitchesPerCm, seamLengthCm, machineRpm, utilization, handling, allowance]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Stitch density (per cm)"
            value={stitchesPerCm}
            onChange={setStitchesPerCm}
            step="0.5"
            hint="Lockstitch typical: 3-5"
          />
          <NumField
            label="Seam length (cm)"
            value={seamLengthCm}
            onChange={setSeamLengthCm}
            step="1"
          />
          <NumField
            label="Machine RPM"
            value={machineRpm}
            onChange={setMachineRpm}
            step="100"
            hint="SNLS: 3500-5000"
          />
          <NumField
            label="Machine utilization (%)"
            value={utilization}
            onChange={setUtilization}
            step="1"
            min="1"
            max="100"
            hint="Real-world: 50-70%"
          />
          <NumField
            label="Handling time (min)"
            value={handling}
            onChange={setHandling}
            step="0.01"
            hint="Pick up, position, set aside"
          />
          <NumField
            label="Allowance (%)"
            value={allowance}
            onChange={setAllowance}
            step="0.5"
          />
        </div>
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
                <dt className="text-muted-foreground">Total stitches</dt>
                <dd className="font-medium tabular-nums">{fmtNumber(result.totalStitches, 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Effective RPM</dt>
                <dd className="font-medium tabular-nums">{fmtNumber(result.effectiveRpm, 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sewing time</dt>
                <dd className="font-medium tabular-nums">{fmtMinutes(result.sewingTimeMinutes)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Handling time</dt>
                <dd className="font-medium tabular-nums">
                  {fmtMinutes(result.handlingTimeMinutes)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-muted-foreground">Basic time</dt>
                <dd className="font-medium tabular-nums">{fmtMinutes(result.basicTimeMinutes)}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular-nums"
        {...rest}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
