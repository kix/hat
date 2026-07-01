import { Group } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { RoundTimer } from './RoundTimer';
import { HatCountBadge } from './HatCountBadge';
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
      </Group>

      <WordDisplay word={context.currentWord.word} />

      <ActionButtons allowSkip={context.settings.allowSkip} send={send} />
    </div>
  );
}
