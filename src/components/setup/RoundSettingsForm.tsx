import { Group, SegmentedControl, Select, Slider, Stack, Switch, Text, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { DictionaryEntry } from '../../data/dictionary';
import { prefetchRuStandard } from '../../data/dictionaryLoader';
import { THEMATIC_PACK_METAS } from '../../data/thematicPacks';
import type { HatEvent, Settings, WordPack } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';

interface RoundSettingsFormProps {
  settings: Settings;
  dictionary: DictionaryEntry[] | null;
  send: (event: HatEvent) => void;
}

export function RoundSettingsForm({ settings, dictionary, send }: RoundSettingsFormProps) {
  const { t } = useI18n();
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

  const wordPackSelectData = [
    {
      group: t('roundSettings.groupStandard'),
      items: [
        { value: 'frequent', label: `🔥 ${t('roundSettings.packFrequent')}` },
        { value: 'standard', label: `📚 ${t('roundSettings.packAll')}` },
      ],
    },
    {
      group: t('roundSettings.groupThematic'),
      items: THEMATIC_PACK_METAS.map((m) => ({
        value: m.id,
        label: `${m.emoji} ${t(m.titleKey)}`,
      })),
    },
    {
      group: t('roundSettings.groupCustom'),
      items: [{ value: 'custom', label: `✏️ ${t('roundSettings.packCustom')}` }],
    },
  ];

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          {t('roundSettings.roundDuration')}
        </Text>
        <SegmentedControl
          fullWidth
          value={String(settings.roundDurationSec)}
          onChange={(value) =>
            send({ type: 'SET_ROUND_DURATION', roundDurationSec: Number(value) as 30 | 60 | 120 })
          }
          data={[
            { value: '30', label: t('roundSettings.secShort', { n: 30 }) },
            { value: '60', label: t('roundSettings.secShort', { n: 60 }) },
            { value: '120', label: t('roundSettings.secShort', { n: 120 }) },
          ]}
        />
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>
          {t('roundSettings.gameFormat')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.gameFormat || 'single'}
          onChange={(value) =>
            send({ type: 'SET_GAME_FORMAT', gameFormat: value as 'single' | 'classic3' })
          }
          data={[
            { value: 'single', label: t('roundSettings.formatSingle') },
            { value: 'classic3', label: t('roundSettings.formatClassic3') },
          ]}
        />
        {settings.gameFormat === 'classic3' && (
          <Text size="xs" c="dimmed" mt={4}>
            {t('roundSettings.formatClassic3Desc')}
          </Text>
        )}
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>
          {t('roundSettings.roles')}
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.rolesMode}
          onChange={(value) => send({ type: 'SET_ROLES_MODE', rolesMode: value as 'alternate' | 'fixed' })}
          data={[
            { value: 'alternate', label: t('roundSettings.rolesAlternate') },
            { value: 'fixed', label: t('roundSettings.rolesFixed') },
          ]}
        />
      </div>

      <Switch
        label={t('roundSettings.allowSkip')}
        checked={settings.allowSkip}
        onChange={(event) => send({ type: 'SET_ALLOW_SKIP', allowSkip: event.currentTarget.checked })}
      />

      <Switch
        label={t('roundSettings.enableReview')}
        description={t('roundSettings.enableReviewDesc')}
        checked={settings.enableReview}
        onChange={(event) => send({ type: 'SET_ENABLE_REVIEW', enableReview: event.currentTarget.checked })}
      />

      <Switch
        label={t('roundSettings.sound')}
        checked={settings.soundEnabled}
        onChange={(event) => send({ type: 'SET_SOUND_ENABLED', soundEnabled: event.currentTarget.checked })}
      />

      {isTouchDevice && (
        <Switch
          label={t('roundSettings.vibration')}
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

      <div onMouseEnter={prefetchRuStandard} onTouchStart={prefetchRuStandard}>
        <Select
          label={t('roundSettings.wordPack')}
          value={settings.wordPack || 'frequent'}
          onChange={(value) => {
            if (value) send({ type: 'SET_WORD_PACK', wordPack: value as WordPack });
          }}
          data={wordPackSelectData}
          allowDeselect={false}
        />
      </div>

      {settings.wordPack === 'custom' ? (
        <div>
          <Textarea
            label={t('roundSettings.customLabel')}
            placeholder={t('roundSettings.customPlaceholder')}
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
            {t('roundSettings.wordsEntered', { n: settings.customWords.length })}
          </Text>
        </div>
      ) : (
        <>
          <div>
            <Text size="sm" fw={500} mb={4}>
              {t('roundSettings.wordCount')}
            </Text>
            <Slider
              value={settings.wordCount}
              min={10}
              max={100}
              onChange={(value) => send({ type: 'SET_WORD_COUNT', wordCount: value })}
              label={(value) => `${value}`}
              mx="xs"
            />
            <Group justify="space-between" mx="xs" mt={4} mb="lg">
              <Text size="xs" c="dimmed">
                10
              </Text>
              <Text size="xs" c="dimmed">
                100
              </Text>
            </Group>
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              {t('roundSettings.difficulty')}
            </Text>
            <Slider
              value={Math.round(settings.difficultyLevel * 100)}
              onChange={(value) => send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel: value / 100 })}
              label={(value) => `${value}%`}
              mx="xs"
            />
            <Group justify="space-between" mx="xs" mt={4} mb="lg">
              <Text size="xs" c="dimmed">
                {t('roundSettings.easier')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('roundSettings.harder')}
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {poolSize === null
                ? t('roundSettings.dictLoading')
                : t('roundSettings.poolAvailable', { n: poolSize })}
            </Text>
          </div>
        </>
      )}
    </Stack>
  );
}
