import { useEffect } from 'react';

export interface TelegramWebUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebAppAPI {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  Accelerometer?: {
    isStarted: boolean;
    x: number;
    y: number;
    z: number;
    start: (params?: { refresh_rate?: number }, callback?: (success: boolean) => void) => void;
    stop: (callback?: (success: boolean) => void) => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppAPI;
    };
  }
}

/**
 * Returns the Telegram WebApp object if running inside Telegram Mini App.
 */
export function getTelegramWebApp(): TelegramWebAppAPI | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Checks if the current environment is running inside a Telegram Web App.
 */
export function isTelegramWebApp(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')));
}

/**
 * Returns the user info passed by Telegram WebApp, if present.
 */
export function getTelegramUser(): TelegramWebUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
}

/**
 * Initializes Telegram Mini App (expands viewport, marks ready, enables closing confirmation).
 */
export function initTelegramWebApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }
  } catch (err) {
    console.warn('Telegram WebApp init warning:', err);
  }
}

/**
 * React hook to bind Telegram WebApp BackButton to an onBack handler.
 */
export function useTelegramBackButton(onBack: () => void, visible = true): void {
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg?.BackButton) return;

    if (visible) {
      tg.BackButton.show();
      tg.BackButton.onClick(onBack);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, [onBack, visible]);
}

export const TELEGRAM_BOT_USERNAME =
  (import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined) ||
  (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) ||
  'hat_gae_bot';

export const TELEGRAM_TWA_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}?startapp=hat`;
export const TELEGRAM_BOT_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=hat`;

