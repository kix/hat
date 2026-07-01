import { Stack, Text } from '@mantine/core';

interface RoundGuessedCountProps {
  count: number;
}

export function RoundGuessedCount({ count }: RoundGuessedCountProps) {
  return (
    <Stack gap={0} align="center">
      <Text size="xs" c="dimmed">
        Угадано
      </Text>
      <Text fw={700} size="xl">
        {count}
      </Text>
    </Stack>
  );
}
