import { useEffect, useMemo, useState } from 'react';
import { Maximize, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductionData } from '@/hooks/useProductionData';
import { useConfig } from '@/config/ConfigProvider';
import { useConnection } from '@/hooks/useConnection';
import { SIGNAL } from '@/lib/signal';
import { cn, formatMetric } from '@/lib/utils';
import type { ModuleView } from '@/hooks/useProductionData';

/**
 * The wall display.
 *
 * A different design problem from the other dashboards: this is read from
 * fifteen metres away by someone walking past, not studied on a desk. So the
 * figures are enormous, the labels are small, and there is no navigation at
 * all.
 *
 * Colour does the work. A supervisor crossing the floor should register
 * which modules are in trouble before any number resolves, which is why the
 * andon rail runs the full height of each card here rather than sitting as a
 * thin edge.
 */
export function WallDisplay() {
  const { cfg } = useConfig();
  const connection = useConnection();
  const { views, totals, slot } = useProductionData();

  const perScreen = cfg('wall.modulesPerScreen');
  const rotateSeconds = cfg('wall.rotateSeconds');

  const pages = useMemo(() => {
    const out: ModuleView[][] = [];
    for (let i = 0; i < views.length; i += perScreen) out.push(views.slice(i, i + perScreen));
    return out.length > 0 ? out : [[]];
  }, [views, perScreen]);

  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pages.length <= 1) return;
    const id = window.setInterval(
      () => setPage((p) => (p + 1) % pages.length),
      rotateSeconds * 1000,
    );
    return () => window.clearInterval(id);
  }, [pages.length, rotateSeconds]);

  // Clamp when the module count shrinks mid-rotation.
  const current = pages[Math.min(page, pages.length - 1)] ?? [];

  function goFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="flex h-dvh flex-col bg-navy-950 text-white">
      <header className="flex shrink-0 items-center gap-6 border-b border-navy-700 px-6 py-3">
        <div>
          <p className="font-display text-2xl uppercase leading-none tracking-[0.04em]">
            {cfg('system.companyName')}
          </p>
          <p className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/40">
            {slot.shift?.name ?? 'No shift running'} · {slot.dateKey}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-8">
          <WallTotal label="Target" value={totals.target} />
          <WallTotal label="Actual" value={totals.actual} />
          <WallTotal label="Achieved" value={totals.achievement} suffix="%" />
          <div className="text-right">
            <p className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/40">
              {connection === 'OFFLINE' ? 'Offline' : 'Live'}
            </p>
            <p className="font-mono tnum text-4xl leading-none">{slot.time}</p>
          </div>

          <div className="flex gap-1">
            <button
              onClick={goFullscreen}
              className="rounded border border-navy-700 p-2 text-white/50 hover:text-white"
              aria-label="Fullscreen"
            >
              <Maximize size={18} />
            </button>
            <Link
              to="/dashboard/factory"
              className="rounded border border-navy-700 p-2 text-white/50 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="grid flex-1 gap-3 overflow-hidden p-3 sm:grid-cols-2 xl:grid-cols-4">
        {current.length === 0 ? (
          <div className="col-span-full flex items-center justify-center">
            <p className="font-display text-3xl uppercase tracking-[0.04em] text-white/30">
              No modules to display
            </p>
          </div>
        ) : (
          current.map((v) => <WallCard key={v.module.id} view={v} />)
        )}
      </main>

      {pages.length > 1 && (
        <footer className="flex shrink-0 justify-center gap-1.5 pb-3">
          {pages.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-8 rounded-sm',
                i === Math.min(page, pages.length - 1) ? 'bg-white/70' : 'bg-white/15',
              )}
            />
          ))}
        </footer>
      )}
    </div>
  );
}

function WallTotal({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="text-right">
      <p className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="font-mono tnum text-4xl leading-none">
        {formatMetric(value, { suffix })}
      </p>
    </div>
  );
}

function WallCard({ view }: { view: ModuleView }) {
  const { module, style, metrics } = view;
  const tone = SIGNAL[metrics.wip.status];

  return (
    <div className="relative flex flex-col overflow-hidden rounded border border-navy-700 bg-navy-900 p-4">
      {/* Full-height rail, not an edge: legible at fifteen metres. */}
      <span className={cn('absolute inset-y-0 left-0 w-2', tone.bg)} />

      <div className="flex items-baseline justify-between pl-3">
        <span className="font-display text-3xl uppercase leading-none tracking-[0.03em]">
          {module.code}
        </span>
        <span className="font-mono text-sm text-white/40">{style?.code ?? '—'}</span>
      </div>

      <div className="mt-auto pl-3">
        <p className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/40">
          Actual / Target
        </p>
        <p className="font-mono tnum text-6xl leading-none">
          {formatMetric(metrics.actual)}
        </p>
        <p className="font-mono tnum text-2xl leading-tight text-white/50">
          {formatMetric(metrics.target)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-navy-700 pt-3 pl-3">
        <WallStat label="Ach" value={metrics.achievement} suffix="%" tone={metrics.achievementBand} />
        <WallStat label="Eff" value={metrics.efficiency} suffix="%" tone={metrics.efficiencyBand} />
        <WallStat label="WIP" value={metrics.wipPieces} tone={metrics.wip.status} />
      </div>
    </div>
  );
}

function WallStat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  tone: keyof typeof SIGNAL;
}) {
  return (
    <div>
      <p className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className={cn('font-mono tnum text-2xl leading-none', SIGNAL[tone].text)}>
        {formatMetric(value, { suffix })}
      </p>
    </div>
  );
}
