import { SegmentedControl, Slider, Stack, Switch, Text, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { DictionaryEntry } from '../../data/dictionary';
import type { HatEvent, Settings } from '../../machine/hatMachine';

interface RoundSettingsFormProps {
  settings: Settings;
  dictionary: DictionaryEntry[] | null;
  send: (event: HatEvent) => void;
}

export function RoundSettingsForm({ settings, dictionary, send }: RoundSettingsFormProps) {
  // Вычисляем размер доступного пула слов в зависимости от выбранного пака
  const poolSize =
    settings.wordPack === 'custom'
      ? settings.customWords.length
      : settings.wordPack === 'frequent'
      ? dictionary
        ? dictionary.filter((w) => w.frequency >= 3.0 || w.levenshtein_zipf_frequency >= 3.0).length
        : null
      : dictionary?.length ?? null;

  // Laptops/desktops (mouse-primary, fine pointer) have no vibration motor —
  // no point showing a setting that can't do anything there.
  const isTouchDevice = useMediaQuery('(pointer: coarse)', undefined, { getInitialValueInEffect: false });

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

      <Switch
        label="Звук"
        checked={settings.soundEnabled}
        onChange={(event) => send({ type: 'SET_SOUND_ENABLED', soundEnabled: event.currentTarget.checked })}
      />

      {isTouchDevice && (
        <Switch
          label="Вибрация"
          checked={settings.vibrationEnabled}
          onChange={(event) => {
            const vibrationEnabled = event.currentTarget.checked;
            send({ type: 'SET_VIBRATION_ENABLED', vibrationEnabled });
            // Chrome only allows navigator.vibrate() during a user gesture — call
            // it right here, synchronously in this click handler, so later calls
            // triggered from timers/game events are allowed to actually vibrate.
            if (vibrationEnabled) navigator.vibrate([50, 50, 50]);
          }}
        />
      )}

      <div>
        <Text size="sm" fw={500} mb={4}>
          Набор слов (Словарь)
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.wordPack || 'standard'}
          onChange={(value) =>
            send({ type: 'SET_WORD_PACK', wordPack: value as 'standard' | 'frequent' | 'custom' })
          }
          data={[
            { value: 'standard', label: 'Все слова' },
            { value: 'frequent', label: 'Частотный (топ)' },
            { value: 'custom', label: 'Свой список' },
          ]}
        />
      </div>

      {settings.wordPack === 'custom' ? (
        <div>
          <Textarea
            label="Ваш список слов"
            placeholder="Введите слова через запятую или с новой строки..."
            minRows={3}
            autosize
            value={settings.customWords.join('\n')}
            onChange={(event) => {
              const text = event.currentTarget.value;
              const words = text
                .split(/[,\n]+/)
                .map((w) => w.trim())
                .filter((w) => w.length > 0);
              send({ type: 'SET_CUSTOM_WORDS', customWords: words });
            }}
          />
          <Text size="xs" c="dimmed" mt={4}>
            Введено слов: {settings.customWords.length}
          </Text>
        </div>
      ) : (
        <>
          <div>
            <Text size="sm" fw={500} mb={4}>
              Количество слов в шляпе
            </Text>
            <Slider
              value={settings.wordCount}
              min={10}
              max={100}
              onChange={(value) => send({ type: 'SET_WORD_COUNT', wordCount: value })}
              label={(value) => `${value}`}
              marks={[
                { value: 10, label: '10' },
                { value: 100, label: '100' },
              ]}
              mx="xs"
              mb="lg"
              styles={{ markLabel: { whiteSpace: 'nowrap' } }}
            />
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              Сложность слов
            </Text>
            <Slider
              value={Math.round(settings.difficultyLevel * 100)}
              onChange={(value) => send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel: value / 100 })}
              label={(value) => `${value}%`}
              marks={[
                { value: 0, label: 'Легче' },
                { value: 100, label: 'Сложнее' },
              ]}
              mx="xs"
              mb="lg"
              styles={{ markLabel: { whiteSpace: 'nowrap' } }}
            />
            <Text size="xs" c="dimmed" mt={4}>
              {poolSize === null ? 'Словарь загружается…' : `Доступно слов в паке: ${poolSize}`}
            </Text>
          </div>
        </>
      )}
    </Stack>
  );
}
