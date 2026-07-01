import { Button, Container, Stack, Text } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getSetupValidity } from '../../utils/setupValidity';
import styles from './StartGameButton.module.css';

interface StartGameButtonProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function StartGameButton({ context, send }: StartGameButtonProps) {
  const { canStart, reasons } = getSetupValidity(context);
  // Tracks the button's natural end-of-page slot (the sentinel below), not
  // the button itself — the button can't watch its own visibility once it
  // becomes position: fixed, since that would remove it from the flow it's
  // trying to observe.
  const { ref: sentinelRef, entry } = useIntersection({ threshold: 1 });
  const atBottom = entry?.isIntersecting ?? false;

  const content = (
    <Stack gap="xs" align="center">
      <Button size="lg" fullWidth disabled={!canStart} onClick={() => send({ type: 'START_GAME' })}>
        Начать игру
      </Button>
      {!canStart && (
        <Text size="sm" c="dimmed" ta="center">
          {reasons.join(' · ')}
        </Text>
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
