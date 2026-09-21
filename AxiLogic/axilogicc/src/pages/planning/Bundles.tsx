import { useMemo, useState } from 'react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { recordPrint, selectRange } from '@/lib/labelPrinting';
import { LabelSheet } from '@/components/labels/LabelSheet';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { Metric } from '@/components/ui/Metric';
import { cn, formatMetric } from '@/lib/utils';
import type { Bundle, BundleStatus, PurchaseOrder, SignalStatus, Style } from '@/types/domain';

const STATUS_TONE: Record<BundleStatus, SignalStatus> = {
  CREATED: 'GREY',
  IN_MODULE: 'GREEN',
  BETWEEN: 'AMBER',
  COMPLETED: 'GREEN',
  CANCELLED: 'RED',
  LOST: 'RED',
};

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-accent';

/**
 * Bundle browser and label printing. §8 asked for printing by single,
 * selection, all, PO, style, size and range — those are all expressions of
 * "filter, then select", so the filters do the work and printing acts on
 * whatever is currently selected.
 */
export function Bundles() {
  const { profile, canWrite } = useAuth();
  const { cfg } = useConfig();
  const { items: bundles } = useTenantCollection<Bundle>('bundles');
  const { items: pos } = useTenantCollection<PurchaseOrder>('purchaseOrders');
  const { items: styles } = useTenantCollection<Style>('styles');

  const [search, setSearch] = useState('');
  const [poId, setPoId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [size, setSize] = useState('');
  const [status, setStatus] = useState('');
  const [fromSeq, setFromSeq] = useState('');
  const [toSeq, setToSeq] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  const canPrint = canWrite('plan.manage');
  const allowReprint = cfg('bundle.allowReprint');

  const filtered = useMemo(() => {
    if (!bundles) return null;
    const q = search.trim().toUpperCase();
    let out = bundles.filter(
      (b) =>
        (!poId || b.poId === poId) &&
        (!styleId || b.styleId === styleId) &&
        (!size || b.size === size) &&
        (!status || b.status === status) &&
        (!q ||
          b.id.includes(q) ||
          b.colour.toUpperCase().includes(q) ||
          b.size.toUpperCase().includes(q)),
    );

    const from = Number(fromSeq);
    const to = Number(toSeq);
    if (from > 0 && to > 0) out = selectRange(out, from, to);

    return out.sort((a, b) => a.seq - b.seq);
  }, [bundles, search, poId, styleId, size, status, fromSeq, toSeq]);

  const sizes = useMemo(
    () => Array.from(new Set((bundles ?? []).map((b) => b.size))).sort(),
    [bundles],
  );

  const selectedBundles = useMemo(
    () => (filtered ?? []).filter((b) => selected.has(b.id)),
    [filtered, selected],
  );

  const totals = useMemo(
    () =>
      filtered
        ? { bundles: filtered.length, pieces: filtered.reduce((s, b) => s + b.qty, 0) }
        : null,
    [filtered],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const labelConfig = {
    widthMm: cfg('label.widthMm'),
    heightMm: cfg('label.heightMm'),
    barcodeHeightMm: cfg('label.barcodeHeightMm'),
    showCompany: cfg('label.showCompany'),
    companyName: cfg('system.companyName'),
  };

  const toPrint = selectedBundles.length > 0 ? selectedBundles : (filtered ?? []);
  const reprintCount = toPrint.filter((b) => (b.printCount ?? 0) > 0).length;
  const blockedByReprint = !allowReprint && reprintCount > 0;

  return (
    <>
      <PageHeader
        title="Bundles & labels"
        description="Filter down to what you need, then print. Selecting nothing prints everything shown."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Card>
          <CardBody className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <input
                className={input}
                placeholder="Search id, colour, size"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className={cn(input, 'appearance-none')} value={poId} onChange={(e) => setPoId(e.target.value)}>
                <option value="">All orders</option>
                {(pos ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.poNumber}</option>
                ))}
              </select>
              <select className={cn(input, 'appearance-none')} value={styleId} onChange={(e) => setStyleId(e.target.value)}>
                <option value="">All styles</option>
                {(styles ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.code}</option>
                ))}
              </select>
              <select className={cn(input, 'appearance-none')} value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">All sizes</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className={cn(input, 'appearance-none')} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {Object.keys(STATUS_TONE).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="eyebrow mb-1.5 block">Bundle range</label>
                <div className="flex items-center gap-2">
                  <input
                    className={cn(input, 'w-24')}
                    type="number"
                    placeholder="From"
                    value={fromSeq}
                    onChange={(e) => setFromSeq(e.target.value)}
                  />
                  <span className="text-muted">to</span>
                  <input
                    className={cn(input, 'w-24')}
                    type="number"
                    placeholder="To"
                    value={toSeq}
                    onChange={(e) => setToSeq(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end gap-6">
                <Metric label="Bundles" value={totals?.bundles ?? null} size="sm" />
                <Metric label="Pieces" value={totals?.pieces ?? null} size="sm" />
                <Metric label="Selected" value={selected.size || null} size="sm" />
              </div>

              <div className="ml-auto flex flex-wrap gap-2">
                <Button onClick={() => setSelected(new Set((filtered ?? []).map((b) => b.id)))}>
                  Select all shown
                </Button>
                <Button variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                {canPrint && (
                  <Button
                    variant="primary"
                    disabled={toPrint.length === 0 || blockedByReprint}
                    onClick={() => setPrinting(true)}
                  >
                    Print {toPrint.length} {toPrint.length === 1 ? 'label' : 'labels'}
                  </Button>
                )}
              </div>
            </div>

            {blockedByReprint ? (
              <p className="andon text-signal-red rounded border border-line p-2.5 text-sm">
                {reprintCount} of these have been printed before, and reprints are turned off in
                settings.
              </p>
            ) : reprintCount > 0 ? (
              <p className="andon text-signal-amber rounded border border-line p-2.5 text-sm">
                {reprintCount} of these have been printed before and will be marked “RE”. A bundle
                printed repeatedly usually means the physical bundle is missing.
              </p>
            ) : null}
          </CardBody>
        </Card>

        {filtered === null ? (
          <LoadingState label="Loading bundles" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No bundles match — generate some from a purchase order" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 300).map((b) => {
              const style = styles?.find((s) => s.id === b.styleId);
              const isSelected = selected.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b.id)}
                  className="text-left"
                >
                  <Card
                    signal={STATUS_TONE[b.status]}
                    className={cn(isSelected && 'ring-2 ring-accent')}
                  >
                    <CardBody className="pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-sm leading-tight">{b.id}</p>
                        {(b.printCount ?? 0) > 0 && (
                          <span className="shrink-0 font-display text-eyebrow uppercase tracking-[0.1em] text-signal-amber">
                            ×{b.printCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {style?.code ?? '—'} · {b.colour} · {b.size}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono tnum text-lg">{formatMetric(b.qty)}</span>
                        <span className="font-display text-eyebrow uppercase tracking-[0.1em] text-muted">
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        {filtered && filtered.length > 300 && (
          <p className="text-sm text-muted">
            Showing the first 300 of {formatMetric(filtered.length)}. Printing still covers all{' '}
            {formatMetric(filtered.length)}.
          </p>
        )}
      </div>

      {printing && profile && (
        <LabelSheet
          bundles={toPrint}
          pos={pos ?? []}
          styles={styles ?? []}
          config={labelConfig}
          onClose={() => setPrinting(false)}
          onPrinted={() => recordPrint(toPrint, profile.uid, profile.tenantId)}
        />
      )}
    </>
  );
}
