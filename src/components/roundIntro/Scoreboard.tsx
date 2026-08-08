import { Badge, Group, Stack, Text } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';
import { useI18n } from '../../i18n/i18n';

interface ScoreboardProps {
  context: HatContext;
}

export function Scoreboard({ context }: ScoreboardProps) {
  const { t } = useI18n();
  const isPairs = context.settings.gameMode === 'pairs';
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
