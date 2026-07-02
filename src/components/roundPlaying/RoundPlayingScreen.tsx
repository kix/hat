import { Group } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { getCurrentRoundGuessedCount } from '../../utils/stats';
import { logWeirdWord } from '../../auth/logWeirdWord';
import { deleteWordFromDictionary } from '../../utils/deleteWord';
import { markWordRareInDictionary } from '../../utils/setWordFrequency';
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
  if (!context.currentWord) return null;
  const currentWord = context.currentWord.word;

  function handleSend(event: HatEvent) {
    if (event.type === 'WORD_SKIPPED') {
      void logWeirdWord(currentWord);
    }
    if (event.type === 'DELETE_WORD') {
      void deleteWordFromDictionary(currentWord);
    }
    if (event.type === 'MARK_WORD_RARE') {
      void markWordRareInDictionary(currentWord);
    }
    send(event);
  }

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
