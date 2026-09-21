import { useState } from 'react';
import { SIGNAL } from '@/lib/signal';
import { cn, formatMetric } from '@/lib/utils';
import type { SignalStatus } from '@/types/domain';

/**
 * Charts drawn as plain SVG rather than pulling in a charting library.
 *
 * A charting package would add roughly a hundred kilobytes for what amounts
 * to bars and a polyline, and it would style itself rather than obeying the
 * andon rule that colour means production status. These are small enough to
 * read, and they inherit the design tokens like everything else.
 */

export interface Point {
  label: string;
  value: number | null;
  status?: SignalStatus;
}

export function BarChart({
  data,
  height = 200,
  suffix = '',
}: {
  data: Point[];
  height?: number;
  suffix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...data.map((d) => d.value ?? 0));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Nothing to chart yet.</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const pct = d.value === null ? 0 : (d.value / peak) * 100;
          const tone = d.status ? SIGNAL[d.status].bg : 'bg-accent';
          return (
            <div
              key={`${d.label}-${i}`}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={cn(
                  'font-mono tnum text-xs transition-opacity',
                  hover === i ? 'opacity-100' : 'opacity-0',
                )}
              >
                {formatMetric(d.value, { suffix })}
              </span>
              <div
                className={cn('w-full rounded-sm', d.value === null ? 'bg-line' : tone)}
                style={{ height: `${Math.max(d.value === null ? 3 : 2, pct)}%` }}
                title={`${d.label}: ${formatMetric(d.value, { suffix })}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-1">
        {data.map((d, i) => (
          <span
            key={`${d.label}-label-${i}`}
            className="flex-1 truncate text-center font-mono text-[0.625rem] text-faint"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Trend line. Nulls break the line rather than being drawn as zero — a day
 * with no production recorded is not a day of zero output, and joining
 * through it would invent a trend that never happened.
 */
export function LineChart({
  data,
  height = 200,
  suffix = '',
}: {
  data: Point[];
  height?: number;
  suffix?: string;
}) {
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Nothing to chart yet.</p>;
  }

  const peak = Math.max(...values);
  const floor = Math.min(0, ...values);
  const range = peak - floor || 1;
  const w = 100;
  const h = 100;

  const x = (i: number) => (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => h - ((v - floor) / range) * h;

  // Each unbroken run becomes its own polyline, so gaps stay gaps.
  const runs: string[] = [];
  let current: string[] = [];
  data.forEach((d, i) => {
    if (d.value === null) {
      if (current.length > 1) runs.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i)},${y(d.value)}`);
    }
  });
  if (current.length > 1) runs.push(current.join(' '));

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
      >
        <line x1="0" y1={h} x2={w} y2={h} className="stroke-line" strokeWidth="0.5" />
        {runs.map((points, i) => (
          <polyline
            key={i}
            points={points}
            fill="none"
            className="stroke-accent"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((d, i) =>
          d.value === null ? null : (
            <circle key={i} cx={x(i)} cy={y(d.value)} r="1.5" className="fill-accent" />
          ),
        )}
      </svg>

      <div className="mt-1.5 flex justify-between font-mono text-[0.625rem] text-faint">
        <span>{data[0]?.label}</span>
        <span>
          peak {formatMetric(peak, { suffix })}
        </span>
        <span>{data.at(-1)?.label}</span>
      </div>
    </div>
  );
}
