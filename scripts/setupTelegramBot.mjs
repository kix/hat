#!/usr/bin/env node

/**
 * Utility script to configure the Telegram Bot for the "Hat" game:
 * 1. Sets Chat Menu Button to open Telegram Mini App ("🎮 Играть")
 * 2. Registers bot commands (/start, /help)
 * 3. Sets bot description
 * 4. (Optional) Sets webhook URL if provided
 *
 * Usage:
 *   node scripts/setupTelegramBot.mjs [BOT_TOKEN] [APP_URL] [WEBHOOK_URL]
 * Or via env:
 *   TELEGRAM_BOT_TOKEN="12345:ABC..." APP_BASE_URL="https://kix.github.io/hat/" node scripts/setupTelegramBot.mjs
 */

const botToken =
  process.argv[2] ||
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.VITE_TELEGRAM_BOT_TOKEN;

const appUrl =
  process.argv[3] ||
  process.env.APP_BASE_URL ||
  'https://kix.github.io/hat/';

const webhookUrl =
  process.argv[4] ||
  process.env.WEBHOOK_URL;

if (!botToken) {
  console.error(`
❌ Ошибка: Не указан токен Telegram-бота!

Использование:
  node scripts/setupTelegramBot.mjs <BOT_TOKEN> [APP_URL] [WEBHOOK_URL]

Или через переменные окружения:
  TELEGRAM_BOT_TOKEN="123456:ABC..." node scripts/setupTelegramBot.mjs
`);
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${botToken}`;

async function tgCall(method, body) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API [${method}] failed: ${data.description || JSON.stringify(data)}`);
  }
  return data.result;
}

async function main() {
  console.log('🎩 Настройка Telegram-бота для игры «Шляпа»...\n');

  try {
    // 1. Проверяем бота
    const me = await tgCall('getMe', {});
    console.log(`✅ Бот найден: @${me.username} (${me.first_name}) [ID: ${me.id}]`);
    console.log(`🔗 Базовый URL приложения: ${appUrl}\n`);

    // 2. Настраиваем Chat Menu Button (кнопка в левом углу чата с ботом)
    console.log('⚙️ 1. Настройка Chat Menu Button (кнопка запуска игры в меню чата)...');
    await tgCall('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🎮 Играть',
        web_app: { url: appUrl },
      },
    });
    console.log('   ✅ Menu Button успешно установлена!');

    // 3. Настраиваем список команд бота
    console.log('⚙️ 2. Настройка команд бота (/start, /hardest, /help)...');
    await tgCall('setMyCommands', {
      commands: [
        { command: 'start', description: '🎮 Запустить игру «Шляпа»' },
        { command: 'hardest', description: '🧠 Топ сложных слов недели' },
        { command: 'help', description: 'ℹ️ Правила игры и информация' },
      ],
    });
    console.log('   ✅ Список команд успешно обновлен!');

    // 4. Настраиваем описание бота
    console.log('⚙️ 3. Настройка описания бота...');
    await tgCall('setMyDescription', {
      description: '🎩 Игра «Шляпа» — классическая интеллектуальная салонная игра для весёлой компании и вечеринок!\n\nОбъясняйте и отгадывайте слова на скорость, играйте вдвоем, командами или онлайн!',
    });
    await tgCall('setMyShortDescription', {
      short_description: '🎩 Игра «Шляпа» для компании и вечеринок прямо в Telegram!',
    });
    console.log('   ✅ Описание бота обновлено!');

    // 5. Настраиваем вебхук (если передан)
    if (webhookUrl) {
      console.log(`⚙️ 4. Установка Webhook (${webhookUrl})...`);
      await tgCall('setWebhook', {
        url: webhookUrl,
        drop_pending_updates: false,
        allowed_updates: ['message'],
      });
      console.log('   ✅ Webhook успешно установлен!');
    } else {
      console.log('ℹ️ Webhook URL не указан (пропускаем setWebhook).');
    }

    console.log('\n🎉 Все настройки Telegram-бота успешно применены!');
    console.log(`👉 Проверить бота: https://t.me/${me.username}`);
  } catch (err) {
    console.error('\n❌ Ошибка при настройке бота:', err.message);
    process.exit(1);
  }
}

main();
