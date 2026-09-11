import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  SimpleGrid,
  Badge,
  Loader,
  ThemeIcon,
  Progress,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBolt,
  IconBrain,
  IconHourglass,
  IconTrophy,
  IconUser,
  IconCalendar,
  IconTarget,
  IconAward,
  IconHeartHandshake,
  IconShieldCheck,
  IconFlame,
} from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { TelegramNotificationsCard } from '../notifications/TelegramNotificationsCard';
import { useI18n } from '../../i18n/i18n';
import { useTelegramBackButton } from '../../utils/telegramWebApp';

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

interface PartnerStat {
  name: string;
  count: number;
  wins: number;
}

interface WordRecord {
  word: string;
  sec: number;
}

function WordRecordCard({
  title,
  icon,
  color,
  record,
  secLabel,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  record: WordRecord;
  secLabel: string;
}) {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={2}>
        <Group gap="xs">
          <ThemeIcon color={color} size="sm" variant="light">
            {icon}
          </ThemeIcon>
          <Text size="xs" c="dimmed" fw={600}>
            {title}
          </Text>
        </Group>
        <Text fw={700} size="md" c={`${color}.8`} truncate="end">
          «{record.word}»
        </Text>
        <Text size="xs" c="dimmed">
          {record.sec} {secLabel}
        </Text>
      </Stack>
    </Card>
  );
}

