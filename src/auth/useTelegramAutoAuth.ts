import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { getTelegramUser, isTelegramWebApp } from '../utils/telegramWebApp';

/**
 * Automatically authenticates Telegram Mini App users without requiring manual button clicks.
 */
export function useTelegramAutoAuth(): void {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || !isTelegramWebApp()) return;
    const tgUser = getTelegramUser();
    if (!tgUser?.id) return;

    attemptedRef.current = true;

    void (async () => {
      try {
        // 1. Проверяем валидность текущей сессии на сервере
        const { data: userData, error: userError } = await supabase.auth.getUser();
        let currentUser = userData?.user;

        if (userError || !currentUser) {
          // Старый или инвалидированный токен (401/403) — очищаем локальную сессию
          await supabase.auth.signOut();
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) throw anonError;
          currentUser = anonData.user;
        }

        if (!currentUser) return;

        const fullName =
          [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') ||
          tgUser.username ||
          'Telegram User';

        // 2. Связываем/объединяем пользователя с историей в Telegram
        const { error: rpcError } = await supabase.rpc('link_telegram_user', {
          p_new_user_id: currentUser.id,
          p_telegram_id: String(tgUser.id),
          p_full_name: fullName,
          p_avatar_url: tgUser.photo_url || '',
          p_username: tgUser.username || '',
        });

        if (rpcError) {
          console.warn('Telegram Auto-Auth link error:', rpcError);
          return;
        }

        await supabase.auth.refreshSession();
      } catch (err) {
        console.warn('Telegram Auto-Auth exception:', err);
      }
    })();
  }, []);
}
