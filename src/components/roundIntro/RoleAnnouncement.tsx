import { Card, Stack, Text, Title } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getCurrentRoles } from '../../utils/roles';
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

  const nextTeam = context.teams.length > 1
    ? context.teams[(context.currentTeamIndex + 1) % context.teams.length]
    : null;
  const nextRoles = nextTeam ? getCurrentRoles(nextTeam, context.settings.rolesMode) : null;

  return (
    <Card withBorder padding="lg">
      <Stack gap={4} align="center">
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
        {isIndividual && nextRoles && (
          <Text size="xs" c="dimmed" mt={4}>
            {t('roundIntro.nextPair', { d: nextRoles.describer.name, g: nextRoles.guesser.name })}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
