/**
 * Scan feedback tones.
 *
 * Generated with the Web Audio API rather than loaded as files: nothing to
 * download, nothing to cache, and it works on the first scan of the day on
 * a tablet that has been offline since yesterday.
 *
 * The three tones are deliberately unlike each other. An operator working a
 * trolley of bundles is listening, not looking, so "accepted", "rejected"
 * and "you already scanned that" must be distinguishable across a noisy
 * sewing floor without turning to the screen.
 */

export type ScanTone = 'ACCEPT' | 'REJECT' | 'DUPLICATE';

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    // Browsers suspend audio until a gesture. Scanning is a keypress, so by
    // the time we play anything the gesture has happened.
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

interface Beep {
  frequency: number;
  durationMs: number;
  delayMs: number;
  type: OscillatorType;
  gain: number;
}

const TONES: Record<ScanTone, Beep[]> = {
  /* Rising two-note chirp. Short, so a fast operator is never waiting for
     the sound to finish before the next scan. */
  ACCEPT: [
    { frequency: 880, durationMs: 60, delayMs: 0, type: 'sine', gain: 0.18 },
    { frequency: 1320, durationMs: 70, delayMs: 65, type: 'sine', gain: 0.18 },
  ],

  /* Low and flat. Nothing about this should sound like success. */
  REJECT: [{ frequency: 190, durationMs: 260, delayMs: 0, type: 'square', gain: 0.13 }],

  /* Two identical mid notes — literally a repeat, which is what happened.
     Distinct from both the rising chirp and the low buzz. */
  DUPLICATE: [
    { frequency: 620, durationMs: 90, delayMs: 0, type: 'triangle', gain: 0.16 },
    { frequency: 620, durationMs: 90, delayMs: 150, type: 'triangle', gain: 0.16 },
  ],
};

export function playScanTone(tone: ScanTone, enabled = true): void {
  if (!enabled) return;

  const ctx = audio();
  if (!ctx) return;

  TONES[tone].forEach((beep) => {
    const start = ctx.currentTime + beep.delayMs / 1000;
    const end = start + beep.durationMs / 1000;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = beep.type;
    oscillator.frequency.setValueAtTime(beep.frequency, start);

    // Ramped rather than switched, so it does not click on cheap tablet
    // speakers — a click sounds like a fault and operators report it.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(beep.gain, start + 0.012);
    gain.gain.setValueAtTime(beep.gain, end - 0.02);
    gain.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });
}

const MUTE_KEY = 'gpt.scan.muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage unavailable; the setting simply does not persist.
  }
}
