import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a metric for display. Renders an em dash for null or non-finite
 * input so that NaN and Infinity can never reach the screen (Part H).
 */
export function formatMetric(
  value: number | null | undefined,
  opts: { decimals?: number; suffix?: string } = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const { decimals = 0, suffix = '' } = opts;
  return (
    value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix
  );
}

/** Minutes from midnight to a zero-padded clock string. */
export function minutesToClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
