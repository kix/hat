import { supabase } from './supabaseClient';
import { getStoredPlayerNames } from '../utils/playerNamesStore';

// Best-effort: a failed sync shouldn't interrupt the game-over screen, so
// errors are swallowed rather than surfaced to the user.
export async function syncPreferencesToSupabase(userId: string): Promise<void> {
  try {
    const preferences = { playerNames: getStoredPlayerNames() };
    await supabase.from('user_states').upsert({ user_id: userId, preferences }, { onConflict: 'user_id' });
  } catch {
    // ignore
  }
}
