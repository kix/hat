import { Card, Stack, Text, Title, Button } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getLastRoundRecap } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface PreviousRoundWordsProps {
  context: HatContext;
  send?: (event: HatEvent) => void;
  isMultiplayer?: boolean;
  isHost?: boolean;
}

export function PreviousRoundWords({
  context,
  send,
  isMultiplayer = false,
  isHost = false,
}: PreviousRoundWordsProps) {
  const { t } = useI18n();
  const recap = getLastRoundRecap(context.teams, context.history);
  if (!recap) return null;

  const canDispute = !!send && (!isMultiplayer || isHost);

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
        {canDispute && (
          <Button
            variant="light"
            color="orange"
            size="xs"
            mt="xs"
            onClick={() => send({ type: 'OPEN_REVIEW' })}
          >
            {t('prevRound.dispute')}
          </Button>
        )}
      </Stack>
    </Card>
  );
}
