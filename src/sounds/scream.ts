import { vibrate } from '../utils/haptics';
import { getTelegramWebApp } from '../utils/telegramWebApp';

/**
 * Synthesizes a cartoon/dramatic scream sound using the Web Audio API.
 * Uses FM vibrato, vocal formant filters, breath noise and soft overdrive.
 */
export function playScreamSound(ctx: AudioContext): void {
  const startAt = ctx.currentTime;
  const duration = 1.3;
  const stopAt = startAt + duration;

  // Master Gain for scream
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, startAt);
  // Fast attack (screaming onset)
  masterGain.gain.exponentialRampToValueAtTime(0.45, startAt + 0.06);
  // High sustain with slight swell
  masterGain.gain.setValueAtTime(0.45, startAt + 0.35);
  // Fade out down to silence
  masterGain.gain.exponentialRampToValueAtTime(0.001, stopAt);

  // Soft distortion / saturation curve for vocal cord overdrive
  const distortion = ctx.createWaveShaper();
  const nSamples = 256;
  const curve = new Float32Array(nSamples);
  const k = 4; // subtle overdrive
  for (let i = 0; i < nSamples; ++i) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  distortion.curve = curve;
  distortion.oversample = '2x';

  // LFO for frantic vocal vibrato / throat tremble
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 32; // 32 Hz throat tremble
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60; // 60 Hz pitch jitter depth
  lfo.connect(lfoGain);

  // Main vocal pitch envelope (Doppler cartoon scream: sudden rise up to terror pitch then long descending drop)
  // Pitch goes: 450Hz -> 880Hz -> slides down to 240Hz
  const createVoiceOsc = (type: OscillatorType, detune: number, gainVal: number) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;

    osc.frequency.setValueAtTime(450, startAt);
    osc.frequency.exponentialRampToValueAtTime(880, startAt + 0.08);
    osc.frequency.setValueAtTime(880, startAt + 0.25);
    osc.frequency.exponentialRampToValueAtTime(240, stopAt);

    lfoGain.connect(osc.frequency);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = gainVal;
    osc.connect(voiceGain);
    osc.start(startAt);
    osc.stop(stopAt);
    return voiceGain;
  };

  // Formant filters to shape vowel "AAAAH!" (vocal tract resonance around 850Hz and 2300Hz)
  const formant1 = ctx.createBiquadFilter();
  formant1.type = 'bandpass';
  formant1.frequency.setValueAtTime(900, startAt);
  formant1.frequency.exponentialRampToValueAtTime(600, stopAt);
  formant1.Q.value = 3.5;

  const formant2 = ctx.createBiquadFilter();
  formant2.type = 'bandpass';
  formant2.frequency.setValueAtTime(2400, startAt);
  formant2.frequency.exponentialRampToValueAtTime(1600, stopAt);
  formant2.Q.value = 4.0;

  // Mix 3 oscillators: Sawtooth + Square + Sawtooth detuned
  const osc1 = createVoiceOsc('sawtooth', 0, 0.4);
  const osc2 = createVoiceOsc('square', 8, 0.25);
  const osc3 = createVoiceOsc('sawtooth', -14, 0.35);

  const voiceBus = ctx.createGain();
  osc1.connect(voiceBus);
  osc2.connect(voiceBus);
  osc3.connect(voiceBus);

  voiceBus.connect(formant1);
  voiceBus.connect(formant2);

  // Noise generator for screaming breath / rushing air
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.8);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.7);

    whiteNoise.connect(noiseFilter).connect(noiseGain);
    noiseGain.connect(distortion);
    whiteNoise.start(startAt);
    whiteNoise.stop(startAt + 0.8);
  } catch {
    // Noise buffer fallback if context doesn't support createBuffer in current state
  }

  // Connect through distortion and master gain
  formant1.connect(distortion);
  formant2.connect(distortion);

  distortion.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start(startAt);
  lfo.stop(stopAt);

  // Haptic terror feedback
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('error');
    } else {
      vibrate([100, 50, 100, 50, 200]);
    }
  } catch {
    // Ignore haptic errors
  }
}
