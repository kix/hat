import { Card, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  children: ReactNode;
}

export function StatCard({ title, children }: StatCardProps) {
  return (
    <Card withBorder padding="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          {title}
        </Text>
        {children}
      </Stack>
    </Card>
  );
}
