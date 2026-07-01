import { ActionIcon, Avatar, Button, Popover, Stack, Text } from '@mantine/core';
import { IconBrandApple, IconBrandGoogle, IconUserCircle } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useAuthSession } from '../../auth/useAuthSession';
import styles from './AuthMenu.module.css';

function signInWith(provider: 'google' | 'apple') {
  void supabase.auth.signInWithOAuth({ provider });
}

export function AuthMenu() {
  const session = useAuthSession();
  const user = session?.user;

  return (
    <Popover position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          aria-label={user ? 'Аккаунт' : 'Войти'}
          variant="white"
          radius="xl"
          size="lg"
          className={styles.trigger}
        >
          {user ? (
            <Avatar size={28} radius="xl" src={user.user_metadata?.avatar_url as string | undefined} />
          ) : (
            <IconUserCircle size={22} />
          )}
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        {user ? (
          <Stack gap="xs" miw={200}>
            <Text size="sm" fw={500} truncate="end">
              {(user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Аккаунт'}
            </Text>
            <Button variant="light" color="red" onClick={() => void supabase.auth.signOut()}>
              Выйти
            </Button>
          </Stack>
        ) : (
          <Stack gap="xs" miw={220}>
            <Text size="sm" fw={500}>
              Войти, чтобы сохранить прогресс
            </Text>
            <Button variant="default" leftSection={<IconBrandGoogle size={18} />} onClick={() => signInWith('google')}>
              Войти через Google
            </Button>
            <Button variant="default" leftSection={<IconBrandApple size={18} />} onClick={() => signInWith('apple')}>
              Войти через Apple
            </Button>
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
