import { useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { HatContext, HatEvent } from '../machine/hatMachine';

export interface Participant {
  userId: string;
  name: string;
  isHost: boolean;
  presenceKey?: string;
}

export interface MultiplayerState {
  roomId: string;
  isHost: boolean;
  participants: Participant[];
  gameState: string | null; // 'setup' | 'roundIntro' | 'roundPlaying' | 'gameOver'
  gameContext: HatContext | null;
  loading: boolean;
  error: string | null;
  createRoom: (name: string, initialContext: HatContext) => Promise<string | null>;
  joinRoom: (code: string, name: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendAction: (action: HatEvent) => void;
  updateRoomState: (gameState: string, gameContext: HatContext) => Promise<void>;
}

// Генератор 4-значного кода комнаты (например, ABCD)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useMultiplayer(
  onActionReceived?: (action: HatEvent) => void
): MultiplayerState {
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameState, setGameState] = useState<string | null>(null);
  const [gameContext, setGameContext] = useState<HatContext | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onActionRef = useRef(onActionReceived);

  useEffect(() => {
    onActionRef.current = onActionReceived;
  }, [onActionReceived]);

  // Выход из комнаты
  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      void channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setRoomId('');
    setIsHost(false);
    setParticipants([]);
    setGameState(null);
    setGameContext(null);
  }, []);

  // Настройка подписки и Presence в комнате
  const setupRoomChannel = useCallback(
    async (code: string, hostMode: boolean, playerName: string, userId: string) => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
      }

      const channel = supabase.channel(`room:${code}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      channelRef.current = channel;

      // Слушаем изменения состояния игры от хоста
      channel.on('broadcast', { event: 'state_changed' }, ({ payload }) => {
        if (!hostMode) {
          setGameState(payload.gameState);
          setGameContext(payload.gameContext);
        }
      });

      // Слушаем действия клиентов на хосте
      channel.on('broadcast', { event: 'client_action' }, ({ payload }) => {
        if (hostMode && onActionRef.current) {
          onActionRef.current(payload.action);
        }
      });

      // Отслеживаем список участников (Presence)
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list: Participant[] = [];

        Object.keys(state).forEach((key) => {
          const userPresences = state[key];
          userPresences.forEach((presence: any) => {
            list.push({
              userId: presence.userId,
              name: presence.name,
              isHost: presence.isHost,
              presenceKey: key,
            });
          });
        });

        // Сортируем участников: хост всегда первый, далее по алфавиту
        list.sort((a, b) => {
          if (a.isHost) return -1;
          if (b.isHost) return 1;
          return a.name.localeCompare(b.name);
        });

        setParticipants(list);
      });

      return new Promise<boolean>((resolve) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Регистрируем себя в Presence
            await channel.track({
              userId,
              name: playerName,
              isHost: hostMode,
            });
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    },
    []
  );

  // Создание комнаты хостом
  const createRoom = useCallback(
    async (name: string, initialContext: HatContext): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData?.session?.user;

        // Если пользователя нет, делаем анонимный вход
        if (!user) {
          const { data, error: authErr } = await supabase.auth.signInAnonymously();
          if (authErr) throw authErr;
          user = data.user!;
        }

        let code = '';
        let exists = true;
        // Генерируем уникальный код
        for (let i = 0; i < 5; i++) {
          code = generateRoomCode();
          const { data: existingRoom, error: checkErr } = await supabase
            .from('rooms')
            .select('id')
            .eq('id', code)
            .maybeSingle();

          if (checkErr) {
            throw checkErr;
          }

          if (!existingRoom) {
            exists = false;
            break;
          }
        }

        if (exists) {
          throw new Error('Не удалось найти свободный код комнаты. Предел попыток исчерпан.');
        }

        // Сохраняем комнату в БД
        const { error: dbErr } = await supabase.from('rooms').insert({
          id: code,
          host_id: user.id,
          state: { gameState: 'setup', gameContext: initialContext },
        });

        if (dbErr) throw dbErr;

        // Подключаемся к каналу
        const ok = await setupRoomChannel(code, true, name, user.id);
        if (!ok) throw new Error('Не удалось подключиться к каналу реального времени.');

        setRoomId(code);
        setIsHost(true);
        setGameState('setup');
        setGameContext(initialContext);
        return code;
      } catch (err: any) {
        console.error('Ошибка создания комнаты:', err);
        setError(err.message || 'Ошибка создания комнаты');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setupRoomChannel]
  );

  // Подключение к существующей комнате клиентом
  const joinRoom = useCallback(
    async (code: string, name: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const cleanCode = code.toUpperCase().trim();
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData?.session?.user;

        if (!user) {
          const { data, error: authErr } = await supabase.auth.signInAnonymously();
          if (authErr) throw authErr;
          user = data.user!;
        }

        // Проверяем наличие комнаты в БД
        const { data: room, error: dbErr } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', cleanCode)
          .single();

        if (dbErr || !room) {
          throw new Error('Комната не найдена. Проверьте правильность кода.');
        }

        // Подключаемся к каналу
        const ok = await setupRoomChannel(cleanCode, false, name, user.id);
        if (!ok) throw new Error('Не удалось подключиться к каналу реального времени.');

        setRoomId(cleanCode);
        setIsHost(false);
        setGameState(room.state?.gameState || 'setup');
        setGameContext(room.state?.gameContext || null);
        return true;
      } catch (err: any) {
        console.error('Ошибка входа в комнату:', err);
        setError(err.message || 'Ошибка входа в комнату');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setupRoomChannel]
  );

  // Хост обновляет состояние игры (Broadcast + DB)
  const updateRoomState = useCallback(
    async (nextState: string, nextContext: HatContext) => {
      if (!isHost || !roomId || !channelRef.current) return;

      // Синхронизируем локально
      setGameState(nextState);
      setGameContext(nextContext);

      // Транслируем всем клиентам
      void channelRef.current.send({
        type: 'broadcast',
        event: 'state_changed',
        payload: {
          gameState: nextState,
          gameContext: nextContext,
        },
      });

      // Сохраняем в базу данных
      void supabase
        .from('rooms')
        .update({
          state: { gameState: nextState, gameContext: nextContext },
        })
        .eq('id', roomId);
    },
    [isHost, roomId]
  );

  // Отправка действий (используется клиентами для передачи кликов хосту)
  const sendAction = useCallback(
    (action: HatEvent) => {
      if (!roomId || !channelRef.current) return;

      if (isHost && onActionRef.current) {
        // Если хост сам кликает кнопки, выполняем действие локально
        onActionRef.current(action);
      } else {
        // Если клиент — отправляем действие хосту
        void channelRef.current.send({
          type: 'broadcast',
          event: 'client_action',
          payload: { action },
        });
      }
    },
    [isHost, roomId]
  );

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    roomId,
    isHost,
    participants,
    gameState,
    gameContext,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    sendAction,
    updateRoomState,
  };
}
