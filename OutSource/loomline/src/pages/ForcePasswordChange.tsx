import { useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { changeOwnPassword, checkPassword } from '@/lib/passwords';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Shown instead of the application when an account must set a new password.
 *
 * It replaces every screen rather than sitting on top of one, because a
 * temporary password handed over on a slip of paper has usually been seen by
 * more than one person, and letting someone dismiss the prompt and carry on
 * scanning defeats it.
 */
export function ForcePasswordChange() {
  const { profile, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = next ? checkPassword(next, profile?.username) : null;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current && strength?.ok && !mismatch && confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changeOwnPassword(current, next);
      // The auth listener picks up the cleared flag and the app continues.
    } catch (err) {
      setError((err as Error).message);
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
        <div className="mb-6">
          <p className="eyebrow text-white/40">Before you continue</p>
          <p className="mt-1 font-display text-2xl uppercase tracking-[0.04em] text-white leading-tight">
            Choose your own password
          </p>
          <p className="mt-2 text-sm text-white/50">
            The one you were given is temporary and other people have seen it.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded border border-navy-700 bg-navy-900 p-5">
          <div>
            <label className="eyebrow mb-1.5 block text-white/50">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className={field}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div>
            <label className="eyebrow mb-1.5 block text-white/50">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              className={field}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            {strength && !strength.ok && (
              <ul className="mt-1.5 space-y-0.5">
                {strength.problems.map((p) => (
                  <li key={p} className="text-xs text-signal-amber">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="eyebrow mb-1.5 block text-white/50">Repeat new password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              className={cn(field, mismatch && 'border-signal-red')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && <p className="mt-1 text-xs text-signal-red">These do not match.</p>}
          </div>

          {error && (
            <p className="andon text-signal-red border border-signal-red/40 bg-signal-red/10 p-3 text-sm">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !ready}>
            {busy ? 'Saving' : 'Set password and continue'}
          </Button>

          <button
            type="button"
            onClick={signOut}
            className="w-full text-center text-xs text-white/40 hover:text-white/70"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
