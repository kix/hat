import { IconDice5, IconTrash } from '@tabler/icons-react';
import { ActionIcon, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';

interface TeamCardProps {
  team: Team;
  teamNumber: number;
  send: (event: HatEvent) => void;
}

export function TeamCard({ team, teamNumber, send }: TeamCardProps) {
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Команда {teamNumber}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            aria-label="Название команды"
            placeholder="Название команды"
            value={team.name}
            onChange={(event) => send({ type: 'UPDATE_TEAM_NAME', teamId: team.id, name: event.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <ActionIcon
            aria-label="Придумать новое название"
            variant="light"
            size="lg"
            onClick={() => send({ type: 'REGENERATE_TEAM_NAME', teamId: team.id })}
          >
            <IconDice5 size={20} />
          </ActionIcon>
          <ActionIcon
            aria-label="Удалить команду"
            variant="light"
            color="red"
            size="lg"
            onClick={() => send({ type: 'REMOVE_TEAM', teamId: team.id })}
          >
            <IconTrash size={20} />
          </ActionIcon>
        </Group>
        <Group gap="xs" grow>
          {team.players.map((player, index) => (
            <TextInput
              key={player.id}
              aria-label={`Игрок ${index + 1}`}
              placeholder={`Игрок ${index + 1}`}
              description={player.name.trim().length === 0 ? 'Вы не представились!' : undefined}
              value={player.name}
              onChange={(event) =>
                send({
                  type: 'UPDATE_PLAYER_NAME',
                  teamId: team.id,
                  playerId: player.id,
                  name: event.currentTarget.value,
                })
              }
            />
          ))}
        </Group>
      </Stack>
    </Card>
  );
}
