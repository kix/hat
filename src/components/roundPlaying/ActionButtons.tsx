import { Button } from '@mantine/core';
import type { HatEvent } from '../../machine/hatMachine';
import { vibrate } from '../../utils/haptics';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  allowSkip: boolean;
  vibrationEnabled: boolean;
  send: (event: HatEvent) => void;
}

export function ActionButtons({ allowSkip, vibrationEnabled, send }: ActionButtonsProps) {
  function act(event: HatEvent, vibrationMs: number) {
    if (vibrationEnabled) vibrate(vibrationMs);
    send(event);
  }

  return (
    <div className={styles.container}>
      {/* Smaller, muted, further from the thumb's resting spot — reduces
          accidental taps on the two less-frequent (and Foul: destructive)
          actions. */}
      <div className={styles.secondaryRow}>
        {allowSkip && (
          <Button
            variant="outline"
            color="yellow"
            size="md"
            onClick={() => act({ type: 'WORD_SKIPPED' }, 15)}
          >
            Пропустить
          </Button>
        )}
        <Button variant="outline" color="red" size="md" onClick={() => act({ type: 'WORD_FOUL' }, 15)}>
          Нарушение
        </Button>
      </div>
      {/* Most frequent action: large, filled, anchored at the very bottom
          edge — the easiest spot to reach one-handed. */}
      <Button size="xl" fullWidth color="green" onClick={() => act({ type: 'WORD_GUESSED' }, 30)}>
        Угадано!
      </Button>
    </div>
  );
}
