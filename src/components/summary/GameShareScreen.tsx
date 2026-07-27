import { useEffect, useState } from 'react';
import { Button, Card, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAuthSession } from '../../auth/useAuthSession';
import { GameSummaryView } from '../gameOver/GameSummaryView';
import { ShareGameButton } from './ShareGameButton';
import { fetchGame, type SummaryGame } from '../../summary/summaryData';

interface GameShareScreenProps {
  gameId: string;
  onClose: () => void;
}

// Standalone, shareable, read-only view of a single finished game reached via
// a ?game=<uuid> link (the "Share to Telegram" button produces these). Opens
// for anyone; a viewer logged in via Telegram sees their own rows highlighted.
export function GameShareScreen({ gameId, onClose }: GameShareScreenProps) {
  const session = useAuthSession();
  const viewerId = session?.user?.id;
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [game, setGame] = useState<SummaryGame | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    void (async () => {
      try {
        const result = await fetchGame(gameId);
        if (!active) return;
        setGame(result);
        setState('ready');
      } catch (err) {
        console.error('Не удалось загрузить игру:', err);
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [gameId]);

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
            <Text c="dimmed">Загрузка игры...</Text>
          </Stack>
        )}

        {state === 'error' && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>Не удалось загрузить игру</Text>
            <Text size="sm" c="dimmed">
              Попробуйте открыть ссылку ещё раз позже.
            </Text>
          </Card>
        )}

        {state === 'ready' && !game && (
          <Card withBorder padding="lg" radius="md" ta="center">
            <Text fw={600}>Игра не найдена</Text>
            <Text size="sm" c="dimmed">
              Ссылка недействительна или игра была удалена.
            </Text>
          </Card>
        )}

        {state === 'ready' && game && (
          <>
            <Title order={1} size={30} fw={800} ta="center" style={{ letterSpacing: -0.5 }}>
              Итоги игры
            </Title>
            <GameSummaryView
              teams={game.teams}
              history={game.history}
              settings={game.settings}
              highlightPlayerId={viewerId}
            />
            <Divider />
            <ShareGameButton gameId={game.id} />
          </>
        )}
      </Stack>
    </Container>
  );
}
