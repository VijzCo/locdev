import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { usePlatform } from '@/platform/PlatformProvider';
import { resolveLoginIdentifier } from '@/lib/loginId';
import { Button } from '@/components/ui/Button';

/** Firebase codes are not sentences. These are the ones this screen produces. */
function readableError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      // All four mean the same thing to the person standing there, and
      // separating them would tell an attacker which usernames exist.
      return 'That username and password do not match. Check both.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute, then try again.';
    case 'auth/network-request-failed':
      return 'No connection to the server. Signing in needs a network; scanning does not.';
    case 'auth/user-disabled':
      return 'This account has been turned off. Ask your administrator.';
    default:
      return 'Sign-in failed. Try again, or ask your administrator.';
  }
}

/**
 * One field for identity.
 *
 * Nobody on a production floor should type an email address to start a
 * shift, so a username becomes an address behind the scenes. An input
 * containing an @ is passed through as a real address instead, which keeps
 * administrator and vendor accounts — the ones that can reset their own
 * password — working in the same field.
 */
export function Login() {
  const { phase, demoMode } = useAuth();
  const { settings } = usePlatform();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (phase === 'READY') {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard/factory';
    return <Navigate to={from} replace />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!auth) {
      setError('This installation is not connected to a Firebase project yet.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(auth, resolveLoginIdentifier(username), password);
    } catch (err) {
      setError(readableError((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Reset only works for accounts with a real address. Most operators have
   * none, so the message says who to ask rather than pretending an email is
   * on its way.
   */
  async function resetPassword() {
    if (!auth || !username) {
      setError('Enter your username first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, resolveLoginIdentifier(username));
      setNotice('If that account has an email address, a reset link is on its way.');
    } catch {
      setNotice(
        'That account has no email address, so it cannot be reset here. Ask your administrator.',
      );
    } finally {
      setBusy(false);
    }
  }

  const field =
    'h-12 w-full rounded border border-navy-700 bg-navy-800 px-3 text-base text-white ' +
    'placeholder:text-white/30 focus:border-accent';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-display text-3xl uppercase tracking-[0.06em] text-white leading-none">
            {settings.branding.productName}
          </p>
          <p className="eyebrow mt-1.5 text-white/40">Production tracking</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded border border-navy-700 bg-navy-900 p-5">
          <div>
            <label htmlFor="username" className="eyebrow mb-1.5 block text-white/50">
              Username
            </label>
            <input
              id="username"
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
            />
            <p className="mt-1 text-xs text-white/30">
              Or your email address, if your account has one.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="eyebrow mb-1.5 block text-white/50">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>

          {error && (
            <p className="andon text-signal-red border border-signal-red/40 bg-signal-red/10 p-3 text-sm">
              {error}
            </p>
          )}

          {notice && (
            <p className="andon text-signal-amber border border-signal-amber/40 bg-signal-amber/10 p-3 text-sm">
              {notice}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={resetPassword}
            className="w-full text-center text-xs text-white/40 hover:text-white/70"
          >
            Forgotten password
          </button>
        </form>

        {!isFirebaseConfigured && (
          <p className="mt-4 text-center text-sm text-white/40">
            {demoMode
              ? 'Running in demo mode — no Firebase project configured.'
              : 'No Firebase project configured.'}
          </p>
        )}

        {/* Supplier credit, kept quiet: four small squares from the product's
            own status language, then the line. It signs the work without
            competing with the customer's own screen. */}
        {settings.branding.showOnLogin && settings.branding.footerText && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {['12A150', 'E8A317', 'E5484D', '5B7085'].map((c) => (
                <span
                  key={c}
                  className="h-1.5 w-1.5 rounded-[1px]"
                  style={{ backgroundColor: `#${c}` }}
                />
              ))}
            </div>
            <p className="font-display text-eyebrow uppercase tracking-[0.14em] text-white/25">
              {settings.branding.footerText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
