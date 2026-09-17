import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  Badge,
  Loader,
  ThemeIcon,
  SegmentedControl,
  Avatar,
  Paper,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconFlame,
  IconBrain,
  IconCrown,
  IconUser,
  IconReload,
  IconChartBar,
  IconClock,
  IconBook2,
} from '@tabler/icons-react';
import { useI18n } from '../../i18n/i18n';
import { useTelegramBackButton } from '../../utils/telegramWebApp';
import {
  fetchLeaderboard,
  fetchHardestWords,
  type LeaderboardEntry,
  type HardestWordEntry,
} from '../../utils/leaderboardData';

interface LeaderboardScreenProps {
  currentUserId?: string;
  onBack: () => void;
}

type MainTab = 'players' | 'hardest_words';
type SortCategory = 'xp' | 'wins' | 'words';

export function LeaderboardScreen({ currentUserId, onBack }: LeaderboardScreenProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<MainTab>('players');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hardestWords, setHardestWords] = useState<HardestWordEntry[]>([]);
  const [category, setCategory] = useState<SortCategory>('xp');

  useTelegramBackButton(onBack);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbData, hwData] = await Promise.all([
        fetchLeaderboard(50),
        fetchHardestWords(10),
      ]);
      setEntries(lbData);
      setHardestWords(hwData);
    } catch (err) {
      console.error('Failed to load statistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const sortedEntries = useMemo(() => {
    const list = [...entries];
    if (category === 'xp') {
      return list.sort((a, b) => b.totalXP - a.totalXP || b.winsCount - a.winsCount);
    }
    if (category === 'wins') {
      return list.sort((a, b) => b.winsCount - a.winsCount || b.totalXP - a.totalXP);
    }
    if (category === 'words') {
      return list.sort((a, b) => b.wordsCount - a.wordsCount || b.totalXP - a.totalXP);
    }
    return list;
  }, [entries, category]);

  const top3 = sortedEntries.slice(0, 3);
  const remaining = sortedEntries.slice(3);

  const currentUserRank = useMemo(() => {
    if (!currentUserId) return null;
    const idx = sortedEntries.findIndex((e) => e.userId === currentUserId);
    if (idx === -1) return null;
    return {
      rank: idx + 1,
      entry: sortedEntries[idx],
    };
  }, [sortedEntries, currentUserId]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: 'yellow', emoji: '🥇', label: '#1' };
    if (rank === 2) return { color: 'gray', emoji: '🥈', label: '#2' };
    if (rank === 3) return { color: 'orange', emoji: '🥉', label: '#3' };
    return { color: 'blue', emoji: '', label: `#${rank}` };
  };

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec} с`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return s > 0 ? `${m} мин ${s} с` : `${m} мин`;
  };

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Кнопка назад и заголовок */}
        <Group justify="space-between" align="center">
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            {t('common.back')}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconReload size={14} />}
            onClick={loadData}
            loading={loading}
          >
            {t('leaderboard.refresh')}
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
            <IconChartBar size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2} size="h3">
              {t('leaderboard.title')}
            </Title>
            <Text size="xs" c="dimmed">
              {t('leaderboard.subtitle')}
            </Text>
          </Stack>
        </Group>

        {/* Главный переключатель: Рейтинг игроков / Топ сложных слов */}
        <SegmentedControl
          value={activeTab}
          onChange={(val) => setActiveTab(val as MainTab)}
          size="sm"
          radius="md"
          data={[
            {
              label: (
                <Group gap={6} justify="center" wrap="nowrap" py={2}>
                  <IconTrophy size={16} />
                  <Text size="xs" fw={700}>
                    {t('leaderboard.tabPlayers')}
                  </Text>
                </Group>
              ),
              value: 'players',
            },
            {
              label: (
                <Group gap={6} justify="center" wrap="nowrap" py={2}>
                  <IconBrain size={16} />
                  <Text size="xs" fw={700}>
                    {t('leaderboard.tabHardestWords')}
                  </Text>
                </Group>
              ),
              value: 'hardest_words',
            },
          ]}
          fullWidth
        />

        {loading ? (
          <Stack align="center" py="xl" gap="md">
            <Loader size="lg" color="blue" />
            <Text size="xs" c="dimmed">{t('leaderboard.loading')}</Text>
          </Stack>
        ) : activeTab === 'players' ? (
          <>
            {/* Переключатель категорий опыта/побед/слов */}
            <SegmentedControl
              value={category}
              onChange={(val) => setCategory(val as SortCategory)}
              data={[
                {
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconFlame size={16} />
                      <Text size="xs" fw={600}>{t('leaderboard.tabXP')}</Text>
                    </Group>
                  ),
                  value: 'xp',
                },
                {
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconCrown size={16} />
                      <Text size="xs" fw={600}>{t('leaderboard.tabWins')}</Text>
                    </Group>
                  ),
                  value: 'wins',
                },
                {
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconBrain size={16} />
                      <Text size="xs" fw={600}>{t('leaderboard.tabWords')}</Text>
                    </Group>
                  ),
                  value: 'words',
                },
              ]}
              fullWidth
            />

            {sortedEntries.length === 0 ? (
              <Card withBorder padding="xl" radius="md" ta="center">
                <Text size="sm" c="dimmed">
                  {t('leaderboard.empty')}
                </Text>
              </Card>
            ) : (
              <Stack gap="md">
              {/* Подиум топ-3 игроков */}
              {top3.length > 0 && (
                <Card withBorder padding="md" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
                  <Group justify="space-around" align="flex-end">
                    {/* 2-е место */}
                    {top3[1] && (
                      <Stack align="center" gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xl">🥈</Text>
                        <Avatar src={top3[1].avatarUrl || undefined} size={48} radius="xl">
                          {top3[1].playerName[0]?.toUpperCase() ?? <IconUser size={20} />}
                        </Avatar>
                        <Text fw={700} size="xs" truncate="end" ta="center" style={{ maxWidth: 85 }}>
                          {top3[1].playerName}
                        </Text>
                        <Badge size="xs" color={top3[1].badgeColor} variant="light">
                          {top3[1].emoji} {t('levels.levelShort', { lvl: top3[1].level })}
                        </Badge>
                        <Text size="xs" fw={700} c="blue">
                          {category === 'xp' && t('levels.xp', { xp: top3[1].totalXP.toLocaleString() })}
                          {category === 'wins' && t('profile.wins', { n: top3[1].winsCount })}
                          {category === 'words' && `${top3[1].wordsCount} ${t('leaderboard.words')}`}
                        </Text>
                      </Stack>
                    )}

                    {/* 1-е место */}
                    {top3[0] && (
                      <Stack align="center" gap={4} style={{ flex: 1.2, minWidth: 0 }} mt={-10}>
                        <ThemeIcon color="yellow" size="lg" radius="xl" variant="filled">
                          <IconCrown size={18} />
                        </ThemeIcon>
                        <Avatar
                          src={top3[0].avatarUrl || undefined}
                          size={64}
                          radius="xl"
                          style={{ border: '3px solid var(--mantine-color-yellow-filled)' }}
                        >
                          {top3[0].playerName[0]?.toUpperCase() ?? <IconUser size={28} />}
                        </Avatar>
                        <Text fw={800} size="sm" truncate="end" ta="center" style={{ maxWidth: 100 }}>
                          {top3[0].playerName}
                        </Text>
                        <Badge size="sm" color={top3[0].badgeColor} variant="filled">
                          {top3[0].emoji} {t('levels.levelShort', { lvl: top3[0].level })}
                        </Badge>
                        <Text size="sm" fw={800} c="yellow.8">
                          {category === 'xp' && t('levels.xp', { xp: top3[0].totalXP.toLocaleString() })}
                          {category === 'wins' && t('profile.wins', { n: top3[0].winsCount })}
                          {category === 'words' && `${top3[0].wordsCount} ${t('leaderboard.words')}`}
                        </Text>
                      </Stack>
                    )}

                    {/* 3-е место */}
                    {top3[2] && (
                      <Stack align="center" gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xl">🥉</Text>
                        <Avatar src={top3[2].avatarUrl || undefined} size={48} radius="xl">
                          {top3[2].playerName[0]?.toUpperCase() ?? <IconUser size={20} />}
                        </Avatar>
                        <Text fw={700} size="xs" truncate="end" ta="center" style={{ maxWidth: 85 }}>
                          {top3[2].playerName}
                        </Text>
                        <Badge size="xs" color={top3[2].badgeColor} variant="light">
                          {top3[2].emoji} {t('levels.levelShort', { lvl: top3[2].level })}
                        </Badge>
                        <Text size="xs" fw={700} c="orange">
                          {category === 'xp' && t('levels.xp', { xp: top3[2].totalXP.toLocaleString() })}
                          {category === 'wins' && t('profile.wins', { n: top3[2].winsCount })}
                          {category === 'words' && `${top3[2].wordsCount} ${t('leaderboard.words')}`}
                        </Text>
                      </Stack>
                    )}
                  </Group>
                </Card>
              )}

              {/* Список остальных игроков */}
              <Stack gap="xs">
                {remaining.map((entry, idx) => {
                  const rank = idx + 4;
                  const isCurrent = entry.userId === currentUserId;
                  const badge = getRankBadge(rank);

                  return (
                    <Card
                      key={entry.userId}
                      withBorder
                      padding="xs"
                      radius="md"
                      style={{
                        background: isCurrent ? 'var(--mantine-color-blue-light)' : undefined,
                        border: isCurrent ? '1.5px solid var(--mantine-color-blue-filled)' : undefined,
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <Badge size="md" color={badge.color} variant="light" miw={36} ta="center">
                            {badge.label}
                          </Badge>
                          <Avatar src={entry.avatarUrl || undefined} size={32} radius="xl">
                            {entry.playerName[0]?.toUpperCase() ?? <IconUser size={16} />}
                          </Avatar>
                          <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                            <Group gap="xs" wrap="nowrap">
                              <Text fw={600} size="sm" truncate="end">
                                {entry.playerName}
                              </Text>
                              {isCurrent && (
                                <Badge size="xs" color="blue" variant="filled">
                                  {t('leaderboard.you')}
                                </Badge>
                              )}
                            </Group>
                            <Group gap={6}>
                              <Text size="11px" c="dimmed">
                                {entry.emoji} {t('levels.levelShort', { lvl: entry.level })} • {t(entry.rankTitle)}
                              </Text>
                            </Group>
                          </Stack>
                        </Group>

                        <Stack gap={0} align="flex-end">
                          <Text fw={700} size="sm" c="blue">
                            {category === 'xp' && t('levels.xp', { xp: entry.totalXP.toLocaleString() })}
                            {category === 'wins' && t('profile.wins', { n: entry.winsCount })}
                            {category === 'words' && `${entry.wordsCount} ${t('leaderboard.words')}`}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {entry.winRate}% {t('profile.winRate').toLowerCase()} ({entry.gamesCount} {t('leaderboard.games')})
                          </Text>
                        </Stack>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>

              {/* Закрепленный блок вашего рейтинга, если вы авторизованы */}
              {currentUserRank && (
                <Card
                  withBorder
                  padding="xs"
                  radius="md"
                  style={{
                    background: 'var(--mantine-color-blue-light)',
                    border: '2px solid var(--mantine-color-blue-filled)',
                    position: 'sticky',
                    bottom: 12,
                    zIndex: 10,
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Badge size="lg" color="blue" variant="filled">
                        #{currentUserRank.rank}
                      </Badge>
                      <Stack gap={0}>
                        <Text fw={700} size="sm">
                          {t('leaderboard.yourPosition')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {currentUserRank.entry.emoji} {t('levels.levelShort', { lvl: currentUserRank.entry.level })} • {t('levels.xp', { xp: currentUserRank.entry.totalXP.toLocaleString() })}
                        </Text>
                      </Stack>
                    </Group>
                    <Text fw={700} size="sm" c="blue">
                      {currentUserRank.entry.winsCount} {t('leaderboard.wins').toLowerCase()} ({currentUserRank.entry.winRate}%)
                    </Text>
                  </Group>
                </Card>
              )}
            </Stack>
          )}
        </>
      ) : (
          /* Вкладка: Топ-10 сложных слов */
          <Stack gap="md">
            <Card withBorder padding="md" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
              <Group gap="sm" align="center">
                <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                  <IconBrain size={20} />
                </ThemeIcon>
                <Stack gap={0} style={{ flex: 1 }}>
                  <Text fw={700} size="sm">
                    {t('leaderboard.hardestWordsTitle')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('leaderboard.hardestWordsSubtitle')}
                  </Text>
                </Stack>
              </Group>
            </Card>

            {hardestWords.length === 0 ? (
              <Card withBorder padding="xl" radius="md" ta="center">
                <Text size="sm" c="dimmed">
                  {t('leaderboard.noHardestWords')}
                </Text>
              </Card>
            ) : (
              <Stack gap="xs">
                {hardestWords.map((item, idx) => {
                  const rank = idx + 1;
                  const badge = getRankBadge(rank);

                  return (
                    <Card key={item.word} withBorder padding="sm" radius="md">
                      <Stack gap="xs">
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                            <Badge size="md" color={badge.color} variant="light" miw={36} ta="center">
                              {badge.label}
                            </Badge>
                            <Text fw={800} size="md" tt="capitalize" truncate="end">
                              {item.word}
                            </Text>
                          </Group>

                          <Group gap="xs" wrap="nowrap">
                            <Badge
                              size="sm"
                              variant="light"
                              color={rank <= 3 ? 'orange' : 'blue'}
                              leftSection={<IconClock size={12} />}
                            >
                              {t('leaderboard.avgSolveTime')}: {formatDuration(item.avgSec)}
                            </Badge>
                            <Badge size="sm" variant="outline" color="gray">
                              {t('leaderboard.solvesCount', { n: item.solvesCount })}
                            </Badge>
                          </Group>
                        </Group>

                        {item.definition ? (
                          <Paper
                            withBorder
                            p="xs"
                            radius="sm"
                            style={{
                              background: 'var(--mantine-color-default-hover)',
                              fontSize: '12px',
                              lineHeight: '1.4',
                            }}
                          >
                            <Group gap={6} align="flex-start" wrap="nowrap">
                              <ThemeIcon size="xs" variant="transparent" color="dimmed" mt={2}>
                                <IconBook2 size={14} />
                              </ThemeIcon>
                              <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                                {item.definition}
                              </Text>
                            </Group>
                          </Paper>
                        ) : null}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
