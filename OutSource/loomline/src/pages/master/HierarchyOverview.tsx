import { useState } from 'react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { clearDemoData, seedDemoData } from '@/lib/seedDemoData';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/States';
import type { Department, Factory, Module, Section } from '@/types/domain';

/**
 * The whole hierarchy on one screen. Useful for checking that departments,
 * sections and modules were attached to the right parents — a mistake that
 * is otherwise invisible until production scans start going to the wrong
 * place.
 */
export function HierarchyOverview() {
  const { profile, canWrite } = useAuth();
  const { items: factories } = useTenantCollection<Factory>('factories');
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: sections } = useTenantCollection<Section>('sections');
  const { items: modules } = useTenantCollection<Module>('modules');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editable = canWrite('master.manage');
  const empty = (factories?.length ?? 0) === 0;

  async function seed() {
    if (!profile) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await seedDemoData(profile.tenantId);
      setMessage(
        `Added ${r.factories} factories, ${r.departments} departments, ${r.sections} sections, ${r.modules} modules and ${r.styles} styles.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!profile) return;
    setBusy(true);
    setMessage(null);
    try {
      const n = await clearDemoData(profile.tenantId);
      setMessage(n === 0 ? 'No demo records found.' : `Removed ${n} demo records.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Factory hierarchy"
        description="Factory, department, section, module. Check parents here before bundles start moving."
      />

      <div className="space-y-4 p-4 sm:p-6">
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={seed} disabled={busy}>
              {busy ? 'Working' : 'Load demo data'}
            </Button>
            <Button onClick={clear} disabled={busy}>
              Remove demo data
            </Button>
            <p className="max-w-prose text-sm text-muted">
              Demo records are tagged, so removing them never touches real data. They do count
              against your licence while they exist — remove them before setting up your real
              factory and the allowance comes back.
            </p>
          </div>
        )}

        {message && (
          <p className="andon text-signal-green rounded border border-line bg-surface p-3 text-sm">
            {message}
          </p>
        )}

        {empty ? (
          <EmptyState title="Nothing set up yet — load the demo data or add a factory" />
        ) : (
          <div className="space-y-3">
            {(factories ?? []).map((f) => (
              <Card key={f.id} signal={f.active === false ? 'GREY' : 'GREEN'}>
                <CardBody className="pt-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl uppercase tracking-[0.03em]">
                      {f.code}
                    </span>
                    <span className="text-sm text-muted">{f.name}</span>
                    <span className="ml-auto font-mono text-xs text-muted">{f.timezone}</span>
                  </div>

                  <div className="mt-3 space-y-3 border-l border-line pl-4">
                    {(departments ?? [])
                      .filter((d) => d.factoryId === f.id)
                      .map((d) => (
                        <div key={d.id}>
                          <p className="font-display text-base uppercase tracking-[0.03em]">
                            {d.name}
                            <span className="ml-2 font-mono text-xs text-muted">{d.stage}</span>
                          </p>

                          <div className="mt-1.5 space-y-1.5 border-l border-line pl-4">
                            {(sections ?? [])
                              .filter((s) => s.departmentId === d.id)
                              .map((s) => (
                                <div key={s.id}>
                                  <p className="text-sm text-muted">{s.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-1.5 pl-3">
                                    {(modules ?? [])
                                      .filter((m) => m.sectionId === s.id)
                                      .map((m) => (
                                        <span
                                          key={m.id}
                                          className="rounded border border-line bg-raised px-2 py-1 font-mono text-xs"
                                        >
                                          {m.code}
                                          <span className="ml-1.5 text-faint">
                                            {m.operatorCount}
                                          </span>
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
