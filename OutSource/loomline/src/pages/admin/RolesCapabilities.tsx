import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { CAPABILITIES, ROLE_CAPABILITIES, type Capability } from '@/lib/capabilities';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/domain';

const ROLES: Role[] = ['SYSTEM_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER'];

const LABEL: Record<Capability, string> = {
  'dashboard.view': 'Dashboards',
  'scan.in': 'Scan in',
  'scan.out': 'Scan out',
  'plan.manage': 'Production planning',
  'wip.configure': 'WIP configuration',
  'master.manage': 'Master data',
  'reports.view': 'Reports',
  'users.manage': 'User management',
  'settings.manage': 'Settings',
};

/**
 * §31's capability matrix, editable rather than hardcoded. SYSTEM_ADMIN is
 * fixed at full access — allowing it to be edited would let an
 * administrator lock themselves out of the screen that unlocks it.
 */
export function RolesCapabilities() {
  const { profile, canWrite, demoMode } = useAuth();
  const [matrix, setMatrix] = useState<Record<string, Capability[]>>(ROLE_CAPABILITIES);
  const [saving, setSaving] = useState<string | null>(null);

  const editable = canWrite('users.manage');

  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) return;
    return onSnapshot(doc(db, 'roles', profile.tenantId), (snap) => {
      if (snap.exists()) {
        setMatrix({ ...ROLE_CAPABILITIES, ...(snap.data().roles ?? {}) });
      }
    });
  }, [profile?.tenantId, demoMode]);

  async function toggle(role: Role, cap: Capability) {
    if (!editable || role === 'SYSTEM_ADMIN') return;
    const current = matrix[role] ?? [];
    const next = current.includes(cap)
      ? current.filter((c) => c !== cap)
      : [...current, cap];

    setMatrix((m) => ({ ...m, [role]: next }));

    if (!db || !profile?.tenantId) return;
    setSaving(role);
    try {
      await setDoc(
        doc(db, 'roles', profile.tenantId),
        { tenantId: profile.tenantId, roles: { [role]: next } },
        { merge: true },
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Roles & capabilities"
        description="What each role can do. Individual users can be given a different set on their own account."
      />

      <div className="p-4 sm:p-6">
        <Card>
          <CardBody className="overflow-x-auto pt-4">
            <table className="w-full min-w-[42rem] border-collapse">
              <thead>
                <tr>
                  <th className="eyebrow border-b border-line px-2 pb-2 text-left">Capability</th>
                  {ROLES.map((r) => (
                    <th key={r} className="border-b border-line px-2 pb-2">
                      <span className="eyebrow block text-center">{r.replace('_', ' ')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap) => (
                  <tr key={cap}>
                    <td className="border-b border-line px-2 py-2.5 text-sm">{LABEL[cap]}</td>
                    {ROLES.map((role) => {
                      const on = (matrix[role] ?? []).includes(cap);
                      const locked = role === 'SYSTEM_ADMIN' || !editable;
                      return (
                        <td key={role} className="border-b border-line px-2 py-1.5 text-center">
                          <button
                            onClick={() => toggle(role, cap)}
                            disabled={locked}
                            aria-label={`${LABEL[cap]} for ${role}`}
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded border',
                              on
                                ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                                : 'border-line bg-surface text-faint',
                              locked ? 'opacity-60' : 'hover:border-muted',
                              saving === role && 'animate-pulse',
                            )}
                          >
                            {on && <Check size={16} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <p className="mt-4 max-w-prose text-sm text-muted">
          System admin is fixed at full access, so an administrator cannot remove the permission
          that lets them fix a mistake on this screen. Changing a role takes effect for its users
          the next time their session loads.
        </p>
      </div>
    </>
  );
}
