import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function main() {
  console.log('🎩 Отправка еженедельного дайджеста сложных слов в Telegram...');

  // Call the weekly hardest words RPC
  const { data, error } = await supabase.rpc('send_weekly_hardest_words', {
    p_limit: 10,
    p_days: 7,
  });

  if (error) {
    console.error('❌ Ошибка при отправке дайджеста:', error);
    process.exit(1);
  }

  console.log('✅ Результат рассылки дайджеста:', data);
}

main();
