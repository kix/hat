import { Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import type { HatContext, History, Settings, Team } from '../../machine/hatMachine';
import {
  getBestPlayer,
  getEasiestWord,
  getHardestWord,
  sortTeamsByScore,
  getFastestGuess,
  getSlowestGuess,
  getStolenWords,
  getRuleBreakers,
} from '../../utils/stats';
import { getTeamScore } from '../../utils/scoring';
import { useI18n } from '../../i18n/i18n';
import { ResultBanner } from './ResultBanner';
import { StatCard } from './StatCard';
import { HintedWordsCard } from './HintedWordsCard';
import { PreviousRoundWords } from '../shared/PreviousRoundWords';

interface GameSummaryViewProps {
  teams: Team[];
  history: History;
  settings: Settings;
  // When set, the matching player's rows are marked as "you" — used by the
  // shareable summary page so a viewer can spot themselves among participants.
  highlightPlayerId?: string;
}

// Pure, read-only rendering of a finished game: winner banner, team and
// player rankings, last round recap, and the highlight stat cards. Shared by
// GameOverScreen (post-game) and SummaryScreen (shared link) so both stay in
// sync. All the stat helpers operate purely on teams + history, so this works
// equally on a live context or a game reconstructed from Supabase.
export function GameSummaryView({ teams, history, settings, highlightPlayerId }: GameSummaryViewProps) {
  const { t } = useI18n();
  // The reused sub-components (ResultBanner / HintedWordsCard /
  // PreviousRoundWords) accept a HatContext but only read teams + history.
  // Feed them a minimal context so we don't have to change their signatures.
  const context = {
    teams,
    history,
    settings,
    dictionary: null,
    hat: [],
    currentWord: null,
    wordShownAt: null,
    timeRemainingSec: 0,
    currentTeamIndex: 0,
  } as HatContext;

  const bestPlayer = getBestPlayer(teams, history);
  const hardestWord = getHardestWord(history);
  const easiestWord = getEasiestWord(history);
  const sortedTeams = sortTeamsByScore(teams, history);
  const fastestGuess = getFastestGuess(teams, history);
  const slowestGuess = getSlowestGuess(teams, history);
  const stolenWords = getStolenWords(teams, history);
  const ruleBreakers = getRuleBreakers(teams, history);

  const getFoulLabel = (count: number) => {
    const isEn = t('summaryView.reasonFoul') === 'foul';
    if (isEn) {
      return count === 1
        ? t('summaryView.foulCountPlural1', { n: count })
        : t('summaryView.foulCountPlural2', { n: count });
    }
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return t('summaryView.foulCountPlural1', { n: count });
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return t('summaryView.foulCountPlural2', { n: count });
    }
    return t('summaryView.foulCountPlural5', { n: count });
  };

  const playersWithScores = teams
    .flatMap((team) =>
      team.players.map((player) => {
        const guessed = history.filter(
          (record) => record.result === 'guessed' && record.guesserId === player.id,
        ).length;
        const explained = history.filter(
          (record) => record.result === 'guessed' && record.describerId === player.id,
        ).length;
        return { player, team, guessed, explained };
      }),
    )
    .sort((a, b) => b.guessed - a.guessed || b.explained - a.explained);

  return (
    <Stack gap="lg">
      <ResultBanner context={context} />

      {/* Рейтинг команд */}
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed">
            {t('summaryView.teamRanking')}
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
                <Text fw={600}>{t('common.points', { n: getTeamScore(history, team.id) })}</Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Рейтинг игроков */}
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Text fw={600} size="sm" c="dimmed">
            {t('summaryView.playerRanking')}
          </Text>
          <Stack gap="xs">
            {playersWithScores.map((item, idx) => {
              const isYou = !!highlightPlayerId && item.player.id === highlightPlayerId;
              return (
                <Group key={item.player.id} justify="space-between" wrap="nowrap">
                  <Group gap="xs" style={{ minWidth: 0, flexShrink: 1 }}>
                    <Text fw={500} c={idx === 0 ? 'yellow' : 'dimmed'}>
                      {idx + 1}.
                    </Text>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                        <Text fw={idx === 0 ? 600 : 500} truncate>
                          {item.player.name}
                        </Text>
                        {isYou && (
                          <Badge size="xs" color="blue" variant="light" style={{ flexShrink: 0 }}>
                            {t('summaryView.you')}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" truncate>
                        {item.team.name}
                      </Text>
                    </Stack>
                  </Group>
                  <Text size="xs" style={{ flexShrink: 0 }} ta="right">
                    {t('summaryView.guessedExplained', { g: item.guessed, e: item.explained })}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Stack>
      </Card>

      <PreviousRoundWords context={context} />

      <SimpleGrid cols={1} spacing="sm">
        {bestPlayer && (
          <StatCard title={t('summaryView.bestPlayer')}>
            <Text fw={600}>{bestPlayer.player.name}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryView.bestPlayerSub', { team: bestPlayer.team.name, n: bestPlayer.guessedCount })}
            </Text>
          </StatCard>
        )}

        {fastestGuess && (
          <StatCard title={t('summaryView.fastestGuessTitle')}>
            <Text fw={600}>{fastestGuess.playerName}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryView.fastestGuessSub', {
                word: fastestGuess.word,
                sec: (fastestGuess.timeMs / 1000).toFixed(2),
                team: fastestGuess.teamName,
              })}
            </Text>
          </StatCard>
        )}

        {slowestGuess && (
          <StatCard title={t('summaryView.slowestGuessTitle')}>
            <Text fw={600}>{slowestGuess.playerName}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryView.slowestGuessSub', {
                word: slowestGuess.word,
                sec: (slowestGuess.timeMs / 1000).toFixed(1),
                team: slowestGuess.teamName,
              })}
            </Text>
          </StatCard>
        )}

        {hardestWord && (
          <StatCard title={t('summaryView.hardestWord')}>
            <Text fw={600}>{hardestWord.word}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryView.secs', { n: (hardestWord.timeMs / 1000).toFixed(1) })}
            </Text>
          </StatCard>
        )}

        {easiestWord && (
          <StatCard title={t('summaryView.easiestWord')}>
            <Text fw={600}>{easiestWord.word}</Text>
            <Text size="sm" c="dimmed">
              {t('summaryView.secs', { n: (easiestWord.timeMs / 1000).toFixed(1) })}
            </Text>
          </StatCard>
        )}
      </SimpleGrid>

      {stolenWords.length > 0 && (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm" c="indigo.6">
              {t('summaryView.stolenWordsTitle')}
            </Text>
            <Stack gap="xs">
              {stolenWords.map((stolen, idx) => {
                let reasonKey = 'summaryView.reasonSkip';
                if (stolen.failureReason === 'foul') reasonKey = 'summaryView.reasonFoul';
                if (stolen.failureReason === 'timeout') reasonKey = 'summaryView.reasonTimeout';
                const reason = t(reasonKey);
                return (
                  <Stack key={idx} gap={2}>
                    <Text size="sm" fw={600}>
                      {stolen.thiefPlayerName} ({stolen.thiefTeamName})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('summaryView.stolenWordsSub', {
                        word: stolen.word,
                        victim: stolen.victimPlayerName,
                        victimTeam: stolen.victimTeamName,
                        reason,
                      })}
                    </Text>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Card>
      )}

      {ruleBreakers.length > 0 && (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm" c="red.6">
              {t('summaryView.ruleBreakersTitle')}
            </Text>
            <Stack gap="xs">
              {ruleBreakers.map((breaker, idx) => (
                <Group key={idx} justify="space-between">
                  <Text size="sm" fw={500}>
                    {breaker.playerName} ({breaker.teamName})
                  </Text>
                  <Text size="sm" c="red.6" fw={600}>
                    {getFoulLabel(breaker.foulCount)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      <HintedWordsCard context={context} />
    </Stack>
  );
}
