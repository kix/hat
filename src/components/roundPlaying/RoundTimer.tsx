import { RingProgress, Text } from '@mantine/core';
import { isUrgentTime } from '../../utils/timerDisplay';

interface RoundTimerProps {
  timeRemainingSec: number;
  roundDurationSec: number;
}

export function RoundTimer({ timeRemainingSec, roundDurationSec }: RoundTimerProps) {
  const urgent = isUrgentTime(timeRemainingSec);
  const fraction = roundDurationSec > 0 ? Math.max(0, timeRemainingSec / roundDurationSec) : 0;

  return (
    <RingProgress
      size={90}
      thickness={8}
      roundCaps
      sections={[{ value: fraction * 100, color: urgent ? 'red' : 'grape' }]}
      label={
        <Text ta="center" fw={700} size="lg" c={urgent ? 'red' : undefined}>
          {timeRemainingSec}
        </Text>
      }
    />
  );
}
