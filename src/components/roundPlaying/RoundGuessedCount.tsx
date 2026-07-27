import { Stack, Text } from '@mantine/core';
import { useI18n } from '../../i18n/i18n';

interface RoundGuessedCountProps {
  count: number;
}

export function RoundGuessedCount({ count }: RoundGuessedCountProps) {
  const { t } = useI18n();
  return (
    <Stack gap={0} align="center">
      <Text size="xs" c="dimmed">
        {t('roundGuessedCount.guessed')}
      </Text>
      <Text fw={700} size="xl">
        {count}
      </Text>
    </Stack>
  );
}
