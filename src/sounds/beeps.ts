export interface BeepOptions {
  freq: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  delayMs?: number;
}

function beep(ctx: AudioContext, { freq, durationMs, type = 'sine', gain = 0.2, delayMs = 0 }: BeepOptions): void {
  const startAt = ctx.currentTime + delayMs / 1000;
  const stopAt = startAt + durationMs / 1000;

  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = freq;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  oscillator.connect(gainNode).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(stopAt);
}

export function playTickBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 880, durationMs: 90, type: 'sine', gain: 0.15 });
}

export function playGuessedBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 660, durationMs: 110, type: 'sine', gain: 0.2 });
  beep(ctx, { freq: 990, durationMs: 150, type: 'sine', gain: 0.2, delayMs: 90 });
}

export function playSkipBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 440, durationMs: 140, type: 'triangle', gain: 0.15 });
}

export function playFoulBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 180, durationMs: 220, type: 'sawtooth', gain: 0.18 });
}
