import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/utils';

const TONE = {
  info: 'border-line bg-raised text-muted',
  warn: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
  critical: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
} as const;

/**
 * Sits under the top bar rather than as a dismissible toast — a licence
 * about to stop production is not a notification, it is a condition of the
 * screen, and it should still be there tomorrow.
 */
export function LicenceBanner() {
  const { licence } = useAuth();
  if (!licence.banner) return null;

  return (
    <div
      className={cn(
        'no-print andon border-b px-4 py-2.5 text-sm sm:px-6',
        TONE[licence.banner.tone],
      )}
      role="status"
    >
      {licence.banner.text}
    </div>
  );
}
