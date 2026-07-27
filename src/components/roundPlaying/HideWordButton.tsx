import { Button } from '@mantine/core';
import { useI18n } from '../../i18n/i18n';

interface HideWordButtonProps {
  hidden: boolean;
  onClick: () => void;
}

export function HideWordButton({ hidden, onClick }: HideWordButtonProps) {
  const { t } = useI18n();
  return (
    <Button variant="white" onClick={onClick}>
      {hidden ? t('hideWord.show') : t('hideWord.hide')}
    </Button>
  );
}
