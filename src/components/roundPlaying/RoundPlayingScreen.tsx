import { Group } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getCurrentRoundGuessedCount } from '../../utils/stats';
import { RoundTimer } from './RoundTimer';
import { HatCountBadge } from './HatCountBadge';
import { RoundGuessedCount } from './RoundGuessedCount';
import { WordDisplay } from './WordDisplay';
import { ActionButtons } from './ActionButtons';

interface RoundPlayingScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function RoundPlayingScreen({ context, send }: RoundPlayingScreenProps) {
  if (!context.currentWord) return null;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Group justify="center" align="center" gap="lg" py="md">
        <HatCountBadge hatLength={context.hat.length} />
        <RoundTimer timeRemainingSec={context.timeRemainingSec} roundDurationSec={context.settings.roundDurationSec} />
        <RoundGuessedCount count={getCurrentRoundGuessedCount(context.teams, context.history, context.currentTeamIndex)} />
      </Group>

      <WordDisplay word={context.currentWord.word} />

      <ActionButtons
        allowSkip={context.settings.allowSkip}
        vibrationEnabled={context.settings.vibrationEnabled}
        send={send}
      />
    </div>
  );
}
