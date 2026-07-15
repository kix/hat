import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { Container, Stack, Title, Text, Button, TextInput, Card, Group, Divider } from '@mantine/core';
import { IconDeviceGamepad2, IconUsers, IconUser, IconBrandGoogle, IconBrandTelegram } from '@tabler/icons-react';
import { hatMachine, type HatContext, type Settings, type HatEvent } from './machine/hatMachine';
import { useGameSounds } from './sounds/useGameSounds';
import { vibrate } from './utils/haptics';
import { rememberPlayerName } from './utils/playerNamesStore';
import { ScreenTransition } from './components/ScreenTransition';
import { SetupScreen } from './components/setup/SetupScreen';
import { LobbyScreen } from './components/setup/LobbyScreen';
import { RoundIntroScreen } from './components/roundIntro/RoundIntroScreen';
import { RoundPlayingScreen } from './components/roundPlaying/RoundPlayingScreen';
import { GameOverScreen } from './components/gameOver/GameOverScreen';
import { AuthMenu, signInWithGoogle, signInWithTelegram } from './components/auth/AuthMenu';
import { useAuthSession } from './auth/useAuthSession';
import { useMultiplayer } from './auth/useMultiplayer';

function App() {
  const sounds = useGameSounds();
  const session = useAuthSession();
  const isRealUser = !!(session?.user && !session.user.is_anonymous && session.user.app_metadata?.provider !== 'anonymous');
  
  // Режимы игры: null (выбор режима), 'local' (Pass & Play), 'multiplayer' (сетевой)
  const [mode, setMode] = useState<'local' | 'multiplayer' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [joinRoomCode, setJoinRoomCode] = useState<string>('');

  // Ссылка на последние настройки для звуков/вибрации
  const settingsRef = useRef<Settings | null>(null);

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
      setMode('multiplayer');
      setJoinRoomCode(joinCode.toUpperCase());
    }
  }, []);

  // Синхронизация состояния хоста в Supabase Realtime + БД
  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.isHost && multiplayer.roomId && localState) {
      void multiplayer.updateRoomState(localState.value as string, localState.context);
    }
  }, [localState, multiplayer.isHost, multiplayer.roomId, mode]);

  // Ленивая загрузка словаря
  useEffect(() => {
    void import('./data/dictionary').then((module) => {
      localSend({ type: 'DICTIONARY_LOADED', entries: module.dictionary });
    });
  }, [localSend]);

  // Общие методы управления действиями (роутинг send)
  const send = mode === 'multiplayer' ? multiplayer.sendAction : localSend;
  const currentContext = mode === 'multiplayer' ? (multiplayer.gameContext || localState.context) : localState.context;
  const currentStatus = mode === 'multiplayer' ? multiplayer.gameState : (localState.value as string);

  // Обработчик создания комнаты
  const handleCreateRoom = async () => {
    const name = playerName.trim() || 'Создатель';
    const code = await multiplayer.createRoom(name, localState.context);
    if (code) {
      setMode('multiplayer');
    }
  };

  // Обработчик подключения к комнате
  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      alert('Введите код комнаты!');
      return;
    }
    const name = playerName.trim() || 'Игрок';
    const ok = await multiplayer.joinRoom(joinRoomCode, name);
    if (ok) {
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

  // =====================================================================
  // ЭКРАН ВЫБОРА РЕЖИМА ИГРЫ
  // =====================================================================
  if (mode === null) {
    return (
      <Container size="xs" py="xl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Stack gap="lg" style={{ width: '100%' }}>
          <Group justify="space-between" align="center">
            <Title order={1} size={36} fw={800} style={{ letterSpacing: -1 }}>
              Шляпа
            </Title>
            <AuthMenu />
          </Group>
          <Text size="sm" c="dimmed">
            Популярная игра в объяснение слов. Выберите режим игры, чтобы начать!
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
                Локальная игра
              </Button>
              <Text size="xs" c="dimmed" ta="center">
                Один телефон передается из рук в руки в одной комнате.
              </Text>
            </Stack>
          </Card>

          <Divider label="ИЛИ СЕТЕВАЯ ИГРА" labelPosition="center" />

          <Card withBorder padding="lg" radius="md">
            {isRealUser ? (
              <Stack gap="md">
                <TextInput
                  label="Ваше имя"
                  placeholder="Введите ваше имя"
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
                  Создать онлайн-комнату
                </Button>

                <Group gap="xs" grow>
                  <TextInput
                    placeholder="КОД"
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
                    Войти по коду
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
                  Для игры по сети необходимо войти в аккаунт. Это позволит сохранять вашу статистику и отображать ваше имя другим игрокам.
                </Text>
                <Button
                  variant="default"
                  leftSection={<IconBrandGoogle size={18} />}
                  onClick={signInWithGoogle}
                >
                  Войти через Google
                </Button>
                {import.meta.env.VITE_TELEGRAM_CLIENT_ID ? (
                  <Button
                    variant="default"
                    leftSection={<IconBrandTelegram size={18} color="#229ED9" />}
                    onClick={() => signInWithTelegram(import.meta.env.VITE_TELEGRAM_CLIENT_ID)}
                  >
                    Войти через Telegram
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed" ta="center">
                    Настройте VITE_TELEGRAM_CLIENT_ID для входа через Telegram
                  </Text>
                )}
              </Stack>
            )}
          </Card>
        </Stack>
      </Container>
    );
  }

  // =====================================================================
  // СЕТЕВОЕ ЛОББИ ОЖИДАНИЯ (SETUP в режиме онлайн)
  // =====================================================================
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
        <SetupScreen context={currentContext} send={send} onBack={() => setMode(null)} />
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
  if (currentStatus === 'gameOver') {
    return (
      <ScreenTransition key="gameOver">
        <GameOverScreen context={currentContext} send={send} />
      </ScreenTransition>
    );
  }

  return null;
}

export default App;
