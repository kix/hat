import { useEffect, useRef, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Badge, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { useAuthSession } from '../../auth/useAuthSession';
import { syncPreferencesToSupabase } from '../../auth/syncPreferences';
import { syncWordTimingsToSupabase } from '../../auth/syncWordTimings';
import { saveGameResult } from '../../auth/saveGame';
import { GameSummaryView } from './GameSummaryView';
import { PlayAgainButton } from './PlayAgainButton';
import { ShareGameButton } from '../summary/ShareGameButton';
import { useI18n } from '../../i18n/i18n';
import { calculateGameXP } from '../../utils/levels';
import { sortTeamsByScore } from '../../utils/stats';

interface GameOverScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  isHost?: boolean;
  participants?: { userId: string; name: string }[];
}

export function GameOverScreen({ context, send, isHost, participants }: GameOverScreenProps) {
  const { t } = useI18n();
  const session = useAuthSession();
  const user = session?.user;
  const isRealUser = !!(user && (!user.is_anonymous || user.user_metadata?.provider === 'telegram'));
  // The id of the persisted game, once saved — enables the share link. Only
  // the saver (local player, or the host in multiplayer) gets it.
  const [savedGameId, setSavedGameId] = useState<string | null>(null);

  const gameXP = useMemo(() => {
    if (!user?.id) return null;
    const sortedTeams = sortTeamsByScore(context.teams, context.history);
    const winnerTeam = sortedTeams[0];
    const userTeam = context.teams.find((tm) =>
      tm.players.some((p) => p.id === user.id || (participants && participants.some((pt) => pt.userId === user.id && pt.name === p.name)))
    );
    const isWinner = Boolean(userTeam && winnerTeam && userTeam.id === winnerTeam.id);
    return calculateGameXP(context.history, user.id, isWinner, userTeam?.name);
  }, [context.teams, context.history, user?.id, participants]);

  useEffect(() => {
    // Первоначальный мощный салют
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } });
    }, 450);

    // Драматичные вспышки конфетти по бокам в течение 3 секунд
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      // Запуски слева и справа
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Runs once per finished game, as soon as the session (if any) is known —
  // session starts out null on mount and fills in shortly after.
  const syncedRef = useRef(false);
  const savedRef = useRef(false);
  useEffect(() => {
    if (session?.user.id && !syncedRef.current) {
      syncedRef.current = true;
      void syncPreferencesToSupabase(session.user.id);
      void syncWordTimingsToSupabase(session.user.id);
    }

    if (session !== undefined && !savedRef.current) {
      savedRef.current = true;
      const isMultiplayer = !!participants && participants.length > 0;
      const shouldSave = !isMultiplayer || isHost;
      if (shouldSave) {
        void saveGameResult(context, participants || [], session?.user?.id).then((id) => {
          if (id) setSavedGameId(id);
        });
      }
    }
  }, [session, isHost, participants, context]);

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          {t('gameOver.title')}
        </Title>

        {isRealUser && gameXP && gameXP.totalXP > 0 && (
          <Card
            withBorder
            padding="md"
            radius="md"
            style={{
              background: 'var(--mantine-color-default-hover)',
              borderLeft: '4px solid var(--mantine-color-yellow-filled)',
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ThemeIcon color="yellow" size="lg" radius="xl" variant="filled">
                    <IconSparkles size={20} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text fw={700} size="md">
                      +{gameXP.totalXP} XP
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('levels.xpEarned')}
                    </Text>
                  </Stack>
                </Group>
                <Badge color="yellow" variant="light" size="md">
                  {t('levels.levelProgression')}
                </Badge>
              </Group>

              <SimpleGrid cols={2} spacing="xs" mt={4}>
                <Group justify="space-between" p="4px 8px" style={{ borderRadius: 4, background: 'var(--mantine-color-default)' }}>
                  <Text size="xs" c="dimmed">{t('levels.partBonus')}</Text>
                  <Text size="xs" fw={700} c="blue">+{gameXP.participationXP} XP</Text>
                </Group>
                {gameXP.victoryXP > 0 && (
                  <Group justify="space-between" p="4px 8px" style={{ borderRadius: 4, background: 'var(--mantine-color-default)' }}>
                    <Text size="xs" c="dimmed">{t('levels.winBonus')}</Text>
                    <Text size="xs" fw={700} c="teal">+{gameXP.victoryXP} XP</Text>
                  </Group>
                )}
                {gameXP.wordsXP > 0 && (
                  <Group justify="space-between" p="4px 8px" style={{ borderRadius: 4, background: 'var(--mantine-color-default)' }}>
                    <Text size="xs" c="dimmed">{t('levels.wordsBonus', { n: gameXP.wordsCount })}</Text>
                    <Text size="xs" fw={700} c="orange">+{gameXP.wordsXP} XP</Text>
                  </Group>
                )}
                {gameXP.fastWordsBonusXP > 0 && (
                  <Group justify="space-between" p="4px 8px" style={{ borderRadius: 4, background: 'var(--mantine-color-default)' }}>
                    <Text size="xs" c="dimmed">{t('levels.fastWordsBonus', { n: gameXP.fastWordsCount })}</Text>
                    <Text size="xs" fw={700} c="yellow">+{gameXP.fastWordsBonusXP} XP</Text>
                  </Group>
                )}
                {gameXP.cleanGameBonusXP > 0 && (
                  <Group justify="space-between" p="4px 8px" style={{ borderRadius: 4, background: 'var(--mantine-color-default)' }}>
                    <Text size="xs" c="dimmed">{t('levels.cleanBonus')}</Text>
                    <Text size="xs" fw={700} c="green">+{gameXP.cleanGameBonusXP} XP</Text>
                  </Group>
                )}
              </SimpleGrid>
            </Stack>
          </Card>
        )}

        <GameSummaryView
          teams={context.teams}
          history={context.history}
          settings={context.settings}
          highlightPlayerId={session?.user?.id}
        />

        <ShareGameButton
          gameId={savedGameId || undefined}
          teams={context.teams}
          history={context.history}
          settings={context.settings}
        />

        <PlayAgainButton send={send} />
      </Stack>
    </Container>
  );
}
