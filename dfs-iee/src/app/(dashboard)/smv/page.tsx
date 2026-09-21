'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StopwatchCalculator } from '@/components/smv/stopwatch-calculator';
import { MotionCalculator } from '@/components/smv/motion-calculator';
import { MachineCalculator } from '@/components/smv/machine-calculator';
import { Clock, Layers, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'stopwatch' | 'motion' | 'machine';

export default function SmvCalculatorPage() {
  const [mode, setMode] = useState<Mode>('stopwatch');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">SMV Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculate Standard Minute Values using three industry-standard methods.
        </p>
      </div>

      {/* Method picker */}
      <div className="grid gap-3 md:grid-cols-3">
        <ModeCard
          active={mode === 'stopwatch'}
          onClick={() => setMode('stopwatch')}
          icon={<Clock className="h-5 w-5" />}
          title="Stopwatch Study"
          description="Direct time study with performance rating and allowances"
        />
        <ModeCard
          active={mode === 'motion'}
          onClick={() => setMode('motion')}
          icon={<Layers className="h-5 w-5" />}
          title="Motion Analysis"
          description="Sum TMU values from your motion library (synthetic SMV)"
        />
        <ModeCard
          active={mode === 'machine'}
          onClick={() => setMode('machine')}
          icon={<Cog className="h-5 w-5" />}
          title="Machine-based"
          description="Estimate from stitch density, seam length, and RPM"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {mode === 'stopwatch' && 'Stopwatch Time Study'}
            {mode === 'motion' && 'Motion Analysis'}
            {mode === 'machine' && 'Machine-based Estimate'}
          </CardTitle>
          <CardDescription>
            {mode === 'stopwatch' &&
              'Enter at least 5 observation cycles for a reliable result.'}
            {mode === 'motion' &&
              'Add motion elements from your library and set frequency per cycle.'}
            {mode === 'machine' &&
              'Quick estimate from machine and seam parameters.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'stopwatch' && <StopwatchCalculator />}
          {mode === 'motion' && <MotionCalculator />}
          {mode === 'machine' && <MachineCalculator />}
        </CardContent>
      </Card>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-all',
        active
          ? 'border-accent ring-2 ring-accent/30'
          : 'hover:border-foreground/30'
      )}
    >
      <div
        className={cn(
          'grid h-9 w-9 place-items-center rounded',
          active ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent'
        )}
      >
        {icon}
      </div>
      <div>
        <div className="font-display text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
