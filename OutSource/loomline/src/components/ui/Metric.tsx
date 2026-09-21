import { cn, formatMetric } from '@/lib/utils';
import { SIGNAL } from '@/lib/signal';
import type { SignalStatus } from '@/types/domain';

interface StatusChipProps {
  status: SignalStatus;
  label?: string;
  className?: string;
}

/** A solid square plus a label — the andon lamp, reduced to inline size. */
export function StatusChip({ status, label, className }: StatusChipProps) {
  const s = SIGNAL[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display text-eyebrow uppercase tracking-[0.1em]',
        className,
      )}
    >
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[1px]', s.bg)} aria-hidden />
      <span className={s.text}>{label ?? s.label}</span>
    </span>
  );
}

interface MetricProps {
  label: string;
  value: number | null | undefined;
  decimals?: number;
  suffix?: string;
  status?: SignalStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * The standard numeric readout. Label above, figure below, always mono and
 * always tabular so the digits hold their column as values tick.
 */
export function Metric({
  label,
  value,
  decimals = 0,
  suffix = '',
  status,
  size = 'md',
  className,
}: MetricProps) {
  const sizeClass =
    size === 'lg'
      ? 'text-metric-lg'
      : size === 'sm'
        ? 'text-xl'
        : 'text-metric';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="eyebrow">{label}</span>
      <span
        className={cn(
          'font-mono tnum font-medium leading-none',
          sizeClass,
          status ? SIGNAL[status].text : 'text-ink',
        )}
      >
        {formatMetric(value, { decimals, suffix })}
      </span>
    </div>
  );
}
