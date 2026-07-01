import { Card, Group, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';
import { sortTeamsByScore } from '../../utils/stats';

interface ResultBannerProps {
  context: HatContext;
}

export function ResultBanner({ context }: ResultBannerProps) {
  const [winner, ...rest] = sortTeamsByScore(context.teams, context.history);
  const loser = rest[rest.length - 1];

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Stack gap={0} align="center">
          <Text size="sm" c="dimmed">
            Победитель
          </Text>
          <Title order={2}>{winner.name}</Title>
          <Text>{getTeamScore(context.history, winner.id)} очков</Text>
        </Stack>
        {loser && loser.id !== winner.id && (
          <Group justify="center">
            <Text c="dimmed">
              {loser.name}: {getTeamScore(context.history, loser.id)} очков
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
