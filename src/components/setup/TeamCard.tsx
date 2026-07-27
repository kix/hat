import { IconDice5, IconTrash } from '@tabler/icons-react';
import { ActionIcon, Autocomplete, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';
import { getStoredPlayerNames } from '../../utils/playerNamesStore';
import { getDuplicateNameReason } from '../../utils/setupValidity';
import { useI18n } from '../../i18n/i18n';

interface TeamCardProps {
  team: Team;
  teamNumber: number;
  canRemove: boolean;
  send: (event: HatEvent) => void;
  connectedParticipants?: { userId: string; name: string }[];
}

const MIN_CHARS_FOR_SUGGESTIONS = 2;

export function TeamCard({ team, teamNumber, canRemove, send, connectedParticipants }: TeamCardProps) {
  const { t } = useI18n();
  const duplicateNameReason = getDuplicateNameReason(team);

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          {t('teamCard.team', { n: teamNumber })}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            aria-label={t('teamCard.teamName')}
            placeholder={t('teamCard.teamName')}
            value={team.name}
            onChange={(event) => send({ type: 'UPDATE_TEAM_NAME', teamId: team.id, name: event.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <ActionIcon
            aria-label={t('teamCard.regenerate')}
            variant="light"
            size="lg"
            onClick={() => send({ type: 'REGENERATE_TEAM_NAME', teamId: team.id })}
          >
            <IconDice5 size={20} />
          </ActionIcon>
          <ActionIcon
            aria-label={t('teamCard.removeTeam')}
            variant="light"
            color="red"
            size="lg"
            disabled={!canRemove}
            onClick={() => send({ type: 'REMOVE_TEAM', teamId: team.id })}
          >
            <IconTrash size={20} />
          </ActionIcon>
        </Group>
        <Group gap="xs" grow>
          {team.players.map((player, index) => {
            const participantNames = (connectedParticipants || []).map((p) => p.name);
            const suggestions = Array.from(
              new Set([
                ...participantNames,
                ...(player.name.trim().length >= MIN_CHARS_FOR_SUGGESTIONS ? getStoredPlayerNames() : []),
              ])
            );

            return (
              <Autocomplete
                key={player.id}
                aria-label={t('default.playerN', { n: index + 1 })}
                placeholder={t('default.playerN', { n: index + 1 })}
                description={
                  player.name.trim().length === 0 ? t('teamCard.anon') : (duplicateNameReason ?? undefined)
                }
                value={player.name}
                data={suggestions}
                onChange={(value) => {
                  const matched = (connectedParticipants || []).find(
                    (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase()
                  );
                  send({
                    type: 'UPDATE_PLAYER_NAME',
                    teamId: team.id,
                    playerId: player.id,
                    name: value,
                    newPlayerId: matched?.userId,
                  });
                }}
              />
            );
          })}
        </Group>
      </Stack>
    </Card>
  );
}
