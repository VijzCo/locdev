import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with thousands separators and configurable decimals */
export function fmtNumber(value: number | undefined | null, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a currency value. Currency code comes from tenant settings. */
export function fmtCurrency(
  value: number | undefined | null,
  currency = 'USD',
  decimals = 2
): string {
  if (value == null || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${currency} ${fmtNumber(value, decimals)}`;
  }
}

/** Format a percentage (input as decimal: 0.65 → "65.0%") */
export function fmtPct(value: number | undefined | null, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format minutes as "1m 30s" or "0.45 min" depending on context */
export function fmtMinutes(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value < 1) {
    return `${value.toFixed(3)} min`;
  }
  const whole = Math.floor(value);
  const seconds = Math.round((value - whole) * 60);
  return `${whole}m ${seconds}s`;
}
