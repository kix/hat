import { useEffect } from 'react';
import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import confetti from 'canvas-confetti';
import type { TournamentState } from './tournamentStore';
import { useI18n } from '../../i18n/i18n';

interface TournamentPodiumProps {
  tournament: TournamentState;
}

export function TournamentPodium({ tournament }: TournamentPodiumProps) {
  const { t } = useI18n();
  const podium = tournament.podium;

  useEffect(() => {
    if (podium) {
      void confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [podium]);

  if (!podium) return null;

  return (
    <Card withBorder p="xl" radius="lg" bg="var(--mantine-color-default-hover)" style={{ textAlign: 'center' }}>
      <Stack gap="lg" align="center">
        <Title order={2}>
          {t('tournament.podiumTitle')}
        </Title>

        <Group justify="center" align="flex-end" gap="lg" wrap="nowrap" style={{ width: '100%', maxWidth: 500 }}>
          {/* 2-е место */}
          {podium.second && (
            <Stack gap={4} align="center" style={{ flex: 1 }}>
              <Text size="2.5rem">🥈</Text>
              <Badge color="gray" size="xl" variant="light" fullWidth>
                {podium.second.name}
              </Badge>
              <Text size="xs" c="dimmed">
                {t('tournament.secondPlace')}
              </Text>
            </Stack>
          )}

          {/* 1-е место (Чемпион) */}
          {podium.first && (
            <Stack gap={4} align="center" style={{ flex: 1.2, transform: 'scale(1.1)' }}>
              <Text size="3.5rem">👑 🥇</Text>
              <Badge color="yellow" size="xl" variant="filled" fullWidth style={{ fontSize: '1.1rem', padding: '1rem' }}>
                {podium.first.name}
              </Badge>
              <Text size="sm" fw={700} c="yellow">
                {t('tournament.firstPlace')}
              </Text>
            </Stack>
          )}

          {/* 3-е место */}
          {podium.third && (
            <Stack gap={4} align="center" style={{ flex: 1 }}>
              <Text size="2.5rem">🥉</Text>
              <Badge color="orange" size="xl" variant="light" fullWidth>
                {podium.third.name}
              </Badge>
              <Text size="xs" c="dimmed">
                {t('tournament.thirdPlaceTitle')}
              </Text>
            </Stack>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
