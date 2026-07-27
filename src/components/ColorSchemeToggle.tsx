import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

// Toggles between light and dark. Reads the *computed* scheme (resolving
// "auto" to the actual light/dark in effect) and flips to the opposite,
// persisting the choice via Mantine's localStorage-backed color scheme.
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';

  return (
    <ActionIcon
      variant="default"
      radius="xl"
      size="lg"
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
