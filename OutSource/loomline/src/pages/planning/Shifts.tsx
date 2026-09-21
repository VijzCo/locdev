import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useAuth } from '@/auth/AuthProvider';
import { useCurrentSlot } from '@/hooks/useCurrentSlot';
import {
  breakLength,
  breakMinutes,
  buildSlotsWithBreaks,
  crossesMidnight,
  formatMinute,
  parseClock,
  productionMinutes,
  shiftLength,
  slotLength,
  validateBreaks,
  validateSlots,
} from '@/time/slots';
import { PageHeader } from '@/pages/Placeholder';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/common/States';
import { cn } from '@/lib/utils';
import type { Factory, Shift, ShiftBreak, ShiftSlot } from '@/types/domain';

const input =
  'h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink focus:border-accent';

const DEFAULT_BREAKS: ShiftBreak[] = [
  { name: 'Tea', startMinute: 10 * 60, endMinute: 10 * 60 + 15, paid: true },
  { name: 'Lunch', startMinute: 12 * 60 + 30, endMinute: 13 * 60 + 30, paid: false },
];

const blank = (factoryId: string): Omit<Shift, 'id' | 'tenantId'> => ({
  factoryId,
  name: '',
  startMinute: 8 * 60,
  endMinute: 17 * 60,
  crossesMidnight: false,
  breaks: DEFAULT_BREAKS,
  slots: buildSlotsWithBreaks(8 * 60, 17 * 60, 60, DEFAULT_BREAKS),
  active: true,
});

/**
 * Shifts, their production slots, and which of those are breaks.
 *
 * The timeline is the point of this screen. A list of times is hard to check;
 * a bar showing where the breaks fall makes a mistake obvious at a glance,
 * and a wrong break is not a cosmetic error — it changes every target,
 * efficiency and forecast figure the factory sees.
 */
