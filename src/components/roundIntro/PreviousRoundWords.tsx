import { Card, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getLastRoundRecap } from '../../utils/stats';

interface PreviousRoundWordsProps {
  context: HatContext;
}

export function PreviousRoundWords({ context }: PreviousRoundWordsProps) {
  const recap = getLastRoundRecap(context.teams, context.history, context.currentTeamIndex);
  if (!recap) return null;

  return (
    <Card withBorder padding="md">
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Раунд команды «{recap.team.name}» завершён
        </Text>
        <Title order={4}>Угаданные слова</Title>
        {recap.guessed.length > 0 ? (
          <Text fw={500}>{recap.guessed.map((record) => record.word).join(', ')}</Text>
        ) : (
          <Text c="dimmed">Ничего не угадано 🙈</Text>
        )}
      </Stack>
    </Card>
  );
}
