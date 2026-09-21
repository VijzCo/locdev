import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { cn } from '@/lib/utils';
import type { ProductionStage, Style } from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

const STAGES: ProductionStage[] = ['RM_IN', 'CUTTING', 'SEWING', 'FINISHING', 'PACKING'];

const blank = (): Omit<Style, 'id' | 'tenantId'> => ({
  code: '',
  description: '',
  smv: 0,
  colours: [],
  sizes: [],
  routeStages: ['CUTTING', 'SEWING'],
  active: true,
});

/**
 * Styles carry the SMV that every target and efficiency figure depends on
 * (decision Q9: one SMV per style, no per-stage breakdown), plus the colour
 * and size lists that purchase order lines are built from.
 */
export function Styles() {
  const { items, create, update, remove } = useTenantCollection<Style>('styles');
  const { canWrite } = useAuth();
  const [draft, setDraft] = useState<(Partial<Style> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const editable = canWrite('master.manage');

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      if (draft.id) {
        const { id, ...rest } = draft;
        await update(id, rest);
      } else {
        await create(draft as never);
      }
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Styles"
        description="Garment styles, their SMV, and the colours and sizes they are ordered in."
      />

      <div className="space-y-4 p-4 sm:p-6">
        {editable && !draft && (
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setDraft(blank())}>
              Add style
            </Button>
          </div>
        )}

        {draft && (
          <Card>
            <CardBody className="space-y-4 pt-4">
              <p className="eyebrow">{draft.id ? 'Edit style' : 'New style'}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="eyebrow mb-1.5 block">Code</label>
                  <input
                    className={input}
                    value={draft.code ?? ''}
                    placeholder="ST-1001"
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow mb-1.5 block">Description</label>
                  <input
                    className={input}
                    value={draft.description ?? ''}
                    placeholder="Long sleeve polo"
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">SMV</label>
                  <input
                    className={input}
                    type="number"
                    step="0.01"
                    value={draft.smv ?? 0}
                    onChange={(e) => setDraft({ ...draft, smv: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Standard minute value per garment. Every target and efficiency figure divides
                    by this, so a wrong SMV skews the whole factory.
                  </p>
                </div>
              </div>

              <ListEditor
                label="Colours"
                placeholder="Navy"
                values={draft.colours ?? []}
                onChange={(colours) => setDraft({ ...draft, colours })}
              />

              <ListEditor
                label="Sizes"
                placeholder="M"
                values={draft.sizes ?? []}
                onChange={(sizes) => setDraft({ ...draft, sizes })}
              />

              <div>
                <label className="eyebrow mb-1.5 block">Route</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage) => {
                    const on = (draft.routeStages ?? []).includes(stage);
                    const position = (draft.routeStages ?? []).indexOf(stage) + 1;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            routeStages: on
                              ? (draft.routeStages ?? []).filter((s) => s !== stage)
                              : STAGES.filter(
                                  (s) => s === stage || (draft.routeStages ?? []).includes(s),
                                ),
                          })
                        }
                        className={cn(
                          'h-11 rounded border px-3 font-display text-sm uppercase tracking-[0.04em]',
                          on
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-line bg-surface text-muted',
                        )}
                      >
                        {on && <span className="mr-1.5 font-mono text-xs">{position}</span>}
                        {stage.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Bundles must pass these stages in order. Leaving the last one completes the
                  bundle.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={save}
                  disabled={busy || !draft.code || !draft.smv}
                >
                  {busy ? 'Saving' : 'Save style'}
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {items === null ? (
          <LoadingState label="Loading styles" />
        ) : items.length === 0 ? (
          <EmptyState title="No styles yet — add the first one" />
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <Card key={s.id} signal={s.active === false ? 'GREY' : 'GREEN'}>
                <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4">
                  <button
                    className="min-w-[10rem] flex-1 text-left"
                    onClick={() => editable && setDraft({ ...s })}
                  >
                    <span className="block font-display text-lg uppercase tracking-[0.03em] leading-tight">
                      {s.code}
                    </span>
                    <span className="text-xs text-muted">{s.description}</span>
                  </button>
                  <Stat label="SMV" value={String(s.smv)} />
                  <Stat label="Colours" value={String(s.colours?.length ?? 0)} />
                  <Stat label="Sizes" value={String(s.sizes?.length ?? 0)} />
                  <Stat label="Stages" value={String(s.routeStages?.length ?? 0)} />
                  {editable && (
                    <Button variant="ghost" size="icon" onClick={() => remove(s.id)} title="Delete">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="font-mono tnum text-sm">{value}</p>
    </div>
  );
}

/** Chip list with add-on-enter. Used for colours and sizes. */
function ListEditor({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [entry, setEntry] = useState('');

  function add() {
    const v = entry.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setEntry('');
  }

  return (
    <div>
      <label className="eyebrow mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <input
          className={cn(input, 'max-w-xs')}
          value={entry}
          placeholder={placeholder}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button onClick={add}>Add</Button>
      </div>

      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded border border-line bg-raised px-2 py-1 text-sm"
            >
              {v}
              <button
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className="text-faint hover:text-signal-red"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
