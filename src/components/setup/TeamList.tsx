import { Button, Stack } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';
import { TeamCard } from './TeamCard';

interface TeamListProps {
  teams: Team[];
  send: (event: HatEvent) => void;
}

export function TeamList({ teams, send }: TeamListProps) {
  return (
    <Stack gap="sm">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} send={send} />
      ))}
      <Button variant="outline" onClick={() => send({ type: 'ADD_TEAM' })}>
        + Добавить команду
      </Button>
    </Stack>
  );
}
