import { Card, Group, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getTeamScore } from '../../utils/scoring';
import { sortTeamsByScore, getIndividualLeaderboard } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface ResultBannerProps {
  context: HatContext;
}

export function ResultBanner({ context }: ResultBannerProps) {
  const { t } = useI18n();
  const isPairs = context.settings.gameMode === 'pairs';
  const [winner, ...rest] = sortTeamsByScore(context.teams, context.history);
  const loser = rest[rest.length - 1];

  if (isPairs) {
    const totalWords = context.history.filter((w) => w.result === 'guessed').length;
    return (
      <Card withBorder padding="lg">
        <Stack gap={0} align="center">
          <Text size="sm" c="dimmed">
            {t('resultBanner.pairsTitle')}
          </Text>
          <Title order={2}>{t('resultBanner.pairsResult', { n: totalWords })}</Title>
        </Stack>
      </Card>
    );
  }

  if (context.settings.gameMode === 'individual') {
    const players =
      context.individualPlayers ||
      Array.from(new Map(context.teams.flatMap((t) => t.players).map((p) => [p.id, p])).values());
    const leaderboard = getIndividualLeaderboard(players, context.history);
    const champion = leaderboard[0];
    const runnerUp = leaderboard[1];

    return (
      <Card withBorder padding="lg">
        <Stack gap="sm">
          <Stack gap={0} align="center">
            <Text size="sm" c="dimmed">
              {t('resultBanner.individualWinner')}
            </Text>
            <Title order={2}>🥇 {champion?.player.name || ''}</Title>
            <Text>{t('common.points', { n: champion?.score ?? 0 })}</Text>
          </Stack>
          {runnerUp && (
            <Group justify="center">
              <Text c="dimmed">
                🥈 {runnerUp.player.name}: {t('common.points', { n: runnerUp.score })}
              </Text>
            </Group>
          )}
        </Stack>
      </Card>
    );
  }

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
