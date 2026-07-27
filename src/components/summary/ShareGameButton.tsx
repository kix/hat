import { Button, CopyButton, Group, Tooltip } from '@mantine/core';
import { IconBrandTelegram, IconCheck, IconCopy } from '@tabler/icons-react';
import { useI18n } from '../../i18n/i18n';

interface ShareGameButtonProps {
  gameId: string;
}

// Builds an absolute ?game=<uuid> link to the current app, stripping any
// existing query (e.g. ?join / ?summary) so shares stay clean.
function buildShareUrl(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}?game=${gameId}`;
}

// Share a finished game. The Telegram button opens Telegram's own share
// composer (t.me/share/url) — the user picks the chat and sends it
// themselves, so no bot delivery is involved. A copy-link fallback covers
// everything else.
export function ShareGameButton({ gameId }: ShareGameButtonProps) {
  const { t } = useI18n();
  const url = buildShareUrl(gameId);
  const text = t('share.text');
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  return (
    <Group grow gap="xs">
      <Button
        variant="light"
        color="blue"
        leftSection={<IconBrandTelegram size={18} />}
        component="a"
        href={telegramShareUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('share.telegram')}
      </Button>
      <CopyButton value={url} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? t('share.linkCopied') : t('share.copyLinkTooltip')} withArrow>
            <Button
              variant="default"
              leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              onClick={copy}
            >
              {copied ? t('share.copied') : t('share.copyLink')}
            </Button>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
