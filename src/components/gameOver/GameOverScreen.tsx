import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Container, Stack, Title } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { useAuthSession } from '../../auth/useAuthSession';
import { syncPreferencesToSupabase } from '../../auth/syncPreferences';
import { syncWordTimingsToSupabase } from '../../auth/syncWordTimings';
import { saveGameResult } from '../../auth/saveGame';
import { GameSummaryView } from './GameSummaryView';
import { PlayAgainButton } from './PlayAgainButton';
import { ShareGameButton } from '../summary/ShareGameButton';

interface GameOverScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  isHost?: boolean;
  participants?: { userId: string; name: string }[];
}

export function GameOverScreen({ context, send, isHost, participants }: GameOverScreenProps) {
  const session = useAuthSession();
  // The id of the persisted game, once saved — enables the share link. Only
  // the saver (local player, or the host in multiplayer) gets it.
  const [savedGameId, setSavedGameId] = useState<string | null>(null);

  useEffect(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }, []);

  // Runs once per finished game, as soon as the session (if any) is known —
  // session starts out null on mount and fills in shortly after.
  const syncedRef = useRef(false);
  const savedRef = useRef(false);
  useEffect(() => {
    if (session?.user.id && !syncedRef.current) {
      syncedRef.current = true;
      void syncPreferencesToSupabase(session.user.id);
      void syncWordTimingsToSupabase(session.user.id);
    }

    if (!savedRef.current) {
      savedRef.current = true;
      const isMultiplayer = !!participants && participants.length > 0;
      const shouldSave = !isMultiplayer || isHost;
      if (shouldSave) {
        void saveGameResult(context, participants || [], session?.user?.id).then((id) => {
          if (id) setSavedGameId(id);
        });
      }
    }
  }, [session, isHost, participants]);

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          Игра окончена
        </Title>

        <GameSummaryView
          teams={context.teams}
          history={context.history}
          settings={context.settings}
          highlightPlayerId={session?.user?.id}
        />

        {savedGameId && <ShareGameButton gameId={savedGameId} />}

        <PlayAgainButton send={send} />
      </Stack>
    </Container>
  );
}
