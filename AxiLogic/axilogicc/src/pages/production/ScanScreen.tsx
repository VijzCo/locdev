import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useCurrentSlot } from '@/hooks/useCurrentSlot';
import { useConnection } from '@/hooks/useConnection';
import { checkScan, scanEventId } from '@/scan/scanValidation';
import { commitScan } from '@/scan/scanService';
import { dismissRejected, queuedScanIds } from '@/scan/outbox';
import {
  checkRapidRepeat,
  duplicateMessage,
  isAlreadyQueued,
  rememberScan,
  type RecentScan,
} from '@/scan/duplicateGuard';
import { isMuted, playScanTone, setMuted } from '@/scan/sounds';
import { useOutbox, useWedgeScanner } from '@/scan/useScanner';
import { Volume2, VolumeX } from 'lucide-react';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { cn, formatMetric } from '@/lib/utils';
import { formatMinute } from '@/time/slots';
import type { Bundle, Department, Module, ScanDirection, Style } from '@/types/domain';

interface Feedback {
  tone: 'GREEN' | 'RED' | 'AMBER';
  title: string;
  detail: string;
  at: number;
}

const input =
  'h-14 w-full rounded border border-line bg-surface px-4 text-lg text-ink placeholder:text-faint focus:border-accent';

/**
 * The screen that runs eight hours a day on a floor terminal.
 *
 * Everything here is sized for a gloved hand and a glance from a metre away.
 * The result banner is the largest element on the screen and carries the
 * andon colour, because an operator scanning a trolley of bundles needs to
 * know accept-or-reject without reading words.
 */
