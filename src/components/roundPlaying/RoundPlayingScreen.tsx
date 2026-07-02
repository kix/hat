import { useEffect, useRef } from 'react';
import { Group } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getCurrentRoundGuessedCount } from '../../utils/stats';
import { logWeirdWord } from '../../auth/logWeirdWord';
import { deleteWordFromDictionary } from '../../utils/deleteWord';
import { markWordRareInDictionary } from '../../utils/setWordFrequency';
import { useAuthSession } from '../../auth/useAuthSession';
import { recordWordTiming } from '../../utils/wordTimingsStore';
import { RoundTimer } from './RoundTimer';
import { HatCountBadge } from './HatCountBadge';
import { RoundGuessedCount } from './RoundGuessedCount';
import { WordDisplay } from './WordDisplay';
import { ActionButtons } from './ActionButtons';
import { DeleteWordButton } from './DeleteWordButton';
import { MarkWordRareButton } from './MarkWordRareButton';
import { isLocalDevEnvironment } from '../../utils/isLocalDevEnvironment';

interface RoundPlayingScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
}

export function RoundPlayingScreen({ context, send }: RoundPlayingScreenProps) {
  const session = useAuthSession();
  const currentWord = context.currentWord?.word;

  // context.wordShownAt is stamped inside the machine's state transition,
  // which happens slightly before React actually renders the new word —
  // this instead captures the moment this word's render actually commits.
  const renderedAtRef = useRef<number | null>(null);
  useEffect(() => {
    renderedAtRef.current = Date.now();
  }, [currentWord]);

  if (!context.currentWord || currentWord === undefined) return null;

  const handleSend = (event: HatEvent) => {
    if (event.type === 'WORD_SKIPPED') {
      void logWeirdWord(currentWord);
    }
    if (event.type === 'DELETE_WORD') {
      void deleteWordFromDictionary(currentWord);
    }
    if (event.type === 'MARK_WORD_RARE') {
      void markWordRareInDictionary(currentWord);
    }
    if (event.type === 'WORD_GUESSED' && session?.user) {
      recordWordTiming(currentWord, Date.now() - (renderedAtRef.current ?? Date.now()));
    }
    send(event);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Group justify="center" align="center" gap="lg" py="md">
        <HatCountBadge hatLength={context.hat.length} />
        <RoundTimer timeRemainingSec={context.timeRemainingSec} roundDurationSec={context.settings.roundDurationSec} />
        <RoundGuessedCount count={getCurrentRoundGuessedCount(context.teams, context.history, context.currentTeamIndex)} />
      </Group>

      <WordDisplay word={context.currentWord.word} />

      { isLocalDevEnvironment() && (
        <Group justify="center" pb="sm">
          <MarkWordRareButton onClick={() => handleSend({ type: 'MARK_WORD_RARE' })} />
          <DeleteWordButton onClick={() => handleSend({ type: 'DELETE_WORD' })} />
        </Group>
      )}
      

      <ActionButtons
        allowSkip={context.settings.allowSkip}
        vibrationEnabled={context.settings.vibrationEnabled}
        send={handleSend}
      />
    </div>
  );
}
