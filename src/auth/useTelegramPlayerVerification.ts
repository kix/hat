import { supabase } from './supabaseClient';

export interface LocalPlayerVerification {
  id: string;
  host_name: string;
  target_username: string;
  target_telegram_id?: string | null;
  target_user_id?: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'not_found';
  chosen_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequestResult {
  ok: boolean;
  verificationId?: string;
  targetFound?: boolean;
  username?: string;
  error?: string;
}

/**
 * Initiates a player verification request by Telegram username
 */
export async function requestTelegramPlayerVerification(
  username: string,
  hostName: string = 'Игрок'
): Promise<VerificationRequestResult> {
  const cleanUsername = username.trim().replace(/^@/, '');
  if (!cleanUsername) {
    return { ok: false, error: 'Имя пользователя не указано' };
  }

  try {
    const { data, error } = await supabase.rpc('request_telegram_player_verification', {
      p_username: cleanUsername,
      p_host_name: hostName,
    });

    if (error) {
      console.warn('RPC request_telegram_player_verification error:', error);
      // Fallback: direct table insert
      const { data: insertData, error: insertError } = await supabase
        .from('local_player_verifications')
        .insert({
          host_name: hostName,
          target_username: cleanUsername,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        return { ok: false, error: insertError?.message || error.message };
      }

      return {
        ok: true,
        verificationId: insertData.id,
        targetFound: false,
        username: cleanUsername,
      };
    }

    return {
      ok: !!data?.ok,
      verificationId: data?.verification_id,
      targetFound: !!data?.target_found,
      username: data?.username || cleanUsername,
      error: data?.error,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Subscribes to verification updates via Supabase Realtime with polling fallback
 */
export function subscribeToPlayerVerification(
  verificationId: string,
  onUpdate: (data: LocalPlayerVerification) => void
): () => void {
  let isSubscribed = true;

  // 1. Initial fetch
  const fetchCurrent = async () => {
    try {
      const { data, error } = await supabase
        .from('local_player_verifications')
        .select('*')
        .eq('id', verificationId)
        .single();

      if (!error && data && isSubscribed) {
        onUpdate(data as LocalPlayerVerification);
      }
    } catch {
      // ignore
    }
  };

  void fetchCurrent();

  // 2. Realtime channel subscription
  const channel = supabase
    .channel(`player-verification-${verificationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'local_player_verifications',
        filter: `id=eq.${verificationId}`,
      },
      (payload) => {
        if (isSubscribed && payload.new) {
          onUpdate(payload.new as LocalPlayerVerification);
        }
      }
    )
    .subscribe();

  // 3. Fallback polling every 2.5 seconds
  const intervalId = setInterval(() => {
    if (isSubscribed) {
      void fetchCurrent();
    }
  }, 2500);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    void supabase.removeChannel(channel);
  };
}
