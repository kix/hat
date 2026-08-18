import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { Container, Stack, Title, Text, Button, TextInput, Card, Group, Divider, Anchor } from '@mantine/core';
import { IconDeviceGamepad2, IconUsers, IconUser, IconBrandTelegram, IconInfoCircle } from '@tabler/icons-react';
import { hatMachine, type HatContext, type Settings, type HatEvent } from './machine/hatMachine';
import packageJson from '../package.json';
import { useGameSounds } from './sounds/useGameSounds';
import { vibrate } from './utils/haptics';
import { rememberPlayerName } from './utils/playerNamesStore';
import { ScreenTransition } from './components/ScreenTransition';
import { SetupScreen } from './components/setup/SetupScreen';
import { LobbyScreen } from './components/setup/LobbyScreen';
import { GuestLocalLobbyScreen } from './components/setup/GuestLocalLobbyScreen';
import { RoundIntroScreen } from './components/roundIntro/RoundIntroScreen';
import { RoundPlayingScreen } from './components/roundPlaying/RoundPlayingScreen';
import { GameOverScreen } from './components/gameOver/GameOverScreen';
import { RoundReviewScreen } from './components/roundReview/RoundReviewScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SummaryScreen } from './components/summary/SummaryScreen';
import { GameShareScreen } from './components/summary/GameShareScreen';
import { AuthMenu, signInWithTelegram } from './components/auth/AuthMenu';
import { ColorSchemeToggle } from './components/ColorSchemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { useI18n } from './i18n/i18n';
import { useAuthSession } from './auth/useAuthSession';
import { useMultiplayer } from './auth/useMultiplayer';
import { trackEvent } from './utils/analytics';

