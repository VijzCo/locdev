import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { SettingsScreen } from './SettingsScreen';
import { PageHeader } from '@/pages/Placeholder';
import { EmptyState } from '@/components/common/States';
import { cn } from '@/lib/utils';
import type { Factory } from '@/types/domain';

/**
 * Organisation-wide settings — the customer's own baseline, applying to
 * every factory they run. This sits above factory settings and below the
 * built-in defaults that ship with the product.
 */
export function GlobalSettings() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <SettingsScreen
      title="Global settings"
      description="Applies to every factory in your organisation unless a factory overrides it."
      level="TENANT"
      scopeId={profile.tenantId}
      scope={{}}
    />
  );
}

/** Per-factory settings, with an inheritance indicator on every field. */
export function FactorySettings() {
  const { profile, demoMode } = useAuth();
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) return;
    return onSnapshot(
      query(collection(db, 'factories'), where('tenantId', '==', profile.tenantId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Factory);
        setFactories(list);
        setSelected((cur) => cur ?? list[0]?.id ?? null);
      },
    );
  }, [profile?.tenantId, demoMode]);

  if (factories.length === 0) {
    return (
      <>
        <PageHeader
          title="Factory settings"
          description="Settings for one factory, overriding your organisation defaults."
        />
        <div className="p-4 sm:p-6">
          <EmptyState title="Add a factory first — master data, factories" />
        </div>
      </>
    );
  }

  const factoryId = selected ?? factories[0]!.id;

  return (
    <>
      {factories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface px-4 py-3 sm:px-6">
          {factories.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={cn(
                'h-9 rounded border px-3 font-display text-sm uppercase tracking-[0.04em]',
                f.id === factoryId
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <SettingsScreen
        title="Factory settings"
        description="Overrides your organisation defaults for this factory only."
        level="FACTORY"
        scopeId={factoryId}
        scope={{ factoryId }}
      />
    </>
  );
}
