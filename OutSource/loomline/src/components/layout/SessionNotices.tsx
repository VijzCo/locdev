import { useSessionGuard } from '@/hooks/useSessionGuard';
import { Button } from '@/components/ui/Button';

/**
 * Idle warning and the reason a session ended.
 *
 * The warning is a dialog rather than a quiet banner on purpose: an operator
 * halfway through a trolley of bundles needs to notice before the sign-out,
 * not after it.
 */
export function SessionNotices() {
  const { secondsLeft, dismissWarning } = useSessionGuard();
  if (secondsLeft === null) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="andon text-signal-amber flex items-center gap-4 rounded border border-signal-amber/50 bg-surface px-4 py-3 shadow-lg">
        <div>
          <p className="font-display text-base uppercase tracking-[0.03em] text-ink">
            Signing out in {secondsLeft}s
          </p>
          <p className="text-sm text-muted">No activity for a while. Any scan you have made is safe.</p>
        </div>
        <Button variant="primary" onClick={dismissWarning}>
          Stay signed in
        </Button>
      </div>
    </div>
  );
}
