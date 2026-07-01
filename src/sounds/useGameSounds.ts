import { useCallback, useRef } from 'react';
import { playFoulBeep, playGuessedBeep, playLowHatGuessedBeep, playSkipBeep, playTickBeep } from './beeps';

export interface GameSounds {
  playTick: () => void;
  playGuessed: () => void;
  playLowHatGuessed: () => void;
  playSkip: () => void;
  playFoul: () => void;
}

export function useGameSounds(): GameSounds {
  const contextRef = useRef<AudioContext | null>(null);

  const withContext = useCallback((play: (ctx: AudioContext) => void) => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    const ctx = contextRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    play(ctx);
  }, []);

  const playTick = useCallback(() => withContext(playTickBeep), [withContext]);
  const playGuessed = useCallback(() => withContext(playGuessedBeep), [withContext]);
  const playLowHatGuessed = useCallback(() => withContext(playLowHatGuessedBeep), [withContext]);
  const playSkip = useCallback(() => withContext(playSkipBeep), [withContext]);
  const playFoul = useCallback(() => withContext(playFoulBeep), [withContext]);

  return { playTick, playGuessed, playLowHatGuessed, playSkip, playFoul };
}
