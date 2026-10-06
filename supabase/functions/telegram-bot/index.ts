// Supabase Edge Function: telegram-bot
// Handles Telegram Webhook requests:
// - /start (welcome message with WebApp button & interactive menu)
// - /stats, /me, /profile (player statistics, level, XP, wins)
// - /top, /leaderboard (global leaderboard)
// - /rules, /help, /about (game rules & round tips)
// - /word, /quiz, /daily (random training word with explanations)
// - /hardest (weekly hardest words digest)
// - /start join_<uuid> (local player verification deep link)
// - /start link_<uuid> (desktop account linking deep link)
// - callback_query (interactive menu navigation & player verifications)

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
    let telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'telegram-bot-webhook',
          version: '2.2.0',
          time: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const payload = await req.json();
    const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

    // Retrieve bot token from Vault if not present in env
    if (!telegramBotToken && supabase) {
      try {
        const { data: secretData } = await supabase
          .schema('vault')
          .from('decrypted_secrets')
          .select('decrypted_secret')
          .eq('name', 'telegram_bot_token')
          .maybeSingle();

        if (secretData?.decrypted_secret) {
          telegramBotToken = secretData.decrypted_secret;
        }
      } catch (vaultErr) {
        console.warn('Could not read bot token from vault:', vaultErr);
      }
    }

    // Option 1: Try Postgres RPC if available and not ignored
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('handle_telegram_webhook', {
          p_payload: payload,
        });

        if (!error && data && data.ok && data.action !== 'cb_ignored' && data.action !== 'message_ignored') {
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        if (error) {
          console.warn('handle_telegram_webhook RPC error or outdated version, using edge fallback:', error);
        }
      } catch (rpcErr) {
        console.warn('RPC invocation failed, falling back to direct Edge function logic:', rpcErr);
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

    // ==========================================================
    // SECTION A: Handle Callback Query (Button click)
    // ==========================================================
    const callbackQuery = payload?.callback_query;
    if (callbackQuery) {
      const cbData = callbackQuery.data || '';
      const cbId = callbackQuery.id;
      const cbChatId = callbackQuery.message?.chat?.id;
      const msgId = callbackQuery.message?.message_id;
      const fromUser = callbackQuery.from;
      const tgName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || fromUser?.username || 'Игрок';
      const tgUsername = fromUser?.username || '';
      const tgId = String(fromUser?.id);

      // Track user in database
      if (supabase && tgId) {
        await supabase
          .from('telegram_users')
          .upsert({
            telegram_id: tgId,
            username: tgUsername ? tgUsername.toLowerCase() : null,
            first_name: fromUser?.first_name || '',
            last_name: fromUser?.last_name || '',
            full_name: tgName,
            updated_at: new Date().toISOString(),
          })
          .select();
      }

      // 1. Player verification callbacks (pv_c: / pv_r:)
      if (cbData.startsWith('pv_c:') || cbData.startsWith('pv_r:')) {
        const isConfirm = cbData.startsWith('pv_c:');
        const verifId = cbData.split(':')[1];
        const nameChoice = cbData.split(':')[2];
        const chosenName = nameChoice === 'user' && tgUsername ? `@${tgUsername}` : tgName;

        if (supabase) {
          await supabase
            .from('local_player_verifications')
            .update({
              status: isConfirm ? 'confirmed' : 'rejected',
              chosen_name: isConfirm ? chosenName : null,
              target_telegram_id: tgId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', verifId);
        }

        await answerCallback(telegramBotToken, cbId, isConfirm ? `✅ Участие подтверждено: ${chosenName}` : '❌ Приглашение отклонено');

        if (cbChatId && msgId) {
          await editMessage(
            telegramBotToken,
            cbChatId,
            msgId,
            isConfirm
              ? `🎩 <b>Участие в игре «Шляпа» подтверждено!</b>\n\nИмя в игре: <b>${escapeHtml(chosenName)}</b>\nВсе набранные очки и опыт пойдут в ваш профиль!`
              : '❌ <b>Приглашение в игру отклонено.</b>'
          );
        }
      }

      // 2. Profile linking callbacks (pl_c: / pl_r:)
      else if (cbData.startsWith('pl_c:') || cbData.startsWith('pl_r:')) {
        const isConfirm = cbData.startsWith('pl_c:');
        const targetUserId = cbData.split(':')[1];

        if (isConfirm && targetUserId && supabase) {
          await supabase.rpc('link_telegram_user', {
            p_new_user_id: targetUserId,
            p_telegram_id: tgId,
            p_full_name: tgName,
            p_avatar_url: '',
            p_username: tgUsername,
          });

          await supabase
            .from('telegram_users')
            .update({
              user_id: targetUserId,
              updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', tgId);
        }

        await answerCallback(telegramBotToken, cbId, isConfirm ? '✅ Профиль Telegram успешно привязан!' : '❌ Привязка отклонена');

        if (cbChatId && msgId) {
          await editMessage(
            telegramBotToken,
            cbChatId,
            msgId,
            isConfirm
              ? `🎩 <b>Telegram-профиль успешно привязан!</b>\n\nИмя: <b>${escapeHtml(tgName)}</b>\n${tgUsername ? `Юзернейм: <b>@${escapeHtml(tgUsername)}</b>\n` : ''}Теперь статистика и лидерборд синхронизированы с вашим браузером на компьютере.`
              : '❌ <b>Привязка профиля отклонена.</b>'
          );
        }
      }

      // 3. Navigation Callbacks: menu_stats, menu_top, menu_rules, menu_word, word_next, menu_hardest, menu_main
      else if (['menu_main', 'menu_stats', 'menu_top', 'menu_rules', 'menu_word', 'word_next', 'menu_hardest'].includes(cbData)) {
        await answerCallback(telegramBotToken, cbId);

        let replyText = '';
        let replyKeyboard = getKeyboard('main', appUrl);

        if (cbData === 'menu_main') {
          replyText = `🎩 <b>Привет, ${escapeHtml(tgName)}! Добро пожаловать в «Шляпу»!</b>\n\nКлассическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!\n\n👇 Выберите действие:`;
          replyKeyboard = getKeyboard('main', appUrl);
        } else if (cbData === 'menu_stats') {
          replyText = await buildPlayerStatsText(supabase, tgId, tgName, tgUsername);
          replyKeyboard = getKeyboard('stats', appUrl);
        } else if (cbData === 'menu_top') {
          replyText = await buildLeaderboardText(supabase, tgId);
          replyKeyboard = getKeyboard('top', appUrl);
        } else if (cbData === 'menu_rules') {
          replyText = buildRulesText();
          replyKeyboard = getKeyboard('rules', appUrl);
        } else if (cbData === 'menu_word' || cbData === 'word_next') {
          replyText = await buildRandomWordText(supabase);
          replyKeyboard = getKeyboard('word', appUrl);
        } else if (cbData === 'menu_hardest') {
          replyText = await buildHardestWordsText(supabase, appUrl);
          replyKeyboard = getKeyboard('hardest', appUrl);
        }

        if (cbChatId && msgId) {
          await editMessage(telegramBotToken, cbChatId, msgId, replyText, replyKeyboard);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ==========================================================
    // SECTION B: Handle Message
    // ==========================================================
    const message = payload?.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    const tgUser = message.from;
    const firstName = tgUser?.first_name || '';
    const lastName = tgUser?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || tgUser?.username || 'друг';
    const tgUsername = tgUser?.username || '';
    const tgId = String(tgUser?.id || '');

    // Track user in database
    if (supabase && tgId) {
      await supabase
        .from('telegram_users')
        .upsert({
          telegram_id: tgId,
          username: tgUsername ? tgUsername.toLowerCase() : null,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .select();
    }

    // 1. Deep link: /start link_<uuid>
    if (/^\/start\s+link_[a-f0-9-]+/i.test(text)) {
      const match = text.match(/^\/start\s+link_([a-f0-9-]+)/i);
      const targetUserId = match ? match[1] : null;

      if (targetUserId && supabase) {
        await supabase.rpc('link_telegram_user', {
          p_new_user_id: targetUserId,
          p_telegram_id: tgId,
          p_full_name: fullName,
          p_avatar_url: '',
          p_username: tgUsername,
        });

        await supabase
          .from('telegram_users')
          .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
          .eq('telegram_id', tgId);
      }

      const replyText = `🎩 <b>Ваш Telegram успешно привязан к профилю «Шляпы»!</b>\n\nИмя: <b>${escapeHtml(fullName)}</b>\n${tgUsername ? `Юзернейм: <b>@${escapeHtml(tgUsername)}</b>\n` : ''}Теперь все ваши партии, опыт (XP) и рейтинг в таблице лидеров синхронизированы!`;
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('stats', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'linked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Deep link: /start join_<uuid>
    if (/^\/start\s+join_[a-f0-9-]+/i.test(text)) {
      const match = text.match(/^\/start\s+join_([a-f0-9-]+)/i);
      const verifId = match ? match[1] : null;

      if (verifId && supabase) {
        const { data: verifRec } = await supabase.from('local_player_verifications').select('*').eq('id', verifId).single();

        if (verifRec && verifRec.status === 'pending') {
          const hostName = escapeHtml(verifRec.host_name || 'Хост');
          const replyText = `🎩 <b>Приглашение в игру «Шляпа»!</b>\n\nИгрок <b>${hostName}</b> добавляет вас в команду локальной партии.\n\nПодтвердите участие и выберите имя для игры:`;
          const keyboard = {
            inline_keyboard: [
              [{ text: `✨ Имя: ${fullName}`, callback_data: `pv_c:${verifId}:name` }],
              ...(tgUsername ? [[{ text: `👤 Юзернейм: @${tgUsername}`, callback_data: `pv_c:${verifId}:user` }]] : []),
              [{ text: '❌ Отклонить', callback_data: `pv_r:${verifId}` }],
            ],
          };
          await sendMessage(telegramBotToken, chatId, replyText, keyboard);
          return new Response(JSON.stringify({ ok: true, action: 'join_prompt_sent' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    }

    // 3. /stats, /me, /profile
    if (/^\/(stats|me|profile)(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = await buildPlayerStatsText(supabase, tgId, fullName, tgUsername);
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('stats', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'stats_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. /top, /leaderboard
    if (/^\/(top|leaderboard)(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = await buildLeaderboardText(supabase, tgId);
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('top', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'leaderboard_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. /rules, /help, /about
    if (/^\/(rules|help|about)(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = buildRulesText();
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('rules', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'rules_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 6. /word, /quiz, /daily
    if (/^\/(word|quiz|daily)(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = await buildRandomWordText(supabase);
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('word', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'word_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 7. /hardest
    if (/^\/hardest(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = await buildHardestWordsText(supabase, appUrl);
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('hardest', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'hardest_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 8. Default /start
    if (/^\/start(@[a-zA-Z0-9_]+)?(\s|$)/i.test(text)) {
      const replyText = `🎩 <b>Привет, ${escapeHtml(fullName)}! Добро пожаловать в игру «Шляпа»!</b>\n\nКлассическая интеллектуальная игра для весёлой компании и вечеринок: объясняйте и отгадывайте слова на время!\n\n👇 Выберите действие:`;
      await sendMessage(telegramBotToken, chatId, replyText, getKeyboard('main', appUrl));
      return new Response(JSON.stringify({ ok: true, action: 'start_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true, action: 'message_ignored' }), {
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

// ==========================================================
// HELPER FUNCTIONS & FORMATTERS
// ==========================================================

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendMessage(botToken: string, chatId: number | string, text: string, keyboard?: any) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    }),
  });
}

async function editMessage(botToken: string, chatId: number | string, messageId: number | string, text: string, keyboard?: any) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    }),
  });
}

async function answerCallback(botToken: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

function getKeyboard(type: string, appUrl: string) {
  switch (type) {
    case 'main':
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [
            { text: '📊 Мой профиль', callback_data: 'menu_stats' },
            { text: '🏆 Лидерборд', callback_data: 'menu_top' },
          ],
          [
            { text: '📖 Правила', callback_data: 'menu_rules' },
            { text: '💡 Тренировка', callback_data: 'menu_word' },
          ],
          [
            { text: '🧠 Сложнейшие слова', callback_data: 'menu_hardest' },
            { text: '🌐 В браузере', url: appUrl },
          ],
        ],
      };
    case 'stats':
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [
            { text: '🏆 Таблица лидеров', callback_data: 'menu_top' },
            { text: '🔄 Обновить', callback_data: 'menu_stats' },
          ],
          [{ text: '◀️ Главное меню', callback_data: 'menu_main' }],
        ],
      };
    case 'top':
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [
            { text: '📊 Мой профиль', callback_data: 'menu_stats' },
            { text: '🔄 Обновить', callback_data: 'menu_top' },
          ],
          [{ text: '◀️ Главное меню', callback_data: 'menu_main' }],
        ],
      };
    case 'word':
      return {
        inline_keyboard: [
          [
            { text: '🎲 Другое слово', callback_data: 'word_next' },
            { text: '🎮 Играть', web_app: { url: appUrl } },
          ],
          [
            { text: '📖 Правила', callback_data: 'menu_rules' },
            { text: '◀️ Главное меню', callback_data: 'menu_main' },
          ],
        ],
      };
    case 'rules':
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [
            { text: '💡 Тренировка слов', callback_data: 'menu_word' },
            { text: '🏆 Лидерборд', callback_data: 'menu_top' },
          ],
          [{ text: '◀️ Главное меню', callback_data: 'menu_main' }],
        ],
      };
    case 'hardest':
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [
            { text: '💡 Тренировка слов', callback_data: 'menu_word' },
            { text: '📊 Мой профиль', callback_data: 'menu_stats' },
          ],
          [{ text: '◀️ Главное меню', callback_data: 'menu_main' }],
        ],
      };
    default:
      return {
        inline_keyboard: [
          [{ text: '🎮 Играть в «Шляпу»', web_app: { url: appUrl } }],
          [{ text: '◀️ Главное меню', callback_data: 'menu_main' }],
        ],
      };
  }
}

async function buildPlayerStatsText(supabase: any, tgId: string, fullName: string, username?: string): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('build_player_stats_message', {
        p_telegram_id: tgId,
        p_full_name: fullName,
        p_username: username || null,
      });
      if (!error && data) return data;
    } catch {
      // Fallback below
    }

    // Direct JS calculation from get_leaderboard
    try {
      const { data: tgUser } = await supabase.from('telegram_users').select('user_id').eq('telegram_id', tgId).single();
      const userId = tgUser?.user_id;

      const { data: leaderboard } = await supabase.rpc('get_leaderboard', { p_limit: 500 });
      if (leaderboard && Array.isArray(leaderboard)) {
        let foundIndex = -1;
        let pRec: any = null;

        if (userId) {
          foundIndex = leaderboard.findIndex((p) => p.user_id === userId);
        }
        if (foundIndex === -1 && fullName) {
          foundIndex = leaderboard.findIndex(
            (p) =>
              p.player_name?.toLowerCase() === fullName.toLowerCase() ||
              (username && p.player_name?.toLowerCase() === `@${username.toLowerCase()}`)
          );
        }

        if (foundIndex !== -1) {
          pRec = leaderboard[foundIndex];
          const rankNum = foundIndex + 1;
          const totalUsers = leaderboard.length;

          let msg = `📊 <b>Профиль игрока: ${escapeHtml(pRec.player_name || fullName)}</b>\n`;
          if (username) msg += `👤 Юзернейм: <b>@${escapeHtml(username)}</b>\n`;
          msg += `\n`;
          msg += `🎖 <b>Звание:</b> ${escapeHtml(pRec.rank_title || 'Новичок')} (${pRec.level || 1} ур.)\n`;
          msg += `⭐️ <b>Опыт:</b> ${pRec.total_xp || 0} XP\n`;
          msg += `🏆 <b>Место в рейтинге:</b> #${rankNum} из ${totalUsers}\n\n`;
          msg += `🎮 <b>Сыграно игр:</b> ${pRec.games_count || 0}\n`;
          msg += `🥇 <b>Побед:</b> ${pRec.wins_count || 0} (${pRec.win_rate || 0}%)\n`;
          msg += `💬 <b>Угадано слов:</b> ${pRec.words_count || 0}\n`;
          msg += `⚡️ <b>Быстрых слов (&lt;3с):</b> ${pRec.fast_words_count || 0}\n`;
          msg += `✨ <b>Игр без нарушений:</b> ${pRec.clean_games_count || 0}\n\n`;
          msg += `<i>Играйте в «Шляпу» чаще, чтобы повышать свой уровень и открывать новые звания!</i>`;
          return msg;
        }
      }
    } catch {
      // Fallback below
    }
  }

  let text = `📊 <b>Профиль игрока: ${escapeHtml(fullName)}</b>\n`;
  if (username) text += `👤 Юзернейм: <b>@${escapeHtml(username)}</b>\n`;
  text += `\n🎖 <b>Звание:</b> Новичок (1 ур.)\n⭐️ <b>Опыт:</b> 0 XP\n\n🎮 <b>Сыграно игр:</b> 0\n🏆 <b>Побед:</b> 0 (0%)\n💬 <b>Угадано слов:</b> 0\n\n💡 <i>Вы пока не сыграли ни одной партии со своим Telegram-аккаунтом. Нажмите кнопку ниже, чтобы начать игру и заработать первые очки!</i>`;
  return text;
}

async function buildLeaderboardText(supabase: any, tgId?: string): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('build_leaderboard_digest', {
        p_current_tg_id: tgId || null,
        p_limit: 10,
      });
      if (!error && data) return data;
    } catch {
      // Fallback below
    }

    try {
      const { data: leaderboard, error } = await supabase.rpc('get_leaderboard', { p_limit: 10 });
      if (!error && Array.isArray(leaderboard) && leaderboard.length > 0) {
        let msg = `🏆 <b>Таблица лидеров «Шляпы»</b> 🎩\n\nЛучшие игроки по набранному опыту (XP) и победам:\n\n`;
        const medals = ['🥇 ', '🥈 ', '🥉 ', '4️⃣ ', '5️⃣ ', '6️⃣ ', '7️⃣ ', '8️⃣ ', '9️⃣ ', '🔟 '];

        leaderboard.slice(0, 10).forEach((p: any, idx: number) => {
          const medal = medals[idx] || `${idx + 1}. `;
          const name = escapeHtml(p.player_name || 'Игрок');
          msg += `${medal}<b>${name}</b> — <b>${p.total_xp || 0} XP</b> (${p.level || 1} ур.)\n`;
          msg += `     └ 🎮 ${p.games_count || 0} игр | 🏆 ${p.wins_count || 0} побед (${p.win_rate || 0}%) | 💬 ${p.words_count || 0} слов\n\n`;
        });

        // Try getting player position
        if (tgId) {
          const { data: allPlayers } = await supabase.rpc('get_leaderboard', { p_limit: 500 });
          const { data: tgUser } = await supabase.from('telegram_users').select('user_id').eq('telegram_id', tgId).single();
          if (allPlayers && tgUser?.user_id) {
            const myIdx = allPlayers.findIndex((p: any) => p.user_id === tgUser.user_id);
            if (myIdx !== -1) {
              const myRec = allPlayers[myIdx];
              msg += `───────────────\n📍 <b>Ваша позиция:</b> #${myIdx + 1} (${myRec.total_xp || 0} XP, ${escapeHtml(myRec.rank_title || 'Новичок')})\n`;
            }
          }
        }

        return msg;
      }
    } catch {
      // Fallback below
    }
  }

  return `🏆 <b>Таблица лидеров «Шляпы»</b> 🎩\n\nОткройте приложение, чтобы увидеть актуальный рейтинг игроков и занять первое место!`;
}

function buildRulesText(): string {
  return `📖 <b>Правила игры «Шляпа»</b> 🎩\n\n«Шляпа» — это командная салонная игра на эрудицию, скорость и взаимопонимание. Игроки по очереди объясняют слова своей команде за ограниченное время (20–60 сек).\n\nИгра состоит из 3 увлекательных раундов с одними и теми же словами:\n\n1️⃣ <b>Раунд 1 — Словами:</b>\nОбъясняйте загаданное слово любыми фразами, синонимами и описаниями.\n❌ <i>Запрещено:</i> называть однокоренные слова, созвучия и прямые переводы.\n\n2️⃣ <b>Раунд 2 — Жестами (Крокодил):</b>\nИспользуйте только мимику, позы и жесты.\n❌ <i>Запрещено:</i> произносить любые звуки, указывать на предметы вокруг или писать буквы в воздухе.\n\n3️⃣ <b>Раунд 3 — Одно слово:</b>\nВедущий может сказать <b>ровно одно слово</b> — ассоциацию к загаданному!\n❌ <i>Запрещено:</i> использовать жесты, говорить более одного слова или называть однокоренные.\n\n⚠️ <b>Нарушения:</b> При нарушении правил ведущий нажимает «Нарушение» — слово уходит со штрафом.\n\n⚡️ <b>Команды бота:</b>\n• /start — Главное меню\n• /stats — Ваш профиль и очки\n• /top — Таблица лидеров\n• /word — Тренировка слов\n• /hardest — Сложнейшие слова недели\n• /rules — Правила игры`;
}

async function buildRandomWordText(supabase: any): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('build_random_training_word_message');
      if (!error && data) return data;
    } catch {
      // Fallback below
    }

    try {
      const { data: words } = await supabase
        .from('word_definitions')
        .select('word, definition')
        .not('definition', 'is', null)
        .limit(50);

      if (words && words.length > 0) {
        const item = words[Math.floor(Math.random() * words.length)];
        return `💡 <b>Тренировка для «Шляпы»</b>\n\nЗагаданное слово: <b>${escapeHtml(item.word.toUpperCase())}</b>\n\n📖 <b>Значение:</b> ${escapeHtml(item.definition)}\n\n🎩 <b>Как объяснять в раундах:</b>\n1️⃣ <b>Раунд 1 (Словами):</b> Опишите суть и свойства предмета или понятия.\n2️⃣ <b>Раунд 2 (Жестами):</b> Покажите действие или форму без единого звука.\n3️⃣ <b>Раунд 3 (Одно слово):</b> Назовите яркую ключевую ассоциацию!\n\n<i>Нажмите «🎲 Другое слово», чтобы потренировать следующее!</i>`;
      }
    } catch {
      // Fallback below
    }
  }

  const fallbackWords = [
    { word: 'АНАЛИЗАТОР', def: 'Прибор для анализа веществ/сигналов, а в анатомии — орган чувств и нервные пути восприятия.' },
    { word: 'ЛИБРЕТТО', def: 'Словесный текст оперы, оперетты или сценарий балетного спектакля.' },
    { word: 'АЛИБИ', def: 'Доказательство непричастности к происшествию в силу нахождения в другом месте.' },
    { word: 'ПЕДИАТР', def: 'Врач, специалист по детским болезням и здоровью детей.' },
    { word: 'ЭГОИЗМ', def: 'Поведение, определяемое заботой исключительно о собственной выгоде.' },
    { word: 'КАНОЭ', def: 'Узкая легкая гребная лодка индейского типа, управляемая однолопастным веслом.' },
  ];
  const item = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];

  return `💡 <b>Тренировка для «Шляпы»</b>\n\nЗагаданное слово: <b>${item.word}</b>\n\n📖 <b>Значение:</b> ${item.def}\n\n🎩 <b>Как объяснять в раундах:</b>\n1️⃣ <b>Раунд 1 (Словами):</b> Опишите суть и свойства предмета или понятия.\n2️⃣ <b>Раунд 2 (Жестами):</b> Покажите действие или форму без единого звука.\n3️⃣ <b>Раунд 3 (Одно слово):</b> Назовите яркую ключевую ассоциацию!\n\n<i>Нажмите «🎲 Другое слово», чтобы потренировать следующее!</i>`;
}

async function buildHardestWordsText(supabase: any, appUrl: string): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('build_hardest_words_digest', { p_limit: 10, p_days: 7 });
      if (!error && data) return data;
    } catch {
      // Fallback below
    }
  }

  return `🧠 <b>Сложнейшие слова в «Шляпе»:</b>\n\nОткройте приложение, чтобы увидеть статистику разгадывания слов и таблицу лидеров!\n\n🎮 <b>Играть:</b> ${appUrl}`;
}
