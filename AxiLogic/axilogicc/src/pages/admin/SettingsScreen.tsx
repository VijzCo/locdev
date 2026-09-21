import { useMemo, useState } from 'react';
import { ConfigField } from '@/components/config/ConfigField';
import { useConfig, type ConfigContextScope } from '@/config/ConfigProvider';
import {
  DEFAULTS,
  FIELDS,
  GROUP_ORDER,
  fieldsForScope,
  type ConfigKey,
  type ConfigValues,
  type ScopeLevel,
} from '@/config/schema';
import { validateConfig } from '@/config/resolve';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description: string;
  level: ScopeLevel;
  scopeId: string;
  scope: ConfigContextScope;
}

/**
 * One screen serves every configuration level. Which keys appear is decided
 * by each field's declared scopes, so a new setting is available at the
 * right levels the moment it is added to the schema.
 */
export function SettingsScreen({ title, description, level, scopeId, scope }: Props) {
  const { resolve } = useConfig();
  const { canWrite } = useAuth();
  const [group, setGroup] = useState<string | null>(null);

  const keys = useMemo(() => fieldsForScope(level), [level]);

  const groups = useMemo(() => {
    const present = new Set(keys.map((k) => FIELDS[k].group));
    return GROUP_ORDER.filter((g) => present.has(g));
  }, [keys]);

  const activeGroup = group ?? groups[0] ?? '';

  /* Validation runs against the fully resolved set, not just the overrides
     on this screen — a factory-level minimum has to make sense against a
     maximum that may still be inherited from the organisation. */
  const resolved = useMemo(() => {
    // Built by iterating a heterogeneous record, so the accumulator is
    // widened while filling and narrowed once complete. Every key in
    // DEFAULTS is visited, so the result is total.
    const out: Record<string, unknown> = {};
    (Object.keys(DEFAULTS) as ConfigKey[]).forEach((k) => {
      out[k] = resolve(k, scope).value;
    });
    return out as unknown as ConfigValues;
  }, [resolve, scope]);

  const errors = useMemo(() => validateConfig({}, resolved), [resolved]);

  const readOnly = !canWrite('settings.manage');

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="p-4 sm:p-6">
        {readOnly && (
          <p className="andon text-signal-amber mb-4 rounded border border-line bg-surface p-3 text-sm">
            You can see these settings but not change them.
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                'h-9 rounded border px-3 font-display text-sm uppercase tracking-[0.04em]',
                g === activeGroup
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <Card className="max-w-3xl">
          <CardBody className="pt-2">
            {keys
              .filter((k) => FIELDS[k].group === activeGroup)
              .map((k) => (
                <ConfigField
                  key={k}
                  configKey={k}
                  level={level}
                  scopeId={scopeId}
                  scope={scope}
                  error={errors[k]}
                  readOnly={readOnly}
                />
              ))}
          </CardBody>
        </Card>

        <p className="mt-4 max-w-prose text-sm text-muted">
          Values shown as “From Organisation” or “Built-in default” are inherited. Changing one
          here creates an override that applies to this level and everything below it. Clearing an
          override returns the value to whatever it inherits.
        </p>
      </div>
    </>
  );
}
