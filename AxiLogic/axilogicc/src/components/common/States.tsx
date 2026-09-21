import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * An empty screen is an invitation to act, so every empty state names the
 * next action rather than merely reporting absence.
 */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 border border-dashed border-line rounded py-16 px-6 text-center',
        className,
      )}
    >
      <p className="font-display text-lg uppercase tracking-[0.04em] text-muted">{title}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded bg-raised border border-line animate-pulse" />
      ))}
    </div>
  );
}

/**
 * Errors state what happened and what to do. They do not apologise and
 * they are never vague.
 */
export function ErrorState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="andon text-signal-red border border-line rounded bg-surface p-6">
      <p className="font-display text-lg uppercase tracking-[0.04em] text-signal-red">{title}</p>
      {detail && <p className="mt-2 text-sm text-muted max-w-prose">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
