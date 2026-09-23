import { useEffect, useState, useCallback } from 'react';
import {
  ActionIcon,
  Badge,
  Card,
  Container,
  Group,
  RingProgress,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowsMaximize, IconArrowsMinimize, IconX } from '@tabler/icons-react';
import type { HatContext } from '../../machine/hatMachine';
import { supabase } from '../../auth/supabaseClient';
import { getCurrentRoles } from '../../utils/roles';
import { getTeamScore } from '../../utils/scoring';
import { getIndividualLeaderboard, getCurrentRoundStreak } from '../../utils/stats';
import { AnimatedHatEmoji } from '../setup/AnimatedHatEmoji';
import { StageBadge } from '../shared/StageBadge';
import { useI18n } from '../../i18n/i18n';

interface TvSpectatorScreenProps {
  roomCode: string;
  localContext?: HatContext | null;
  localState?: string | null;
  onExit: () => void;
}

export function TvSpectatorScreen({
  roomCode,
  localContext,
  localState,
  onExit,
}: TvSpectatorScreenProps) {
  const { t } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<string>(localState || 'setup');
  const [context, setContext] = useState<HatContext | null>(localContext || null);

  // Синхронизация с Realtime комнатой, если указан roomCode
  useEffect(() => {
    if (!roomCode) return;

    // Первичная загрузка состояния комнаты из БД
    void (async () => {
      const { data } = await supabase
        .from('rooms')
        .select('game_state, game_context')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (data) {
        if (data.game_state) setGameState(data.game_state);
        if (data.game_context) setContext(data.game_context as HatContext);
      }
    })();

    const channel = supabase.channel(`room:${roomCode.toUpperCase()}`);
    channel.on('broadcast', { event: 'state_changed' }, ({ payload }) => {
      if (payload.gameState) setGameState(payload.gameState);
      if (payload.gameContext) setContext(payload.gameContext);
    });

    channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [roomCode]);

  // Если передано локальное состояние
  useEffect(() => {
    if (localState) setGameState(localState);
    if (localContext) setContext(localContext);
  }, [localState, localContext]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  const activeTeam = context?.teams?.[context.currentTeamIndex ?? 0];
  const roles = activeTeam && context ? getCurrentRoles(activeTeam, context.settings.rolesMode) : null;
  const isIndividual = context?.settings.gameMode === 'individual';
  const isPairs = context?.settings.gameMode === 'pairs';
  const isClassic3 = context?.settings.gameFormat === 'classic3';
  const stageIndex = context?.currentStageIndex ?? 1;

  const currentStreak = context?.teams && context?.history
    ? getCurrentRoundStreak(context.teams, context.history, context.currentTeamIndex ?? 0)
    : 0;

  const individualLeaderboard = isIndividual && context
    ? getIndividualLeaderboard(
        context.individualPlayers ||
          Array.from(new Map(context.teams.flatMap((t) => t.players).map((p) => [p.id, p])).values()),
        context.history,
      )
    : [];

  const timeRemaining = context?.timeRemainingSec ?? 0;
  const totalDuration = context?.settings.roundDurationSec ?? 60;
  const timeProgress = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;
  const isTimeLow = timeRemaining <= 10 && timeRemaining > 0;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Верхняя панель управления */}
      <Group justify="space-between" align="center" pb="lg" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Group gap="md">
          <span style={{ fontSize: '2rem' }}><AnimatedHatEmoji /></span>
          <div>
            <Title order={2} style={{ letterSpacing: '1px' }}>
              {t('tv.title')}
            </Title>
            <Text size="xs" c="dimmed">
              {t('tv.lobbyTitle')}
            </Text>
          </div>
        </Group>

        <Group gap="sm">
          {roomCode && (
            <Badge size="xl" variant="filled" color="indigo" radius="md">
              #{roomCode.toUpperCase()}
            </Badge>
          )}
          {isClassic3 && <StageBadge stageIndex={stageIndex} size="lg" />}
          <Tooltip label={t('tv.fullscreen')}>
            <ActionIcon size="lg" variant="light" color="gray" onClick={toggleFullscreen}>
              {isFullscreen ? <IconArrowsMinimize size={22} /> : <IconArrowsMaximize size={22} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('tv.exit')}>
            <ActionIcon size="lg" variant="light" color="red" onClick={onExit}>
              <IconX size={22} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Основной контент в зависимости от состояния игры */}
      <Container size="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} py="xl">
        {gameState === 'setup' && (
          <Stack align="center" gap="xl" ta="center">
            <span style={{ fontSize: '4rem' }}><AnimatedHatEmoji /></span>
            <Title order={1} size="3rem">
              {t('tv.lobbyTitle')}
            </Title>
            <Text size="xl" c="dimmed">
              {t('tv.waitingRoom')}
            </Text>
            {roomCode && (
              <Card withBorder p="xl" radius="lg" bg="rgba(255,255,255,0.05)">
                <Stack align="center" gap="sm">
                  <Text size="lg" fw={600}>
                    {t('tv.scanToJoin')}
                  </Text>
                  <Badge size="xl" color="blue" style={{ fontSize: '2rem', padding: '1.5rem' }}>
                    {roomCode.toUpperCase()}
                  </Badge>
                </Stack>
              </Card>
            )}
          </Stack>
        )}

        {gameState === 'roundIntro' && (
          <Stack align="center" gap="xl">
            {roles && (
              <Card withBorder p="xl" radius="lg" bg="rgba(255,255,255,0.05)" style={{ width: '100%', maxWidth: 640 }}>
                <Stack align="center" gap="md" ta="center">
                  {!isPairs && !isIndividual && activeTeam && (
                    <Badge size="xl" color="indigo" variant="light">
                      {activeTeam.name}
                    </Badge>
                  )}
                  <Title order={1} size="2.5rem">
                    🗣️ {roles.describer.name} ➔ 👂 {roles.guesser.name}
                  </Title>
                  <Text size="lg" c="dimmed">
                    {t('roundIntro.startRound')}
                  </Text>
                </Stack>
              </Card>
            )}

            {/* Турнирная таблица */}
            <Card withBorder p="lg" radius="md" bg="rgba(255,255,255,0.03)" style={{ width: '100%', maxWidth: 640 }}>
              <Stack gap="sm">
                <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                  {t('roundIntro.scoreTitle')} ({t('tv.wordsLeft', { n: context?.hat?.length ?? 0 })})
                </Text>
                {isIndividual ? (
                  individualLeaderboard.slice(0, 5).map((item) => (
                    <Group key={item.player.id} justify="space-between">
                      <Text size="lg" fw={500}>{item.player.name}</Text>
                      <Badge size="lg" color="blue">{item.score}</Badge>
                    </Group>
                  ))
                ) : (
                  context?.teams?.map((team) => (
                    <Group key={team.id} justify="space-between">
                      <Text size="lg" fw={500}>{team.name}</Text>
                      <Badge size="lg" color="blue">{getTeamScore(context.history, team.id)}</Badge>
                    </Group>
                  ))
                )}
              </Stack>
            </Card>
          </Stack>
        )}

        {gameState === 'roundPlaying' && (
          <Stack align="center" gap="xl" ta="center">
            {/* Круговой таймер */}
            <RingProgress
              size={220}
              thickness={18}
              roundCaps
              sections={[{ value: timeProgress, color: isTimeLow ? 'red' : 'blue' }]}
              label={
                <Text
                  fw={800}
                  size="3.5rem"
                  ta="center"
                  c={isTimeLow ? 'red' : undefined}
                  style={{
                    animation: isTimeLow ? 'pulse 0.6s infinite alternate' : 'none',
                  }}
                >
                  {timeRemaining}
                </Text>
              }
            />

            {/* Роли текущего хода */}
            {roles && (
              <div>
                <Text size="lg" c="dimmed" mb={4}>
                  {activeTeam?.name}
                </Text>
                <Title order={2} size="2.2rem">
                  🗣️ {roles.describer.name} объясняет для {roles.guesser.name}
                </Title>
              </div>
            )}

            {/* Скрытая карточка слова для зрителей */}
            <Card
              withBorder
              p="xl"
              radius="lg"
              bg="rgba(255,255,255,0.05)"
              style={{
                width: '100%',
                maxWidth: 580,
                border: '2px dashed var(--mantine-color-blue-5)',
              }}
            >
              <Stack align="center" gap="xs">
                <Text size="2.5rem">🔒</Text>
                <Text size="lg" fw={600} c="blue">
                  {t('tv.wordHiddenSpectators')}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('tv.wordsLeft', { n: (context?.hat?.length ?? 0) + 1 })}
                </Text>
              </Stack>
            </Card>

            {currentStreak >= 3 && (
              <Badge size="xl" color="orange" variant="filled">
                🔥 Серия: {currentStreak} подряд!
              </Badge>
            )}
          </Stack>
        )}

        {gameState === 'stageTransition' && (
          <Stack align="center" gap="lg" ta="center">
            <span style={{ fontSize: '3rem' }}><AnimatedHatEmoji /></span>
            <Title order={1} size="3rem">
              {t('stageTransition.title', { n: stageIndex })}
            </Title>
            <StageBadge stageIndex={stageIndex + 1} size="xl" />
            <Text size="xl" c="blue" fw={600}>
              {t('stageTransition.wordsReturning', { n: context?.wordsPool?.length || context?.settings?.wordCount || 0 })}
            </Text>
          </Stack>
        )}

        {gameState === 'gameOver' && (
          <Stack align="center" gap="xl" ta="center">
            <Title order={1} size="3.5rem">
              {t('tv.champion')}
            </Title>
            <Text size="2.5rem">🏆 🥇 👑</Text>
            {context?.teams?.[0] && (
              <Badge size="xl" color="yellow" variant="filled" style={{ fontSize: '1.8rem', padding: '1.5rem 2rem' }}>
                {context.teams[0].name}
              </Badge>
            )}
          </Stack>
        )}
      </Container>
    </div>
  );
}
