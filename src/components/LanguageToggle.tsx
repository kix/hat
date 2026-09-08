import { ActionIcon } from '@mantine/core';
import { useI18n } from '../i18n/i18n';
import { prefetchEn, loadRuFrequent } from '../data/dictionaryLoader';

// Compact RU/EN switch that flips the app language (persisted). Shows the
// language it will switch TO, matching the theme toggle's affordance.
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'ru' ? 'en' : 'ru';

  const handlePrefetch = () => {
    if (next === 'en') {
      prefetchEn();
    } else {
      void loadRuFrequent();
    }
  };

  return (
    <ActionIcon
      variant="default"
      radius="xl"
      size="lg"
      onClick={() => setLang(next)}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onFocus={handlePrefetch}
      aria-label={t('lang.toggle')}
      fw={700}
    >
      {next.toUpperCase()}
    </ActionIcon>
  );
}
