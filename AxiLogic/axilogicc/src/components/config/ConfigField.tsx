import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { FIELDS, type ConfigKey, type ScopeLevel } from '@/config/schema';
import { useConfig, type ConfigContextScope } from '@/config/ConfigProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ProductionStage } from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

interface Props {
  configKey: ConfigKey;
  /** The level being edited on this screen. */
  level: ScopeLevel;
  scopeId: string;
  /** Scope used to work out what the value would inherit as. */
  scope: ConfigContextScope;
  error?: string;
  readOnly?: boolean;
}

/**
 * One configurable value. The point of this component is provenance: it
 * always shows where the effective value came from, so an administrator
 * changing a threshold can see whether they are editing their own override
 * or shadowing one set higher up.
 */
export function ConfigField({ configKey, level, scopeId, scope, error, readOnly }: Props) {
  const { resolve, overrideValues, setOverride, clearOverride } = useConfig();
  const meta = FIELDS[configKey];

  const overrides = overrideValues(level, scopeId);
  const hasOverride = overrides[configKey] !== undefined;
  const resolution = resolve(configKey, scope);

  const [draft, setDraft] = useState<unknown>(resolution.value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(resolution.value);
  }, [resolution.value, dirty]);

  async function commit(next: unknown) {
    setDraft(next);
    setDirty(false);
    await setOverride(level, scopeId, configKey, next);
  }

  async function reset() {
    setDirty(false);
    await clearOverride(level, scopeId, configKey);
  }

  return (
    <div className="border-b border-line py-4 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="font-display text-base uppercase tracking-[0.03em]">{meta.label}</label>

        {hasOverride ? (
          <span className="font-display text-eyebrow uppercase tracking-[0.1em] text-accent">
            Set here
          </span>
        ) : (
          <span className="font-display text-eyebrow uppercase tracking-[0.1em] text-muted">
            From {resolution.label}
          </span>
        )}
      </div>

      {meta.help && <p className="mt-1 max-w-prose text-sm text-muted">{meta.help}</p>}

      <div className="mt-2.5 flex items-center gap-2">
        <div className="max-w-md flex-1">
          {meta.control === 'toggle' ? (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => commit(!draft)}
              className={cn(
                'h-11 w-full rounded border px-3 text-left font-display uppercase tracking-[0.04em]',
                draft
                  ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                  : 'border-line bg-surface text-muted',
                readOnly && 'opacity-50',
              )}
            >
              {draft ? 'On' : 'Off'}
            </button>
          ) : meta.control === 'select' ? (
            <select
              className={cn(input, 'appearance-none')}
              value={String(draft)}
              disabled={readOnly}
              onChange={(e) => commit(e.target.value)}
            >
              {meta.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : meta.control === 'stages' ? (
            <StagePicker
              value={(draft as ProductionStage[]) ?? []}
              disabled={readOnly}
              onChange={commit}
            />
          ) : (
            <input
              className={input}
              type={meta.control === 'number' ? 'number' : 'text'}
              value={String(draft ?? '')}
              min={meta.min}
              max={meta.max}
              disabled={readOnly}
              onChange={(e) => {
                setDirty(true);
                setDraft(meta.control === 'number' ? Number(e.target.value) : e.target.value);
              }}
              onBlur={() => dirty && commit(draft)}
            />
          )}
        </div>

        {meta.unit && <span className="text-sm text-muted">{meta.unit}</span>}

        {hasOverride && !readOnly && (
          <Button variant="ghost" size="icon" onClick={reset} title="Clear this override">
            <RotateCcw size={16} />
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-signal-red">{error}</p>}
    </div>
  );
}

/** Ordered stage list. Order is meaningful — it is the route. */
function StagePicker({
  value,
  disabled,
  onChange,
}: {
  value: ProductionStage[];
  disabled?: boolean;
  onChange: (next: ProductionStage[]) => void;
}) {
  const ALL: ProductionStage[] = ['RM_IN', 'CUTTING', 'SEWING', 'FINISHING', 'PACKING'];

  return (
    <div className="flex flex-wrap gap-2">
      {ALL.map((stage) => {
        const on = value.includes(stage);
        const position = value.indexOf(stage) + 1;
        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(
                on
                  ? value.filter((s) => s !== stage)
                  : // Keeps the canonical production order rather than
                    // click order, so the route is always sensible.
                    ALL.filter((s) => s === stage || value.includes(s)),
              )
            }
            className={cn(
              'h-11 rounded border px-3 font-display text-sm uppercase tracking-[0.04em]',
              on ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-muted',
              disabled && 'opacity-50',
            )}
          >
            {on && <span className="mr-1.5 font-mono text-xs">{position}</span>}
            {stage.replace('_', ' ')}
          </button>
        );
      })}
    </div>
  );
}
