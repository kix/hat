import { Button, Stack, Text } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getSetupValidity } from '../../utils/setupValidity';

interface StartGameButtonProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function StartGameButton({ context, send }: StartGameButtonProps) {
  const { canStart, reasons } = getSetupValidity(context);
  const dictionaryLoading = context.dictionary === null;

  return (
    <Stack gap="xs" align="center">
      <Button
        size="lg"
        fullWidth
        disabled={!canStart || dictionaryLoading}
        loading={dictionaryLoading}
        onClick={() => send({ type: 'START_GAME' })}
      >
        Начать игру
      </Button>
      {dictionaryLoading ? (
        <Text size="sm" c="dimmed" ta="center">
          Загружаем словарь…
        </Text>
      ) : (
        !canStart && (
          <Text size="sm" c="dimmed" ta="center">
            {reasons.join(' · ')}
          </Text>
        )
      )}
    </Stack>
  );
}
