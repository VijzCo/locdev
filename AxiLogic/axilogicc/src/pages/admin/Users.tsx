import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { createUserAccount, suggestUsername } from '@/lib/userAdmin';
import { generatePassword, requirePasswordChange, sendReset } from '@/lib/passwords';
import { isUsernameLogin } from '@/lib/loginId';
import { displayLogin, validateUsername } from '@/lib/loginId';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { LimitBanner, useAtLimit } from '@/components/common/LimitBanner';
import { cn } from '@/lib/utils';
import type { AppUser, Role, ScanAccess } from '@/types/domain';

const ROLES: Role[] = ['SYSTEM_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER'];
const SCAN: ScanAccess[] = ['BOTH', 'IN', 'OUT', 'NONE'];

const field =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

export function UsersAdmin() {
  const { profile, canWrite, licence, demoMode } = useAuth();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const writable = canWrite('users.manage');
  const atLimit = useAtLimit('users');


  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) {
      setUsers(demoMode ? [profile as AppUser] : []);
      return;
    }
    return onSnapshot(
      query(collection(db, 'users'), where('tenantId', '==', profile.tenantId)),
      (snap) => setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser)),
      (e) => setError(e.message),
    );
  }, [profile, demoMode]);

  async function toggleDisabled(u: AppUser) {
    if (!db) return;
    await updateDoc(doc(db, 'users', u.uid), { disabled: !u.disabled });
  }

  /*
   * An administrator cannot set someone else's password — Firebase only
   * allows the account holder or an emailed link. So a reset is two things:
   * a link where the account has an address, and otherwise a flag plus a new
   * temporary password handed over in person.
   */
  async function resetPassword(u: AppUser) {
    setError(null);
    try {
      await requirePasswordChange(u.uid);
      if (u.recoveryEmail) {
        await sendReset(u.recoveryEmail);
        setNotice(
          `Reset link sent to ${u.recoveryEmail}. ${u.displayName} must also choose a new password at the next sign-in.`,
        );
        return;
      }
      const temp = generatePassword();
      setNotice(
        `${u.displayName} has no email address, so no link can be sent. Give them this temporary password in person — it is shown once: ${temp}  ` +
          `They will be asked to change it at sign-in. If it does not work, the account has no way back and must be replaced.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title="Users" />
        <div className="p-4 sm:p-6">
          <ErrorState title="Could not load users" detail={error} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts, roles, and which modules and scan directions each person may use."
      />

      <div className="space-y-4 p-4 sm:p-6">
        {!licence.canWrite && (
          <p className="andon text-signal-red rounded border border-line bg-surface p-3 text-sm">
            The licence is read-only, so accounts cannot be changed right now.
          </p>
        )}

        <LimitBanner collection="users" />

        {notice && (
          <div className="andon text-signal-amber rounded border border-signal-amber/40 bg-surface p-3">
            <p className="text-sm text-ink">{notice}</p>
            <button
              onClick={() => setNotice(null)}
              className="mt-2 font-display text-eyebrow uppercase tracking-[0.1em] text-muted"
            >
              Dismiss
            </button>
          </div>
        )}

        {writable && (
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setCreating((v) => !v)} disabled={atLimit && !creating}>
              {creating ? 'Cancel' : 'Add user'}
            </Button>
          </div>
        )}

        {creating && writable && profile && (
          <CreateUserForm tenantId={profile.tenantId} onDone={() => setCreating(false)} />
        )}

        {users === null ? (
          <LoadingState label="Loading users" />
        ) : users.length === 0 ? (
          <EmptyState title="No users yet — add the first one" />
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.uid} signal={u.disabled ? 'GREY' : 'GREEN'}>
                <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4">
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-display text-lg uppercase tracking-[0.03em] leading-tight">
                      {u.displayName}
                    </p>
                    <p className="font-mono text-xs text-muted">
                      {u.username ?? displayLogin(u.email)}
                      {u.recoveryEmail
                        ? ' \u00b7 can reset by email'
                        : isUsernameLogin(u.email)
                          ? ' \u00b7 no reset email'
                          : ''}
                    </p>
                  </div>
                  <Field label="Role" value={u.role.replace('_', ' ')} />
                  <Field label="Scan" value={u.scanAccess} />
                  <Field
                    label="Modules"
                    value={u.scope?.moduleIds?.length ? String(u.scope.moduleIds.length) : 'All'}
                  />
                  {u.mustChangePassword && (
                    <span className="font-display text-eyebrow uppercase tracking-[0.1em] text-signal-amber">
                      Must change password
                    </span>
                  )}

                  {writable && u.uid !== profile?.uid && (
                    <div className="ml-auto flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => resetPassword(u)}>
                        Reset password
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => toggleDisabled(u)}>
                        {u.disabled ? 'Enable' : 'Disable'}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function CreateUserForm({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [scanAccess, setScanAccess] = useState<ScanAccess>('BOTH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestion = useMemo(() => (name ? suggestUsername(name) : ''), [name]);
  const usernameProblem = username ? validateUsername(username) : null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await createUserAccount({
        username: username || suggestion,
        recoveryEmail,
        password,
        displayName: name,
        tenantId,
        role,
        scanAccess,
        scope: { factoryIds: [], departmentIds: [], sectionIds: [], moduleIds: [], shiftIds: [] },
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3 pt-4">
        <p className="eyebrow">New user</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="eyebrow mb-1.5 block">Name</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="eyebrow mb-1.5 block">Username</label>
            <input
              className={cn(field, usernameProblem && 'border-signal-red')}
              value={username}
              placeholder={suggestion}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
            {usernameProblem ? (
              <p className="mt-1 text-xs text-signal-red">{usernameProblem}</p>
            ) : (
              <p className="mt-1 font-mono text-xs text-muted">
                signs in as {username || suggestion || 'username'}
              </p>
            )}
          </div>

          <div>
            <label className="eyebrow mb-1.5 block">Recovery email (optional)</label>
            <input
              className={field}
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Only used to reset a forgotten password. Without one, a forgotten password means
              this account has to be replaced.
            </p>
          </div>
          <div>
            <label className="eyebrow mb-1.5 block">Temporary password</label>
            <div className="flex gap-2">
              <input
                className={field}
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button onClick={() => setPassword(generatePassword())}>Generate</Button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Write it down before saving — it cannot be looked up afterwards. They will be asked
              to choose their own at first sign-in.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow mb-1.5 block">Role</label>
              <select
                className={cn(field, 'appearance-none')}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Scan access</label>
              <select
                className={cn(field, 'appearance-none')}
                value={scanAccess}
                onChange={(e) => setScanAccess(e.target.value as ScanAccess)}
              >
                {SCAN.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <p className="andon text-signal-red border border-signal-red/40 bg-signal-red/10 p-3 text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="primary" onClick={submit} disabled={busy || !name || !password}>
            {busy ? 'Creating' : 'Create user'}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
