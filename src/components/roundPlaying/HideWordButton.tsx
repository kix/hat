import { Button } from '@mantine/core';

interface HideWordButtonProps {
  hidden: boolean;
  onClick: () => void;
}

export function HideWordButton({ hidden, onClick }: HideWordButtonProps) {
  return (
    <Button variant="white" onClick={onClick}>
      {hidden ? 'Показать слово' : 'Скрыть слово'}
    </Button>
  );
}
