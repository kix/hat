import { useEffect, useState } from 'react';
import { ActionIcon, Anchor, Avatar, Button, Popover, Stack, Text, Loader } from '@mantine/core';
import { IconBrandGoogle, IconBrandTelegram, IconUserCircle } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useAuthSession } from '../../auth/useAuthSession';
import styles from './AuthMenu.module.css';

// Инициализация OAuth для Google
function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  void supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
}

// Инициализация OIDC для Telegram
function signInWithTelegram(botName: string) {
  const redirectUri = window.location.origin + window.location.pathname;
  const authUrl = `https://oauth.telegram.org/auth?client_id=${botName}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid`;
  window.location.href = authUrl;
}

// Декодер JWT токена на клиенте
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Ошибка декодирования ID Token:', e);
    return null;
  }
}

export function AuthMenu() {
  const session = useAuthSession();
  const user = session?.user;
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME;
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const [loading, setLoading] = useState(false);

  // Обработка OIDC-кода от Telegram в URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && botName && botToken) {
      setLoading(true);
      const redirectUri = window.location.origin + window.location.pathname;

      void (async () => {
        try {
          // Обмениваем code на id_token через PL/pgSQL RPC функцию в Supabase
          const { data, error } = await supabase.rpc('exchange_telegram_code', {
            code,
            redirect_uri: redirectUri,
            bot_name: botName,
            bot_token: botToken,
          });

          if (error) throw error;

          const idToken = data?.id_token;
          if (!idToken) {
            throw new Error('Telegram не вернул id_token');
          }

          // Декодируем JWT-токен
          const decoded = decodeJwt(idToken);
          if (!decoded) {
            throw new Error('Не удалось декодировать данные пользователя');
          }

          // Выполняем анонимный вход в Supabase
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) throw authError;

          if (authData.user) {
            // Сохраняем имя и аватар из Telegram в метаданных пользователя
            const fullName =
              [decoded.given_name, decoded.family_name].filter(Boolean).join(' ') ||
              decoded.nickname ||
              'Telegram User';

            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                avatar_url: decoded.picture,
                telegram_id: decoded.sub,
                provider: 'telegram',
              },
            });
          }
        } catch (e) {
          console.error('Ошибка авторизации через Telegram OIDC:', e);
          alert('Не удалось войти через Telegram. Убедитесь, что настроена RPC-функция в Supabase.');
        } finally {
          setLoading(false);
          // Очищаем URL от параметров авторизации
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, [botName, botToken]);

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
          {loading ? (
            <Loader size={18} color="blue" />
          ) : user ? (
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
            <Anchor component="button" type="button" c="red" onClick={() => void supabase.auth.signOut()}>
              Выйти
            </Anchor>
          </Stack>
        ) : (
          <Stack gap="xs" miw={220}>
            <Text size="sm" fw={500}>
              Войти, чтобы сохранить прогресс
            </Text>
            <Button variant="default" leftSection={<IconBrandGoogle size={18} />} onClick={signInWithGoogle}>
              Войти через Google
            </Button>
            
            {botName ? (
              <Button
                variant="default"
                leftSection={<IconBrandTelegram size={18} color="#229ED9" />}
                onClick={() => signInWithTelegram(botName)}
              >
                Войти через Telegram
              </Button>
            ) : (
              <Text size="xs" c="dimmed" ta="center">
                Настройте VITE_TELEGRAM_BOT_NAME для входа через Telegram
              </Text>
            )}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
