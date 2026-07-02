import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface DeleteWordButtonProps {
  onClick: () => void;
}

// Dev-only word-list curation tool — see vite.config.ts's delete-word
// middleware and hatMachine.ts's DELETE_WORD handling. Renders nothing in
// production, where there's no dev server to edit the dictionary file.
export function DeleteWordButton({ onClick }: DeleteWordButtonProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <ActionIcon aria-label="Удалить слово из словаря" variant="subtle" color="red" size="lg" onClick={onClick}>
      <IconTrash size={20} />
    </ActionIcon>
  );
}
