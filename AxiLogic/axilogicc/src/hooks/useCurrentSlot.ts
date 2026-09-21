import { useMemo } from 'react';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import { useFactoryClock } from '@/hooks/useFactoryClock';
import { useConfig } from '@/config/ConfigProvider';
import {
  activeShift,
  currentSlot,
  elapsedProductionMinutes,
  isProductionOpen,
  productionDate,
  productionMinutes,
  remainingProductionMinutes,
} from '@/time/slots';
import type { Shift, ShiftSlot } from '@/types/domain';

export interface SlotState {
  shift: Shift | null;
  slot: ShiftSlot | null;
  /** True only inside a non-break slot of an active shift. */
  productionOpen: boolean;
  /** Why production is closed, for a message the operator can act on. */
  closedReason: 'NO_SHIFT' | 'BREAK' | 'OUTSIDE_SLOT' | null;
  elapsedMinutes: number;
  remainingMinutes: number;
  totalMinutes: number;
  /** Production date, which is not today's date on a night shift. */
  dateKey: string;
  minuteOfDay: number;
  time: string;
}

/**
 * The live view of factory time.
 *
 * §15 and §34 both insist the active slot updates as time passes rather than
 * being read once at page load, so this recomputes on every clock tick. The
 * clock ticks on an interval from configuration, so a slot boundary is
 * picked up within seconds without re-rendering dashboards every second.
 */
export function useCurrentSlot(factoryId?: string | null): SlotState {
  const { cfg } = useConfig();
  const timezone = cfg('time.timezone', { factoryId });
  const clock = useFactoryClock(timezone, cfg('time.clockTickSeconds', { factoryId }) * 1000);
  const { items: shifts } = useTenantCollection<Shift>('shifts');

  return useMemo(() => {
    const relevant = (shifts ?? []).filter((s) => !factoryId || s.factoryId === factoryId);
    const shift = activeShift(relevant, clock.minuteOfDay);

    if (!shift) {
      return {
        shift: null,
        slot: null,
        productionOpen: false,
        closedReason: 'NO_SHIFT' as const,
        elapsedMinutes: 0,
        remainingMinutes: 0,
        totalMinutes: 0,
        dateKey: new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(clock.now),
        minuteOfDay: clock.minuteOfDay,
        time: clock.time,
      };
    }

    const slot = currentSlot(shift, clock.minuteOfDay);
    const open = isProductionOpen(shift, clock.minuteOfDay);

    return {
      shift,
      slot,
      productionOpen: open,
      closedReason: open ? null : slot?.isBreak ? ('BREAK' as const) : ('OUTSIDE_SLOT' as const),
      elapsedMinutes: elapsedProductionMinutes(shift, clock.minuteOfDay),
      remainingMinutes: remainingProductionMinutes(shift, clock.minuteOfDay),
      totalMinutes: productionMinutes(shift),
      dateKey: productionDate(shift, clock.now, timezone),
      minuteOfDay: clock.minuteOfDay,
      time: clock.time,
    };
  }, [shifts, factoryId, clock.minuteOfDay, clock.now, clock.time, timezone]);
}
