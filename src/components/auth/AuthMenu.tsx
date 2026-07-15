import { useEffect, useRef } from 'react';
import { ActionIcon, Anchor, Avatar, Button, Popover, Stack, Text } from '@mantine/core';
import { IconBrandGoogle, IconUserCircle } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useAuthSession } from '../../auth/useAuthSession';
import { verifyTelegramHash, type TelegramUser } from '../../auth/telegram';
import styles from './AuthMenu.module.css';

// Элемент инициализации OAuth (только для Google)
function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  void supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
}

function TelegramLoginButton({ botName, onAuth }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Очищаем контейнер перед добавлением виджета
    containerRef.current.innerHTML = '';

    // Регистрируем глобальный коллбэк для виджета Telegram
    const callbackName = 'onTelegramAuth';
    (window as any)[callbackName] = (user: TelegramUser) => {
      onAuth(user);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, [botName, onAuth]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }} />;
}

export function AuthMenu() {
  const session = useAuthSession();
  const user = session?.user;
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME;

  const handleTelegramAuth = async (tgUser: TelegramUser) => {
    let isValid = true;
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

    if (botToken) {
      isValid = await verifyTelegramHash(tgUser, botToken);
    } else {
      console.warn(
        'Telegram bot token is not provided (VITE_TELEGRAM_BOT_TOKEN). Signature verification skipped in development.'
      );
    }

    if (isValid) {
      try {
        // Выполняем анонимный вход в Supabase
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        if (data.user) {
          // Сохраняем имя и аватар из Telegram в метаданных пользователя
          const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Telegram User';
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              avatar_url: tgUser.photo_url,
              telegram_id: tgUser.id,
              provider: 'telegram'
            }
          });
        }
      } catch (e) {
        console.error('Ошибка входа через Telegram в Supabase:', e);
      }
    } else {
      alert('Ошибка: Не удалось подтвердить подпись Telegram (проверьте VITE_TELEGRAM_BOT_TOKEN).');
    }
  };

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
              <TelegramLoginButton botName={botName} onAuth={handleTelegramAuth} />
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
