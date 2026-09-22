import { Badge, Group, Stack, Text } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';
import { getIndividualLeaderboard } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface ScoreboardProps {
  context: HatContext;
}

export function Scoreboard({ context }: ScoreboardProps) {
  const { t } = useI18n();
  const isPairs = context.settings.gameMode === 'pairs';
  const isIndividual = context.settings.gameMode === 'individual';

  const individualLeaderboard = isIndividual
    ? getIndividualLeaderboard(
        context.individualPlayers ||
          Array.from(new Map(context.teams.flatMap((t) => t.players).map((p) => [p.id, p])).values()),
        context.history,
      )
    : [];

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {t('roundIntro.wordsInHat', { n: context.hat.length })}
      </Text>
      {isPairs ? (
        <Group justify="space-between">
          <Text>{t('roundIntro.scoreTitle')}</Text>
          <Badge variant="light" size="lg">
            {getTeamScore(context.history, context.teams[0]?.id || '')}
          </Badge>
        </Group>
      ) : isIndividual ? (
        individualLeaderboard.map((item) => (
          <Group key={item.player.id} justify="space-between">
            <Text>{item.player.name}</Text>
            <Badge variant="light" size="lg">
              {item.score}
            </Badge>
          </Group>
        ))
      ) : (
        context.teams.map((team) => (
          <Group key={team.id} justify="space-between">
            <Text>{team.name}</Text>
            <Badge variant="light" size="lg">
              {getTeamScore(context.history, team.id)}
            </Badge>
          </Group>
        ))
      )}
    </Stack>
  );
}
