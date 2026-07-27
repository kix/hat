import { useEffect, useState } from 'react';
import { Button, Card, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconCalendar } from '@tabler/icons-react';
import { useAuthSession } from '../../auth/useAuthSession';
import { GameSummaryView } from '../gameOver/GameSummaryView';
import { fetchSummary, summaryTotals, type GameSummary } from '../../summary/summaryData';

interface SummaryScreenProps {
  summaryId: string;
  // Clears the ?summary= param and drops back to the app.
  onClose: () => void;
}

// Standalone, shareable, read-only view of a daily game digest reached via a
// ?summary=<uuid> link (the one Telegram DMs). Anyone with the link can open
// it; a viewer logged in via Telegram sees their own rows highlighted.
export function SummaryScreen({ summaryId, onClose }: SummaryScreenProps) {
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
    ? new Date(summary.summaryDate).toLocaleDateString('ru-RU', {
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
            В игру
          </Button>
        </Group>

        {state === 'loading' && (
          <Stack align="center" gap="md" py="xl">
            <Loader size="xl" />
            <Text c="dimmed">Загрузка сводки...</Text>
          </Stack>
        )}

        {state === 'error' && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>Не удалось загрузить сводку</Text>
            <Text size="sm" c="dimmed">
              Попробуйте открыть ссылку ещё раз позже.
            </Text>
          </Card>
        )}

        {state === 'ready' && (!summary || summary.games.length === 0) && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>Сводка не найдена</Text>
            <Text size="sm" c="dimmed">
              Ссылка недействительна или за этот день не было игр.
            </Text>
          </Card>
        )}

        {state === 'ready' && summary && summary.games.length > 0 && (
          <>
            <Stack gap={4}>
              <Title order={1} size={30} fw={800} style={{ letterSpacing: -0.5 }}>
                Итоги дня в Шляпе
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
                    {totals.games === 1 ? 'ИГРА' : 'ИГР'}
                  </Text>
                </Stack>
                {viewerId && (
                  <Stack gap={0} align="center">
                    <Title order={2} c="teal">
                      {totals.wins}
                    </Title>
                    <Text size="xs" c="dimmed" fw={600}>
                      ВАШИХ ПОБЕД
                    </Text>
                  </Stack>
                )}
              </Group>
              {!viewerId && (
                <Text size="xs" c="dimmed" ta="center" mt="sm">
                  Войдите через Telegram, чтобы увидеть свою статистику выделенной.
                </Text>
              )}
            </Card>

            {summary.games.map((game, index) => (
              <Stack key={game.id} gap="sm">
                <Divider
                  label={summary.games.length > 1 ? `Игра ${index + 1}` : 'Результаты'}
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
