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

  return (
    <Card withBorder padding="lg">
      <Stack gap={4} align="center">
        <Text size="sm" c="dimmed">
          {t('roundIntro.teamTurn')}
        </Text>
        <Title order={2} ta="center">
          {team.name}
        </Title>
        <Text ta="center">
          <b>{describer.name}</b> {t('roundIntro.explains')} — <b>{guesser.name}</b>{' '}
          {t('roundIntro.guesses')}
        </Text>
      </Stack>
    </Card>
  );
}
