import { useState, lazy, Suspense } from 'react';
import { Button, CopyButton, Group, Stack, Tooltip } from '@mantine/core';
import { IconBrandTelegram, IconCheck, IconCopy, IconPhoto } from '@tabler/icons-react';
import type { History, Settings, Team } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';

const ExportCardModal = lazy(() =>
  import('./ExportCardModal').then((m) => ({ default: m.ExportCardModal })),
);

interface ShareGameButtonProps {
  gameId?: string;
  teams?: Team[];
  history?: History;
  settings?: Settings;
}

// Builds an absolute ?game=<uuid> link to the current app, stripping any
// existing query (e.g. ?join / ?summary) so shares stay clean.
function buildShareUrl(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}?game=${gameId}`;
}

export function ShareGameButton({ gameId, teams, history, settings }: ShareGameButtonProps) {
  const { t } = useI18n();
  const [cardModalOpened, setCardModalOpened] = useState<boolean>(false);

  const url = gameId ? buildShareUrl(gameId) : '';
  const text = t('share.text');
  const telegramShareUrl = url
    ? `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    : '';

  const hasCardData = Boolean(teams && history && settings);

  return (
    <Stack gap="xs">
      {hasCardData && (
        <Button
          variant="gradient"
          gradient={{ from: 'indigo', to: 'grape', deg: 90 }}
          leftSection={<IconPhoto size={18} />}
          onClick={() => setCardModalOpened(true)}
          fullWidth
          size="md"
        >
          {t('exportCard.button')}
        </Button>
      )}

      {gameId && (
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
      )}

      {hasCardData && cardModalOpened && (
        <Suspense fallback={null}>
          <ExportCardModal
            opened={cardModalOpened}
            onClose={() => setCardModalOpened(false)}
            teams={teams!}
            history={history!}
            settings={settings!}
          />
        </Suspense>
      )}
    </Stack>
  );
}
