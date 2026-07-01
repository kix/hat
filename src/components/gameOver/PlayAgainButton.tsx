import { Button } from '@mantine/core';
import type { HatEvent } from '../../machine/hatMachine';

interface PlayAgainButtonProps {
  send: (event: HatEvent) => void;
}

export function PlayAgainButton({ send }: PlayAgainButtonProps) {
  return (
    <Button size="lg" fullWidth onClick={() => send({ type: 'RESTART' })}>
      Играть ещё раз
    </Button>
  );
}
