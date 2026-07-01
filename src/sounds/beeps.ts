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

// A brighter three-note run (instead of guessed's two notes) to signal the
// hat is almost empty — the game is about to end.
export function playLowHatGuessedBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 784, durationMs: 90, type: 'sine', gain: 0.2 });
  beep(ctx, { freq: 988, durationMs: 90, type: 'sine', gain: 0.2, delayMs: 80 });
  beep(ctx, { freq: 1319, durationMs: 160, type: 'sine', gain: 0.22, delayMs: 160 });
}

export function playSkipBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 440, durationMs: 140, type: 'triangle', gain: 0.15 });
}

export function playFoulBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 180, durationMs: 220, type: 'sawtooth', gain: 0.18 });
}

// A short four-note fanfare announcing the game has ended.
export function playGameOverBeep(ctx: AudioContext): void {
  beep(ctx, { freq: 523, durationMs: 150, type: 'triangle', gain: 0.2 });
  beep(ctx, { freq: 659, durationMs: 150, type: 'triangle', gain: 0.2, delayMs: 150 });
  beep(ctx, { freq: 784, durationMs: 150, type: 'triangle', gain: 0.2, delayMs: 300 });
  beep(ctx, { freq: 1047, durationMs: 400, type: 'triangle', gain: 0.22, delayMs: 450 });
}
