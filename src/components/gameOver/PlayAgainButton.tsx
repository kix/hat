import { Button } from '@mantine/core';
import type { HatEvent } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';

interface PlayAgainButtonProps {
  send: (event: HatEvent) => void;
}

export function PlayAgainButton({ send }: PlayAgainButtonProps) {
  const { t } = useI18n();
  return (
    <Button size="lg" fullWidth onClick={() => send({ type: 'RESTART' })}>
      {t('playAgain')}
    </Button>
  );
}
