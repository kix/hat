import { useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { hatMachine, type Settings } from './machine/hatMachine';
import { useGameSounds } from './sounds/useGameSounds';
import { vibrate } from './utils/haptics';
import { SetupScreen } from './components/setup/SetupScreen';
import { RoundIntroScreen } from './components/roundIntro/RoundIntroScreen';
import { RoundPlayingScreen } from './components/roundPlaying/RoundPlayingScreen';
import { GameOverScreen } from './components/gameOver/GameOverScreen';

function App() {
  const sounds = useGameSounds();
  // The provided actions below are captured once (see the useMemo below) and
  // called later from inside the machine, so they read the latest settings
  // through this ref rather than closing over a stale snapshot.
  const settingsRef = useRef<Settings | null>(null);

  const machine = useMemo(
    () =>
      hatMachine.provide({
        actions: {
          playRoundStartSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playRoundStart();
          },
          playTickSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playTick();
            if (settingsRef.current?.vibrationEnabled) vibrate(10);
          },
          playGuessedSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playGuessed();
          },
          playLowHatGuessedSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playLowHatGuessed();
          },
          playSkipSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playSkip();
          },
          playFoulSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playFoul();
          },
          playGameOverSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playGameOver();
          },
        },
      }),
    [sounds],
  );
  const [state, send] = useMachine(machine);
  settingsRef.current = state.context.settings;

  if (state.matches('setup')) return <SetupScreen context={state.context} send={send} />;
  if (state.matches('roundIntro')) return <RoundIntroScreen context={state.context} send={send} />;
  if (state.matches('roundPlaying')) return <RoundPlayingScreen context={state.context} send={send} />;
  if (state.matches('gameOver')) return <GameOverScreen context={state.context} send={send} />;
  return null;
}

export default App;
