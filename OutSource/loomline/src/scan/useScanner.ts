import { useCallback, useEffect, useRef, useState } from 'react';
import { all, oldestPendingMinutes, pruneAcknowledged, type OutboxRecord } from './outbox';

/**
 * Captures a keyboard-wedge barcode scanner.
 *
 * These scanners type the barcode as fast keystrokes and finish with Enter.
 * The distinguishing feature is speed: a human types at maybe 200 ms per
 * character, a scanner at under 30 ms. Buffering on that gap means the
 * screen works with a scanner without an input focused, while still leaving
 * the manual entry box usable for a damaged label.
 */
export function useWedgeScanner(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef('');
  const lastKey = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Let a focused text field have its own keystrokes.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const now = Date.now();
      if (now - lastKey.current > 120) buffer.current = '';
      lastKey.current = now;

      if (e.key === 'Enter') {
        const code = buffer.current.trim();
        buffer.current = '';
        if (code.length >= 3) onScan(code.toUpperCase());
        return;
      }

      if (e.key.length === 1) buffer.current += e.key;
    }

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onScan, enabled]);
}

export interface OutboxStatus {
  records: OutboxRecord[];
  pendingCount: number;
  rejectedCount: number;
  oldestPendingMinutes: number | null;
  refresh: () => Promise<void>;
}

/**
 * Watches the outbox. The pending count is shown permanently on the scan
 * screen — an operator needs to know their last twenty scans have not
 * reached the server, and a supervisor needs to know a tablet has been
 * holding scans for an hour.
 */
export function useOutbox(pollMs = 4000): OutboxStatus {
  const [records, setRecords] = useState<OutboxRecord[]>([]);

  const refresh = useCallback(async () => {
    try {
      const rows = await all();
      setRecords(rows);
      if (rows.filter((r) => r.state === 'ACKNOWLEDGED').length > 40) {
        await pruneAcknowledged();
      }
    } catch {
      // IndexedDB unavailable (private browsing). The scan screen warns.
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return {
    records,
    pendingCount: records.filter((r) => r.state === 'PENDING').length,
    rejectedCount: records.filter((r) => r.state === 'REJECTED').length,
    oldestPendingMinutes: oldestPendingMinutes(records),
    refresh,
  };
}
