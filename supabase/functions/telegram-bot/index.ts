// Supabase Edge Function: telegram-bot
// Handles Telegram Webhook requests:
// - /start (welcome message with WebApp button)
// - /hardest (weekly hardest words digest)
// - /start join_<uuid> (local player verification deep link)
// - callback_query (inline button clicks for player verification)

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

    // Option 1: Delegate to Postgres RPC
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
      if (error) {
        console.error('handle_telegram_webhook RPC error:', error);
      }
    }

    // Option 2: Fallback handling directly in Edge Function
    if (!telegramBotToken) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const appUrl = Deno.env.get('APP_BASE_URL') || 'https://kix.github.io/hat/';

    // A. Handle Callback Query (Button click)
    const callbackQuery = payload?.callback_query;
    if (callbackQuery) {
      const cbData = callbackQuery.data || '';
      const cbId = callbackQuery.id;
      const cbChatId = callbackQuery.message?.chat?.id;
      const msgId = callbackQuery.message?.message_id;

      if (cbData.startsWith('pv_c:') || cbData.startsWith('pv_r:')) {
        const isConfirm = cbData.startsWith('pv_c:');
        const verifId = cbData.split(':')[1];
        const nameChoice = cbData.split(':')[2];
        const fromUser = callbackQuery.from;
        const tgName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || fromUser?.username || 'Игрок';
        const chosenName = nameChoice === 'user' && fromUser?.username ? `@${fromUser.username}` : tgName;

        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from('local_player_verifications')
            .update({
              status: isConfirm ? 'confirmed' : 'rejected',
              chosen_name: isConfirm ? chosenName : null,
              target_telegram_id: String(fromUser?.id),
              updated_at: new Date().toISOString(),
            })
            .eq('id', verifId);
        }

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cbId,
            text: isConfirm ? `✅ Участие подтверждено: ${chosenName}` : '❌ Приглашение отклонено',
          }),
        });

        if (cbChatId && msgId) {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cbChatId,
              message_id: msgId,
              text: isConfirm
                ? `🎩 <b>Участие в игре «Шляпа» подтверждено!</b>\n\nИмя в игре: <b>${escapeHtml(chosenName)}</b>\nВаш опыт и очки пойдут в профиль!`
                : '❌ <b>Приглашение в игру отклонено.</b>',
              parse_mode: 'HTML',
            }),
          });
        }
      } else if (cbData.startsWith('pl_c:') || cbData.startsWith('pl_r:')) {
        const isConfirm = cbData.startsWith('pl_c:');
        const targetUserId = cbData.split(':')[1];
        const fromUser = callbackQuery.from;
        const tgName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || fromUser?.username || 'друг';

        if (isConfirm && targetUserId && supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase.rpc('link_telegram_user', {
            p_new_user_id: targetUserId,
            p_telegram_id: String(fromUser?.id),
            p_full_name: tgName,
            p_avatar_url: '',
            p_username: fromUser?.username || '',
          });

          await supabase
            .from('telegram_users')
            .update({
              user_id: targetUserId,
              updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', String(fromUser?.id));
        }

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cbId,
            text: isConfirm ? '✅ Профиль Telegram успешно привязан!' : '❌ Привязка отклонена',
          }),
        });

        if (cbChatId && msgId) {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cbChatId,
              message_id: msgId,
              text: isConfirm
                ? `🎩 <b>Telegram-профиль успешно привязан!</b>\n\nИмя: <b>${escapeHtml(tgName)}</b>\n${fromUser?.username ? `Юзернейм: <b>@${escapeHtml(fromUser.username)}</b>\n` : ''}Теперь статистика и лидерборд синхронизированы с вашим браузером на компьютере.`
                : '❌ <b>Привязка профиля отклонена.</b>',
              parse_mode: 'HTML',
            }),
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // B. Handle Message
    const message = payload?.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    const firstName = message.from?.first_name || 'друг';

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
    } else if (text.startsWith('/hardest')) {
      let hardestText = '🧠 <b>Сложнейшие слова в «Шляпе»:</b>\n\nОткройте приложение, чтобы увидеть статистику и таблицу лидеров!';
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data } = await supabase.rpc('build_hardest_words_digest', { p_limit: 10, p_days: 7 });
        if (data) hardestText = data;
      }

      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: hardestText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 Играть в «Шляпу»',
                  web_app: { url: appUrl },
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
