import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import type { TournamentMatch, TournamentState } from './tournamentStore';
import { useI18n } from '../../i18n/i18n';

interface TournamentBracketTreeProps {
  tournament: TournamentState;
  onPlayMatch: (match: TournamentMatch) => void;
}

export function TournamentBracketTree({ tournament, onPlayMatch }: TournamentBracketTreeProps) {
  const { t } = useI18n();

  const getRoundTitle = (match: TournamentMatch) => {
    switch (match.roundName) {
      case 'quarter':
        return `${t('tournament.quarterFinals')} #${match.matchIndex + 1}`;
      case 'semi':
        return `${t('tournament.semiFinals')} #${match.matchIndex + 1}`;
      case 'third_place':
        return t('tournament.thirdPlace');
      case 'final':
        return t('tournament.final');
    }
  };

  const quarterMatches = tournament.matches.filter((m) => m.roundName === 'quarter');
  const semiMatches = tournament.matches.filter((m) => m.roundName === 'semi');
  const finalMatches = tournament.matches.filter((m) => m.roundName === 'final' || m.roundName === 'third_place');

  const renderMatchCard = (match: TournamentMatch) => {
    const isFinished = match.status === 'finished';
    const isReady = match.status === 'ready';
    const isFinal = match.roundName === 'final';

    return (
      <Card
        key={match.id}
        withBorder
        p="sm"
        radius="md"
        bg={isFinal ? 'rgba(250, 176, 5, 0.05)' : undefined}
        style={{
          borderColor: isFinal ? 'var(--mantine-color-yellow-6)' : undefined,
          minWidth: 220,
        }}
      >
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="xs" fw={700} c={isFinal ? 'yellow' : 'dimmed'}>
              {getRoundTitle(match)}
            </Text>
            {isFinished && (
              <Badge size="xs" color="green" variant="light">
                ✓
              </Badge>
            )}
          </Group>

          {/* Команда А */}
          <Group justify="space-between" wrap="nowrap">
            <Text
              size="sm"
              fw={match.winnerTeamId === match.teamA?.id ? 700 : 400}
              c={match.winnerTeamId === match.teamA?.id ? 'blue' : undefined}
              truncate
            >
              {match.teamA?.name || '—'}
            </Text>
            {isFinished && <Badge size="sm" variant="light">{match.scoreA ?? 0}</Badge>}
          </Group>

          {/* Команда Б */}
          <Group justify="space-between" wrap="nowrap">
            <Text
              size="sm"
              fw={match.winnerTeamId === match.teamB?.id ? 700 : 400}
              c={match.winnerTeamId === match.teamB?.id ? 'blue' : undefined}
              truncate
            >
              {match.teamB?.name || '—'}
            </Text>
            {isFinished && <Badge size="sm" variant="light">{match.scoreB ?? 0}</Badge>}
          </Group>

          {isReady && (
            <Button
              size="xs"
              color={isFinal ? 'yellow' : 'blue'}
              fullWidth
              mt={4}
              onClick={() => onPlayMatch(match)}
            >
              {t('tournament.playMatch')}
            </Button>
          )}
        </Stack>
      </Card>
    );
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: tournament.teamsCount === 8 ? 3 : 2 }} spacing="md">
      {quarterMatches.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed" ta="center">
            {t('tournament.quarterFinals')}
          </Text>
          {quarterMatches.map(renderMatchCard)}
        </Stack>
      )}

      {semiMatches.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed" ta="center">
            {t('tournament.semiFinals')}
          </Text>
          {semiMatches.map(renderMatchCard)}
        </Stack>
      )}

      {finalMatches.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed" ta="center">
            {t('tournament.final')}
          </Text>
          {finalMatches.map(renderMatchCard)}
        </Stack>
      )}
    </SimpleGrid>
  );
}
