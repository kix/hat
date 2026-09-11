import { describe, it, expect, vi } from 'vitest';
import { playScreamSound } from './scream';

describe('playScreamSound', () => {
  it('connects nodes and starts oscillators without throwing', () => {
    const createdOscillators: any[] = [];
    const createdGains: any[] = [];
    const createdFilters: any[] = [];

    const mockCtx = {
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      createGain: vi.fn(() => {
        const g = {
          gain: {
            value: 1,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn().mockReturnThis(),
        };
        createdGains.push(g);
        return g;
      }),
      createOscillator: vi.fn(() => {
        const osc = {
          type: 'sine',
          frequency: {
            value: 0,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: { value: 0 },
          connect: vi.fn().mockReturnThis(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(osc);
        return osc;
      }),
      createBiquadFilter: vi.fn(() => {
        const f = {
          type: 'bandpass',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          Q: { value: 1 },
          connect: vi.fn().mockReturnThis(),
        };
        createdFilters.push(f);
        return f;
      }),
      createWaveShaper: vi.fn(() => ({
        curve: null,
        oversample: 'none',
        connect: vi.fn().mockReturnThis(),
      })),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(100)),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
    } as unknown as AudioContext;

    expect(() => playScreamSound(mockCtx)).not.toThrow();
    expect(createdOscillators.length).toBeGreaterThanOrEqual(4); // 3 voice oscs + 1 LFO
    expect(createdFilters.length).toBeGreaterThanOrEqual(2); // Formants
    createdOscillators.forEach((osc) => {
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });
  });
});
