import { supabase } from './supabaseClient';
import type { HatContext } from '../machine/hatMachine';
import { sortTeamsByScore } from '../utils/stats';

/**
 * Сохраняет результаты сыгранной партии в базу данных Supabase.
 * Связывает участников игры с их учетными записями в Supabase Auth.
 */
export async function saveGameResult(
  context: HatContext,
  participants: { userId: string; name: string }[] = [],
  currentUserId?: string
): Promise<string | null> {
  try {
    if (context.history.length === 0) return null;

    const sortedTeams = sortTeamsByScore(context.teams, context.history);
    const winnerTeam = sortedTeams[0];
    if (!winnerTeam) return null;

    // 1. Строим карту соответствия имен и UUID пользователей
    const realUsersMap = new Map<string, string>(); // name -> userId
    
    // Добавляем всех известных участников лобби
    participants.forEach((p) => {
      if (p.userId && p.name) {
        realUsersMap.set(p.name.trim().toLowerCase(), p.userId);
      }
    });

    // Добавляем текущего авторизованного пользователя
    if (currentUserId) {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserName = userData?.user?.user_metadata?.full_name;
      if (currentUserName) {
        realUsersMap.set(currentUserName.trim().toLowerCase(), currentUserId);
      }
    }

    // Собираем набор всех гарантированно реальных UUID пользователей в этой сессии
    const validUserIds = new Set<string>();
    if (currentUserId) {
      validUserIds.add(currentUserId);
    }
    participants.forEach((p) => {
      if (p.userId) {
        validUserIds.add(p.userId);
      }
    });

    // Строим карту соответствия локального player.id -> Supabase UUID
    const playerIdToUuidMap = new Map<string, string>();
    for (const team of context.teams) {
      for (const player of team.players) {
        if (!player.name) continue;
        const nameKey = player.name.trim().toLowerCase();
        const matchedUserId = validUserIds.has(player.id) ? player.id : (realUsersMap.get(nameKey) || null);
        if (matchedUserId) {
          playerIdToUuidMap.set(player.id, matchedUserId);
        }
      }
    }

    // В случае фоллбека для локальной игры, если никто не совпал по имени:
    // Мы сможем смаппить первого игрока на текущего пользователя
    let hasMatchedAny = false;
    for (const team of context.teams) {
      for (const player of team.players) {
        if (player.name && (validUserIds.has(player.id) || realUsersMap.has(player.name.trim().toLowerCase()))) {
          hasMatchedAny = true;
        }
      }
    }

    if (!hasMatchedAny && currentUserId && context.teams.length > 0) {
      const firstTeam = context.teams[0];
      const firstPlayer = firstTeam.players[0];
      if (firstPlayer && firstPlayer.name) {
        playerIdToUuidMap.set(firstPlayer.id, currentUserId);
      }
    }

    // Теперь маппим history_data, подменяя локальные ID игроков на их реальные Supabase UUID
    const mappedHistory = context.history.map((record) => ({
      ...record,
      describerId: playerIdToUuidMap.get(record.describerId) || record.describerId,
      guesserId: playerIdToUuidMap.get(record.guesserId) || record.guesserId,
    }));

    // 2. Сохраняем игру в таблицу games
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        winner_team_name: winnerTeam.name,
        history_data: mappedHistory, // Используем отмаппленную историю с реальными UUID!
        settings: context.settings,
        teams_data: context.teams,
      })
      .select()
      .single();

    if (gameErr || !game) {
      console.error('Ошибка сохранения игры:', gameErr);
      return null;
    }

    // 3. Формируем список участников для сохранения
    const participantsToInsert: any[] = [];
    for (const team of context.teams) {
      const isTeamWinner = team.id === winnerTeam.id;
      for (const player of team.players) {
        if (!player.name) continue;
        const matchedUserId = playerIdToUuidMap.get(player.id);
        if (matchedUserId) {
          participantsToInsert.push({
            game_id: game.id,
            user_id: matchedUserId,
            player_name: player.name,
            team_name: team.name,
            is_winner: isTeamWinner,
          });
        }
      }
    }

    // 4. Записываем участников
    if (participantsToInsert.length > 0) {
      const { error: partErr } = await supabase
        .from('game_participants')
        .insert(participantsToInsert);

      if (partErr) {
        console.error('Ошибка сохранения участников игры:', partErr);
      }
    }

    return game.id as string;
  } catch (err) {
    console.error('Системная ошибка в функции saveGameResult:', err);
    return null;
  }
}
