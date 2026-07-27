import { Card, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getLastRoundRecap } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface PreviousRoundWordsProps {
  context: HatContext;
}

export function PreviousRoundWords({ context }: PreviousRoundWordsProps) {
  const { t } = useI18n();
  const recap = getLastRoundRecap(context.teams, context.history);
  if (!recap) return null;

  return (
    <Card withBorder padding="md">
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          {t('prevRound.roundEnded', { team: recap.team.name })}
        </Text>
        <Title order={4}>{t('prevRound.guessedWords')}</Title>
        {recap.guessed.length > 0 ? (
          <Text fw={500}>{recap.guessed.map((record) => record.word).join(', ')}</Text>
        ) : (
          <Text c="dimmed">{t('prevRound.nothing')}</Text>
        )}
      </Stack>
    </Card>
  );
}
