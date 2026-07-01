import { useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { hatMachine, type HatContext, type Settings } from './machine/hatMachine';
import { useGameSounds } from './sounds/useGameSounds';
import { vibrate } from './utils/haptics';
import { rememberPlayerName } from './utils/playerNamesStore';
import { ScreenTransition } from './components/ScreenTransition';
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
          rememberPlayerNames: ({ context }: { context: HatContext }) => {
            for (const team of context.teams) {
              for (const player of team.players) {
                rememberPlayerName(player.name);
              }
            }
          },
        },
      }),
    [sounds],
  );
  const [state, send] = useMachine(machine);
  settingsRef.current = state.context.settings;

  // The dictionary is ~2.7MB, so it's split into its own chunk and fetched
  // only once the UI has already painted, instead of blocking the initial
  // bundle. START_GAME stays disabled (with a spinner) until this resolves.
  useEffect(() => {
    void import('./data/dictionary').then((module) => {
      send({ type: 'DICTIONARY_LOADED', entries: module.dictionary });
    });
  }, [send]);

  if (state.matches('setup'))
    return (
      <ScreenTransition key="setup">
        <SetupScreen context={state.context} send={send} />
      </ScreenTransition>
    );
  if (state.matches('roundIntro'))
    return (
      <ScreenTransition key="roundIntro">
        <RoundIntroScreen context={state.context} send={send} />
      </ScreenTransition>
    );
  if (state.matches('roundPlaying'))
    return (
      <ScreenTransition key="roundPlaying">
        <RoundPlayingScreen context={state.context} send={send} />
      </ScreenTransition>
    );
  if (state.matches('gameOver'))
    return (
      <ScreenTransition key="gameOver">
        <GameOverScreen context={state.context} send={send} />
      </ScreenTransition>
    );
  return null;
}

export default App;
