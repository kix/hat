import { IconPlus } from '@tabler/icons-react';
import { Button, Stack, Text } from '@mantine/core';
import { MAX_TEAMS, MIN_TEAMS, type HatEvent, type Team } from '../../machine/hatMachine';
import { TeamCard } from './TeamCard';
import { useI18n } from '../../i18n/i18n';

interface TeamListProps {
  teams: Team[];
  send: (event: HatEvent) => void;
  connectedParticipants?: { userId: string; name: string }[];
  gameMode?: 'teams' | 'pairs';
}

export function TeamList({ teams, send, connectedParticipants, gameMode }: TeamListProps) {
  const { t } = useI18n();
  const atMax = teams.length >= MAX_TEAMS;
  const atMin = teams.length <= MIN_TEAMS;

  return (
    <Stack gap="sm">
      {teams.map((team, index) => (
        <TeamCard
          key={team.id}
          team={team}
          teamNumber={index + 1}
          canRemove={!atMin && gameMode !== 'pairs'}
          send={send}
          connectedParticipants={connectedParticipants}
          gameMode={gameMode}
        />
      ))}
      {gameMode !== 'pairs' && (
        !atMax ? (
          <Button variant="outline" leftSection={<IconPlus size={18} />} onClick={() => send({ type: 'ADD_TEAM' })}>
            {t('teamList.addTeam')}
          </Button>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            {t('teamList.maxTeams', { n: MAX_TEAMS })}
          </Text>
        )
      )}
    </Stack>
  );
}
