import type { SignalStatus } from '@/types/domain';

/**
 * The production semaphore. These four colours are reserved for status and
 * are never used decoratively anywhere in the application — that discipline
 * is what lets a supervisor read a wall of modules from across the floor.
 *
 * Every component that renders status pulls from this map. Nothing
 * hardcodes a green or a red.
 */
export const SIGNAL: Record<
  SignalStatus,
  { text: string; bg: string; softBg: string; border: string; label: string }
> = {
  GREEN: {
    text: 'text-signal-green',
    bg: 'bg-signal-green',
    softBg: 'bg-signal-green/10',
    border: 'border-signal-green',
    label: 'Normal',
  },
  AMBER: {
    text: 'text-signal-amber',
    bg: 'bg-signal-amber',
    softBg: 'bg-signal-amber/10',
    border: 'border-signal-amber',
    label: 'Attention',
  },
  RED: {
    text: 'text-signal-red',
    bg: 'bg-signal-red',
    softBg: 'bg-signal-red/10',
    border: 'border-signal-red',
    label: 'Critical',
  },
  GREY: {
    text: 'text-signal-grey',
    bg: 'bg-signal-grey',
    softBg: 'bg-signal-grey/10',
    border: 'border-signal-grey',
    label: 'Inactive',
  },
};
