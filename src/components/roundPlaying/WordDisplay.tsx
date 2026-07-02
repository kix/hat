import { Box } from '@mantine/core';

interface WordDisplayProps {
  word: string;
  hidden?: boolean;
}

export function WordDisplay({ word, hidden = false }: WordDisplayProps) {
  return (
    <Box
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mantine-spacing-md)',
        userSelect: 'none',
      }}
    >
      <Box
        component="span"
        style={{
          fontSize: 'clamp(2.5rem, 12vw, 6rem)',
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: 'center',
          color: hidden ? 'var(--mantine-color-dimmed)' : '#000',
          wordBreak: 'break-word',
        }}
      >
        {hidden ? 'Слово скрыто' : word}
      </Box>
    </Box>
  );
}
