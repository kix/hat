import { useCallback, useRef } from 'react';
import {
  playFoulBeep,
  playGameOverBeep,
  playGuessedBeep,
  playLowHatGuessedBeep,
  playRoundStartBeep,
  playSkipBeep,
  playTickBeep,
} from './beeps';

export interface GameSounds {
  playRoundStart: () => void;
  playTick: () => void;
  playGuessed: () => void;
  playLowHatGuessed: () => void;
  playSkip: () => void;
  playFoul: () => void;
  playGameOver: () => void;
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

  const playRoundStart = useCallback(() => withContext(playRoundStartBeep), [withContext]);
  const playTick = useCallback(() => withContext(playTickBeep), [withContext]);
  const playGuessed = useCallback(() => withContext(playGuessedBeep), [withContext]);
  const playLowHatGuessed = useCallback(() => withContext(playLowHatGuessedBeep), [withContext]);
  const playSkip = useCallback(() => withContext(playSkipBeep), [withContext]);
  const playFoul = useCallback(() => withContext(playFoulBeep), [withContext]);
  const playGameOver = useCallback(() => withContext(playGameOverBeep), [withContext]);

  return { playRoundStart, playTick, playGuessed, playLowHatGuessed, playSkip, playFoul, playGameOver };
}
