import { useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { hatMachine } from './machine/hatMachine';
import { useGameSounds } from './sounds/useGameSounds';
import { vibrate } from './utils/haptics';
import { SetupScreen } from './components/setup/SetupScreen';
import { RoundIntroScreen } from './components/roundIntro/RoundIntroScreen';
import { RoundPlayingScreen } from './components/roundPlaying/RoundPlayingScreen';
import { GameOverScreen } from './components/gameOver/GameOverScreen';

function App() {
  const sounds = useGameSounds();
  const machine = useMemo(
    () =>
      hatMachine.provide({
        actions: {
          playTickSound: () => {
            sounds.playTick();
            vibrate(10);
          },
          playGuessedSound: sounds.playGuessed,
          playLowHatGuessedSound: sounds.playLowHatGuessed,
          playSkipSound: sounds.playSkip,
          playFoulSound: sounds.playFoul,
          playGameOverSound: sounds.playGameOver,
        },
      }),
    [sounds],
  );
  const [state, send] = useMachine(machine);

  if (state.matches('setup')) return <SetupScreen context={state.context} send={send} />;
  if (state.matches('roundIntro')) return <RoundIntroScreen context={state.context} send={send} />;
  if (state.matches('roundPlaying')) return <RoundPlayingScreen context={state.context} send={send} />;
  if (state.matches('gameOver')) return <GameOverScreen context={state.context} send={send} />;
  return null;
}

export default App;
