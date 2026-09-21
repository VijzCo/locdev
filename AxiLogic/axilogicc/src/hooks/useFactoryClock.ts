import { useEffect, useState } from 'react';

export interface FactoryClock {
  /** Current instant, refreshed on a ticking interval. */
  now: Date;
  /** Factory-local wall time, formatted. */
  time: string;
  date: string;
  /** Minutes from factory-local midnight. Drives slot resolution. */
  minuteOfDay: number;
  timezone: string;
}

/**
 * Sections 15 and 34 both insist the active production slot must update as
 * time passes rather than being read once at page load. This hook is the
 * single source of factory time for the whole application; nothing else
 * calls `new Date()` to decide what slot it is.
 *
 * Ticks every 10s by default — enough to move a slot boundary promptly
 * without re-rendering dashboards every second.
 */
export function useFactoryClock(timezone = 'UTC', intervalMs = 10_000): FactoryClock {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(now);

  return {
    now,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    date,
    minuteOfDay: hour * 60 + minute,
    timezone,
  };
}
