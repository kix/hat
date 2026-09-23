import { Card, Group, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getCurrentRoles } from '../../utils/roles';
import { StageBadge } from '../shared/StageBadge';
import { useI18n } from '../../i18n/i18n';

interface RoleAnnouncementProps {
  context: HatContext;
}

export function RoleAnnouncement({ context }: RoleAnnouncementProps) {
  const { t } = useI18n();
  const team = context.teams[context.currentTeamIndex];
  const { describer, guesser } = getCurrentRoles(team, context.settings.rolesMode);
  const isPairs = context.settings.gameMode === 'pairs';
  const isIndividual = context.settings.gameMode === 'individual';
  const isClassic3 = context.settings.gameFormat === 'classic3';
  const stageIndex = context.currentStageIndex ?? 1;

  const stageDescKey =
    stageIndex === 1
      ? 'stage.stage1Desc'
      : stageIndex === 2
        ? 'stage.stage2Desc'
        : 'stage.stage3Desc';

  const nextTeam = context.teams.length > 1
    ? context.teams[(context.currentTeamIndex + 1) % context.teams.length]
    : null;
  const nextRoles = nextTeam ? getCurrentRoles(nextTeam, context.settings.rolesMode) : null;

  return (
    <Card withBorder padding="lg">
      <Stack gap={4} align="center">
        {isClassic3 && (
          <Group gap="xs" mb={4}>
            <StageBadge stageIndex={stageIndex} size="md" />
          </Group>
        )}
        <Text size="sm" c="dimmed">
          {isIndividual
            ? t('roundIntro.individualTurn')
            : isPairs
            ? t('roundIntro.pairTurn')
            : t('roundIntro.teamTurn')}
        </Text>
        {!isPairs && !isIndividual && (
          <Title order={2} ta="center">
            {team.name}
          </Title>
        )}
        <Text ta="center" size="lg">
          <b>{describer.name}</b> {t('roundIntro.explains')} — <b>{guesser.name}</b>{' '}
          {t('roundIntro.guesses')}
        </Text>
        {isClassic3 && (
          <Text size="xs" fw={500} c="blue" ta="center" mt={2}>
            {t(stageDescKey)}
          </Text>
        )}
        {isIndividual && nextRoles && (
          <Text size="xs" c="dimmed" mt={4}>
            {t('roundIntro.nextPair', { d: nextRoles.describer.name, g: nextRoles.guesser.name })}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
