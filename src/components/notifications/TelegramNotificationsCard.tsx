import { useEffect, useState } from 'react';
import { Anchor, Card, Group, Stack, Switch, Text, ThemeIcon, Divider, Button, TextInput, Loader, Badge } from '@mantine/core';
import { IconBrandTelegram, IconExternalLink, IconSend } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useI18n } from '../../i18n/i18n';
import { trackEvent } from '../../utils/analytics';
import { TELEGRAM_BOT_LINK, TELEGRAM_BOT_USERNAME } from '../../utils/telegramWebApp';

interface TelegramNotificationsCardProps {
  userId: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
  onProfileUpdated?: () => void;
}

const botUsername = TELEGRAM_BOT_USERNAME;

export function TelegramNotificationsCard({
  userId,
  telegramId: initialTelegramId,
  telegramUsername: initialUsername,
  onProfileUpdated,
}: TelegramNotificationsCardProps) {
  const { t } = useI18n();
  const [currentTelegramId, setCurrentTelegramId] = useState<string | null>(initialTelegramId || null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(initialUsername || null);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // Desktop linking states
  const [inputUsername, setInputUsername] = useState('');
  const [linkingStatus, setLinkingStatus] = useState<'idle' | 'loading' | 'waiting' | 'error'>('idle');
  const [linkingMessage, setLinkingMessage] = useState('');

  const directLinkUrl = `https://t.me/${botUsername}?start=link_${userId}`;

  // Fetch initial notification status and listen for link updates
  useEffect(() => {
    let isMounted = true;

    const checkLinkAndNotifs = async () => {
      // 1. Check telegram_notifications
      const { data: notifData } = await supabase
        .from('telegram_notifications')
        .select('enabled, telegram_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (notifData) {
        setEnabled(!!notifData.enabled);
        if (notifData.telegram_id && !currentTelegramId) {
          setCurrentTelegramId(notifData.telegram_id);
        }
      }

      // 2. Check telegram_users
      const { data: tgUserData } = await supabase
        .from('telegram_users')
        .select('username, telegram_id, full_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (tgUserData) {
        if (tgUserData.username) setCurrentUsername(tgUserData.username);
        if (tgUserData.telegram_id) setCurrentTelegramId(tgUserData.telegram_id);
      }
    };

    void checkLinkAndNotifs();

    // Subscribe to realtime changes on telegram_notifications & telegram_users
    const channel = supabase
      .channel(`tg-card-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void checkLinkAndNotifs();
          if (onProfileUpdated) onProfileUpdated();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_users',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void checkLinkAndNotifs();
          if (onProfileUpdated) onProfileUpdated();
        }
      )
      .subscribe();

    // Fallback polling for desktop links
    const interval = setInterval(() => {
      void checkLinkAndNotifs();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, currentTelegramId, onProfileUpdated]);

  const toggle = async (next: boolean) => {
    if (!currentTelegramId) return;
    setEnabled(next);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('telegram_notifications')
        .upsert(
          { user_id: userId, telegram_id: currentTelegramId, enabled: next },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      trackEvent('telegram_notifications_toggle', { enabled: next });
      if (next && TELEGRAM_BOT_LINK) {
        window.open(TELEGRAM_BOT_LINK, '_blank', 'noopener');
        trackEvent('bot_start_click', { trigger: 'auto_toggle' });
      }
    } catch (err) {
      console.error('Не удалось сохранить настройку уведомлений:', err);
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestLinkByUsername = async () => {
    const cleanUser = inputUsername.trim().replace(/^@/, '');
    if (!cleanUser) return;

    setLinkingStatus('loading');
    setLinkingMessage('');

    try {
      const { data, error } = await supabase.rpc('request_telegram_account_link', {
        p_username: cleanUser,
        p_user_id: userId,
      });

      if (error) throw error;

      if (data?.target_found) {
        setLinkingStatus('waiting');
        setLinkingMessage(t('tgLink.requestSent'));
      } else {
        setLinkingStatus('error');
        setLinkingMessage(t('tgLink.notInBot'));
      }
    } catch (err: any) {
      setLinkingStatus('error');
      setLinkingMessage(err.message || 'Ошибка отправки запроса');
    }
  };

  // If already linked to a Telegram account
  if (currentTelegramId) {
    return (
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon color="blue" size="lg" variant="light">
              <IconBrandTelegram size={18} />
            </ThemeIcon>
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Group gap="xs">
                <Text fw={600} size="sm">
                  {t('notif.title')}
                </Text>
                {currentUsername && (
                  <Badge color="blue" size="xs" variant="light">
                    @{currentUsername}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {t('notif.desc')}
              </Text>
            </Stack>
          </Group>
          <Switch
            checked={enabled}
            disabled={saving}
            onChange={(e) => void toggle(e.currentTarget.checked)}
            aria-label={t('notif.switchAria')}
          />
        </Group>
        <Divider my="sm" variant="dashed" />
        <Text size="xs" c="dimmed">
          {t('notif.startHintPre')}{' '}
          <Anchor
            href={TELEGRAM_BOT_LINK}
            target="_blank"
            rel="noopener"
            fw={600}
            onClick={() => trackEvent('bot_start_click', { trigger: 'link' })}
          >
            {t('notif.chatWithBot')}{botUsername ? ` (@${botUsername})` : ''}
          </Anchor>{' '}
          {t('notif.startHintPost')}
        </Text>
      </Card>
    );
  }

  // If on Desktop / Unlinked: Show Desktop Link Card
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon color="blue" size="lg" variant="light">
            <IconBrandTelegram size={20} />
          </ThemeIcon>
          <Stack gap={2} style={{ flex: 1 }}>
            <Text fw={600} size="sm">
              {t('tgLink.cardTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('tgLink.notLinkedDesc')}
            </Text>
          </Stack>
        </Group>

        <Divider variant="dashed" />

        {/* Primary Option: Open Bot Link */}
        <Button
          component="a"
          href={directLinkUrl}
          target="_blank"
          rel="noopener"
          color="blue"
          variant="light"
          leftSection={<IconBrandTelegram size={18} />}
          rightSection={<IconExternalLink size={14} />}
          onClick={() => trackEvent('desktop_tg_link_click')}
        >
          {t('tgLink.linkViaBot')}
        </Button>

        {/* Secondary Option: Request by Username */}
        <Stack gap="xs" mt={4}>
          <Text size="xs" fw={500} c="dimmed">
            {t('tgLink.orByUsername')}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="@username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.currentTarget.value)}
              style={{ flex: 1 }}
              size="sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleRequestLinkByUsername();
              }}
            />
            <Button
              size="sm"
              variant="default"
              leftSection={linkingStatus === 'loading' ? <Loader size={14} /> : <IconSend size={14} />}
              onClick={handleRequestLinkByUsername}
              disabled={!inputUsername.trim() || linkingStatus === 'loading'}
            >
              {t('tgLink.sendRequest')}
            </Button>
          </Group>
        </Stack>

        {linkingMessage && (
          <Text size="xs" c={linkingStatus === 'error' ? 'red' : 'blue'} fw={500}>
            {linkingMessage}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
