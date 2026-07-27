import { Card, Group, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';
import { sortTeamsByScore } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface ResultBannerProps {
  context: HatContext;
}

export function ResultBanner({ context }: ResultBannerProps) {
  const { t } = useI18n();
  const [winner, ...rest] = sortTeamsByScore(context.teams, context.history);
  const loser = rest[rest.length - 1];

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Stack gap={0} align="center">
          <Text size="sm" c="dimmed">
            {t('resultBanner.winner')}
          </Text>
          <Title order={2}>{winner.name}</Title>
          <Text>{t('common.points', { n: getTeamScore(context.history, winner.id) })}</Text>
        </Stack>
        {loser && loser.id !== winner.id && (
          <Group justify="center">
            <Text c="dimmed">
              {loser.name}: {t('common.points', { n: getTeamScore(context.history, loser.id) })}
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