export function ScanScreen({ direction }: { direction: ScanDirection }) {
  const { profile } = useAuth();
  const { cfg } = useConfig();
  const connection = useConnection();
  const outbox = useOutbox();

  const { items: modules } = useTenantCollection<Module>('modules');
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: styles } = useTenantCollection<Style>('styles');

  const [moduleId, setModuleId] = useState<string>(() => localStorage.getItem('gpt.station') ?? '');
  const [manual, setManual] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [recent, setRecent] = useState<{ id: string; qty: number; ok: boolean }[]>([]);
  const busy = useRef(false);
  // Kept in a ref, not state: the guard must see the previous scan even when
  // two reads arrive in the same render.
  const seen = useRef<RecentScan[]>([]);
  const [muted, setMutedState] = useState(isMuted);

  const module = useMemo(() => modules?.find((m) => m.id === moduleId) ?? null, [modules, moduleId]);
  const department = useMemo(
    () => departments?.find((d) => d.id === module?.departmentId) ?? null,
    [departments, module],
  );

  // Live: the slot re-evaluates as time passes rather than at page load, so
  // a station left open across a break locks itself without a refresh.
  const slotState = useCurrentSlot(module?.factoryId);
  const timezone = cfg('time.timezone', { factoryId: module?.factoryId });

  useEffect(() => {
    if (moduleId) localStorage.setItem('gpt.station', moduleId);
  }, [moduleId]);

  const scopedModules = useMemo(() => {
    if (!modules || !profile) return [];
    const allowed = profile.scope?.moduleIds ?? [];
    return modules.filter((m) => m.active !== false && (allowed.length === 0 || allowed.includes(m.id)));
  }, [modules, profile]);

  const handleScan = useCallback(
    async (code: string) => {
      if (!profile || !module || !department || busy.current) return;
      busy.current = true;

      try {
        const bundleId = code.trim().toUpperCase();

        const soundOn = cfg('scan.soundEnabled', { moduleId: module.id }) && !muted;
        const windowMs = cfg('scan.duplicateWindowSeconds', { moduleId: module.id }) * 1000;

        /* A scanner firing twice is the operator doing one thing, so it is
           swallowed with a warning rather than shown as a rejection. Telling
           someone "rejected" for their own double-press teaches them to
           distrust every rejection. */
        const rapid = checkRapidRepeat(seen.current, bundleId, Date.now(), windowMs);
        if (rapid.duplicate) {
          playScanTone('DUPLICATE', soundOn);
          setFeedback({
            tone: 'AMBER',
            title: 'Already scanned',
            detail: `${bundleId} — ${duplicateMessage(rapid)}`,
            at: Date.now(),
          });
          return;
        }
        seen.current = rememberScan(seen.current, bundleId, Date.now(), windowMs);

        // Reads resolve from the offline cache when there is no connection,
        // which is what makes validation work during an outage.
        let bundle: Bundle | null = null;
        if (db) {
          const snap = await getDoc(doc(db, 'bundles', bundleId));
          bundle = snap.exists() ? ({ id: snap.id, ...snap.data() } as Bundle) : null;
        }

        /* The outbox is this device's own record of what it has accepted,
           so it catches a repeat even when the bundle document has not
           caught up — the check that matters offline. */
        const scanId = scanEventId(bundleId, module.id, direction);
        const queued = isAlreadyQueued(await queuedScanIds(), scanId);
        if (queued.duplicate) {
          playScanTone('DUPLICATE', soundOn);
          setFeedback({
            tone: 'AMBER',
            title: 'Already recorded',
            detail: `${bundleId} — ${duplicateMessage(queued)}`,
            at: Date.now(),
          });
          return;
        }

        const style = styles?.find((s) => s.id === bundle?.styleId) ?? null;
        const currentModuleCode = modules?.find((m) => m.id === bundle?.currentModuleId)?.code;

        const result = checkScan({
          bundle,
          module,
          style,
          direction,
          userScanAccess: profile.scanAccess,
          userModuleIds: profile.scope?.moduleIds ?? [],
          moduleStage: department.stage,
          slotOpen: slotState.productionOpen,
          enforceTimeSlots: cfg('scan.enforceTimeSlots', { moduleId: module.id }),
          routingEnforcement: cfg('routing.enforcement', {
            factoryId: module.factoryId,
            styleId: style?.id,
          }),
          currentModuleCode,
        });

        if (!result.ok || !bundle) {
          playScanTone('REJECT', soundOn);
          setFeedback({
            tone: 'RED',
            title: bundleId,
            detail: result.message ?? 'Barcode not found.',
            at: Date.now(),
          });
          setRecent((r) => [{ id: bundleId, qty: 0, ok: false }, ...r].slice(0, 8));
          return;
        }

        const route = style?.routeStages ?? [];
        const isFinalStage =
          direction === 'OUT' && route.length > 0 && route[route.length - 1] === department.stage;

        await commitScan({
          bundle,
          module,
          moduleStage: department.stage,
          style,
          direction,
          userId: profile.uid,
          tenantId: profile.tenantId,
          factoryId: module.factoryId,
          shiftId: slotState.shift?.id ?? '',
          timezone,
          slotIndex: slotState.slot?.index ?? 0,
          dateKey: slotState.dateKey,
          isFinalStage,
        });

        playScanTone('ACCEPT', soundOn);
        setFeedback({
          tone: 'GREEN',
          title: `${bundle.size} · ${formatMetric(bundle.qty)} pieces`,
          detail: `${bundle.id} scanned ${direction} at ${module.code}`,
          at: Date.now(),
        });
        setRecent((r) => [{ id: bundle.id, qty: bundle.qty, ok: true }, ...r].slice(0, 8));
        outbox.refresh();
      } finally {
        busy.current = false;
        setManual('');
      }
    },
    [profile, module, department, styles, modules, direction, cfg, slotState, timezone, outbox, muted],
  );

  useWedgeScanner(handleScan, Boolean(module));

  // Clears the banner so a stale green is never mistaken for the scan just made.
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const offline = connection === 'OFFLINE';

  return (
    <>
      <PageHeader
        title={direction === 'IN' ? 'Scan in' : 'Scan out'}
        description={
          direction === 'IN'
            ? 'Records a bundle entering this module.'
            : 'Records a bundle leaving this module and adds it to the hour’s output.'
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-4 pt-4">
            <div className="min-w-[14rem] flex-1">
              <label className="eyebrow mb-1.5 block">Station</label>
              <select
                className={cn(input, 'appearance-none')}
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
              >
                <option value="">Choose a module…</option>
                {scopedModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <p className="eyebrow leading-none">
                {slotState.shift?.name ?? 'No shift running'}
              </p>
              <p className="font-mono tnum text-2xl leading-tight">{slotState.time}</p>
            </div>

            <Button
              variant="secondary"
              size="icon"
              aria-label={muted ? 'Turn scan sounds on' : 'Turn scan sounds off'}
              title={muted ? 'Scan sounds off' : 'Scan sounds on'}
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setMutedState(next);
                if (!next) playScanTone('ACCEPT', true);
              }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>

            <div
              className={cn(
                'rounded border px-3 py-2',
                offline
                  ? 'border-signal-amber/50 bg-signal-amber/10 text-signal-amber'
                  : 'border-signal-green/40 bg-signal-green/10 text-signal-green',
              )}
            >
              <p className="font-display text-eyebrow uppercase tracking-[0.1em]">
                {offline ? 'Offline' : 'Online'}
              </p>
              <p className="font-mono tnum text-sm">
                {outbox.pendingCount > 0
                  ? `${outbox.pendingCount} waiting to sync`
                  : 'All scans synced'}
              </p>
            </div>
          </CardBody>
        </Card>

        {offline && (
          <p className="andon text-signal-amber rounded border border-line bg-surface p-3 text-sm">
            Working offline. Scanning continues and everything queues here. Scans that break a rule
            — a bundle already scanned somewhere else — are only refused once the connection
            returns, and will appear below.
          </p>
        )}

        {outbox.oldestPendingMinutes !== null && outbox.oldestPendingMinutes > 30 && (
          <p className="andon text-signal-red rounded border border-line bg-surface p-3 text-sm">
            The oldest unsent scan is {outbox.oldestPendingMinutes} minutes old. Tell a supervisor —
            this tablet has not reached the server in a while.
          </p>
        )}

        {module && !slotState.productionOpen && cfg('scan.enforceTimeSlots', { moduleId: module.id }) && (
          <p className="andon text-signal-red rounded border border-line bg-surface p-3 text-sm">
            {slotState.closedReason === 'BREAK'
              ? `Production entry is closed for ${module.code} — this slot is a break. It reopens at ${slotState.slot ? formatMinute(slotState.slot.endMinute) : 'the next slot'}.`
              : slotState.closedReason === 'NO_SHIFT'
                ? 'No shift is running right now, so production cannot be recorded. Check shifts under Planning.'
                : `Production entry is closed for ${module.code} in the current time slot.`}
          </p>
        )}

        {!module ? (
          <Card>
            <CardBody className="py-12 text-center">
              <p className="font-display text-xl uppercase tracking-[0.04em] text-muted">
                Choose a station to start scanning
              </p>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* The result banner: the largest thing on screen, andon-coloured,
                readable from a metre away without reading the words. */}
            <div
              className={cn(
                'andon flex min-h-[9rem] flex-col justify-center rounded border p-6',
                feedback?.tone === 'GREEN' &&
                  'border-signal-green/50 bg-signal-green/10 text-signal-green',
                feedback?.tone === 'AMBER' &&
                  'border-signal-amber/50 bg-signal-amber/10 text-signal-amber',
                feedback?.tone === 'RED' && 'border-signal-red/50 bg-signal-red/10 text-signal-red',
                !feedback && 'border-line bg-surface text-muted',
              )}
            >
              {feedback ? (
                <>
                  <p className="font-display text-4xl uppercase leading-none tracking-[0.02em]">
                    {feedback.tone === 'GREEN'
                      ? feedback.title
                      : feedback.tone === 'AMBER'
                        ? feedback.title
                        : 'Rejected'}
                  </p>
                  <p className="mt-2 text-base">{feedback.detail}</p>
                </>
              ) : (
                <p className="font-display text-2xl uppercase tracking-[0.04em]">
                  Ready — scan a bundle
                </p>
              )}
            </div>

            <Card>
              <CardBody className="pt-4">
                <label className="eyebrow mb-1.5 block">Damaged label? Type the bundle id</label>
                <div className="flex gap-2">
                  <input
                    className={input}
                    value={manual}
                    placeholder="PO-9001-ST-1001-NAVY-M-B0007"
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manual.trim()) handleScan(manual);
                    }}
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!manual.trim()}
                    onClick={() => handleScan(manual)}
                  >
                    Scan
                  </Button>
                </div>
              </CardBody>
            </Card>

            {recent.length > 0 && (
              <Card>
                <CardBody className="pt-4">
                  <p className="eyebrow mb-2">Last few scans</p>
                  <div className="space-y-1">
                    {recent.map((r, i) => (
                      <div
                        key={`${r.id}-${i}`}
                        className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0"
                      >
                        <span className="font-mono">{r.id}</span>
                        <span
                          className={cn(
                            'font-display text-eyebrow uppercase tracking-[0.1em]',
                            r.ok ? 'text-signal-green' : 'text-signal-red',
                          )}
                        >
                          {r.ok ? `${r.qty} pcs` : 'Rejected'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {outbox.rejectedCount > 0 && (
          <Card signal="RED">
            <CardBody className="pt-4">
              <p className="eyebrow mb-2">
                {outbox.rejectedCount} scans were refused by the server
              </p>
              <div className="space-y-1.5">
                {outbox.records
                  .filter((r) => r.state === 'REJECTED')
                  .map((r) => (
                    <div
                      key={r.scanId}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-2 text-sm last:border-0"
                    >
                      <span className="font-mono">{r.bundleId}</span>
                      <span className="text-muted">
                        {r.direction} at {r.moduleCode}
                      </span>
                      <span className="text-signal-red">{r.rejectionReason}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={async () => {
                          await dismissRejected(r.scanId);
                          outbox.refresh();
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ))}
              </div>
              <p className="mt-3 max-w-prose text-sm text-muted">
                These were accepted on this device but refused when they reached the server, usually
                because the bundle was scanned somewhere else first. The pieces were not counted.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
