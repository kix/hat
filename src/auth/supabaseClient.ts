import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
