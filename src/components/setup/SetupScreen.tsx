import { Container, Divider, Stack, Title } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { TeamList } from './TeamList';
import { RoundSettingsForm } from './RoundSettingsForm';
import { StartGameButton } from './StartGameButton';

interface SetupScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function SetupScreen({ context, send }: SetupScreenProps) {
  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          Шляпа
        </Title>

        <div>
          <Title order={3} mb="sm">
            Команды
          </Title>
          <TeamList teams={context.teams} send={send} />
        </div>

        <Divider />

        <div>
          <Title order={3} mb="sm">
            Настройки
          </Title>
          <RoundSettingsForm settings={context.settings} send={send} />
        </div>

        <StartGameButton context={context} send={send} />
      </Stack>
    </Container>
  );
}