export function Shifts() {
  const { canWrite } = useAuth();
  const { items: shifts, create, update, remove } = useTenantCollection<Shift>('shifts');
  const { items: factories } = useTenantCollection<Factory>('factories');
  const [draft, setDraft] = useState<(Partial<Shift> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const live = useCurrentSlot();
  const editable = canWrite('plan.manage');

  async function save() {
    if (!draft?.name || !draft.factoryId) return;
    setBusy(true);
    try {
      const record = {
        ...draft,
        crossesMidnight: crossesMidnight({
          startMinute: draft.startMinute ?? 0,
          endMinute: draft.endMinute ?? 0,
        }),
      };
      if (draft.id) {
        const { id, ...rest } = record;
        await update(id as string, rest);
      } else {
        await create(record as never);
      }
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Slots are derived, never edited directly. Times and breaks are the
   * inputs; the slot list is what falls out of them. Editing both would let
   * them disagree, and the slots are what every target divides by.
   */
  function rebuild(
    startMinute: number,
    endMinute: number,
    breaks: ShiftBreak[],
  ) {
    if (!draft) return;
    setDraft({
      ...draft,
      startMinute,
      endMinute,
      breaks,
      slots: buildSlotsWithBreaks(startMinute, endMinute, 60, breaks),
    });
  }

  function setBreaks(breaks: ShiftBreak[]) {
    if (!draft) return;
    rebuild(draft.startMinute ?? 0, draft.endMinute ?? 0, breaks);
  }

  return (
    <>
      <PageHeader
        title="Shifts & slots"
        description="Working hours, hourly production slots, and breaks. These decide every target and efficiency figure."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Card signal={live.productionOpen ? 'GREEN' : 'GREY'}>
          <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-4">
            <div>
              <p className="eyebrow">Right now</p>
              <p className="font-mono tnum text-2xl leading-tight">{live.time}</p>
            </div>
            <div>
              <p className="eyebrow">Shift</p>
              <p className="font-display text-lg uppercase tracking-[0.03em]">
                {live.shift?.name ?? 'None running'}
              </p>
            </div>
            <div>
              <p className="eyebrow">Slot</p>
              <p className="font-display text-lg uppercase tracking-[0.03em]">
                {live.slot
                  ? `${formatMinute(live.slot.startMinute)}–${formatMinute(live.slot.endMinute)}${live.slot.isBreak ? ' · break' : ''}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="eyebrow">Production date</p>
              <p className="font-mono text-lg">{live.dateKey}</p>
            </div>
            <div className="ml-auto">
              <p className="eyebrow">Production minutes</p>
              <p className="font-mono tnum text-lg">
                {live.elapsedMinutes} of {live.totalMinutes}
              </p>
            </div>
          </CardBody>
        </Card>

        {editable && !draft && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setDraft(blank(factories?.[0]?.id ?? ''))}
              disabled={!factories?.length}
            >
              Add shift
            </Button>
          </div>
        )}

        {draft && (
          <Card>
            <CardBody className="space-y-4 pt-4">
              <p className="eyebrow">{draft.id ? 'Edit shift' : 'New shift'}</p>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="eyebrow mb-1.5 block">Name</label>
                  <input
                    className={input}
                    placeholder="Shift A"
                    value={draft.name ?? ''}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Factory</label>
                  <select
                    className={cn(input, 'appearance-none')}
                    value={draft.factoryId ?? ''}
                    onChange={(e) => setDraft({ ...draft, factoryId: e.target.value })}
                  >
                    {(factories ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Starts</label>
                  <input
                    className={input}
                    type="time"
                    value={formatMinute(draft.startMinute ?? 0)}
                    onChange={(e) =>
                      rebuild(parseClock(e.target.value), draft.endMinute ?? 0, draft.breaks ?? [])
                    }
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Ends</label>
                  <input
                    className={input}
                    type="time"
                    value={formatMinute(draft.endMinute ?? 0)}
                    onChange={(e) =>
                      rebuild(draft.startMinute ?? 0, parseClock(e.target.value), draft.breaks ?? [])
                    }
                  />
                </div>
              </div>

              {crossesMidnight({
                startMinute: draft.startMinute ?? 0,
                endMinute: draft.endMinute ?? 0,
              }) && (
                <p className="andon text-signal-amber rounded border border-line p-2.5 text-sm">
                  This shift runs past midnight. Output after midnight is booked to the date the
                  shift started, so a Monday night shift stays in Monday’s figures.
                </p>
              )}

              <BreakEditor
                breaks={draft.breaks ?? []}
                onChange={setBreaks}
                shift={{
                  startMinute: draft.startMinute ?? 0,
                  endMinute: draft.endMinute ?? 0,
                }}
              />

              <SlotPreview slots={draft.slots ?? []} />

              <Problems shift={draft as Shift} />

              <div className="flex gap-2">
                <Button variant="primary" onClick={save} disabled={busy || !draft.name}>
                  {busy ? 'Saving' : 'Save shift'}
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {shifts === null ? (
          <LoadingState label="Loading shifts" />
        ) : shifts.length === 0 ? (
          <EmptyState title="No shifts yet — add one so production slots exist" />
        ) : (
          <div className="space-y-2">
            {shifts.map((s) => (
              <Card key={s.id} signal={s.id === live.shift?.id ? 'GREEN' : 'GREY'}>
                <CardBody className="pt-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <button className="min-w-[8rem] text-left" onClick={() => editable && setDraft({ ...s })}>
                      <span className="block font-display text-lg uppercase tracking-[0.03em]">
                        {s.name}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {formatMinute(s.startMinute)}–{formatMinute(s.endMinute)}
                        {crossesMidnight(s) ? ' · overnight' : ''}
                      </span>
                    </button>
                    <Stat label="Length" value={`${Math.round(shiftLength(s) / 60)} h`} />
                    <Stat label="Production" value={`${Math.round(productionMinutes(s) / 60)} h`} />
                    <Stat label="Slots" value={String(s.slots?.length ?? 0)} />
                    <Stat
                      label="Breaks"
                      value={`${(s.slots ?? []).filter((x) => x.isBreak).length} · ${breakMinutes(s)} min`}
                    />
                    {editable && (
                      <Button variant="ghost" size="icon" className="ml-auto" onClick={() => remove(s.id)}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>

                  <Timeline shift={s} />
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

/** Proportional bar. Breaks read as gaps, which is how they behave. */
function Timeline({ shift }: { shift: Shift }) {
  const total = shiftLength(shift) || 1;
  return (
    <div className="mt-3 flex h-6 overflow-hidden rounded border border-line">
      {(shift.slots ?? []).map((s) => (
        <div
          key={s.index}
          title={`${formatMinute(s.startMinute)}–${formatMinute(s.endMinute)}${s.isBreak ? ' break' : ''}`}
          style={{ width: `${(slotLength(s) / total) * 100}%` }}
          className={cn(
            'border-r border-line/60 last:border-r-0',
            s.isBreak ? 'bg-signal-grey/30' : 'bg-signal-green/30',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Breaks of any length, as many as the shift has.
 *
 * A factory takes fifteen minutes for tea and an hour for lunch. Forcing
 * both into whole production slots — as this screen used to — either wrote
 * off forty-five minutes of target or ignored the tea break entirely.
 */
function BreakEditor({
  breaks,
  shift,
  onChange,
}: {
  breaks: ShiftBreak[];
  shift: { startMinute: number; endMinute: number };
  onChange: (next: ShiftBreak[]) => void;
}) {
  const problems = validateBreaks(shift, breaks);

  const update = (i: number, patch: Partial<ShiftBreak>) =>
    onChange(breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="eyebrow">Breaks</label>
        <Button
          size="sm"
          onClick={() =>
            onChange([
              ...breaks,
              { name: 'Break', startMinute: 15 * 60, endMinute: 15 * 60 + 15, paid: true },
            ])
          }
        >
          <Plus size={14} />
          Add break
        </Button>
      </div>

      {breaks.length === 0 ? (
        <p className="text-sm text-muted">
          No breaks. Every minute of the shift counts as production time.
        </p>
      ) : (
        <div className="space-y-2">
          {breaks.map((b, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded border border-line bg-raised p-2"
            >
              <div className="min-w-[7rem] flex-1">
                <label className="eyebrow mb-1 block">Name</label>
                <input
                  className={cn(input, 'h-10')}
                  value={b.name}
                  placeholder="Tea"
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">From</label>
                <input
                  className={cn(input, 'h-10 w-28')}
                  type="time"
                  value={formatMinute(b.startMinute)}
                  onChange={(e) => update(i, { startMinute: parseClock(e.target.value) })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">To</label>
                <input
                  className={cn(input, 'h-10 w-28')}
                  type="time"
                  value={formatMinute(b.endMinute)}
                  onChange={(e) => update(i, { endMinute: parseClock(e.target.value) })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">Length</label>
                <p className="flex h-10 items-center font-mono tnum text-sm text-muted">
                  {breakLength(b)} min
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title="Remove"
                onClick={() => onChange(breaks.filter((_, j) => j !== i))}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {problems.length > 0 && (
        <div className="andon text-signal-red mt-2 rounded border border-signal-red/40 p-2.5">
          {problems.map((p) => (
            <p key={p} className="text-sm text-signal-red">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read-only: the slots that fall out of the times and the breaks. */
function SlotPreview({ slots }: { slots: ShiftSlot[] }) {
  return (
    <div>
      <label className="eyebrow mb-2 block">Production slots</label>
      <div className="flex flex-wrap gap-1.5">
        {slots.map((s) => (
          <span
            key={s.index}
            className={cn(
              'inline-flex h-9 items-center rounded border px-2.5 font-mono text-xs',
              s.isBreak
                ? 'border-signal-grey/50 bg-signal-grey/10 text-signal-grey'
                : 'border-signal-green/40 bg-signal-green/10 text-signal-green',
            )}
          >
            {formatMinute(s.startMinute)}–{formatMinute(s.endMinute)}
            {s.isBreak && <span className="ml-1.5 uppercase">{s.name || 'break'}</span>}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Built from the shift times and the breaks above. Not edited directly.
      </p>
    </div>
  );
}

function Problems({ shift }: { shift: Shift }) {
  const problems = useMemo(() => (shift.slots ? validateSlots(shift) : []), [shift]);
  if (problems.length === 0) return null;

  return (
    <div className="andon text-signal-red rounded border border-line p-3">
      {problems.map((p) => (
        <p key={p} className="text-sm text-signal-red">
          {p}
        </p>
      ))}
    </div>
  );
}
