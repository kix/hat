import { Button, Container, Divider, Stack } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { RoleAnnouncement } from './RoleAnnouncement';
import { Scoreboard } from './Scoreboard';
import { PreviousRoundWords } from '../shared/PreviousRoundWords';
import { ExitGameButton } from '../shared/ExitGameButton';
import { useI18n } from '../../i18n/i18n';

interface RoundIntroScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function RoundIntroScreen({ context, send }: RoundIntroScreenProps) {
  const { t } = useI18n();
  return (
    <Container size="xs" py="lg">
      <ExitGameButton send={send} />
      <Stack gap="lg">
        <PreviousRoundWords context={context} />
        <RoleAnnouncement context={context} />
        <Divider />
        <Scoreboard context={context} />
        <Button size="xl" fullWidth onClick={() => send({ type: 'START_ROUND' })}>
          {t('roundIntro.startRound')}
        </Button>
      </Stack>
    </Container>
  );
}
