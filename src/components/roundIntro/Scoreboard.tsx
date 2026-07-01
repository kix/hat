import { Badge, Group, Stack, Text } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';

interface ScoreboardProps {
  context: HatContext;
}

export function Scoreboard({ context }: ScoreboardProps) {
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        Слов в шляпе: {context.hat.length}
      </Text>
      {context.teams.map((team) => (
        <Group key={team.id} justify="space-between">
          <Text>{team.name}</Text>
          <Badge variant="light" size="lg">
            {getTeamScore(context.history, team.id)}
          </Badge>
        </Group>
      ))}
    </Stack>
  );
}
