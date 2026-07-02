import { supabase } from './supabaseClient';
import { clearStoredWordTimings, getStoredWordTimings } from '../utils/wordTimingsStore';

// Best-effort: a failed sync shouldn't interrupt the game-over screen, so
// errors are swallowed rather than surfaced to the user. The local copy is
// cleared either way — this isn't append-only server-side, so keeping stale
// entries around to retry would just re-upload them alongside the next
// game's timings.
export async function syncWordTimingsToSupabase(userId: string): Promise<void> {
  const timings = getStoredWordTimings();
  if (timings.length === 0) return;

  try {
    const rows = timings.map(({ word, timeMs }) => ({ user_id: userId, word, time_ms: Math.round(timeMs) }));
    await supabase.from('word_solution_times').insert(rows);
  } catch {
    // ignore
  } finally {
    clearStoredWordTimings();
  }
}