export function ProfileScreen({ userId, onBack }: ProfileScreenProps) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [participations, setParticipations] = useState<UserParticipation[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStat[]>([]);

  // Hook Telegram WebApp back button
  useTelegramBackButton(onBack);

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

        // 3. Вычисляем синергию с напарниками
        if (validParticipations.length > 0) {
          const gameIds = validParticipations.map((p) => p.game_id);

          const { data: allParts } = await supabase
            .from('game_participants')
            .select('*')
            .in('game_id', gameIds);

          if (allParts) {
            const map: Record<string, { count: number; wins: number }> = {};

            validParticipations.forEach((userPart) => {
              const partner = allParts.find(
                (p) =>
                  p.game_id === userPart.game_id &&
                  p.team_name === userPart.team_name &&
                  p.user_id !== userId,
              );

              if (partner?.player_name) {
                if (!map[partner.player_name]) {
                  map[partner.player_name] = { count: 0, wins: 0 };
                }
                map[partner.player_name].count += 1;
                if (userPart.is_winner) {
                  map[partner.player_name].wins += 1;
                }
              }
            });

            const sortedPartners = Object.entries(map)
              .map(([name, data]) => ({ name, count: data.count, wins: data.wins }))
              .sort((a, b) => b.count - a.count);

            setPartnerStats(sortedPartners);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки статистики профиля:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // --- ВЫЧИСЛЕНИЕ СТАТИСТИКИ И АЧИВОК ---
  const stats = useMemo(() => {
    const totalGames = participations.length;
    const wins = participations.filter((p) => p.is_winner).length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    let totalGuessTimeMs = 0;
    let totalSolvedWordsCount = 0;
    let fastest: WordRecord | null = null;
    let hardest: WordRecord | null = null;
    let maxWordsInRound = 0;

    let hasLightning = false;
    let hasErudite = false;
    let hasIronNerves = false;
    let hasCleanGame = false;

    const topPartner = partnerStats[0] || null;
    const maxPartnerGames = topPartner?.count || 0;

    participations.forEach((part) => {
      const history = part.games?.history_data || [];
      const settings = part.games?.settings;
      const roundDurationMs = (settings?.roundDurationSec || 60) * 1000;

      let hardestWordInGame: any = null;
      let maxTimeMs = 0;
      history.forEach((record) => {
        if (record.result === 'guessed' && record.timeMs > maxTimeMs) {
          maxTimeMs = record.timeMs;
          hardestWordInGame = record;
        }
      });

      if (part.is_winner) {
        const userTeamRecords = history.filter(
          (r) => r.guesserId === userId || r.describerId === userId,
        );
        const fouls = userTeamRecords.filter((r) => r.result === 'foul').length;
        if (userTeamRecords.length > 0 && fouls === 0) {
          hasCleanGame = true;
        }
      }

      const roundCounts: Record<string, number> = {};

      history.forEach((record) => {
        if (record.result !== 'guessed') return;

        const isUserGuesser = record.guesserId === userId;
        const isUserDescriber = record.describerId === userId;

        if (isUserGuesser || isUserDescriber) {
          totalGuessTimeMs += record.timeMs;
          totalSolvedWordsCount++;

          const timeSec = Number((record.timeMs / 1000).toFixed(1));
          if (!fastest || record.timeMs < fastest.sec * 1000) {
            fastest = { word: record.word, sec: timeSec };
          }
          if (!hardest || record.timeMs > hardest.sec * 1000) {
            hardest = { word: record.word, sec: timeSec };
          }

          const rKey = `${record.roundNumber ?? 0}_${record.describerId ?? ''}`;
          roundCounts[rKey] = (roundCounts[rKey] || 0) + 1;
          if (roundCounts[rKey] > maxWordsInRound) {
            maxWordsInRound = roundCounts[rKey];
          }
        }

        if (isUserGuesser) {
          if (record.timeMs < 1500) {
            hasLightning = true;
          }
          if (roundDurationMs - record.timeMs <= 1500) {
            hasIronNerves = true;
          }
        }

        if (hardestWordInGame && record.word === hardestWordInGame.word && (isUserGuesser || isUserDescriber)) {
          hasErudite = true;
        }
      });
    });

    const hasChampion = wins >= 5;
    const hasVeteran = totalGames >= 10;
    const hasTelepath = maxWordsInRound >= 5;
    const hasPerfectDuo = maxPartnerGames >= 5;

    const avgSpeedSec =
      totalSolvedWordsCount > 0 ? (totalGuessTimeMs / totalSolvedWordsCount / 1000).toFixed(1) : '—';

    return {
      totalGames,
      wins,
      winRate,
      totalSolvedWordsCount,
      avgSpeedSec,
      fastestWord: fastest,
      hardestWord: hardest,
      hasLightning,
      hasErudite,
      hasIronNerves,
      hasChampion,
      hasTelepath,
      hasVeteran,
      hasPerfectDuo,
      hasCleanGame,
      maxWordsInRound,
      maxPartnerGames,
      topPartner,
    };
  }, [participations, partnerStats, userId]);

  const {
    totalGames,
    wins,
    winRate,
    totalSolvedWordsCount,
    avgSpeedSec,
    hasLightning,
    hasErudite,
    hasIronNerves,
    hasChampion,
    hasTelepath,
    hasVeteran,
    hasPerfectDuo,
    hasCleanGame,
    maxWordsInRound,
    maxPartnerGames,
    topPartner,
  } = stats;

  if (loading) {
    return (
      <Container
        size="xs"
        py="xl"
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text c="dimmed">{t('profile.loadingStats')}</Text>
        </Stack>
      </Container>
    );
  }

  const registerDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
        year: 'numeric',
        month: 'long',
      })
    : '—';

  const achievementsList = [
    {
      id: 'lightning',
      title: t('profile.achLightning'),
      desc: t('profile.achLightningDesc'),
      icon: <IconBolt size={18} />,
      color: 'yellow',
      unlocked: hasLightning,
    },
    {
      id: 'erudite',
      title: t('profile.achErudite'),
      desc: t('profile.achEruditeDesc'),
      icon: <IconBrain size={18} />,
      color: 'blue',
      unlocked: hasErudite,
    },
    {
      id: 'ironNerves',
      title: t('profile.achIronNerves'),
      desc: t('profile.achIronNervesDesc'),
      icon: <IconHourglass size={18} />,
      color: 'red',
      unlocked: hasIronNerves,
    },
    {
      id: 'champion',
      title: t('profile.achChampion'),
      desc: t('profile.achChampionDesc'),
      icon: <IconTrophy size={18} />,
      color: 'teal',
      unlocked: hasChampion,
      progress: { current: Math.min(wins, 5), total: 5 },
    },
    {
      id: 'telepath',
      title: t('profile.achTelepath'),
      desc: t('profile.achTelepathDesc'),
      icon: <IconTarget size={18} />,
      color: 'grape',
      unlocked: hasTelepath,
      progress: { current: Math.min(maxWordsInRound, 5), total: 5 },
    },
    {
      id: 'veteran',
      title: t('profile.achVeteran'),
      desc: t('profile.achVeteranDesc'),
      icon: <IconAward size={18} />,
      color: 'orange',
      unlocked: hasVeteran,
      progress: { current: Math.min(totalGames, 10), total: 10 },
    },
    {
      id: 'perfectDuo',
      title: t('profile.achPerfectDuo'),
      desc: t('profile.achPerfectDuoDesc'),
      icon: <IconHeartHandshake size={18} />,
      color: 'indigo',
      unlocked: hasPerfectDuo,
      progress: { current: Math.min(maxPartnerGames, 5), total: 5 },
    },
    {
      id: 'cleanGame',
      title: t('profile.achCleanGame'),
      desc: t('profile.achCleanGameDesc'),
      icon: <IconShieldCheck size={18} />,
      color: 'green',
      unlocked: hasCleanGame,
    },
  ];

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Кнопка назад */}
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            {t('common.back')}
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
                {profile?.user_metadata?.full_name || t('default.player')}
              </Text>
              <Group gap="xs" c="dimmed">
                <IconCalendar size={14} />
                <Text size="xs">{t('profile.inGameSince', { date: registerDate })}</Text>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Уведомления в Telegram */}
        {profile?.user_metadata?.provider === 'telegram' && profile?.user_metadata?.telegram_id && (
          <TelegramNotificationsCard
            userId={userId}
            telegramId={String(profile.user_metadata.telegram_id)}
          />
        )}

        {/* Статистика */}
        <Title order={3} size="h4" mb={-10}>
          {t('profile.statsTitle')}
        </Title>
        <SimpleGrid cols={2} spacing="sm">
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>
                {t('profile.gamesPlayed')}
              </Text>
              <Title order={2} c="blue">
                {totalGames}
              </Title>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>
                {t('profile.winRate')}
              </Text>
              <Title order={2} c="teal">
                {winRate}%
              </Title>
              <Text size="xs" c="dimmed">
                {t('profile.wins', { n: wins })}
              </Text>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>
                {t('profile.avgSpeed')}
              </Text>
              <Title order={2} c="orange">
                {avgSpeedSec} {avgSpeedSec !== '—' ? t('profile.secShort') : ''}
              </Title>
              <Text size="xs" c="dimmed">
                {t('profile.solvedWords', { n: totalSolvedWordsCount })}
              </Text>
            </Stack>
          </Card>
          <Card withBorder padding="md" radius="md">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600}>
                {t('profile.favPartner')}
              </Text>
              <Text fw={700} c="indigo" truncate="end" style={{ maxWidth: '100%' }}>
                {topPartner ? topPartner.name : '—'}
              </Text>
              <Text size="xs" c="dimmed">
                {topPartner ? t('profile.jointGames', { n: topPartner.count }) : t('profile.playInPairs')}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Личные рекорды слов */}
        {(stats.fastestWord || stats.hardestWord) && (
          <>
            <Title order={3} size="h4" mb={-10}>
              {t('profile.recordsTitle')}
            </Title>
            <SimpleGrid cols={2} spacing="sm">
              {stats.fastestWord && (
                <WordRecordCard
                  title={t('profile.fastestWord')}
                  icon={<IconBolt size={14} />}
                  color="yellow"
                  record={stats.fastestWord}
                  secLabel={t('profile.secShort')}
                />
              )}
              {stats.hardestWord && (
                <WordRecordCard
                  title={t('profile.hardestWord')}
                  icon={<IconFlame size={14} />}
                  color="indigo"
                  record={stats.hardestWord}
                  secLabel={t('profile.secShort')}
                />
              )}
            </SimpleGrid>
          </>
        )}

        {/* Ачивки / Достижения */}
        <Title order={3} size="h4" mb={-10}>
          {t('profile.achievements')}
        </Title>
        <Stack gap="xs">
          {achievementsList.map((ach) => (
            <Card
              key={ach.id}
              withBorder
              padding="sm"
              radius="md"
              opacity={ach.unlocked ? 1 : 0.6}
              style={{
                borderLeft: ach.unlocked ? `4px solid var(--mantine-color-${ach.color}-filled)` : '1px solid var(--mantine-color-border)',
              }}
            >
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                  <ThemeIcon color={ach.color} size="lg" variant={ach.unlocked ? 'filled' : 'light'} mt={2}>
                    {ach.icon}
                  </ThemeIcon>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm">
                      {ach.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {ach.desc}
                    </Text>
                    {ach.progress && !ach.unlocked && (
                      <Stack gap={2} mt={4}>
                        <Progress
                          value={(ach.progress.current / ach.progress.total) * 100}
                          size="xs"
                          radius="xl"
                          color={ach.color}
                        />
                        <Text size="10px" c="dimmed">
                          {t('profile.progressLabel', {
                            current: ach.progress.current,
                            total: ach.progress.total,
                          })}
                        </Text>
                      </Stack>
                    )}
                  </Stack>
                </Group>
                <Badge color={ach.unlocked ? ach.color : 'gray'} variant={ach.unlocked ? 'light' : 'outline'}>
                  {ach.unlocked ? t('profile.unlocked') : t('profile.locked')}
                </Badge>
              </Group>
            </Card>
          ))}
        </Stack>

        {/* Синергия с напарниками */}
        {partnerStats.length > 0 && (
          <>
            <Title order={3} size="h4" mb={-10}>
              {t('profile.synergyTitle')}
            </Title>
            <Stack gap="xs">
              {partnerStats.slice(0, 5).map((partner) => {
                const partnerWinRate = Math.round((partner.wins / partner.count) * 100);
                return (
                  <Card key={partner.name} withBorder padding="sm" radius="md">
                    <Group justify="space-between">
                      <Group gap="xs">
                        <ThemeIcon color="indigo" size="md" variant="light" radius="xl">
                          <IconUser size={16} />
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text fw={600} size="sm">
                            {partner.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {t('profile.jointGames', { n: partner.count })}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge color={partnerWinRate >= 50 ? 'teal' : 'gray'} variant="light">
                        {partnerWinRate}% {t('profile.winRate').toLowerCase()}
                      </Badge>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </>
        )}

        {/* История игр */}
        <Title order={3} size="h4" mb={-10}>
          {t('profile.historyTitle')}
        </Title>
        {totalGames === 0 ? (
          <Card withBorder padding="md" radius="md" ta="center">
            <Text size="sm" c="dimmed">
              {t('profile.noGames')}
            </Text>
          </Card>
        ) : (
          <Stack gap="xs">
            {participations.slice(0, 10).map((part) => {
              const game = part.games;
              const dateStr = new Date(game.created_at).toLocaleDateString(
                lang === 'en' ? 'en-US' : 'ru-RU',
                {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

              const gameHistory = game.history_data || [];
              const teamGuesses = gameHistory.filter(
                (r) =>
                  r.result === 'guessed' &&
                  r.teamId === gameHistory.find((h) => h.teamId && h.guesserId === userId)?.teamId,
              ).length;

              return (
                <Card withBorder key={part.id} padding="sm" radius="md">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={600} size="sm">
                          {t('profile.teamLabel', { team: part.team_name })}
                        </Text>
                        <Badge color={part.is_winner ? 'green' : 'gray'} size="xs" variant="filled">
                          {part.is_winner ? t('profile.win') : t('profile.loss')}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {t('profile.wonLabel', { team: game.winner_team_name })}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {dateStr}
                      </Text>
                    </Stack>
                    <Stack gap={2} align="flex-end">
                      <Group gap="xs">
                        <ThemeIcon color="green" size="xs" radius="xl" variant="light">
                          <IconTrophy size={10} />
                        </ThemeIcon>
                        <Text size="xs" fw={500}>
                          {t('profile.wordsGuessedCount', { n: teamGuesses })}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {t('profile.wordsInGame', { n: game.settings?.wordCount })}
                      </Text>
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
