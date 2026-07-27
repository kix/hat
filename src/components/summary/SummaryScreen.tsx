import { useEffect, useState } from 'react';
import { Button, Card, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconCalendar } from '@tabler/icons-react';
import { useAuthSession } from '../../auth/useAuthSession';
import { GameSummaryView } from '../gameOver/GameSummaryView';
import { fetchSummary, summaryTotals, type GameSummary } from '../../summary/summaryData';
import { useI18n } from '../../i18n/i18n';

interface SummaryScreenProps {
  summaryId: string;
  // Clears the ?summary= param and drops back to the app.
  onClose: () => void;
}

// Standalone, shareable, read-only view of a daily game digest reached via a
// ?summary=<uuid> link (the one Telegram DMs). Anyone with the link can open
// it; a viewer logged in via Telegram sees their own rows highlighted.
export function SummaryScreen({ summaryId, onClose }: SummaryScreenProps) {
  const { t, lang } = useI18n();
  const session = useAuthSession();
  const viewerId = session?.user?.id;
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [summary, setSummary] = useState<GameSummary | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    void (async () => {
      try {
        const result = await fetchSummary(summaryId);
        if (!active) return;
        setSummary(result);
        setState('ready');
      } catch (err) {
        console.error('Не удалось загрузить сводку игр:', err);
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [summaryId]);

  const dateLabel = summary
    ? new Date(summary.summaryDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const totals = summary ? summaryTotals(summary, viewerId) : { games: 0, wins: 0 };

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onClose}>
            {t('summary.backToGame')}
          </Button>
        </Group>

        {state === 'loading' && (
          <Stack align="center" gap="md" py="xl">
            <Loader size="xl" />
            <Text c="dimmed">{t('summaryScreen.loadingSummary')}</Text>
          </Stack>
        )}

        {state === 'error' && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>{t('summaryScreen.loadFailed')}</Text>
            <Text size="sm" c="dimmed">
              {t('summary.tryLater')}
            </Text>
          </Card>
        )}

        {state === 'ready' && (!summary || summary.games.length === 0) && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>{t('summaryScreen.notFound')}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryScreen.notFoundDesc')}
            </Text>
          </Card>
        )}

        {state === 'ready' && summary && summary.games.length > 0 && (
          <>
            <Stack gap={4}>
              <Title order={1} size={30} fw={800} style={{ letterSpacing: -0.5 }}>
                {t('summaryScreen.dayTitle')}
              </Title>
              <Group gap="xs" c="dimmed">
                <IconCalendar size={16} />
                <Text size="sm">{dateLabel}</Text>
              </Group>
            </Stack>

            <Card withBorder padding="md" radius="md">
              <Group justify="space-around">
                <Stack gap={0} align="center">
                  <Title order={2} c="blue">
                    {totals.games}
                  </Title>
                  <Text size="xs" c="dimmed" fw={600}>
                    {totals.games === 1 ? t('summaryScreen.gameSingular') : t('summaryScreen.gamePlural')}
                  </Text>
                </Stack>
                {viewerId && (
                  <Stack gap={0} align="center">
                    <Title order={2} c="teal">
                      {totals.wins}
                    </Title>
                    <Text size="xs" c="dimmed" fw={600}>
                      {t('summaryScreen.yourWins')}
                    </Text>
                  </Stack>
                )}
              </Group>
              {!viewerId && (
                <Text size="xs" c="dimmed" ta="center" mt="sm">
                  {t('summaryScreen.loginToHighlight')}
                </Text>
              )}
            </Card>

            {summary.games.map((game, index) => (
              <Stack key={game.id} gap="sm">
                <Divider
                  label={
                    summary.games.length > 1
                      ? t('summaryScreen.gameN', { n: index + 1 })
                      : t('summaryScreen.results')
                  }
                  labelPosition="center"
                />
                <GameSummaryView
                  teams={game.teams}
                  history={game.history}
                  settings={game.settings}
                  highlightPlayerId={viewerId}
                />
              </Stack>
            ))}
          </>
        )}
      </Stack>
    </Container>
  );
}
