import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'bad';
}

/**
 * Diagnostics.
 *
 * Firestore refuses a write with one message whatever the reason, so
 * "missing or insufficient permissions" could be a licence limit, a role, an
 * expiry or a counter that has drifted from reality. Guessing between them
 * from the outside wastes a support call each time.
 *
 * This shows all four at once, including the counters *and* a real count of
 * the documents, so a mismatch between them is visible rather than inferred.
 */
export function Diagnostics() {
  const { profile, licence, licenceDoc, usage, capabilities, isVendorAdmin, effectiveTenantId } =
    useAuth();
  const [actual, setActual] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);

  async function count() {
    if (!db || !profile) return;
    setBusy(true);
    try {
      const names = ['factories', 'modules', 'users'] as const;
      const snaps = await Promise.all(
        names.map((name) =>
          getDocs(query(collection(db!, name), where('tenantId', '==', effectiveTenantId))),
        ),
      );
      setActual(Object.fromEntries(names.map((name, i) => [name, snaps[i]?.size ?? 0])));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void count();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTenantId]);

  if (!profile) return null;

  const account: Row[] = [
    { label: 'Signed in as', value: profile.username ?? profile.email },
    {
      label: 'Role',
      value: profile.role.replace('_', ' '),
      // Only a system admin may create a factory.
      tone: profile.role === 'SYSTEM_ADMIN' ? 'ok' : 'warn',
    },
    { label: 'Organisation id', value: effectiveTenantId ?? profile.tenantId },
    { label: 'Capabilities', value: String(capabilities.length) },
    { label: 'Vendor access', value: isVendorAdmin ? 'yes' : 'no' },
  ];

  const lic: Row[] = [
    {
      label: 'Licence status',
      value: licence.status,
      tone: licence.canWrite ? 'ok' : 'bad',
    },
    {
      label: 'Days remaining',
      value: licence.daysRemaining === null ? '—' : String(licence.daysRemaining),
    },
    { label: 'Can save changes', value: licence.canWrite ? 'yes' : 'no — read only', tone: licence.canWrite ? 'ok' : 'bad' },
  ];

  const limits = licenceDoc?.limits;

  const compare = (key: 'factories' | 'modules' | 'users', limitKey: 'maxFactories' | 'maxModules' | 'maxUsers'): Row => {
    const counted = usage?.[key];
    const real = actual?.[key];
    const limit = limits?.[limitKey];
    const drifted = counted !== undefined && real !== undefined && counted !== real;
    const full = typeof limit === 'number' && (counted ?? 0) >= limit;

    return {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value:
        `counter ${counted ?? '—'} · actually ${real ?? '—'} · licensed ` +
        `${typeof limit === 'number' ? limit : 'unlimited'}` +
        (drifted ? '  ← counter does not match' : full ? '  ← at the limit' : ''),
      tone: drifted ? 'bad' : full ? 'warn' : 'ok',
    };
  };

  return (
    <Card>
      <CardBody className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Diagnostics</p>
          <Button size="sm" variant="ghost" onClick={count} disabled={busy}>
            {busy ? 'Counting' : 'Refresh'}
          </Button>
        </div>

        <p className="max-w-prose text-sm text-muted">
          If something cannot be saved, the reason is almost always on this page. Send a
          screenshot of it to your supplier and they can tell you immediately.
        </p>

        <Section title="Account" rows={account} />
        <Section title="Licence" rows={lic} />
        <Section
          title="Usage"
          rows={[compare('factories', 'maxFactories'), compare('modules', 'maxModules'), compare('users', 'maxUsers')]}
        />

        {!usage && (
          <p className="andon text-signal-red rounded border border-signal-red/40 p-3 text-sm">
            No usage record exists for this organisation, so nothing new can be created. Your
            supplier needs to run “Rebuild counters”.
          </p>
        )}

        {profile.role !== 'SYSTEM_ADMIN' && (
          <p className="andon text-signal-amber rounded border border-signal-amber/40 p-3 text-sm">
            Creating a factory needs the system administrator role. This account is {profile.role.replace('_', ' ').toLowerCase()}.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{title}</p>
      <div className="space-y-0">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex flex-wrap justify-between gap-x-4 border-b border-line py-1.5 text-sm last:border-0"
          >
            <span className="text-muted">{r.label}</span>
            <span
              className={cn(
                'font-mono',
                r.tone === 'bad' && 'text-signal-red',
                r.tone === 'warn' && 'text-signal-amber',
                r.tone === 'ok' && 'text-ink',
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
