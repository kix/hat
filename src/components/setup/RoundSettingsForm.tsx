import { Chip, Group, NumberInput, SegmentedControl, Stack, Switch, Text } from '@mantine/core';
import { dictionary, type DifficultyLevel } from '../../data/dictionary';
import type { HatEvent, Settings } from '../../machine/hatMachine';

interface RoundSettingsFormProps {
  settings: Settings;
  send: (event: HatEvent) => void;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Лёгкие',
  medium: 'Средние',
  hard: 'Сложные',
};

export function RoundSettingsForm({ settings, send }: RoundSettingsFormProps) {
  const poolSize = dictionary.filter((entry) => settings.difficulties.includes(entry.difficulty)).length;

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Длительность раунда
        </Text>
        <SegmentedControl
          fullWidth
          value={String(settings.roundDurationSec)}
          onChange={(value) =>
            send({ type: 'SET_ROUND_DURATION', roundDurationSec: Number(value) as 30 | 60 | 120 })
          }
          data={[
            { value: '30', label: '30 сек' },
            { value: '60', label: '60 сек' },
            { value: '120', label: '120 сек' },
          ]}
        />
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>
          Роли в команде
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.rolesMode}
          onChange={(value) => send({ type: 'SET_ROLES_MODE', rolesMode: value as 'alternate' | 'fixed' })}
          data={[
            { value: 'alternate', label: 'Чередуются' },
            { value: 'fixed', label: 'Фиксированные' },
          ]}
        />
      </div>

      <Switch
        label="Разрешить пропуск слова"
        checked={settings.allowSkip}
        onChange={(event) => send({ type: 'SET_ALLOW_SKIP', allowSkip: event.currentTarget.checked })}
      />

      <NumberInput
        label="Количество слов в шляпе"
        min={1}
        value={settings.wordCount}
        onChange={(value) => send({ type: 'SET_WORD_COUNT', wordCount: typeof value === 'number' ? value : 1 })}
      />

      <div>
        <Text size="sm" fw={500} mb={4}>
          Сложность слов
        </Text>
        <Chip.Group
          multiple
          value={settings.difficulties}
          onChange={(value) => send({ type: 'SET_DIFFICULTIES', difficulties: value as DifficultyLevel[] })}
        >
          <Group gap="xs">
            {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((level) => (
              <Chip key={level} value={level}>
                {DIFFICULTY_LABELS[level]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Text size="xs" c="dimmed" mt={4}>
          Доступно слов: {poolSize}
        </Text>
      </div>
    </Stack>
  );
}
