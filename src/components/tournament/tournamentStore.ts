export interface TournamentTeam {
  id: string;
  name: string;
  players: [string, string];
}

export interface TournamentMatch {
  id: string;
  roundName: 'quarter' | 'semi' | 'third_place' | 'final';
  roundNumber: number; // 1, 2, 3...
  matchIndex: number;
  teamA?: TournamentTeam;
  teamB?: TournamentTeam;
  scoreA?: number;
  scoreB?: number;
  winnerTeamId?: string;
  loserTeamId?: string;
  status: 'pending' | 'ready' | 'in_progress' | 'finished';
  nextMatchId?: string;
  nextMatchSlot?: 'teamA' | 'teamB';
  loserMatchId?: string;
  loserMatchSlot?: 'teamA' | 'teamB';
}

export interface TournamentState {
  id: string;
  teamsCount: 4 | 8;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  status: 'setup' | 'active' | 'completed';
  podium?: {
    first?: TournamentTeam;
    second?: TournamentTeam;
    third?: TournamentTeam;
  };
  activeMatchId?: string;
  createdAt: number;
}

const STORAGE_KEY = 'claude_hat_active_tournament';

export function createTournament(teams: TournamentTeam[]): TournamentState {
  const teamsCount = teams.length >= 8 ? 8 : 4;
  const slicedTeams = teams.slice(0, teamsCount);
  const matches: TournamentMatch[] = [];

  if (teamsCount === 4) {
    // 4 команды: 2 полуфинала, матч за 3 место, финал
    const semi1: TournamentMatch = {
      id: 'semi_1',
      roundName: 'semi',
      roundNumber: 1,
      matchIndex: 0,
      teamA: slicedTeams[0],
      teamB: slicedTeams[1],
      status: 'ready',
      nextMatchId: 'final',
      nextMatchSlot: 'teamA',
      loserMatchId: 'third_place',
      loserMatchSlot: 'teamA',
    };

    const semi2: TournamentMatch = {
      id: 'semi_2',
      roundName: 'semi',
      roundNumber: 1,
      matchIndex: 1,
      teamA: slicedTeams[2],
      teamB: slicedTeams[3],
      status: 'ready',
      nextMatchId: 'final',
      nextMatchSlot: 'teamB',
      loserMatchId: 'third_place',
      loserMatchSlot: 'teamB',
    };

    const thirdPlace: TournamentMatch = {
      id: 'third_place',
      roundName: 'third_place',
      roundNumber: 2,
      matchIndex: 0,
      status: 'pending',
    };

    const final: TournamentMatch = {
      id: 'final',
      roundName: 'final',
      roundNumber: 2,
      matchIndex: 1,
      status: 'pending',
    };

    matches.push(semi1, semi2, thirdPlace, final);
  } else {
    // 8 команд: 4 четвертьфинала, 2 полуфинала, 3 место, финал
    const q1: TournamentMatch = {
      id: 'q_1',
      roundName: 'quarter',
      roundNumber: 1,
      matchIndex: 0,
      teamA: slicedTeams[0],
      teamB: slicedTeams[1],
      status: 'ready',
      nextMatchId: 'semi_1',
      nextMatchSlot: 'teamA',
    };
    const q2: TournamentMatch = {
      id: 'q_2',
      roundName: 'quarter',
      roundNumber: 1,
      matchIndex: 1,
      teamA: slicedTeams[2],
      teamB: slicedTeams[3],
      status: 'ready',
      nextMatchId: 'semi_1',
      nextMatchSlot: 'teamB',
    };
    const q3: TournamentMatch = {
      id: 'q_3',
      roundName: 'quarter',
      roundNumber: 1,
      matchIndex: 2,
      teamA: slicedTeams[4],
      teamB: slicedTeams[5],
      status: 'ready',
      nextMatchId: 'semi_2',
      nextMatchSlot: 'teamA',
    };
    const q4: TournamentMatch = {
      id: 'q_4',
      roundName: 'quarter',
      roundNumber: 1,
      matchIndex: 3,
      teamA: slicedTeams[6],
      teamB: slicedTeams[7],
      status: 'ready',
      nextMatchId: 'semi_2',
      nextMatchSlot: 'teamB',
    };

    const semi1: TournamentMatch = {
      id: 'semi_1',
      roundName: 'semi',
      roundNumber: 2,
      matchIndex: 0,
      status: 'pending',
      nextMatchId: 'final',
      nextMatchSlot: 'teamA',
      loserMatchId: 'third_place',
      loserMatchSlot: 'teamA',
    };

    const semi2: TournamentMatch = {
      id: 'semi_2',
      roundName: 'semi',
      roundNumber: 2,
      matchIndex: 1,
      status: 'pending',
      nextMatchId: 'final',
      nextMatchSlot: 'teamB',
      loserMatchId: 'third_place',
      loserMatchSlot: 'teamB',
    };

    const thirdPlace: TournamentMatch = {
      id: 'third_place',
      roundName: 'third_place',
      roundNumber: 3,
      matchIndex: 0,
      status: 'pending',
    };

    const final: TournamentMatch = {
      id: 'final',
      roundName: 'final',
      roundNumber: 3,
      matchIndex: 1,
      status: 'pending',
    };

    matches.push(q1, q2, q3, q4, semi1, semi2, thirdPlace, final);
  }

  const tournament: TournamentState = {
    id: `tourn_${Date.now()}`,
    teamsCount,
    teams: slicedTeams,
    matches,
    status: 'active',
    createdAt: Date.now(),
  };

  saveTournament(tournament);
  return tournament;
}

