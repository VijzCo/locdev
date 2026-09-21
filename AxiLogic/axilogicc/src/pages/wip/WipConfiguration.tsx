import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { ConfigField } from '@/components/config/ConfigField';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/States';
import { StatusChip } from '@/components/ui/Metric';
import { cn } from '@/lib/utils';
import type { ConfigKey } from '@/config/schema';
import type { Module } from '@/types/domain';

const WIP_KEYS: ConfigKey[] = ['wip.min', 'wip.reorder', 'wip.max'];

/**
 * §13 asked for WIP thresholds configurable per module rather than
 * hardcoded, with a clear rule when several configurations exist. That rule
 * is the precedence chain in `config/resolve.ts` — this screen is just the
 * module-level view of it, and every field states what it would inherit.
 */
export function WipConfiguration() {
  const { profile, demoMode } = useAuth();
  const { resolve } = useConfig();
  const [modules, setModules] = useState<Module[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) return;
    return onSnapshot(
      query(collection(db, 'modules'), where('tenantId', '==', profile.tenantId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Module);
        setModules(list);
        setSelected((cur) => cur ?? list[0]?.id ?? null);
      },
    );
  }, [profile?.tenantId, demoMode]);

  const active = useMemo(
    () => modules.find((m) => m.id === selected) ?? null,
    [modules, selected],
  );

  if (modules.length === 0) {
    return (
      <>
        <PageHeader
          title="WIP configuration"
          description="Thresholds that decide when a module shows green, amber or red."
        />
        <div className="p-4 sm:p-6">
          <EmptyState title="Add modules first — master data, modules" />
        </div>
      </>
    );
  }

  const scope = active
    ? {
        factoryId: active.factoryId,
        departmentId: active.departmentId,
        sectionId: active.sectionId,
        moduleId: active.id,
      }
    : {};

  return (
    <>
      <PageHeader
        title="WIP configuration"
        description="Thresholds that decide when a module shows green, amber or red."
      />

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-1.5">
          {modules.map((m) => {
            const max = resolve('wip.max', {
              factoryId: m.factoryId,
              departmentId: m.departmentId,
              sectionId: m.sectionId,
              moduleId: m.id,
            });
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={cn(
                  'w-full rounded border px-3 py-2.5 text-left',
                  m.id === selected
                    ? 'border-accent bg-accent/10'
                    : 'border-line bg-surface hover:border-muted',
                )}
              >
                <span className="block font-display text-base uppercase tracking-[0.03em]">
                  {m.code}
                </span>
                <span className="font-mono text-xs text-muted">
                  max {max.value} · {max.isDefault ? 'default' : max.label.toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>

        {active && (
          <div className="space-y-4">
            <Card signal="GREEN">
              <CardBody className="pt-4">
                <p className="eyebrow">How the bands work</p>
                <div className="mt-3 space-y-2 text-sm">
                  <Band status="RED" text="Above maximum — over WIP, stop feeding this module" />
                  <Band status="GREEN" text="Between reorder and maximum — normal" />
                  <Band status="AMBER" text="Between minimum and reorder — feed it soon" />
                  <Band status="GREY" text="Below minimum, or no plan today" />
                </div>
              </CardBody>
            </Card>

            <Card className="max-w-2xl">
              <CardBody className="pt-2">
                {WIP_KEYS.map((k) => (
                  <ConfigField
                    key={k}
                    configKey={k}
                    level="MODULE"
                    scopeId={active.id}
                    scope={scope}
                  />
                ))}
              </CardBody>
            </Card>

            <p className="max-w-prose text-sm text-muted">
              A module with no override of its own inherits from its section, then its department,
              then the factory, then your organisation defaults. Each field above says which one it
              is currently using.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Band({ status, text }: { status: 'RED' | 'GREEN' | 'AMBER' | 'GREY'; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <StatusChip status={status} label="" />
      <span className="text-muted">{text}</span>
    </div>
  );
}
