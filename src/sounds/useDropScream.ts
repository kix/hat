import { useEffect, useRef } from 'react';
import { getTelegramWebApp } from '../utils/telegramWebApp';
import { playScreamSound } from './scream';

/**
 * Hook that listens to the accelerometer (via Telegram Mini App Accelerometer API,
 * with standard DeviceMotion API fallback) and plays a dramatic scream if the phone
 * is dropped into free fall.
 */
export function useDropScream(): void {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScreamRef = useRef<number>(0);
  const freeFallCountRef = useRef<number>(0);
  const lastFreeFallTimeRef = useRef<number>(0);

  useEffect(() => {
    // Shared audio context initializer on first user gesture
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    };

    window.addEventListener('pointerdown', initAudio, { once: true, passive: true });
    window.addEventListener('touchstart', initAudio, { once: true, passive: true });
    window.addEventListener('keydown', initAudio, { once: true, passive: true });

    const triggerScream = () => {
      const now = Date.now();
      if (now - lastScreamRef.current < 2500) return; // 2.5s cooldown
      lastScreamRef.current = now;

      initAudio();
      if (audioCtxRef.current) {
        try {
          playScreamSound(audioCtxRef.current);
        } catch (err) {
          console.warn('Failed to play drop scream:', err);
        }
      }
    };

    const processAcceleration = (x: number, y: number, z: number) => {
      const mag = Math.hypot(x, y, z);
      const now = Date.now();

      // Free fall detection: in free fall, acceleration approaches 0 (weightlessness).
      // Standard gravity is ~9.8 m/s² or 1.0 G.
      const isFreeFall = mag < 2.5 || (mag > 0.001 && mag < 0.25);

      if (isFreeFall) {
        freeFallCountRef.current += 1;
        lastFreeFallTimeRef.current = now;

        // Trigger scream on sustained free fall (at least 2 consecutive readings ~60-100ms)
        if (freeFallCountRef.current >= 2) {
          triggerScream();
        }
      } else {
        // High-G sudden impact / catch immediately following free fall
        const wasRecentlyFalling = now - lastFreeFallTimeRef.current < 400;
        const isImpact = (mag > 28 || (mag > 2.8 && mag < 10.0)) && wasRecentlyFalling;

        if (isImpact) {
          triggerScream();
        }

        freeFallCountRef.current = 0;
      }
    };

    // 1. Telegram Mini App Accelerometer API
    const tg = getTelegramWebApp();
    let tgTracking = false;

    const handleTgAcc = () => {
      if (!tg?.Accelerometer) return;
      const { x = 0, y = 0, z = 0 } = tg.Accelerometer;
      processAcceleration(x, y, z);
    };

    if (tg?.Accelerometer && typeof tg.Accelerometer.start === 'function') {
      try {
        tg.Accelerometer.start({ refresh_rate: 50 });
        tg.onEvent('accelerometerChanged', handleTgAcc);
        tgTracking = true;
      } catch (err) {
        console.warn('Telegram accelerometer error:', err);
      }
    }

    // 2. Standard Web DeviceMotion fallback
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      // If Telegram accelerometer is already active and reporting, let it handle or complement
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        processAcceleration(acc.x, acc.y, acc.z);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('devicemotion', handleDeviceMotion);

      if (tgTracking && tg?.Accelerometer) {
        try {
          tg.offEvent('accelerometerChanged', handleTgAcc);
          if (typeof tg.Accelerometer.stop === 'function') {
            tg.Accelerometer.stop();
          }
        } catch {
          // Ignore cleanup errors
        }
      }

      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, []);
}