export function recordMatchResult(
  tournament: TournamentState,
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentState {
  const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) return tournament;

  const match = tournament.matches[matchIndex];
  if (!match.teamA || !match.teamB) return tournament;

  // Победитель (при равенстве очков побеждает teamA)
  const winner = scoreA >= scoreB ? match.teamA : match.teamB;
  const loser = scoreA >= scoreB ? match.teamB : match.teamA;

  const updatedMatches = [...tournament.matches];
  updatedMatches[matchIndex] = {
    ...match,
    scoreA,
    scoreB,
    winnerTeamId: winner.id,
    loserTeamId: loser.id,
    status: 'finished',
  };

  // Продвижение победителя в следующий раунд
  if (match.nextMatchId && match.nextMatchSlot) {
    const nextIdx = updatedMatches.findIndex((m) => m.id === match.nextMatchId);
    if (nextIdx !== -1) {
      const nextM = updatedMatches[nextIdx];
      const updatedNext = {
        ...nextM,
        [match.nextMatchSlot]: winner,
      };
      if (updatedNext.teamA && updatedNext.teamB) {
        updatedNext.status = 'ready';
      }
      updatedMatches[nextIdx] = updatedNext;
    }
  }

  // Продвижение проигравшего (для матча за 3-е место)
  if (match.loserMatchId && match.loserMatchSlot) {
    const loserIdx = updatedMatches.findIndex((m) => m.id === match.loserMatchId);
    if (loserIdx !== -1) {
      const loserM = updatedMatches[loserIdx];
      const updatedLoser = {
        ...loserM,
        [match.loserMatchSlot]: loser,
      };
      if (updatedLoser.teamA && updatedLoser.teamB) {
        updatedLoser.status = 'ready';
      }
      updatedMatches[loserIdx] = updatedLoser;
    }
  }

  // Проверка завершения турнира
  const finalMatch = updatedMatches.find((m) => m.id === 'final');
  const thirdMatch = updatedMatches.find((m) => m.id === 'third_place');

  let podium = tournament.podium;
  let status = tournament.status;

  if (finalMatch?.status === 'finished') {
    const champion = finalMatch.scoreA! >= finalMatch.scoreB! ? finalMatch.teamA : finalMatch.teamB;
    const second = finalMatch.scoreA! >= finalMatch.scoreB! ? finalMatch.teamB : finalMatch.teamA;
    const third = thirdMatch?.status === 'finished'
      ? thirdMatch.scoreA! >= thirdMatch.scoreB!
        ? thirdMatch.teamA
        : thirdMatch.teamB
      : undefined;

    podium = {
      first: champion,
      second,
      third,
    };
    status = 'completed';
  }

  const updatedTournament: TournamentState = {
    ...tournament,
    matches: updatedMatches,
    podium,
    status,
    activeMatchId: undefined,
  };

  saveTournament(updatedTournament);
  return updatedTournament;
}

export function saveTournament(tournament: TournamentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
  } catch {
    // ignore
  }
}

export function loadTournament(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TournamentState;
  } catch {
    return null;
  }
}

export function clearTournament(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
