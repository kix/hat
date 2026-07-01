import { Card, Stack, Text } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getHintedWords } from '../../utils/stats';

interface HintedWordsCardProps {
  context: HatContext;
}

export function HintedWordsCard({ context }: HintedWordsCardProps) {
  const hinted = getHintedWords(context.teams, context.history);
  if (hinted.length === 0) return null;

  const teamName = (teamId: string) => context.teams.find((team) => team.id === teamId)?.name ?? '?';

  return (
    <Card withBorder padding="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          Подсказали 👀
        </Text>
        {hinted.map((hint, index) => (
          <Text key={index}>
            «{hint.word}»: {teamName(hint.strugglingTeamId)} не смогла отгадать, а{' '}
            {teamName(hint.helpedTeamId)} угадала почти мгновенно
          </Text>
        ))}
      </Stack>
    </Card>
  );
}
