import { Button, Container, Stack, Title, Text, Card, Group, SimpleGrid } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';
import { ExitGameButton } from '../shared/ExitGameButton';

interface RoundReviewScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  isMultiplayer?: boolean;
  isHost?: boolean;
}

export function RoundReviewScreen({
  context,
  send,
  isMultiplayer = false,
  isHost = false,
}: RoundReviewScreenProps) {
  const { t } = useI18n();

  const lastRecord = context.history[context.history.length - 1];
  const targetTeamId = lastRecord?.teamId;
  const targetRoundIndex = lastRecord?.roundIndex;

  const roundWords = lastRecord
    ? context.history.filter((r) => r.teamId === targetTeamId && r.roundIndex === targetRoundIndex)
    : [];

  const canEdit = !isMultiplayer || isHost;
  const team = context.teams.find((tm) => tm.id === targetTeamId);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {canEdit && <ExitGameButton send={send} />}

      <Container size="xs" py="lg" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack gap="lg" style={{ flex: 1 }}>
          <Stack gap="xs" ta="center">
            <Title order={2}>{t('review.title')}</Title>
            {team && (
              <Text size="sm" c="dimmed">
                {t('prevRound.roundEnded', { team: team.name })}
              </Text>
            )}
            {isMultiplayer && !isHost && (
              <Text size="sm" c="orange" fw={600}>
                {t('review.hostReviewing')}
              </Text>
            )}
          </Stack>

          {roundWords.length === 0 ? (
            <Card withBorder padding="xl" radius="md" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text c="dimmed" ta="center">
                {t('review.noWords')}
              </Text>
            </Card>
          ) : (
            <Stack gap="sm" style={{ flex: 1 }}>
              {roundWords.map((record) => (
                <Card key={record.word} withBorder padding="sm" radius="md">
                  <Stack gap="xs">
                    <Text fw={700} size="md" ta="center">
                      {record.word}
                    </Text>
                    <SimpleGrid cols={2} spacing="xs">
                      <Button
                        size="sm"
                        variant={record.result === 'guessed' ? 'filled' : 'light'}
                        color="green"
                        onClick={() => send({ type: 'UPDATE_WORD_RESULT', word: record.word, result: 'guessed' })}
                        disabled={!canEdit}
                      >
                        {t('review.guessed')}
                      </Button>
                      <Button
                        size="sm"
                        variant={record.result === 'skipped' ? 'filled' : 'light'}
                        color="gray"
                        onClick={() => send({ type: 'UPDATE_WORD_RESULT', word: record.word, result: 'skipped' })}
                        disabled={!canEdit}
                      >
                        {t('review.skipped')}
                      </Button>
                      <Button
                        size="sm"
                        variant={record.result === 'foul' ? 'filled' : 'light'}
                        color="red"
                        onClick={() => send({ type: 'UPDATE_WORD_RESULT', word: record.word, result: 'foul' })}
                        disabled={!canEdit}
                      >
                        {t('review.foul')}
                      </Button>
                      <Button
                        size="sm"
                        variant={record.result === 'timeout' ? 'filled' : 'light'}
                        color="blue"
                        onClick={() => send({ type: 'UPDATE_WORD_RESULT', word: record.word, result: 'timeout' })}
                        disabled={!canEdit}
                      >
                        {t('review.timeout')}
                      </Button>
                    </SimpleGrid>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}

          <Group justify="center" mt="auto" py="md">
            <Button
              size="xl"
              color="blue"
              fullWidth
              style={{ maxWidth: 320 }}
              disabled={!canEdit}
              onClick={() => send({ type: 'CONFIRM_REVIEW' })}
            >
              {t('review.confirm')}
            </Button>
          </Group>
        </Stack>
      </Container>
    </div>
  );
}
