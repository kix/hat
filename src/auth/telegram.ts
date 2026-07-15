/**
 * Вспомогательные функции для работы с авторизацией через Telegram Widget
 */

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Проверяет подпись (hash) полученных от Telegram данных пользователя с использованием Bot Token.
 * В соответствии с требованиями безопасности Telegram:
 * 1. Данные сортируются по алфавиту и склеиваются через перевод строки (\n).
 * 2. Секретный ключ вычисляется как SHA-256 от токена бота.
 * 3. Вычисляется HMAC-SHA256 подпись.
 */
export async function verifyTelegramHash(user: TelegramUser, botToken: string): Promise<boolean> {
  const { hash, ...data } = user;
  
  // Сортируем ключи и создаем строку проверки
  const checkString = Object.entries(data)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  try {
    const enc = new TextEncoder();
    
    // 1. Вычисляем секретный ключ как SHA-256 от токена бота
    const tokenBuffer = enc.encode(botToken);
    const secretKeyBuffer = await crypto.subtle.digest('SHA-256', tokenBuffer);
    
    // 2. Импортируем ключ для использования в HMAC
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // 3. Подписываем строку проверки
    const dataBuffer = enc.encode(checkString);
    const signatureBuffer = await crypto.subtle.sign('HMAC', hmacKey, dataBuffer);
    
    // 4. Переводим подпись в hex-строку
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const calculatedHash = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return calculatedHash === hash;
  } catch (e) {
    console.error('Ошибка проверки подписи Telegram в Web Crypto API:', e);
    return false;
  }
}
