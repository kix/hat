import { getTelegramWebApp } from './telegramWebApp';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type NotificationType = 'error' | 'success' | 'warning';

/**
 * Triggers haptic feedback across standard web (navigator.vibrate) and Telegram Mini App (HapticFeedback).
 */
export function vibrate(pattern: number | number[]): void {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (Array.isArray(pattern)) {
        tg.HapticFeedback.notificationOccurred('warning');
      } else if (pattern > 50) {
        tg.HapticFeedback.impactOccurred('heavy');
      } else if (pattern > 20) {
        tg.HapticFeedback.impactOccurred('medium');
      } else {
        tg.HapticFeedback.impactOccurred('light');
      }
      return;
    } catch {
      /* fallback to navigator.vibrate */
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

/**
 * Triggers semantic Telegram / Web haptics for specific actions (success, error, impact).
 */
export function triggerHapticNotification(type: NotificationType): void {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.notificationOccurred(type);
      return;
    } catch {
      /* fallback */
    }
  }

  if (type === 'error') {
    vibrate([100, 50, 100]);
  } else if (type === 'success') {
    vibrate(40);
  } else {
    vibrate(20);
  }
}
