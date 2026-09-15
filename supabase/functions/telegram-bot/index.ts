// Supabase Edge Function: telegram-bot
// Handles Telegram Webhook requests, sends welcome message with WebApp Mini App button upon /start

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

    // If GET request, return status info
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'telegram-bot-webhook',
          time: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const payload = await req.json();

    // Option 1: Delegate to Postgres RPC if Supabase client is initialized
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.rpc('handle_telegram_webhook', {
        p_payload: payload,
      });

      if (!error && data) {
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // Option 2: Fallback handling directly in Edge Function
    const message = payload?.message;
    if (!message || !telegramBotToken) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    const firstName = message.from?.first_name || 'друг';
    const appUrl = Deno.env.get('APP_BASE_URL') || 'https://kix.github.io/hat/';

    if (text.startsWith('/start')) {
      const replyText = `🎩 <b>Привет, ${escapeHtml(firstName)}! Добро пожаловать в игру «Шляпа»!</b>\n\nКлассическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!\n\n👇 Нажмите кнопку ниже, чтобы запустить игру прямо сейчас:`;

      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 Играть в «Шляпу»',
                  web_app: { url: appUrl },
                },
              ],
              [
                {
                  text: '🌐 Открыть в браузере',
                  url: appUrl,
                },
              ],
            ],
          },
          disable_web_page_preview: false,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
