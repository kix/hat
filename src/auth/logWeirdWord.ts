import { supabase } from './supabaseClient';

// Best-effort, anonymous — no auth required, and a failure here shouldn't
// interrupt the round, so errors are swallowed rather than surfaced.
export async function logWeirdWord(word: string): Promise<void> {
  try {
    await supabase.from('weird_words').insert({ word });
  } catch {
    // ignore
  }
}
