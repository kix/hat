import { IconPlus } from '@tabler/icons-react';
import { Button, Stack, Text } from '@mantine/core';
import { MAX_TEAMS, type HatEvent, type Team } from '../../machine/hatMachine';
import { TeamCard } from './TeamCard';

interface TeamListProps {
  teams: Team[];
  send: (event: HatEvent) => void;
}

export function TeamList({ teams, send }: TeamListProps) {
  const atMax = teams.length >= MAX_TEAMS;

  return (
    <Stack gap="sm">
      {teams.map((team, index) => (
        <TeamCard key={team.id} team={team} teamNumber={index + 1} send={send} />
      ))}
      {!atMax ? (
        <Button variant="outline" leftSection={<IconPlus size={18} />} onClick={() => send({ type: 'ADD_TEAM' })}>
          Добавить команду
        </Button>
      ) : (
        <Text size="sm" c="dimmed" ta="center">
          Максимум {MAX_TEAMS} команд
        </Text>
      )}
    </Stack>
  );
}
