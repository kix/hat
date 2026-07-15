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
) {
  try {
    if (context.history.length === 0) return;

    const sortedTeams = sortTeamsByScore(context.teams, context.history);
    const winnerTeam = sortedTeams[0];
    if (!winnerTeam) return;

    // 1. Сохраняем игру в таблицу games
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        winner_team_name: winnerTeam.name,
        history_data: context.history,
        settings: context.settings,
      })
      .select()
      .single();

    if (gameErr || !game) {
      console.error('Ошибка сохранения игры:', gameErr);
      return;
    }

    // 2. Строим карту соответствия имен и UUID пользователей
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

    // 3. Формируем список участников для сохранения
    const participantsToInsert: any[] = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const team of context.teams) {
      const isTeamWinner = team.id === winnerTeam.id;
      for (const player of team.players) {
        if (!player.name) continue;

        const nameKey = player.name.trim().toLowerCase();
        let matchedUserId: string | null = null;

        // Если player.id — это уже UUID пользователя (мультиплеер)
        if (uuidRegex.test(player.id)) {
          matchedUserId = player.id;
        } else {
          // Иначе пытаемся сопоставить по имени (локальный режим)
          matchedUserId = realUsersMap.get(nameKey) || null;
        }

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

    // Если в локальной игре ни один игрок не совпал по имени, связываем текущего пользователя с первым игроком
    if (participantsToInsert.length === 0 && currentUserId && context.teams.length > 0) {
      const firstTeam = context.teams[0];
      const firstPlayer = firstTeam.players[0];
      if (firstPlayer && firstPlayer.name) {
        participantsToInsert.push({
          game_id: game.id,
          user_id: currentUserId,
          player_name: firstPlayer.name,
          team_name: firstTeam.name,
          is_winner: firstTeam.id === winnerTeam.id,
        });
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
  } catch (err) {
    console.error('Системная ошибка в функции saveGameResult:', err);
  }
}
