import { Button, Container, Stack, Text, Group } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getSetupValidity } from '../../utils/setupValidity';
import styles from './StartGameButton.module.css';

interface StartGameButtonProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  onBack?: () => void;
}

export function StartGameButton({ context, send, onBack }: StartGameButtonProps) {
  const { canStart, reasons } = getSetupValidity(context);
  const dictionaryLoading = context.dictionary === null;
  // Tracks the button's natural end-of-page slot (the sentinel below), not
  // the button itself — the button can't watch its own visibility once it
  // becomes position: fixed, since that would remove it from the flow it's
  // trying to observe.
  const { ref: sentinelRef, entry } = useIntersection({ threshold: 1 });
  const atBottom = entry?.isIntersecting ?? false;

  const content = (
    <Stack gap="xs" align="stretch" style={{ width: '100%' }}>
      <Group grow gap="sm">
        {onBack && (
          <Button variant="default" size="lg" onClick={onBack}>
            Назад
          </Button>
        )}
        <Button
          size="lg"
          disabled={!canStart || dictionaryLoading}
          loading={dictionaryLoading}
          onClick={() => send({ type: 'START_GAME' })}
        >
          Начать игру
        </Button>
      </Group>
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

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} />
      {atBottom ? (
        content
      ) : (
        <div className={styles.floating}>
          <Container size="xs">{content}</Container>
        </div>
      )}
    </>
  );
}
