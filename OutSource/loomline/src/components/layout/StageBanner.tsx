import { usePlatform } from '@/platform/PlatformProvider';
import { cn } from '@/lib/utils';

/**
 * Shown when the platform is not in normal running.
 *
 * Staging exists so nobody mistakes a test system for the real one and
 * scans a shift into it. Maintenance tells a factory why saving has stopped
 * — without it, a read-only system looks like a fault.
 */
export function StageBanner() {
  const { settings } = usePlatform();
  if (settings.stage === 'PRODUCTION') return null;

  const maintenance = settings.stage === 'MAINTENANCE';

  return (
    <div
      className={cn(
        'no-print andon border-b px-4 py-2.5 text-sm sm:px-6',
        maintenance
          ? 'border-signal-red/50 bg-signal-red/15 text-signal-red'
          : 'border-signal-amber/50 bg-signal-amber/15 text-signal-amber',
      )}
      role="status"
    >
      <span className="font-display uppercase tracking-[0.06em]">
        {maintenance ? 'Maintenance' : 'Test system'}
      </span>
      <span className="ml-2 text-ink/70">
        {maintenance
          ? settings.maintenanceMessage
          : 'This is not the live system. Anything recorded here is not real production.'}
      </span>
    </div>
  );
}
