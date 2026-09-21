import { cn } from '@/lib/utils';
import { SIGNAL } from '@/lib/signal';
import type { SignalStatus } from '@/types/domain';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * When set, the card carries an andon rail down its left edge — the
   * signature device of this interface, borrowed from the light stacks
   * mounted above a production line. Status is readable at distance
   * before any text resolves.
   */
  signal?: SignalStatus;
}

export function Card({ className, signal, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-line rounded',
        signal && `andon ${SIGNAL[signal].text}`,
        className,
      )}
      {...props}
    >
      <div className="text-ink">{children}</div>
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pt-4 pb-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-lg uppercase tracking-[0.04em] leading-tight', className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4', className)} {...props} />;
}
