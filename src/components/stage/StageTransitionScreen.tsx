import { Button, Card, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { Scoreboard } from '../roundIntro/Scoreboard';
import { ExitGameButton } from '../shared/ExitGameButton';
import { StageBadge } from '../shared/StageBadge';
import { useI18n } from '../../i18n/i18n';

interface StageTransitionScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function StageTransitionScreen({ context, send }: StageTransitionScreenProps) {
  const { t } = useI18n();
  const currentStage = context.currentStageIndex ?? 1;
  const nextStage = currentStage + 1;

  const nextStageNameKey =
    nextStage === 2
      ? 'stage.stage2Name'
      : nextStage === 3
        ? 'stage.stage3Name'
        : 'stage.stage1Name';

  const nextStageDescKey =
    nextStage === 2
      ? 'stage.stage2Desc'
      : nextStage === 3
        ? 'stage.stage3Desc'
        : 'stage.stage1Desc';

  const wordCount = context.wordsPool?.length || context.settings.wordCount;

  return (
    <Container size="xs" py="lg">
      <ExitGameButton send={send} />
      <Stack gap="lg" mt="sm">
        <Stack gap="xs" align="center" ta="center">
          <Title order={2}>
            {t('stageTransition.title', { n: currentStage })}
          </Title>
          <Text c="dimmed" size="sm">
            {t('stageTransition.wordsReturning', { n: wordCount })}
          </Text>
        </Stack>

        <Card withBorder radius="md" p="md" bg="var(--mantine-color-default-hover)">
          <Stack gap="sm" align="center" ta="center">
            <StageBadge stageIndex={nextStage} size="xl" />
            <Title order={3}>{t(nextStageNameKey)}</Title>
            <Text size="md" fw={500} c="blue">
              {t(nextStageDescKey)}
            </Text>
          </Stack>
        </Card>

        <Divider label={t('roundIntro.scoreTitle')} labelPosition="center" />
        <Scoreboard context={context} />

        <Group grow>
          <Button size="xl" onClick={() => send({ type: 'PROCEED_TO_NEXT_STAGE' })}>
            {t('stageTransition.continue', { n: nextStage })}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
