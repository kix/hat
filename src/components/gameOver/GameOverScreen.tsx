import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Container, Stack, Title, Button } from '@mantine/core';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { useAuthSession } from '../../auth/useAuthSession';
import { syncPreferencesToSupabase } from '../../auth/syncPreferences';
import { syncWordTimingsToSupabase } from '../../auth/syncWordTimings';
import { saveGameResult } from '../../auth/saveGame';
import { GameSummaryView } from './GameSummaryView';
import { PlayAgainButton } from './PlayAgainButton';
import { ShareGameButton } from '../summary/ShareGameButton';
import { useI18n } from '../../i18n/i18n';

interface GameOverScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  isHost?: boolean;
  participants?: { userId: string; name: string }[];
}

export function GameOverScreen({ context, send, isHost, participants }: GameOverScreenProps) {
  const { t } = useI18n();
  const session = useAuthSession();
  // The id of the persisted game, once saved — enables the share link. Only
  // the saver (local player, or the host in multiplayer) gets it.
  const [savedGameId, setSavedGameId] = useState<string | null>(null);

  useEffect(() => {
    // Первоначальный мощный салют
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } });
    }, 450);

    // Драматичные вспышки конфетти по бокам в течение 3 секунд
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      // Запуски слева и справа
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
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

    if (session !== undefined && !savedRef.current) {
      savedRef.current = true;
      const isMultiplayer = !!participants && participants.length > 0;
      const shouldSave = !isMultiplayer || isHost;
      if (shouldSave) {
        void saveGameResult(context, participants || [], session?.user?.id).then((id) => {
          if (id) setSavedGameId(id);
        });
      }
    }
  }, [session, isHost, participants, context]);

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <Title order={1} ta="center">
          {t('gameOver.title')}
        </Title>

        <GameSummaryView
          teams={context.teams}
          history={context.history}
          settings={context.settings}
          highlightPlayerId={session?.user?.id}
        />

        {savedGameId && <ShareGameButton gameId={savedGameId} />}

        {isHost && (
          <Button variant="light" color="orange" onClick={() => send({ type: 'OPEN_REVIEW' })}>
            {t('gameOver.dispute')}
          </Button>
        )}

        <PlayAgainButton send={send} />
      </Stack>
    </Container>
  );
}
