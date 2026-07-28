import { useEffect, useState } from 'react';
import { Anchor, Card, Group, Stack, Switch, Text, ThemeIcon, Divider } from '@mantine/core';
import { IconBrandTelegram } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useI18n } from '../../i18n/i18n';

interface TelegramNotificationsCardProps {
  userId: string;
  telegramId: string;
}

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;
const botLink = botUsername ? `https://t.me/${botUsername}?start=hat` : undefined;

// Lets a Telegram-logged-in user opt in to the daily game-summary DM. Because
// Telegram forbids bots from cold-messaging, enabling also nudges the user to
// open the bot and press Start — without that, delivery silently fails.
export function TelegramNotificationsCard({ userId, telegramId }: TelegramNotificationsCardProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('telegram_notifications')
        .select('enabled')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setEnabled(!!data.enabled);
    })();
  }, [userId]);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('telegram_notifications')
        .upsert(
          { user_id: userId, telegram_id: telegramId, enabled: next },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      // On opt-in, open the bot so the user can press Start — required for the
      // bot to be allowed to message them at all.
      if (next && botLink) window.open(botLink, '_blank', 'noopener');
    } catch (err) {
      console.error('Не удалось сохранить настройку уведомлений:', err);
      setEnabled(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon color="blue" size="lg" variant="light">
            <IconBrandTelegram size={18} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} size="sm">
              {t('notif.title')}
            </Text>
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
        {botLink ? (
          <Anchor href={botLink} target="_blank" rel="noopener" fw={600}>
            {t('notif.chatWithBot')}{botUsername ? ` (@${botUsername})` : ''}
          </Anchor>
        ) : (
          t('notif.chatWithBot')
        )}{' '}
        {t('notif.startHintPost')}
      </Text>
    </Card>
  );
}
