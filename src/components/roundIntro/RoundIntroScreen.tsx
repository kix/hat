import { Button, Container, Divider, Stack } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { RoleAnnouncement } from './RoleAnnouncement';
import { Scoreboard } from './Scoreboard';
import { PreviousRoundWords } from '../shared/PreviousRoundWords';
import { ExitGameButton } from '../shared/ExitGameButton';

interface RoundIntroScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function RoundIntroScreen({ context, send }: RoundIntroScreenProps) {
  return (
    <Container size="xs" py="lg">
      <ExitGameButton send={send} />
      <Stack gap="lg">
        <PreviousRoundWords context={context} />
        <RoleAnnouncement context={context} />
        <Divider />
        <Scoreboard context={context} />
        <Button size="xl" fullWidth onClick={() => send({ type: 'START_ROUND' })}>
          Начать раунд
        </Button>
      </Stack>
    </Container>
  );
}
