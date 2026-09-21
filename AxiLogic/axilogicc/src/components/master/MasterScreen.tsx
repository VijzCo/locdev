import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { LimitBanner, useAtLimit } from '@/components/common/LimitBanner';
import { explainWriteFailure, type LimitedCollection } from '@/lib/tenantUsage';
import { cn } from '@/lib/utils';

export interface FieldSpec {
  name: string;
  label: string;
  control: 'text' | 'number' | 'toggle' | 'select' | 'derived';
  /** Resolved at render so parent options stay live. */
  options?: { value: string; label: string }[];
  required?: boolean;
  help?: string;
  placeholder?: string;
  defaultValue?: unknown;
  /**
   * Fields this choice implies. Picking a section determines its department
   * and factory, so asking for all three invites the mismatch that made
   * these forms wrong — and made the option lists easy to build from the
   * wrong collection.
   */
  derive?: (value: string) => Record<string, unknown>;
  /** For `derived`: how to show the value that was filled in. */
  displayValue?: (record: Record<string, unknown>) => string;
}

interface Props {
  title: string;
  description: string;
  collectionName: string;
  fields: FieldSpec[];
  /** Rendered under the name in each row. */
  subtitle?: (record: Record<string, unknown>) => string;
  emptyMessage: string;
}

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

/**
 * Four of the five master-data screens differ only in their fields, so they
 * share this component and describe themselves declaratively. Styles has its
 * own screen because its list-valued fields need real editors.
 */
export function MasterScreen({
  title,
  description,
  collectionName,
  fields,
  subtitle,
  emptyMessage,
}: Props) {
  const { items, error, create, update, remove } = useTenantCollection<
    { id: string } & Record<string, unknown>
  >(collectionName);
  const { canWrite } = useAuth();
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error2, setError2] = useState<string | null>(null);

  const limited = ['factories', 'modules'].includes(collectionName);
  const atLimit = useAtLimit(collectionName as LimitedCollection);
  const editable = canWrite('master.manage');

  function startNew() {
    const blank: Record<string, unknown> = { active: true };
    fields.forEach((f) => {
      blank[f.name] = f.defaultValue ?? (f.control === 'number' ? 0 : f.control === 'toggle' ? true : '');
    });
    setDraft(blank);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError2(null);
    try {
      if (draft.id) {
        const { id, ...rest } = draft;
        await update(id as string, rest);
      } else {
        await create(draft as never);
      }
      setDraft(null);
    } catch (e) {
      setError2(
        limited
          ? explainWriteFailure(e, collectionName as LimitedCollection)
          : ((e as Error).message ?? 'Could not save.'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title={title} />
        <div className="p-4 sm:p-6">
          <ErrorState title={`Could not load ${title.toLowerCase()}`} detail={error} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="space-y-4 p-4 sm:p-6">
        {limited && <LimitBanner collection={collectionName as LimitedCollection} />}

        {error2 && !draft && (
          <p className="andon text-signal-red rounded border border-signal-red/40 bg-surface p-3 text-sm">
            {error2}
          </p>
        )}

        {editable && !draft && (
          <div className="flex justify-end">
            <Button variant="primary" onClick={startNew} disabled={atLimit}>
              Add
            </Button>
          </div>
        )}

        {draft && (
          <Card>
            <CardBody className="space-y-3 pt-4">
              <p className="eyebrow">{draft.id ? 'Edit' : 'New'}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label className="eyebrow mb-1.5 block">{f.label}</label>

                    {f.control === 'toggle' ? (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, [f.name]: !draft[f.name] })}
                        className={cn(
                          'h-11 w-full rounded border px-3 text-left font-display uppercase tracking-[0.04em]',
                          draft[f.name]
                            ? 'border-signal-green/50 bg-signal-green/10 text-signal-green'
                            : 'border-line bg-surface text-muted',
                        )}
                      >
                        {draft[f.name] ? 'Active' : 'Inactive'}
                      </button>
                    ) : f.control === 'derived' ? (
                      <div
                        className={cn(
                          input,
                          'flex items-center bg-raised text-muted',
                        )}
                      >
                        {f.displayValue?.(draft) || '—'}
                      </div>
                    ) : f.control === 'select' ? (
                      <select
                        className={cn(input, 'appearance-none')}
                        value={String(draft[f.name] ?? '')}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.name]: e.target.value,
                            ...(f.derive?.(e.target.value) ?? {}),
                          })
                        }
                      >
                        <option value="">Select…</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={input}
                        type={f.control === 'number' ? 'number' : 'text'}
                        value={String(draft[f.name] ?? '')}
                        placeholder={f.placeholder}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.name]:
                              f.control === 'number' ? Number(e.target.value) : e.target.value,
                          })
                        }
                      />
                    )}

                    {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
                  </div>
                ))}
              </div>

              {error2 && (
                <p className="andon text-signal-red rounded border border-signal-red/40 p-3 text-sm">
                  {error2}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={save}
                  disabled={
                    busy ||
                    fields.some((f) => f.required && f.control !== 'derived' && !draft[f.name])
                  }
                >
                  {busy ? 'Saving' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {items === null ? (
          <LoadingState label={`Loading ${title.toLowerCase()}`} />
        ) : items.length === 0 ? (
          <EmptyState title={emptyMessage} />
        ) : (
          <div className="space-y-2">
            {items.map((rec) => (
              <Card key={rec.id} signal={rec.active === false ? 'GREY' : 'GREEN'}>
                <CardBody className="flex flex-wrap items-center gap-4 pt-4">
                  <button
                    className="min-w-[10rem] flex-1 text-left"
                    onClick={() => editable && setDraft({ ...rec })}
                  >
                    <span className="block font-display text-lg uppercase tracking-[0.03em] leading-tight">
                      {String(rec.code ?? rec.name ?? rec.id)}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {subtitle ? subtitle(rec) : String(rec.name ?? '')}
                    </span>
                  </button>

                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={async () => {
                        setError2(null);
                        try {
                          await remove(rec.id);
                        } catch (e) {
                          setError2(
                            limited
                              ? explainWriteFailure(e, collectionName as LimitedCollection)
                              : ((e as Error).message ?? 'Could not delete.'),
                          );
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
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
