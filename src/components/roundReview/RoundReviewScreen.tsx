import { Button, Container, Stack, Title, Text, Card, Group, SegmentedControl } from '@mantine/core';
import type { HatContext, HatEvent, WordResult } from '../../machine/hatMachine';
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
                    <SegmentedControl
                      fullWidth
                      value={record.result}
                      onChange={(value) =>
                        send({
                          type: 'UPDATE_WORD_RESULT',
                          word: record.word,
                          result: value as WordResult,
                        })
                      }
                      disabled={!canEdit}
                      data={[
                        { value: 'guessed', label: t('review.guessed') },
                        { value: 'skipped', label: t('review.skipped') },
                        { value: 'foul', label: t('review.foul') },
                        { value: 'timeout', label: t('review.timeout') },
                      ]}
                    />
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
