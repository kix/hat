import { Stack, Text } from '@mantine/core';
import { isHatRunningLow } from '../../utils/lowHat';
import { useI18n } from '../../i18n/i18n';
import styles from './HatCountBadge.module.css';

interface HatCountBadgeProps {
  hatLength: number;
}

export function HatCountBadge({ hatLength }: HatCountBadgeProps) {
  const { t } = useI18n();
  const low = isHatRunningLow(hatLength);

  return (
    <Stack gap={0} align="center">
      <Text size="xs" c="dimmed">
        {t('hatCount.inHat')}
      </Text>
      <Text
        component="span"
        fw={700}
        size="xl"
        c={low ? 'orange' : undefined}
        className={low ? styles.count : undefined}
      >
        {hatLength}
      </Text>
    </Stack>
  );
}
