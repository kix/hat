import { Card, Stack, Text } from '@mantine/core';
import type { HatContext } from '../../machine/hatMachine';
import { getHintedWords } from '../../utils/stats';
import { useI18n } from '../../i18n/i18n';

interface HintedWordsCardProps {
  context: HatContext;
}

export function HintedWordsCard({ context }: HintedWordsCardProps) {
  const { t } = useI18n();
  const hinted = getHintedWords(context.teams, context.history);
  if (hinted.length === 0) return null;

  const teamName = (teamId: string) => context.teams.find((team) => team.id === teamId)?.name ?? '?';

  return (
    <Card withBorder padding="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          {t('hinted.title')}
        </Text>
        {hinted.map((hint, index) => (
          <Text key={index}>
            {t('hinted.line', {
              word: hint.word,
              a: teamName(hint.strugglingTeamId),
              b: teamName(hint.helpedTeamId),
            })}
          </Text>
        ))}
      </Stack>
    </Card>
  );
}
