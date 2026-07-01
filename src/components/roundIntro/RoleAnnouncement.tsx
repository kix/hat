import { Card, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getCurrentRoles } from '../../utils/roles';

interface RoleAnnouncementProps {
  context: HatContext;
}

export function RoleAnnouncement({ context }: RoleAnnouncementProps) {
  const team = context.teams[context.currentTeamIndex];
  const { describer, guesser } = getCurrentRoles(team, context.settings.rolesMode);

  return (
    <Card withBorder padding="lg">
      <Stack gap={4} align="center">
        <Text size="sm" c="dimmed">
          Ход команды
        </Text>
        <Title order={2} ta="center">
          {team.name}
        </Title>
        <Text ta="center">
          <b>{describer.name}</b> объясняет — <b>{guesser.name}</b> отгадывает
        </Text>
      </Stack>
    </Card>
  );
}
