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
  UnstyledButton,
  Avatar,
  SegmentedControl,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBolt,
  IconTrophy,
  IconUser,
  IconCalendar,
  IconFlame,
  IconSparkles,
  IconChevronDown,
  IconChevronUp,
  IconChartBar,
} from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { TelegramNotificationsCard } from '../notifications/TelegramNotificationsCard';
import { useI18n } from '../../i18n/i18n';
import { useTelegramBackButton } from '../../utils/telegramWebApp';
import { LEVEL_THRESHOLDS, getLevelFromXP, calculateTotalPlayerXP } from '../../utils/levels';
import { ACHIEVEMENT_DEFINITIONS, getLocalUnlockedAchievements } from '../../utils/achievements';

interface ProfileScreenProps {
  userId: string;
  onBack: () => void;
  onViewLeaderboard?: () => void;
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
    wordPack?: string;
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

export function ProfileScreen({ userId, onBack, onViewLeaderboard }: ProfileScreenProps) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tgUserInfo, setTgUserInfo] = useState<any>(null);
  const [participations, setParticipations] = useState<UserParticipation[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStat[]>([]);
  const [showLadder, setShowLadder] = useState(false);

  // Hook Telegram WebApp back button
  useTelegramBackButton(onBack);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);

        // 1. Получаем текущую сессию auth
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setProfile(userData.user);
        }

        // 2. Получаем данные пользователя из telegram_users по userId
        const { data: tgUsers } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        const tgUser = tgUsers?.[0] || null;
        setTgUserInfo(tgUser);

        // 3. Получаем все игры пользователя из game_participants
        const { data: parts, error: partsErr } = await supabase
          .from('game_participants')
          .select('*, games:game_id (*)')
          .eq('user_id', userId)
          .order('id', { ascending: false });

        if (partsErr) throw partsErr;

        const validParticipations = (parts || []).filter((p) => p.games) as UserParticipation[];
        setParticipations(validParticipations);

        // 4. Вычисляем синергию с напарниками
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

    let hasPartyAnimal = false;
    let hasCustomHat = false;
    let hasWorldTraveler = false;
    let hasStreakMaster = false;

    participations.forEach((part) => {
      const history = part.games?.history_data || [];
      const pack = part.games?.settings?.wordPack;
      if (pack === 'party18') hasPartyAnimal = true;
      if (pack === 'custom') hasCustomHat = true;
      if (pack && ['movies', 'food', 'geography', 'gaming', 'animals', 'celebrities', 'tech'].includes(pack)) {
        hasWorldTraveler = true;
      }

      const settings = part.games?.settings;
      const roundDurationSec = settings?.roundDurationSec || 60;
      const roundDurationMs = roundDurationSec * 1000;

      let hardestWordInGame: any = null;
      let maxTimeMs = 0;
      history.forEach((record) => {
        if (record.result === 'guessed' && record.timeMs > maxTimeMs) {
          maxTimeMs = record.timeMs;
          hardestWordInGame = record;
        }
      });

      // Streaks
      const roundStreaks = new Map<string, { current: number; max: number }>();
      history.forEach((rec) => {
        const key = `${rec.teamId}_${rec.roundIndex ?? rec.roundNumber ?? 0}`;
        const entry = roundStreaks.get(key) || { current: 0, max: 0 };
        if (rec.result === 'guessed') {
          entry.current++;
          if (entry.current > entry.max) entry.max = entry.current;
        } else {
          entry.current = 0;
        }
        roundStreaks.set(key, entry);
      });
      roundStreaks.forEach((val) => {
        if (val.max >= 4) hasStreakMaster = true;
      });

      if (part.is_winner) {
        const userTeamRecords = history.filter((r) => r.teamId === part.team_name);
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
          if (record.timeMs < 3000) {
            hasLightning = true;
          }
          if (roundDurationMs - record.timeMs <= 2000) {
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
      hasStreakMaster,
      hasPartyAnimal,
      hasCustomHat,
      hasWorldTraveler,
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
    hasStreakMaster,
    hasPartyAnimal,
    hasCustomHat,
    hasWorldTraveler,
    maxWordsInRound,
    maxPartnerGames,
    topPartner,
  } = stats;

  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const localUnlocked = useMemo(() => getLocalUnlockedAchievements(), []);

  const achievementsList = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      let isUnlocked = Boolean(localUnlocked[def.id]);
      let progress: { current: number; total: number } | undefined = undefined;

      switch (def.id) {
        case 'lightning':
          isUnlocked = isUnlocked || hasLightning;
          break;
        case 'erudite':
          isUnlocked = isUnlocked || hasErudite;
          break;
        case 'ironNerves':
          isUnlocked = isUnlocked || hasIronNerves;
          break;
        case 'streakMaster':
          isUnlocked = isUnlocked || hasStreakMaster;
          break;
        case 'telepath':
          isUnlocked = isUnlocked || hasTelepath;
          progress = { current: Math.min(maxWordsInRound, 5), total: 5 };
          break;
        case 'cleanGame':
          isUnlocked = isUnlocked || hasCleanGame;
          break;
        case 'champion':
          isUnlocked = isUnlocked || hasChampion;
          progress = { current: Math.min(wins, 5), total: 5 };
          break;
        case 'veteran':
          isUnlocked = isUnlocked || hasVeteran;
          progress = { current: Math.min(totalGames, 10), total: 10 };
          break;
        case 'perfectDuo':
          isUnlocked = isUnlocked || hasPerfectDuo;
          progress = { current: Math.min(maxPartnerGames, 5), total: 5 };
          break;
        case 'partyAnimal':
          isUnlocked = isUnlocked || hasPartyAnimal;
          break;
        case 'customHat':
          isUnlocked = isUnlocked || hasCustomHat;
          break;
        case 'worldTraveler':
          isUnlocked = isUnlocked || hasWorldTraveler;
          break;
      }

      return {
        ...def,
        title: t(def.titleKey),
        desc: t(def.descKey),
        unlocked: isUnlocked,
        progress,
      };
    });
  }, [
    localUnlocked,
    hasLightning,
    hasErudite,
    hasIronNerves,
    hasStreakMaster,
    hasTelepath,
    hasCleanGame,
    hasChampion,
    hasVeteran,
    hasPerfectDuo,
    hasPartyAnimal,
    hasCustomHat,
    hasWorldTraveler,
    maxWordsInRound,
    wins,
    totalGames,
    maxPartnerGames,
    t,
  ]);

  const filteredAchievements = useMemo(() => {
    if (achievementFilter === 'unlocked') return achievementsList.filter((a) => a.unlocked);
    if (achievementFilter === 'locked') return achievementsList.filter((a) => !a.unlocked);
    return achievementsList;
  }, [achievementsList, achievementFilter]);

  const playerXPData = useMemo(() => {
    return calculateTotalPlayerXP(participations, userId, achievementsList);
  }, [participations, userId, achievementsList]);

  const levelInfo = useMemo(() => {
    return getLevelFromXP(playerXPData.totalXP);
  }, [playerXPData.totalXP]);

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

  const isOwnProfile = profile?.id === userId;
  const displayName =
    tgUserInfo?.full_name ||
    (isOwnProfile ? (profile?.user_metadata?.full_name as string) : undefined) ||
    participations[0]?.player_name ||
    t('default.player');

  const avatarUrl =
    tgUserInfo?.avatar_url ||
    (isOwnProfile ? (profile?.user_metadata?.avatar_url as string) : undefined) ||
    '';

  const registerDate = participations.length > 0
    ? new Date(participations[participations.length - 1].games.created_at).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'ru-RU',
        { month: 'long', year: 'numeric' },
      )
    : tgUserInfo?.created_at
    ? new Date(tgUserInfo.created_at).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'ru-RU',
        { month: 'long', year: 'numeric' },
      )
    : profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'ru-RU',
        { month: 'long', year: 'numeric' },
      )
    : '—';

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Кнопка назад и Статистика */}
        <Group justify="space-between" align="center">
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            {t('common.back')}
          </Button>
          {onViewLeaderboard && (
            <Button
              variant="light"
              color="blue"
              size="xs"
              leftSection={<IconChartBar size={14} />}
              onClick={onViewLeaderboard}
            >
              {t('leaderboard.title')}
            </Button>
          )}
        </Group>

        {/* Профиль игрока */}
        <Card withBorder padding="lg" radius="md">
          <Group gap="md">
            <Avatar src={avatarUrl || undefined} size={64} radius="xl" color="blue">
              {displayName[0]?.toUpperCase() ?? <IconUser size={36} />}
            </Avatar>
            <Stack gap={2} style={{ flex: 1 }}>
              <Group gap="xs" wrap="nowrap">
                <Text fw={700} size="xl" truncate="end">
                  {displayName}
                </Text>
                <Badge color={levelInfo.badgeColor} variant="filled" size="sm">
                  {levelInfo.emoji} {t('levels.levelShort', { lvl: levelInfo.level })}
                </Badge>
              </Group>
              {tgUserInfo?.username && (
                <Text size="xs" c="blue" fw={600}>
                  @{tgUserInfo.username}
                </Text>
              )}
              <Group gap="xs" c="dimmed">
                <IconCalendar size={14} />
                <Text size="xs">{t('profile.inGameSince', { date: registerDate })}</Text>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Прокачка уровня и XP */}
        <Card
          withBorder
          padding="md"
          radius="md"
          style={{
            background: 'var(--mantine-color-default-hover)',
            borderLeft: `4px solid var(--mantine-color-${levelInfo.badgeColor}-filled)`,
          }}
        >
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="xl" color={levelInfo.badgeColor} variant="filled">
                  <IconSparkles size={20} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Group gap="xs">
                    <Text fw={700} size="md">
                      {t('levels.level', { lvl: levelInfo.level })}: {t(levelInfo.titleKey)}
                    </Text>
                    <Text size="md">{levelInfo.emoji}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('levels.levelProgression')}
                  </Text>
                </Stack>
              </Group>
              <Badge variant="light" size="lg" color={levelInfo.badgeColor}>
                {t('levels.xp', { xp: levelInfo.totalXP.toLocaleString() })}
              </Badge>
            </Group>

            <Stack gap={4}>
              <Progress
                value={levelInfo.progressPercent}
                size="md"
                radius="xl"
                color={levelInfo.badgeColor}
                animated
              />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('levels.xpProgress', {
                    current: levelInfo.xpIntoLevel,
                    total: levelInfo.xpForNextLevel,
                  })}
                </Text>
                <Text size="xs" fw={600} c="dimmed">
                  {t('levels.nextLevel')}{' '}
                  <Text span fw={700} c={`${levelInfo.badgeColor}.8`}>
                    +{levelInfo.xpForNextLevel - levelInfo.xpIntoLevel} XP
                  </Text>
                </Text>
              </Group>
            </Stack>

            <SimpleGrid cols={2} spacing="xs" mt={2}>
              <Card withBorder padding="xs" radius="sm">
                <Text size="11px" c="dimmed">
                  {t('levels.gamesXP')}
                </Text>
                <Text fw={700} size="sm" c="blue">
                  +{playerXPData.gamesXP} XP
                </Text>
              </Card>
              <Card withBorder padding="xs" radius="sm">
                <Text size="11px" c="dimmed">
                  {t('levels.achievementsXP')}
                </Text>
                <Text fw={700} size="sm" c="teal">
                  +{playerXPData.achievementsXP} XP
                </Text>
              </Card>
            </SimpleGrid>

            {/* Шкала всех уровней (аккордеон/разворачивание) */}
            <UnstyledButton onClick={() => setShowLadder(!showLadder)} mt={4}>
              <Group justify="space-between" p="xs" style={{ borderRadius: 6, background: 'var(--mantine-color-default)' }}>
                <Text size="xs" fw={600} c="dimmed">
                  {t('levels.ladderTitle')}
                </Text>
                {showLadder ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </Group>
            </UnstyledButton>

            {showLadder && (
              <Stack gap={6} pt={4}>
                {LEVEL_THRESHOLDS.map((thresh) => {
                  const isReached = levelInfo.level >= thresh.level;
                  const isCurrent = levelInfo.level === thresh.level;
                  return (
                    <Group
                      key={thresh.level}
                      justify="space-between"
                      p="xs"
                      style={{
                        borderRadius: 6,
                        background: isCurrent ? `var(--mantine-color-${thresh.badgeColor}-light)` : 'var(--mantine-color-default)',
                        border: isCurrent ? `1px solid var(--mantine-color-${thresh.badgeColor}-filled)` : undefined,
                        opacity: isReached ? 1 : 0.6,
                      }}
                    >
                      <Group gap="xs">
                        <Badge size="xs" color={thresh.badgeColor} variant={isReached ? 'filled' : 'outline'}>
                          {thresh.emoji} {t('levels.levelShort', { lvl: thresh.level })}
                        </Badge>
                        <Text size="xs" fw={isCurrent ? 700 : 500}>
                          {t(thresh.titleKey)}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" fw={600}>
                        {t('levels.xp', { xp: thresh.minXP.toLocaleString() })}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Уведомления и привязка Telegram (только для своего профиля) */}
        {isOwnProfile && (
          <TelegramNotificationsCard
            userId={userId}
            telegramId={
              tgUserInfo?.telegram_id ||
              (profile?.user_metadata?.telegram_id ? String(profile.user_metadata.telegram_id) : null)
            }
            telegramUsername={
              tgUserInfo?.username ||
              (profile?.user_metadata?.username as string | undefined)
            }
            onProfileUpdated={async () => {
              const { data } = await supabase.auth.getUser();
              if (data?.user) setProfile(data.user);
            }}
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
        <Group justify="space-between" align="center" mb={-6}>
          <Title order={3} size="h4">
            {t('profile.achievements')}
          </Title>
          <Badge color="yellow" variant="light" size="sm">
            {t('profile.achievementsProgress', {
              unlocked: achievementsList.filter((a) => a.unlocked).length,
              total: achievementsList.length,
            })}
          </Badge>
        </Group>

        <SegmentedControl
          size="xs"
          fullWidth
          value={achievementFilter}
          onChange={(val) => setAchievementFilter(val as any)}
          data={[
            { label: t('profile.filterAll'), value: 'all' },
            {
              label: `${t('profile.filterUnlocked')} (${achievementsList.filter((a) => a.unlocked).length})`,
              value: 'unlocked',
            },
            {
              label: `${t('profile.filterLocked')} (${achievementsList.filter((a) => !a.unlocked).length})`,
              value: 'locked',
            },
          ]}
        />

        <Stack gap="xs">
          {filteredAchievements.map((ach) => (
            <Card
              key={ach.id}
              withBorder
              padding="sm"
              radius="md"
              opacity={ach.unlocked ? 1 : 0.65}
              style={{
                borderLeft: ach.unlocked
                  ? `4px solid var(--mantine-color-${ach.color}-filled)`
                  : '1px solid var(--mantine-color-border)',
              }}
            >
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="28px" style={{ lineHeight: 1, marginTop: 2 }}>
                    {ach.emoji}
                  </Text>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" align="center">
                      <Text fw={700} size="sm">
                        {ach.title}
                      </Text>
                      <Badge size="xs" color="yellow" variant="light">
                        +{ach.xpReward} XP
                      </Badge>
                    </Group>
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
                <Badge
                  color={ach.unlocked ? ach.color : 'gray'}
                  variant={ach.unlocked ? 'light' : 'outline'}
                  size="sm"
                >
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
