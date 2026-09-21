import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useProductionData } from '@/hooks/useProductionData';
import { useConfig } from '@/config/ConfigProvider';
import { acknowledge, evaluateAlerts, loadAcknowledged } from '@/alerts/rules';
import { SIGNAL } from '@/lib/signal';
import { cn } from '@/lib/utils';

/**
 * The alert panel.
 *
 * Alerts are derived from current state rather than stored as notification
 * documents. Writing a row per module per rule would add writes on every
 * dashboard load, need cleaning up, and go stale the moment the underlying
 * problem is fixed — an over-WIP notice still sitting there after the module
 * was fed is worse than no notice.
 *
 * Dismissing an alert silences it on this device for the rest of the day.
 */
export function AlertBell() {
  const { cfg } = useConfig();
  const { views, slot } = useProductionData();
  const [open, setOpen] = useState(false);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAcked(loadAcknowledged(slot.dateKey)), [slot.dateKey]);

  useEffect(() => {
    if (!open) return;
    function away(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const alerts = useMemo(() => {
    const lastCompleted =
      slot.shift && slot.slot ? (slot.slot.index > 0 ? slot.slot.index - 1 : null) : null;

    return evaluateAlerts({
      views,
      settings: {
        overWip: cfg('alerts.overWip'),
        lowWip: cfg('alerts.lowWip'),
        behindTarget: cfg('alerts.behindTarget'),
        forecastShort: cfg('alerts.forecastShort'),
        noOutput: cfg('alerts.noOutput'),
        minElapsedMinutes: cfg('forecast.minElapsedMinutes'),
        behindThresholdPct: cfg('achievement.amberPct'),
      },
      elapsedMinutes: slot.elapsedMinutes,
      lastCompletedSlot: lastCompleted,
      dateKey: slot.dateKey,
      shiftRunning: Boolean(slot.shift),
    }).filter((a) => !acked.has(a.id));
  }, [views, cfg, slot, acked]);

  const critical = alerts.filter((a) => a.severity === 'RED').length;

  function dismiss(id: string) {
    acknowledge(slot.dateKey, id);
    setAcked((prev) => new Set(prev).add(id));
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Alerts (${alerts.length})`}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded transition-colors',
          alerts.length > 0 ? 'text-ink hover:bg-raised' : 'text-muted hover:bg-raised',
        )}
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span
            className={cn(
              'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-sm px-1',
              'font-mono text-[0.625rem] leading-none text-white',
              critical > 0 ? 'bg-signal-red' : 'bg-signal-amber',
            )}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="eyebrow">
              {alerts.length === 0 ? 'Nothing needs attention' : `${alerts.length} to look at`}
            </p>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto scrollbar-slim">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {slot.shift
                  ? 'Every module is running within its limits.'
                  : 'No shift running.'}
              </p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn('andon border-b border-line px-4 py-3 last:border-0', SIGNAL[a.severity].text)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-base uppercase tracking-[0.03em] leading-tight text-ink">
                      {a.title}
                    </p>
                    <button
                      onClick={() => dismiss(a.id)}
                      className="shrink-0 text-faint hover:text-ink"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-muted">{a.detail}</p>
                </div>
              ))
            )}
          </div>

          {alerts.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-xs text-muted">
              Dismissing hides an alert on this device until tomorrow. It returns if the problem
              recurs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
