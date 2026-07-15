import { useEffect, useRef, useState } from 'react';
import { Button, Group, Stack, Text } from '@mantine/core';
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
import { HideWordButton } from './HideWordButton';
import { isLocalDevEnvironment } from '../../utils/isLocalDevEnvironment';
import { ExitGameButton } from '../shared/ExitGameButton';

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
  const [wordHidden, setWordHidden] = useState(false);
  useEffect(() => {
    renderedAtRef.current = Date.now();
    // Every new word starts visible — hiding is a per-word choice, not a
    // standing one, so it doesn't carry over to the next word or the next
    // player's turn.
    setWordHidden(false);
  }, [currentWord]);

  const handleSend = (event: HatEvent) => {
    if (!currentWord) return;
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

  const isTimeUp = context.timeRemainingSec <= 0;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ExitGameButton send={send} />
      <Group justify="center" align="center" gap="lg" py="md">
        <HatCountBadge hatLength={context.hat.length} />
        <RoundTimer timeRemainingSec={context.timeRemainingSec} roundDurationSec={context.settings.roundDurationSec} />
        <RoundGuessedCount count={getCurrentRoundGuessedCount(context.teams, context.history, context.currentTeamIndex)} />
      </Group>

      {context.currentWord ? (
        <>
          <WordDisplay word={context.currentWord.word} hidden={wordHidden} />

          <Group justify="center" pb="sm">
            <HideWordButton hidden={wordHidden} onClick={() => setWordHidden((hidden) => !hidden)} />
          </Group>

          {isLocalDevEnvironment() && (
            <Group justify="center" pb="sm">
              <MarkWordRareButton onClick={() => handleSend({ type: 'MARK_WORD_RARE' })} />
              <DeleteWordButton onClick={() => handleSend({ type: 'DELETE_WORD' })} />
            </Group>
          )}

          {!isTimeUp ? (
            <ActionButtons
              allowSkip={context.settings.allowSkip}
              vibrationEnabled={context.settings.vibrationEnabled}
              wordShownAt={context.wordShownAt}
              send={handleSend}
            />
          ) : (
            <Stack align="center" gap="md" pb="xl" px="md">
              <Text c="red" fw={700} size="md" ta="center">
                Время вышло! Вы можете разгадать последнее слово или завершить раунд.
              </Text>
              <ActionButtons
                allowSkip={context.settings.allowSkip}
                vibrationEnabled={context.settings.vibrationEnabled}
                wordShownAt={context.wordShownAt}
                send={handleSend}
              />
              <Button size="xl" color="blue" fullWidth style={{ maxWidth: 300 }} onClick={() => send({ type: 'FINISH_ROUND' })}>
                Завершить раунд
              </Button>
            </Stack>
          )}
        </>
      ) : (
        <Stack align="center" justify="center" style={{ flex: 1 }} gap="lg" px="md">
          <Text size="xl" fw={600} ta="center">
            Раунд окончен! Все слова разгаданы.
          </Text>
          <Button size="xl" color="blue" fullWidth style={{ maxWidth: 300 }} onClick={() => send({ type: 'FINISH_ROUND' })}>
            Завершить раунд
          </Button>
        </Stack>
      )}
    </div>
  );
}
