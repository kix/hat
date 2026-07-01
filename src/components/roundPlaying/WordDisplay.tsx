import { Box } from '@mantine/core';

interface WordDisplayProps {
  word: string;
}

export function WordDisplay({ word }: WordDisplayProps) {
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
          color: '#000',
          wordBreak: 'break-word',
        }}
      >
        {word}
      </Box>
    </Box>
  );
}
