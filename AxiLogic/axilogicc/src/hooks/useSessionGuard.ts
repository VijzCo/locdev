import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { usePlatform } from '@/platform/PlatformProvider';

export type SessionEndReason = 'IDLE' | 'SIGNED_IN_ELSEWHERE' | null;

/**
 * Session security.
 *
 * Two controls, both set by the vendor and applied to every customer.
 *
 * **Single session.** A factory terminal is shared, and credentials get
 * passed around. Writing the current session id to `sessions/{uid}` and
 * watching it means a second sign-in ends the first, so an account is one
 * person at a time rather than however many know the password.
 *
 * **Idle timeout.** Terminals are left signed in on the floor at the end of
 * a shift. This signs them out after a period of no activity, with a warning
 * first so nobody loses a scan mid-bundle.
 *
 * Neither is a substitute for the security rules. Both are about the
 * ordinary carelessness of a busy production floor rather than an attacker.
 */
export function useSessionGuard() {
  const { profile, signOut, phase } = useAuth();
  const { settings } = usePlatform();
  const [endedBecause, setEndedBecause] = useState<SessionEndReason>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Identifies this browser tab for the lifetime of the session.
  const sessionId = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
  );

  const lastActivity = useRef(Date.now());
  const active = phase === 'READY' && Boolean(profile);

  const { idleTimeoutMinutes, idleWarningSeconds, singleSession } = settings.security;

  /* ---------------- single session ---------------- */

  useEffect(() => {
    if (!active || !db || !profile || !singleSession) return;

    // Claim the session, then watch for someone else claiming it.
    void setDoc(doc(db, 'sessions', profile.uid), {
      sessionId: sessionId.current,
      startedAt: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });

    return onSnapshot(doc(db, 'sessions', profile.uid), (snap) => {
      const current = snap.data()?.sessionId as string | undefined;
      if (current && current !== sessionId.current) {
        setEndedBecause('SIGNED_IN_ELSEWHERE');
        void signOut();
      }
    });
  }, [active, profile, singleSession, signOut]);

  /* ---------------- idle timeout ---------------- */

  const bump = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!active || idleTimeoutMinutes <= 0) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const timer = window.setInterval(() => {
      const idleMs = Date.now() - lastActivity.current;
      const limitMs = idleTimeoutMinutes * 60_000;
      const remaining = Math.ceil((limitMs - idleMs) / 1000);

      if (remaining <= 0) {
        setEndedBecause('IDLE');
        void signOut();
      } else if (remaining <= idleWarningSeconds) {
        setSecondsLeft(remaining);
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, [active, idleTimeoutMinutes, idleWarningSeconds, bump, signOut]);

  return {
    endedBecause,
    secondsLeft,
    dismissWarning: bump,
    clearEndedReason: () => setEndedBecause(null),
  };
}