function App() {
  const sounds = useGameSounds();
  const { t, lang } = useI18n();
  const session = useAuthSession();
  const isRealUser = !!(session?.user && (!session.user.is_anonymous || session.user.user_metadata?.provider === 'telegram'));
  
  // Режимы игры: null (выбор режима), 'local' (Pass & Play), 'multiplayer' (сетевой)
  const [mode, setMode] = useState<'local' | 'multiplayer' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [joinRoomCode, setJoinRoomCode] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  // Shareable daily-summary link (?summary=<uuid>), read once on load.
  const [summaryId, setSummaryId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('summary'),
  );
  // Shareable single-game link (?game=<uuid>), read once on load.
  const [shareGameId, setShareGameId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('game'),
  );

  // Ссылка на последние настройки для звуков/вибрации
  const settingsRef = useRef<Settings | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Инициализация XState автомата (используется локально и на Хосте)
  const machine = useMemo(
    () =>
      hatMachine.provide({
        actions: {
          playRoundStartSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playRoundStart();
          },
          playTickSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playTick();
            if (settingsRef.current?.vibrationEnabled) vibrate(10);
          },
          playGuessedSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playGuessed();
          },
          playLowHatGuessedSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playLowHatGuessed();
          },
          playSkipSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playSkip();
          },
          playFoulSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playFoul();
          },
          playGameOverSound: () => {
            if (settingsRef.current?.soundEnabled) sounds.playGameOver();
          },
          rememberPlayerNames: ({ context }: { context: HatContext }) => {
            for (const team of context.teams) {
              for (const player of team.players) {
                rememberPlayerName(player.name);
              }
            }
          },
        },
      }),
    [sounds],
  );

  const [localState, localSend] = useMachine(machine);

  // Обработчик входящих событий для сетевого режима (вызывается на хосте)
  const handleActionFromClient = useCallback((action: HatEvent) => {
    localSend(action);
  }, [localSend]);

  // Подключаем хук сетевой игры
  const multiplayer = useMultiplayer(handleActionFromClient);

  // Прокидываем настройки
  settingsRef.current = mode === 'multiplayer' && !multiplayer.isHost && multiplayer.gameContext
    ? multiplayer.gameContext.settings
    : localState.context.settings;

  // Автозаполнение имени из сессии авторизации (Telegram / Google)
  useEffect(() => {
    if (session?.user?.user_metadata?.full_name && !playerName) {
      setPlayerName(session.user.user_metadata.full_name);
    }
  }, [session, playerName]);

  // Обработка параметров авто-входа по ссылке ?join=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setJoinRoomCode(joinCode.toUpperCase());
    }
  }, []);

  // Синхронизация состояния хоста в Supabase Realtime + БД
  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.isHost && multiplayer.roomId && localState) {
      void multiplayer.updateRoomState(localState.value as string, localState.context);
    }
  }, [localState, multiplayer.isHost, multiplayer.roomId, mode]);

  // Общие методы управления действиями (роутинг send)
  const send = mode === 'multiplayer' ? multiplayer.sendAction : localSend;
  const currentContext = mode === 'multiplayer' ? (multiplayer.gameContext || localState.context) : localState.context;
  const currentStatus = mode === 'multiplayer' ? multiplayer.gameState : (localState.value as string);

  // Ленивая загрузка словаря — русского или английского, в зависимости от языка и настроек набора слов
  useEffect(() => {
    let active = true;
    void (async () => {
      let entries: any[] = [];
      if (lang === 'en') {
        entries = (await import('./data/dictionaryEn')).dictionaryEn;
      } else {
        const frequent = (await import('./data/dictionaryRuFrequent')).dictionaryRuFrequent;
        if (currentContext.settings.wordPack === 'standard') {
          const standard = (await import('./data/dictionaryRuStandard')).dictionaryRuStandard;
          entries = [...frequent, ...standard];
        } else {
          entries = frequent;
        }
      }
      if (active) {
        localSend({ type: 'DICTIONARY_LOADED', entries });
      }
    })();
    return () => {
      active = false;
    };
  }, [localSend, lang, currentContext.settings.wordPack]);
  // Отслеживаем начало и конец игры для аналитики
  useEffect(() => {
    if (prevStatusRef.current === 'setup' && currentStatus === 'roundIntro') {
      trackEvent('game_start', {
        mode: mode,
        teams_count: currentContext.teams.length,
        word_count: currentContext.settings.wordCount,
        difficulty: currentContext.settings.difficultyLevel,
        word_pack: currentContext.settings.wordPack,
        round_duration: currentContext.settings.roundDurationSec,
      });
    }
    if (currentStatus === 'gameOver' && prevStatusRef.current !== 'gameOver') {
      trackEvent('game_end', {
        mode: mode,
        winner_team: currentContext.teams[0]?.name || '',
        total_words: currentContext.settings.wordCount,
        rounds_played: currentContext.teams.reduce((acc, t) => acc + t.roundsPlayed, 0),
      });
    }
    prevStatusRef.current = currentStatus;
  }, [currentStatus, mode, currentContext]);
  // Автоматический выход из комнаты при старте локальной игры хостом
  useEffect(() => {
    if (mode === 'local' && currentStatus !== 'setup' && multiplayer.roomId) {
      multiplayer.leaveRoom();
    }
  }, [mode, currentStatus, multiplayer.roomId, multiplayer.leaveRoom]);

  // Обработчик создания комнаты
  const handleCreateRoom = async () => {
    const name = playerName.trim() || t('default.host');
    const code = await multiplayer.createRoom(name, localState.context);
    if (code) {
      trackEvent('create_room');
      setMode('multiplayer');
    }
  };

  // Обработчик подключения к комнате
  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      alert(t('alert.enterRoomCode'));
      return;
    }
    const name = playerName.trim() || t('default.player');
    const ok = await multiplayer.joinRoom(joinRoomCode, name);
    if (ok) {
      trackEvent('join_room');
      setMode('multiplayer');
      // Очищаем URL параметр join
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLeaveRoom = () => {
    multiplayer.leaveRoom();
    setMode(null);
  };

  const closeSummary = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('summary');
    window.history.replaceState({}, '', url.toString());
    setSummaryId(null);
  };

  const closeShareGame = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('game');
    window.history.replaceState({}, '', url.toString());
    setShareGameId(null);
  };

  // =====================================================================
  // ЭКРАН СВОДКИ ИГР ПО ССЫЛКЕ (?summary=<uuid>)
  // =====================================================================
  if (summaryId) {
    return (
      <ScreenTransition key="summary">
        <SummaryScreen summaryId={summaryId} onClose={closeSummary} />
      </ScreenTransition>
    );
  }

  // =====================================================================
  // ЭКРАН ОДНОЙ ИГРЫ ПО ССЫЛКЕ (?game=<uuid>)
  // =====================================================================
  if (shareGameId) {
    return (
      <ScreenTransition key="shareGame">
        <GameShareScreen gameId={shareGameId} onClose={closeShareGame} />
      </ScreenTransition>
    );
  }

  // =====================================================================
  // ЭКРАН ПРОФИЛЯ И СТАТИСТИКИ
  // =====================================================================
  if (showProfile && session?.user?.id) {
    return (
      <ScreenTransition key="profile">
        <ProfileScreen userId={session.user.id} onBack={() => setShowProfile(false)} />
      </ScreenTransition>
    );
  }

  // =====================================================================
  // ЭКРАН ВЫБОРА РЕЖИМА ИГРЫ
  // =====================================================================
  if (mode === null) {
    return (
      <Container size="xs" py="xl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Stack gap="lg" style={{ width: '100%' }}>
          <Group justify="space-between" align="center">
            <Title order={1} size={36} fw={800} style={{ letterSpacing: -1 }}>
              {t('app.title')}
            </Title>
            <Group gap="xs">
              <LanguageToggle />
              <ColorSchemeToggle />
              <AuthMenu onViewProfile={() => setShowProfile(true)} />
            </Group>
          </Group>
          <Text size="sm" c="dimmed">
            {t('landing.tagline')}
          </Text>

          <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
              <Button
                size="xl"
                variant="filled"
                color="blue"
                leftSection={<IconDeviceGamepad2 size={24} />}
                onClick={() => setMode('local')}
              >
                {t('landing.localGame')}
              </Button>
              <Text size="xs" c="dimmed" ta="center">
                {t('landing.localHint')}
              </Text>
            </Stack>
          </Card>

          <Divider label={t('landing.orOnline')} labelPosition="center" />

          <Card withBorder padding="lg" radius="md">
            {isRealUser ? (
              <Stack gap="md">
                <Group justify="space-between" align="center" mb={-5}>
                  <Text size="sm" c="dimmed">
                    {t('landing.online')}
                  </Text>
                  <Button variant="subtle" size="xs" onClick={() => setShowProfile(true)}>
                    {t('landing.statsAchievements')}
                  </Button>
                </Group>
                <TextInput
                  label={t('landing.yourName')}
                  placeholder={t('landing.yourNamePlaceholder')}
                  leftSection={<IconUser size={16} />}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.currentTarget.value)}
                />

                <Button
                  size="lg"
                  variant="light"
                  color="teal"
                  leftSection={<IconUsers size={20} />}
                  onClick={handleCreateRoom}
                  loading={multiplayer.loading}
                >
                  {t('landing.createRoom')}
                </Button>

                <Group gap="xs" grow>
                  <TextInput
                    placeholder={t('landing.codePlaceholder')}
                    maxLength={4}
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.currentTarget.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', letterSpacing: 2 }}
                  />
                  <Button
                    size="md"
                    variant="outline"
                    color="blue"
                    onClick={handleJoinRoom}
                    loading={multiplayer.loading}
                  >
                    {t('landing.joinByCode')}
                  </Button>
                </Group>
                {multiplayer.error && (
                  <Text size="xs" color="red" ta="center">
                    {multiplayer.error}
                  </Text>
                )}
              </Stack>
            ) : (
              <Stack gap="sm" align="stretch">
                <Text size="sm" c="dimmed" ta="center">
                  {t('landing.loginPrompt')}
                </Text>
                {import.meta.env.VITE_TELEGRAM_CLIENT_ID ? (
                  <Button
                    variant="default"
                    leftSection={<IconBrandTelegram size={18} color="#229ED9" />}
                    onClick={() => {
                      trackEvent('auth_click', { provider: 'telegram' });
                      signInWithTelegram(import.meta.env.VITE_TELEGRAM_CLIENT_ID);
                    }}
                  >
                    {t('auth.telegram')}
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed" ta="center">
                    {t('auth.telegramNotConfigured')}
                  </Text>
                )}
              </Stack>
            )}
          </Card>

          <Card withBorder padding="lg" radius="md" style={{ background: 'rgba(25, 113, 194, 0.03)' }}>
            <Stack gap="xs">
              <Group gap="xs" c="blue">
                <IconInfoCircle size={20} />
                <Text fw={700} size="xs" style={{ letterSpacing: 0.5 }}>
                  {t('landing.howToPlayTitle').toUpperCase()}
                </Text>
              </Group>
              <Text size="xs" style={{ lineHeight: 1.5 }}>
                {t('landing.howToPlayRule1')}
              </Text>
              <Text size="xs" style={{ lineHeight: 1.5 }}>
                {t('landing.howToPlayRule2')}
              </Text>
              <Text size="xs" style={{ lineHeight: 1.5 }}>
                {t('landing.howToPlayRule3')}
              </Text>
            </Stack>
          </Card>

          <Group justify="center" gap="xs" mt="sm" style={{ opacity: 0.5 }}>
            <Text size="xs">
              v{packageJson.version}
            </Text>
            <Text size="xs" c="dimmed">·</Text>
            <Anchor 
              href="https://web.tribute.tg/d/NSu" 
              target="_blank" 
              size="xs" 
              c="dimmed" 
              underline="hover"
              onClick={() => trackEvent('support_click', { provider: 'tribute' })}
            >
              {t('landing.supportAuthor')}
            </Anchor>
            <Text size="xs" c="dimmed">·</Text>
            <Anchor 
              href="https://github.com/kix/hat/issues/new" 
              target="_blank" 
              size="xs" 
              c="dimmed" 
              underline="hover"
              onClick={() => trackEvent('bug_report_click')}
            >
              {t('landing.reportBug')}
            </Anchor>
          </Group>
        </Stack>
      </Container>
    );
  }

  // =====================================================================
  // СЕТЕВОЕ ЛОББИ ОЖИДАНИЯ (SETUP в режиме онлайн)
  // =====================================================================
  if (mode === 'multiplayer' && !multiplayer.isHost && multiplayer.gameContext?.isLocalLobby) {
    return (
      <ScreenTransition key="guestLocalLobby">
        <GuestLocalLobbyScreen
          roomId={multiplayer.roomId}
          playerName={playerName}
          participants={multiplayer.participants}
          onLeave={handleLeaveRoom}
        />
      </ScreenTransition>
    );
  }

  if (mode === 'multiplayer' && currentStatus === 'setup') {
    return (
      <ScreenTransition key="lobby">
        <LobbyScreen
          roomId={multiplayer.roomId}
          isHost={multiplayer.isHost}
          participants={multiplayer.participants}
          context={currentContext}
          send={send}
          onLeave={handleLeaveRoom}
          onStartGame={() => send({ type: 'START_GAME' })}
        />
      </ScreenTransition>
    );
  }

  // =====================================================================
  // СТАНДАРТНЫЕ ИГРОВЫЕ ЭКРАНЫ (ЛОКАЛЬНЫЙ ИЛИ СЕТЕВОЙ РЕЖИМ)
  // =====================================================================
  if (currentStatus === 'setup') {
    return (
      <ScreenTransition key="setup">
        <SetupScreen
          context={currentContext}
          send={send}
          onBack={() => {
            multiplayer.leaveRoom();
            setMode(null);
          }}
          multiplayer={multiplayer}
          currentUser={session?.user}
        />
      </ScreenTransition>
    );
  }
  if (currentStatus === 'roundIntro') {
    return (
      <ScreenTransition key="roundIntro">
        <RoundIntroScreen context={currentContext} send={send} />
      </ScreenTransition>
    );
  }
  if (currentStatus === 'roundPlaying') {
    return (
      <ScreenTransition key="roundPlaying">
        <RoundPlayingScreen
          context={currentContext}
          send={send}
          isMultiplayer={mode === 'multiplayer'}
          currentUserId={session?.user?.id}
          isHost={multiplayer.isHost}
        />
      </ScreenTransition>
    );
  }
  if (currentStatus === 'roundReview') {
    return (
      <ScreenTransition key="roundReview">
        <RoundReviewScreen
          context={currentContext}
          send={send}
          isMultiplayer={mode === 'multiplayer'}
          isHost={mode === 'multiplayer' ? multiplayer.isHost : true}
        />
      </ScreenTransition>
    );
  }
  if (currentStatus === 'gameOver') {
    return (
      <ScreenTransition key="gameOver">
        <GameOverScreen
          context={currentContext}
          send={send}
          isHost={mode === 'multiplayer' ? multiplayer.isHost : true}
          participants={mode === 'multiplayer' ? multiplayer.participants : []}
        />
      </ScreenTransition>
    );
  }

  return null;
}

export default App;
