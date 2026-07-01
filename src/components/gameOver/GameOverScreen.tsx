import { Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getBestPlayer, getEasiestWord, getHardestWord } from '../../utils/stats';
import { ResultBanner } from './ResultBanner';
import { StatCard } from './StatCard';
import { HintedWordsCard } from './HintedWordsCard';
import { PlayAgainButton } from './PlayAgainButton';

interface GameOverScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function GameOverScreen({ context, send }: GameOverScreenProps) {
  const bestPlayer = getBestPlayer(context.teams, context.history);
  const hardestWord = getHardestWord(context.history);
  const easiestWord = getEasiestWord(context.history);

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          Игра окончена
        </Title>

        <ResultBanner context={context} />

        <SimpleGrid cols={1} spacing="sm">
          {bestPlayer && (
            <StatCard title="Лучший игрок">
              <Text fw={600}>{bestPlayer.player.name}</Text>
              <Text size="sm" c="dimmed">
                {bestPlayer.team.name} · {bestPlayer.guessedCount} угаданных слов
              </Text>
            </StatCard>
          )}

          {hardestWord && (
            <StatCard title="Самое сложное слово">
              <Text fw={600}>{hardestWord.word}</Text>
              <Text size="sm" c="dimmed">
                {(hardestWord.timeMs / 1000).toFixed(1)} сек
              </Text>
            </StatCard>
          )}

          {easiestWord && (
            <StatCard title="Самое простое слово">
              <Text fw={600}>{easiestWord.word}</Text>
              <Text size="sm" c="dimmed">
                {(easiestWord.timeMs / 1000).toFixed(1)} сек
              </Text>
            </StatCard>
          )}
        </SimpleGrid>

        <HintedWordsCard context={context} />

        <PlayAgainButton send={send} />
      </Stack>
    </Container>
  );
}
