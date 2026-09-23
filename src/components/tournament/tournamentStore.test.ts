import { describe, expect, it } from 'vitest';
import {
  createTournament,
  recordMatchResult,
  type TournamentTeam,
} from './tournamentStore';

describe('tournamentStore', () => {
  const teams4: TournamentTeam[] = [
    { id: 't1', name: 'Команда 1', players: ['Аня', 'Боря'] },
    { id: 't2', name: 'Команда 2', players: ['Вика', 'Гриша'] },
    { id: 't3', name: 'Команда 3', players: ['Дима', 'Ева'] },
    { id: 't4', name: 'Команда 4', players: ['Женя', 'Зоя'] },
  ];

  it('creates 4-team tournament bracket with 2 semifinals and 1 final', () => {
    const tournament = createTournament(teams4);
    expect(tournament.teamsCount).toBe(4);
    expect(tournament.matches.length).toBe(4);
    expect(tournament.matches.filter((m) => m.roundName === 'semi').length).toBe(2);
    expect(tournament.matches.find((m) => m.id === 'final')?.status).toBe('pending');
    expect(tournament.matches.find((m) => m.id === 'third_place')?.status).toBe('pending');
  });

  it('advances winners to final and losers to 3rd place match', () => {
    let tournament = createTournament(teams4);

    // Semi 1: Team 1 beats Team 2 (10 - 5)
    tournament = recordMatchResult(tournament, 'semi_1', 10, 5);
    const finalMatch = tournament.matches.find((m) => m.id === 'final');
    const thirdMatch = tournament.matches.find((m) => m.id === 'third_place');

    expect(finalMatch?.teamA?.name).toBe('Команда 1');
    expect(thirdMatch?.teamA?.name).toBe('Команда 2');

    // Semi 2: Team 4 beats Team 3 (8 - 12 -> Team 4)
    tournament = recordMatchResult(tournament, 'semi_2', 8, 12);
    const finalReady = tournament.matches.find((m) => m.id === 'final');
    expect(finalReady?.teamB?.name).toBe('Команда 4');
    expect(finalReady?.status).toBe('ready');

    // 3rd place match: Team 2 beats Team 3 (15 - 10)
    tournament = recordMatchResult(tournament, 'third_place', 15, 10);

    // Grand Final: Team 1 beats Team 4 (20 - 18)
    tournament = recordMatchResult(tournament, 'final', 20, 18);

    expect(tournament.status).toBe('completed');
    expect(tournament.podium?.first?.name).toBe('Команда 1');
    expect(tournament.podium?.second?.name).toBe('Команда 4');
    expect(tournament.podium?.third?.name).toBe('Команда 2');
  });
});
