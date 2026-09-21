import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { summarisePlan } from '@/lib/bundleMath';
import { cancelLineBundles, generateBundles } from '@/lib/bundleGeneration';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { cn, formatMetric } from '@/lib/utils';
import type { Factory, PoLine, PurchaseOrder, Style } from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

export function PurchaseOrders() {
  const { profile, canWrite } = useAuth();
  const { items: pos, create, remove } = useTenantCollection<PurchaseOrder>('purchaseOrders');
  const { items: factories } = useTenantCollection<Factory>('factories');
  const [draft, setDraft] = useState<Partial<PurchaseOrder> | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const editable = canWrite('plan.manage');

  async function save() {
    if (!draft?.poNumber || !draft.factoryId) return;
    await create({
      poNumber: draft.poNumber,
      buyer: draft.buyer ?? '',
      factoryId: draft.factoryId,
      status: 'OPEN',
      orderDate: draft.orderDate ?? new Date().toISOString().slice(0, 10),
      shipDate: draft.shipDate ?? '',
    } as never);
    setDraft(null);
  }

  if (!profile) return null;

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Orders, their style and size breakdown, and the bundles generated from them."
      />

      <div className="space-y-4 p-4 sm:p-6">
        {editable && !draft && (
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setDraft({})}>
              New order
            </Button>
          </div>
        )}

        {draft && (
          <Card>
            <CardBody className="space-y-3 pt-4">
              <p className="eyebrow">New purchase order</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="eyebrow mb-1.5 block">PO number</label>
                  <input
                    className={input}
                    placeholder="PO-9001"
                    value={draft.poNumber ?? ''}
                    onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Buyer</label>
                  <input
                    className={input}
                    value={draft.buyer ?? ''}
                    onChange={(e) => setDraft({ ...draft, buyer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Factory</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={draft.factoryId ?? ''}
                    onChange={(e) => setDraft({ ...draft, factoryId: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {(factories ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Ship date</label>
                  <input
                    className={input}
                    type="date"
                    value={draft.shipDate ?? ''}
                    onChange={(e) => setDraft({ ...draft, shipDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={save} disabled={!draft.poNumber || !draft.factoryId}>
                  Create order
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {pos === null ? (
          <LoadingState label="Loading orders" />
        ) : pos.length === 0 ? (
          <EmptyState title="No purchase orders yet — create the first one" />
        ) : (
          <div className="space-y-2">
            {pos.map((po) => (
              <Card key={po.id} signal={po.status === 'CLOSED' ? 'GREY' : 'GREEN'}>
                <CardBody className="pt-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <button
                      className="min-w-[10rem] flex-1 text-left"
                      onClick={() => setOpen(open === po.id ? null : po.id)}
                    >
                      <span className="block font-display text-lg uppercase tracking-[0.03em] leading-tight">
                        {po.poNumber}
                      </span>
                      <span className="text-xs text-muted">
                        {po.buyer || 'No buyer'} · {po.status}
                      </span>
                    </button>
                    <Button size="sm" onClick={() => setOpen(open === po.id ? null : po.id)}>
                      {open === po.id ? 'Hide lines' : 'Lines & bundles'}
                    </Button>
                    {editable && (
                      <Button variant="ghost" size="icon" onClick={() => remove(po.id)}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>

                  {open === po.id && <PoLines po={po} editable={editable} />}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PoLines({ po, editable }: { po: PurchaseOrder; editable: boolean }) {
  const { cfg } = useConfig();
  const { items: styles } = useTenantCollection<Style>('styles');
  const { items: lines, create, remove } = useTenantCollection<PoLine>('poLines', {
    filterField: 'poId',
    filterValue: po.id,
  });

  const [styleId, setStyleId] = useState('');
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('');
  const [orderQty, setOrderQty] = useState(0);
  const [bundleQty, setBundleQty] = useState(cfg('bundle.defaultQty', { factoryId: po.factoryId }));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const style = styles?.find((s) => s.id === styleId) ?? null;

  /* Shown before anything is written, so the partial bundle is never a
     surprise discovered after 52 labels have been printed. */
  const preview = useMemo(() => {
    try {
      return orderQty > 0 && bundleQty > 0 ? summarisePlan(orderQty, bundleQty) : null;
    } catch {
      return null;
    }
  }, [orderQty, bundleQty]);

  async function addLine() {
    if (!style || !colour || !size || !orderQty) return;
    await create({
      poId: po.id,
      styleId: style.id,
      colour,
      size,
      orderQty,
      bundleQty,
      bundlesGenerated: false,
    } as never);
    setOrderQty(0);
  }

  async function generate(line: PoLine) {
    const s = styles?.find((x) => x.id === line.styleId);
    if (!s) return;
    setBusy(line.id);
    setMessage(null);
    try {
      const r = await generateBundles({
        tenantId: line.tenantId,
        factoryId: po.factoryId,
        po,
        line,
        style: s,
        template: cfg('bundle.barcodeTemplate', { factoryId: po.factoryId, styleId: s.id }),
        padding: cfg('bundle.sequencePadding', { factoryId: po.factoryId }),
      });
      setMessage(
        `Created ${r.created} bundles totalling ${r.pieces} pieces${r.batches > 1 ? ` in ${r.batches} batches` : ''}.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(line: PoLine) {
    setBusy(line.id);
    try {
      const n = await cancelLineBundles(line.id);
      setMessage(`Cancelled ${n} unscanned bundles. Scanned bundles were left untouched.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {editable && (
        <div className="mb-4 grid gap-2 sm:grid-cols-6">
          <select
            className={cn(input, 'appearance-none')}
            value={styleId}
            onChange={(e) => {
              setStyleId(e.target.value);
              setColour('');
              setSize('');
            }}
          >
            <option value="">Style…</option>
            {(styles ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>

          <select
            className={cn(input, 'appearance-none')}
            value={colour}
            disabled={!style}
            onChange={(e) => setColour(e.target.value)}
          >
            <option value="">Colour…</option>
            {(style?.colours ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className={cn(input, 'appearance-none')}
            value={size}
            disabled={!style}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="">Size…</option>
            {(style?.sizes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            className={input}
            type="number"
            placeholder="Order qty"
            value={orderQty || ''}
            onChange={(e) => setOrderQty(Number(e.target.value))}
          />
          <input
            className={input}
            type="number"
            placeholder="Bundle qty"
            value={bundleQty || ''}
            onChange={(e) => setBundleQty(Number(e.target.value))}
          />
          <Button variant="primary" onClick={addLine} disabled={!style || !colour || !size || !orderQty}>
            Add line
          </Button>

          {preview && (
            <p className="col-span-full text-sm text-muted">
              {preview.count} bundles ·{' '}
              {preview.partialQty
                ? `${preview.fullCount} × ${bundleQty} plus one of ${preview.partialQty}`
                : `all ${bundleQty}`}{' '}
              · {formatMetric(preview.totalPieces)} pieces total
            </p>
          )}
        </div>
      )}

      {message && (
        <p className="andon text-signal-green mb-3 rounded border border-line bg-surface p-2.5 text-sm">
          {message}
        </p>
      )}

      {lines === null ? (
        <LoadingState rows={1} />
      ) : lines.length === 0 ? (
        <p className="text-sm text-muted">No lines yet.</p>
      ) : (
        <div className="space-y-1.5">
          {lines.map((l) => {
            const s = styles?.find((x) => x.id === l.styleId);
            const plan = (() => {
              try {
                return summarisePlan(l.orderQty, l.bundleQty);
              } catch {
                return null;
              }
            })();

            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded border border-line bg-raised px-3 py-2.5"
              >
                <span className="font-mono text-sm">
                  {s?.code ?? '—'} · {l.colour} · {l.size}
                </span>
                <span className="font-mono tnum text-sm text-muted">
                  {formatMetric(l.orderQty)} pcs @ {l.bundleQty}
                </span>
                {plan && (
                  <span className="font-mono tnum text-sm text-muted">
                    {plan.count} bundles
                    {plan.partialQty ? ` (last ${plan.partialQty})` : ''}
                  </span>
                )}

                <span
                  className={cn(
                    'font-display text-eyebrow uppercase tracking-[0.1em]',
                    l.bundlesGenerated ? 'text-signal-green' : 'text-muted',
                  )}
                >
                  {l.bundlesGenerated ? 'Generated' : 'Not generated'}
                </span>

                {editable && (
                  <div className="ml-auto flex gap-2">
                    {l.bundlesGenerated ? (
                      <Button size="sm" onClick={() => cancel(l)} disabled={busy === l.id}>
                        Cancel bundles
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => generate(l)}
                        disabled={busy === l.id}
                      >
                        {busy === l.id ? 'Generating' : 'Generate bundles'}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
