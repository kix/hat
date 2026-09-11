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
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData?.session?.user;

        // If user is already linked to this Telegram ID, no need to link again
        if (
          currentUser &&
          String(currentUser.user_metadata?.telegram_id) === String(tgUser.id)
        ) {
          return;
        }

        const fullName =
          [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') ||
          tgUser.username ||
          'Telegram User';

        let targetUserId = currentUser?.id;

        if (!currentUser) {
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) throw anonError;
          targetUserId = anonData.user?.id;
        }

        if (!targetUserId) return;

        const { error: rpcError } = await supabase.rpc('link_telegram_user', {
          p_new_user_id: targetUserId,
          p_telegram_id: String(tgUser.id),
          p_full_name: fullName,
          p_avatar_url: tgUser.photo_url || '',
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
