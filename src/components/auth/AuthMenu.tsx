import { useEffect, useState } from 'react';
import { ActionIcon, Anchor, Avatar, Button, Popover, Stack, Text, Loader } from '@mantine/core';
import { IconBrandTelegram, IconUserCircle } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { tr } from '../../i18n/lang';
import styles from './AuthMenu.module.css';

// Получение текущего URL без временных параметров авторизации
function getCleanCurrentUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  return url.toString();
}

// Инициализация OIDC для Telegram
export function signInWithTelegram(clientId: string) {
  const redirectUri = getCleanCurrentUrl();
  const authUrl = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
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

interface AuthMenuProps {
  onViewProfile?: () => void;
}

export function AuthMenu({ onViewProfile }: AuthMenuProps) {
  const { t } = useI18n();
  const session = useAuthSession();
  const user = session?.user;
  const isRealUser = !!(user && (!user.is_anonymous || user.user_metadata?.provider === 'telegram'));
  const clientId = import.meta.env.VITE_TELEGRAM_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_TELEGRAM_CLIENT_SECRET;
  const [loading, setLoading] = useState(false);

  // Обработка OIDC-кода от Telegram в URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && clientId && clientSecret) {
      setLoading(true);
      const redirectUri = getCleanCurrentUrl();

      void (async () => {
        try {
          // Обмениваем code на id_token через PL/pgSQL RPC функцию в Supabase
          const { data, error } = await supabase.rpc('exchange_telegram_code', {
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          });

          if (error) throw error;

          const idToken = data?.id_token;
          if (!idToken) {
            throw new Error(tr('auth.telegramNoIdToken', { data: JSON.stringify(data) }));
          }

          // Декодируем JWT-токен
          const decoded = decodeJwt(idToken);
          if (!decoded) {
            throw new Error(tr('auth.decodeFailed'));
          }

          // Извлекаем Telegram ID из OIDC токена (используем decoded.id / decoded.telegram_id, если доступны, с фоллбеком на sub)
          const telegramId = String(decoded.id || decoded.telegram_id || decoded.sub || '');
          if (!telegramId) {
            throw new Error('Telegram ID не найден в claims токена');
          }

          const fullName =
            [decoded.given_name, decoded.family_name].filter(Boolean).join(' ') ||
            decoded.nickname ||
            'Telegram User';

          // 1. Выполняем анонимный вход в Supabase (гарантированно работает без почтовых лимитов)
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) throw signInError;
          if (!signInData.user) throw new Error('Не удалось получить анонимного пользователя');

          // 2. Связываем/объединяем анонимного пользователя с историей и настройками Telegram-аккаунта
          const { error: rpcError } = await supabase.rpc('link_telegram_user', {
            p_new_user_id: signInData.user.id,
            p_telegram_id: telegramId,
            p_full_name: fullName,
            p_avatar_url: decoded.picture || decoded.avatar_url || '',
          });

          if (rpcError) throw rpcError;

          // 3. Обновляем сессию клиента, чтобы подтянуть новые метаданные Telegram в JWT
          await supabase.auth.refreshSession();
        } catch (e: any) {
          console.error('Ошибка авторизации через Telegram OIDC:', e);
          let errorMsg = '';
          if (e && typeof e === 'object') {
            errorMsg = e.message || e.details || e.error_description || JSON.stringify(e);
            if (errorMsg === '{}') {
              errorMsg = `${e.name || 'Error'}: ${e.message || 'Unknown error'}`;
            }
          } else {
            errorMsg = String(e);
          }
          alert(tr('auth.telegramFailed', { error: errorMsg }));
        } finally {
          setLoading(false);
          // Очищаем URL от параметров авторизации
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, [clientId, clientSecret]);

  return (
    <Popover position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          aria-label={isRealUser ? t('auth.account') : t('auth.signIn')}
          variant="white"
          radius="xl"
          size="lg"
          className={styles.trigger}
        >
          {loading ? (
            <Loader size={18} color="blue" />
          ) : isRealUser ? (
            <Avatar size={28} radius="xl" src={user?.user_metadata?.avatar_url as string | undefined} />
          ) : (
            <IconUserCircle size={22} />
          )}
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        {isRealUser ? (
          <Stack gap="xs" miw={200}>
            <Text size="sm" fw={500} truncate="end">
              {(user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? t('auth.account')}
            </Text>
            {onViewProfile && (
              <Anchor component="button" type="button" onClick={onViewProfile} fw={500}>
                {t('auth.myProfile')}
              </Anchor>
            )}
            <Anchor component="button" type="button" c="red" onClick={() => void supabase.auth.signOut()}>
              {t('auth.signOut')}
            </Anchor>
          </Stack>
        ) : (
          <Stack gap="xs" miw={220}>
            <Text size="sm" fw={500}>
              {t('auth.signInToSave')}
            </Text>

            {clientId ? (
              <Button
                variant="default"
                leftSection={<IconBrandTelegram size={18} color="#229ED9" />}
                onClick={() => signInWithTelegram(clientId)}
              >
                {t('auth.telegram')}
              </Button>
            ) : (
              <Text size="xs" c="dimmed" ta="center">
                {t('auth.telegramNotConfigured')}
              </Text>
            )}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
