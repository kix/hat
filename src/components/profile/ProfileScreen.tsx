import { useEffect, useState } from 'react';
import { Container, Stack, Title, Text, Button, Card, Group, SimpleGrid, Badge, Loader, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconBolt, IconBrain, IconHourglass, IconTrophy, IconUser, IconCalendar } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';

interface ProfileScreenProps {
  userId: string;
  onBack: () => void;
}

interface GameRecord {
  id: string;
  created_at: string;
  winner_team_name: string;
  history_data: any[];
  settings: {
    roundDurationSec: number;
    allowSkip: boolean;
    wordCount: number;
    difficultyLevel: number;
  };
}

interface UserParticipation {
  id: number;
  game_id: string;
  user_id: string;
  player_name: string;
  team_name: string;
  is_winner: boolean;
  games: GameRecord;
}

export function ProfileScreen({ userId, onBack }: ProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [participations, setParticipations] = useState<UserParticipation[]>([]);
  const [partnerStats, setPartnerStats] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);

        // 1. Получаем профиль пользователя
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setProfile(userData.user);
        }

        // 2. Получаем все игры пользователя из game_participants
        const { data: parts, error: partsErr } = await supabase
          .from('game_participants')
          .select('*, games:game_id (*)')
          .eq('user_id', userId)
          .order('id', { ascending: false });

        if (partsErr) throw partsErr;

        const validParticipations = (parts || []).filter((p) => p.games) as UserParticipation[];
        setParticipations(validParticipations);

        // 3. Вычисляем любимого напарника
        if (validParticipations.length > 0) {
          const gameIds = validParticipations.map((p) => p.game_id);
          
          // Получаем всех участников этих же игр
          const { data: allParts } = await supabase
            .from('game_participants')
            .select('*')
            .in('game_id', gameIds);

          if (allParts) {
            const partnersCount: { [name: string]: number } = {};

            validParticipations.forEach((userPart) => {
              // Ищем напарника по той же игре, в той же команде, но с другим user_id
              const partner = allParts.find(
                (p) =>
                  p.game_id === userPart.game_id &&
                  p.team_name === userPart.team_name &&
                  p.user_id !== userId
              );

              if (partner && partner.player_name) {
                partnersCount[partner.player_name] = (partnersCount[partner.player_name] || 0) + 1;
              }
            });

            // Находим напарника с наибольшим количеством совместных игр
            let bestPartner = '';
            let maxGames = 0;
            Object.keys(partnersCount).forEach((name) => {
              if (partnersCount[name] > maxGames) {
                maxGames = partnersCount[name];
                bestPartner = name;
              }
            });

            if (bestPartner) {
              setPartnerStats({ name: bestPartner, count: maxGames });
            }
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки статистики профиля:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <Container size="xs" py="xl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text c="dimmed">Загрузка статистики...</Text>
        </Stack>
      </Container>
    );
  }

  // --- ВЫЧИСЛЕНИЕ СТАТИСТИКИ ---
  const totalGames = participations.length;
  const wins = participations.filter((p) => p.is_winner).length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  // Сбор всех сыгранных слов пользователя (где он угадывал или объяснял)
  let userGuessedWordsCount = 0;
  let userExplainedWordsCount = 0;
  let totalGuessTimeMs = 0;
  let totalSolvedWordsCount = 0;

  // Переменные для проверки ачивок
  let hasLightning = false;     // Молния (угадал < 1.5 сек)
  let hasErudite = false;      // Эрудит (разгадал самое сложное слово)
  let hasIronNerves = false;    // Железные нервы (на последней секунде раунда)

  participations.forEach((part) => {
    const history = part.games?.history_data || [];
    const settings = part.games?.settings;
    const roundDurationMs = (settings?.roundDurationSec || 60) * 1000;

    // Находим самое сложное слово этой конкретной игры (по максимальному времени)
    let hardestWordInGame: any = null;
    let maxTimeMs = 0;
    history.forEach((record) => {
      if (record.result === 'guessed' && record.timeMs > maxTimeMs) {
        maxTimeMs = record.timeMs;
        hardestWordInGame = record;
      }
    });

    history.forEach((record) => {
      if (record.result !== 'guessed') return;

      const isUserGuesser = record.guesserId === userId;
      const isUserDescriber = record.describerId === userId;

      if (isUserGuesser) {
        userGuessedWordsCount++;
        totalGuessTimeMs += record.timeMs;
        totalSolvedWordsCount++;

        // Проверка ачивки: Молния (быстрее 1.5 секунд)
        if (record.timeMs < 1500) {
          hasLightning = true;
        }

        // Проверка ачивки: Железные нервы (в последние 1.5 секунды раунда)
        if (roundDurationMs - record.timeMs <= 1500) {
          hasIronNerves = true;
        }
      }

      if (isUserDescriber) {
        userExplainedWordsCount++;
        totalGuessTimeMs += record.timeMs;
        totalSolvedWordsCount++;
      }

      // Проверка ачивки: Эрудит (угадал или объяснил самое сложное слово в игре)
      if (hardestWordInGame && record.word === hardestWordInGame.word && (isUserGuesser || isUserDescriber)) {
        hasErudite = true;
      }
    });
  });

  const avgSpeedSec = totalSolvedWordsCount > 0 ? (totalGuessTimeMs / totalSolvedWordsCount / 1000).toFixed(1) : '—';

  // Форматирование даты регистрации
  const registerDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
    : '—';

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Кнопка назад */}
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            Назад
          </Button>
        </Group>

        {/* Профиль игрока */}
        <Card withBorder padding="lg" radius="md">
          <Group gap="md">
            <ThemeIcon size={64} radius="xl" color="blue" variant="light">
              <IconUser size={36} />
            </ThemeIcon>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text fw={700} size="xl" truncate="end">
                {profile?.user_metadata?.full_name || 'Игрок'}
              </Text>
              <Group gap="xs" c="dimmed">
                <IconCalendar size={14} />
                <Text size="xs">В игре с {registerDate}</Text>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Статистика */}
        <Title order={3} size="h4" mb={-10}>Статистика партий</Title>
        <SimpleGrid cols={2} spacing="sm">
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>СЫГРАНО ИГР</Text>
              <Title order={2} c="blue">{totalGames}</Title>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>ПРОЦЕНТ ПОБЕД</Text>
              <Title order={2} c="teal">{winRate}%</Title>
              <Text size="xs" c="dimmed">{wins} побед</Text>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>СР. СКОРОСТЬ</Text>
              <Title order={2} c="orange">{avgSpeedSec} {avgSpeedSec !== '—' ? 'сек' : ''}</Title>
              <Text size="xs" c="dimmed">угадали/объяснили {totalSolvedWordsCount} слов</Text>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>ЛЮБИМЫЙ НАПАРНИК</Text>
              <Text fw={700} c="indigo" truncate="end" style={{ maxWidth: '100%' }}>
                {partnerStats ? partnerStats.name : '—'}
              </Text>
              <Text size="xs" c="dimmed">
                {partnerStats ? `${partnerStats.count} совместных игр` : 'Играйте в парах!'}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Ачивки / Достижения */}
        <Title order={3} size="h4" mb={-10}>Достижения</Title>
        <Stack gap="xs">
          {/* Молния */}
          <Card withBorder padding="sm" radius="md" opacity={hasLightning ? 1 : 0.4} style={{ borderLeft: hasLightning ? '4px solid #fab005' : '1px solid var(--mantine-color-border)' }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon color="yellow" size="lg" variant={hasLightning ? 'filled' : 'light'}>
                  <IconBolt size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={600} size="sm">Молния</Text>
                  <Text size="xs" c="dimmed">Угадал слово быстрее чем за 1.5 секунды</Text>
                </Stack>
              </Group>
              <Badge color={hasLightning ? 'yellow' : 'gray'} variant="light">
                {hasLightning ? 'Разблокировано' : 'Закрыто'}
              </Badge>
            </Group>
          </Card>

          {/* Эрудит */}
          <Card withBorder padding="sm" radius="md" opacity={hasErudite ? 1 : 0.4} style={{ borderLeft: hasErudite ? '4px solid #1c7ed6' : '1px solid var(--mantine-color-border)' }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon color="blue" size="lg" variant={hasErudite ? 'filled' : 'light'}>
                  <IconBrain size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={600} size="sm">Эрудит</Text>
                  <Text size="xs" c="dimmed">Разгадал/объяснил самое сложное слово партии</Text>
                </Stack>
              </Group>
              <Badge color={hasErudite ? 'blue' : 'gray'} variant="light">
                {hasErudite ? 'Разблокировано' : 'Закрыто'}
              </Badge>
            </Group>
          </Card>

          {/* Железные нервы */}
          <Card withBorder padding="sm" radius="md" opacity={hasIronNerves ? 1 : 0.4} style={{ borderLeft: hasIronNerves ? '4px solid #fa5252' : '1px solid var(--mantine-color-border)' }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon color="red" size="lg" variant={hasIronNerves ? 'filled' : 'light'}>
                  <IconHourglass size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={600} size="sm">Железные нервы</Text>
                  <Text size="xs" c="dimmed">Угадал слово на последней секунде раунда</Text>
                </Stack>
              </Group>
              <Badge color={hasIronNerves ? 'red' : 'gray'} variant="light">
                {hasIronNerves ? 'Разблокировано' : 'Закрыто'}
              </Badge>
            </Group>
          </Card>
        </Stack>

        {/* История игр */}
        <Title order={3} size="h4" mb={-10}>История игр</Title>
        {totalGames === 0 ? (
          <Card withBorder padding="md" radius="md" ta="center">
            <Text size="sm" c="dimmed">Вы еще не сыграли ни одной игры. Начните партию, чтобы увидеть историю!</Text>
          </Card>
        ) : (
          <Stack gap="xs">
            {participations.slice(0, 10).map((part) => {
              const game = part.games;
              const dateStr = new Date(game.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              
              // Подсчет угаданных слов его команды в этой игре
              const gameHistory = game.history_data || [];
              const teamGuesses = gameHistory.filter(
                (r) => r.result === 'guessed' && r.teamId === gameHistory.find((h) => h.teamId && h.guesserId === userId)?.teamId
              ).length;

              return (
                <Card withBorder key={part.id} padding="sm" radius="md">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={600} size="sm">Команда: {part.team_name}</Text>
                        <Badge color={part.is_winner ? 'green' : 'gray'} size="xs" variant="filled">
                          {part.is_winner ? 'Победа' : 'Поражение'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">Победила: {game.winner_team_name}</Text>
                      <Text size="xs" c="dimmed">{dateStr}</Text>
                    </Stack>
                    <Stack gap={2} align="flex-end">
                      <Group gap="xs">
                        <ThemeIcon color="green" size="xs" radius="xl" variant="light">
                          <IconTrophy size={10} />
                        </ThemeIcon>
                        <Text size="xs" fw={500}>{teamGuesses} слов угадано</Text>
                      </Group>
                      <Text size="xs" c="dimmed">Слова в игре: {game.settings?.wordCount}</Text>
                    </Stack>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
