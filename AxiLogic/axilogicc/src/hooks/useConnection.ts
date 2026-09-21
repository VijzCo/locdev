import { useEffect, useState } from 'react';

export type ConnectionState = 'ONLINE' | 'OFFLINE';

/**
 * Section 30 requires the connection state to be visible at all times, not
 * inferred. Increment 7 extends this with the outbox depth so the operator
 * sees "Offline — 3 scans pending" rather than a bare status word.
 */
export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online ? 'ONLINE' : 'OFFLINE';
}
