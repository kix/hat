import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useI18n } from '../i18n/i18n';

// Toggles between light and dark. Reads the *computed* scheme (resolving
// "auto" to the actual light/dark in effect) and flips to the opposite,
// persisting the choice via Mantine's localStorage-backed color scheme.
export function ColorSchemeToggle() {
  const { t } = useI18n();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';

  return (
    <ActionIcon
      variant="default"
      radius="xl"
      size="lg"
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
