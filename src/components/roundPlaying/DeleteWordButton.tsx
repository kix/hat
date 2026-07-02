import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { isLocalDevEnvironment } from '../../utils/isLocalDevEnvironment';

interface DeleteWordButtonProps {
  onClick: () => void;
}

// Dev-only word-list curation tool — see vite.config.ts's delete-word
// middleware and hatMachine.ts's DELETE_WORD handling. Renders nothing
// outside a local dev server, where there's no dev server to edit the
// dictionary file (or it's not the developer's own machine).
export function DeleteWordButton({ onClick }: DeleteWordButtonProps) {
  if (!isLocalDevEnvironment()) return null;

  return (
    <ActionIcon aria-label="Удалить слово из словаря" variant="subtle" color="red" size="lg" onClick={onClick}>
      <IconTrash size={20} />
    </ActionIcon>
  );
}
