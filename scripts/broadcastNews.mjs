import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const newsMessage = `🎩 <b>Большое обновление «Шляпы» v1.6.33!</b> 🚀

Мы добавили крутые возможности для удобной и азартной игры в компании и по сети:

📱 <b>Telegram Mini App (TMA)</b>
• Теперь «Шляпу» можно открывать прямо внутри Telegram — в один клик из любого чата!
• Мгновенный бесшовный вход без паролей и подтверждений.
• Нативная вибрация HapticFeedback при отгадывании, фолах и тиканье таймера.

🏆 <b>Достижения и Мета-игра 2.0</b>
• 8 новых ачивок с прогресс-барами: <i>«Молния»</i>, <i>«Эрудит»</i>, <i>«Железные нервы»</i>, <i>«Чемпион»</i>, <i>«Телепат»</i>, <i>«Ветеран Шляпы»</i>, <i>«Идеальный дуэт»</i> и <i>«Чистая игра»</i>!
• Личные рекорды: узнайте свои самые быстрые и трудные разгаданные слова.
• Синергия с напарниками: статистика совместных побед и игр в профиле.

📋 <b>Чейнджлог на фронтенде</b>
• Нажмите на номер версии внизу экрана, чтобы посмотреть полную историю изменений.

⚡️ <b>Ускорение загрузки</b>
• Оптимизировали размер приложения в 2.5 раза — игра стартует мгновенно даже при слабом интернете.

👉 <b>Собрать друзей и сыграть:</b> https://kix.github.io/hat/`;

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
