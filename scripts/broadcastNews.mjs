import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const newsMessage = `🎩 <b>Большое обновление «Шляпы» v1.7.0!</b> 🚀

Сегодня в игре появились масштабные соревновательные механики и прокачка:

🏆 <b>Глобальная таблица лидеров (Лидерборд)</b>
• Подиум для топ-3 игроков 🥇🥈🥉 и общий рейтинг топ-50 игроков!
• Сортировка по <b>Опыту (XP)</b>, <b>Победам</b> и <b>Угаданным словам</b>.
• Отслеживайте свою позицию среди всех игроков «Шляпы».
• Доступ к таблице лидеров прямо с главной страницы и из профиля.

⚡ <b>Прокачка уровней и система опыта (XP)</b>
• 10+ рангов: от 🧢 <i>«Новичок»</i> до ⚜️ <i>«Повелитель Шляпы»</i>!
• Опыт начисляется за участие, победы, слова, скорость отгадывания (&lt;3 сек) и игру без нарушений.
• Дополнительный опыт за открытие ачивок.
• Наглядный прогресс-бар в профиле и подробный расчет XP по итогам партии.

🤖 <b>Быстрый запуск в Telegram</b>
• Теперь бот по команде /start сразу предлагает кнопку быстрого входа в Telegram Mini App.
• Нативная кнопка меню «🎮 Играть» прямо в чате с ботом.

👉 <b>Собрать друзей, набрать XP и ворваться в топ лидеров:</b> https://kix.github.io/hat/`;

async function main() {
  console.log('Sending broadcast release news...');
  const { data, error } = await supabase.rpc('broadcast_release_news', {
    p_text: newsMessage,
  });

  if (error) {
    console.error('Error broadcasting news:', error);
    process.exit(1);
  }

  console.log('Broadcast result:', data);
}

main();
