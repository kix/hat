import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Container, SimpleGrid, Stack, Text, Title, Card, Group } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getBestPlayer, getEasiestWord, getHardestWord, sortTeamsByScore } from '../../utils/stats';
import { getTeamScore } from '../../utils/scoring';
import { useAuthSession } from '../../auth/useAuthSession';
import { syncPreferencesToSupabase } from '../../auth/syncPreferences';
import { syncWordTimingsToSupabase } from '../../auth/syncWordTimings';
import { saveGameResult } from '../../auth/saveGame';
import { ResultBanner } from './ResultBanner';
import { StatCard } from './StatCard';
import { HintedWordsCard } from './HintedWordsCard';
import { PlayAgainButton } from './PlayAgainButton';
import { PreviousRoundWords } from '../shared/PreviousRoundWords';

interface GameOverScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  isHost?: boolean;
  participants?: { userId: string; name: string }[];
}

export function GameOverScreen({ context, send, isHost, participants }: GameOverScreenProps) {
  const bestPlayer = getBestPlayer(context.teams, context.history);
  const hardestWord = getHardestWord(context.history);
  const easiestWord = getEasiestWord(context.history);
  const session = useAuthSession();

  useEffect(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
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

    if (!savedRef.current) {
      savedRef.current = true;
      const isMultiplayer = !!participants && participants.length > 0;
      const shouldSave = !isMultiplayer || isHost;
      if (shouldSave) {
        void saveGameResult(context, participants || [], session?.user?.id);
      }
    }
  }, [session, isHost, participants]);

  const sortedTeams = sortTeamsByScore(context.teams, context.history);

  // Вычисляем рейтинг игроков
  const playersWithScores = context.teams
    .flatMap((team) =>
      team.players.map((player) => {
        const guessed = context.history.filter(
          (record) => record.result === 'guessed' && record.guesserId === player.id
        ).length;
        const explained = context.history.filter(
          (record) => record.result === 'guessed' && record.describerId === player.id
        ).length;
        return {
          player,
          team,
          guessed,
          explained,
        };
      })
    )
    .sort((a, b) => b.guessed - a.guessed || b.explained - a.explained);

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          Игра окончена
        </Title>

        <ResultBanner context={context} />

        {/* Рейтинг команд */}
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              Рейтинг команд
            </Text>
            <Stack gap={6}>
              {sortedTeams.map((team, idx) => (
                <Group key={team.id} justify="space-between">
                  <Group gap="xs">
                    <Text fw={500} c={idx === 0 ? 'yellow' : 'dimmed'}>
                      {idx + 1}.
                    </Text>
                    <Text fw={idx === 0 ? 600 : 500}>{team.name}</Text>
                  </Group>
                  <Text fw={600}>{getTeamScore(context.history, team.id)} очков</Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>

        {/* Рейтинг игроков */}
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              Рейтинг игроков
            </Text>
            <Stack gap="xs">
              {playersWithScores.map((item, idx) => (
                <Group key={item.player.id} justify="space-between" wrap="nowrap">
                  <Group gap="xs" style={{ minWidth: 0, flexShrink: 1 }}>
                    <Text fw={500} c={idx === 0 ? 'yellow' : 'dimmed'}>
                      {idx + 1}.
                    </Text>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text fw={idx === 0 ? 600 : 500} truncate>
                        {item.player.name}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {item.team.name}
                      </Text>
                    </Stack>
                  </Group>
                  <Text size="xs" style={{ flexShrink: 0 }} ta="right">
                    угадал: <b>{item.guessed}</b> · объяснил: <b>{item.explained}</b>
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>

        <PreviousRoundWords context={context} />

        <SimpleGrid cols={1} spacing="sm">
          {bestPlayer && (
            <StatCard title="Лучший игрок">
              <Text fw={600}>{bestPlayer.player.name}</Text>
              <Text size="sm" c="dimmed">
                {bestPlayer.team.name} · {bestPlayer.guessedCount} угаданных слов
              </Text>
            </StatCard>
          )}

          {hardestWord && (
            <StatCard title="Самое сложное слово">
              <Text fw={600}>{hardestWord.word}</Text>
              <Text size="sm" c="dimmed">
                {(hardestWord.timeMs / 1000).toFixed(1)} сек
              </Text>
            </StatCard>
          )}

          {easiestWord && (
            <StatCard title="Самое простое слово">
              <Text fw={600}>{easiestWord.word}</Text>
              <Text size="sm" c="dimmed">
                {(easiestWord.timeMs / 1000).toFixed(1)} сек
              </Text>
            </StatCard>
          )}
        </SimpleGrid>

        <HintedWordsCard context={context} />

        <PlayAgainButton send={send} />
      </Stack>
    </Container>
  );
}
