import { Stack, Text } from '@mantine/core';
import { isHatRunningLow } from '../../utils/lowHat';
import styles from './HatCountBadge.module.css';

interface HatCountBadgeProps {
  hatLength: number;
}

export function HatCountBadge({ hatLength }: HatCountBadgeProps) {
  if (!isHatRunningLow(hatLength)) return null;

  return (
    <Stack gap={0} align="center">
      <Text size="xs" c="dimmed">
        В шляпе
      </Text>
      <Text component="span" fw={700} size="xl" c="orange" className={styles.count}>
        {hatLength}
      </Text>
    </Stack>
  );
}
