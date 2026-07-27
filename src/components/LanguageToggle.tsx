import { ActionIcon } from '@mantine/core';
import { useI18n } from '../i18n/i18n';

// Compact RU/EN switch that flips the app language (persisted). Shows the
// language it will switch TO, matching the theme toggle's affordance.
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'ru' ? 'en' : 'ru';

  return (
    <ActionIcon
      variant="default"
      radius="xl"
      size="lg"
      onClick={() => setLang(next)}
      aria-label={t('lang.toggle')}
      fw={700}
    >
      {next.toUpperCase()}
    </ActionIcon>
  );
}
