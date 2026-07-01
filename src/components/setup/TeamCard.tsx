import { ActionIcon, Card, Group, Stack, TextInput } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';

interface TeamCardProps {
  team: Team;
  send: (event: HatEvent) => void;
}

export function TeamCard({ team, send }: TeamCardProps) {
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
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
            🎲
          </ActionIcon>
          <ActionIcon
            aria-label="Удалить команду"
            variant="light"
            color="red"
            size="lg"
            onClick={() => send({ type: 'REMOVE_TEAM', teamId: team.id })}
          >
            ✕
          </ActionIcon>
        </Group>
        <Group gap="xs" grow>
          {team.players.map((player, index) => (
            <TextInput
              key={player.id}
              aria-label={`Игрок ${index + 1}`}
              placeholder={`Игрок ${index + 1}`}
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
