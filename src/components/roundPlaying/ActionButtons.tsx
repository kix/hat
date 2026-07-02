import { useEffect, useState } from 'react';
import { Button, LoadingOverlay } from '@mantine/core';
import type { HatEvent } from '../../machine/hatMachine';
import { vibrate } from '../../utils/haptics';
import styles from './ActionButtons.module.css';

// Guards against a tap intended for the previous word landing on the new one
// the instant it appears. Skipped in dev so manual testing isn't slowed down.
const ENABLE_DELAY_MS = 400;

interface ActionButtonsProps {
  allowSkip: boolean;
  vibrationEnabled: boolean;
  wordShownAt: number | null;
  send: (event: HatEvent) => void;
}

export function ActionButtons({ allowSkip, vibrationEnabled, wordShownAt, send }: ActionButtonsProps) {
  const [ready, setReady] = useState(import.meta.env.DEV);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    setReady(false);
    const timeoutId = setTimeout(() => setReady(true), ENABLE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [wordShownAt]);

  function act(event: HatEvent, vibrationMs: number) {
    if (vibrationEnabled) vibrate(vibrationMs);
    send(event);
  }

  return (
    <div className={styles.container} style={{ position: 'relative' }}>
      <LoadingOverlay visible={!ready} zIndex={1} overlayProps={{ radius: 'sm', blur: 1 }} />
      {/* Smaller, muted, further from the thumb's resting spot — reduces
          accidental taps on the two less-frequent (and Foul: destructive)
          actions. */}
      <div className={styles.secondaryRow}>
        {allowSkip && (
          <Button
            variant="outline"
            color="yellow"
            size="md"
            disabled={!ready}
            onClick={() => act({ type: 'WORD_SKIPPED' }, 15)}
          >
            Пропустить
          </Button>
        )}
        <Button variant="outline" color="red" size="md" disabled={!ready} onClick={() => act({ type: 'WORD_FOUL' }, 15)}>
          Нарушение
        </Button>
      </div>
      {/* Most frequent action: large, filled, anchored at the very bottom
          edge — the easiest spot to reach one-handed. */}
      <Button size="xl" fullWidth color="green" disabled={!ready} onClick={() => act({ type: 'WORD_GUESSED' }, 30)}>
        Угадано!
      </Button>
    </div>
  );
}
