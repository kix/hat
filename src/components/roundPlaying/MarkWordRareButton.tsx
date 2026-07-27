import { ActionIcon } from '@mantine/core';
import { IconTrendingDown } from '@tabler/icons-react';
import { isLocalDevEnvironment } from '../../utils/isLocalDevEnvironment';
import { useI18n } from '../../i18n/i18n';

interface MarkWordRareButtonProps {
  onClick: () => void;
}

// Dev-only word-list curation tool — see vite.config.ts's set-word-frequency
// middleware and hatMachine.ts's MARK_WORD_RARE handling. Renders nothing
// outside a local dev server, where there's no dev server to edit the
// dictionary file (or it's not the developer's own machine).
export function MarkWordRareButton({ onClick }: MarkWordRareButtonProps) {
  const { t } = useI18n();
  if (!isLocalDevEnvironment()) return null;

  return (
    <ActionIcon aria-label={t('markRare.aria')} variant="subtle" color="yellow" size="lg" onClick={onClick}>
      <IconTrendingDown size={20} />
    </ActionIcon>
  );
}
