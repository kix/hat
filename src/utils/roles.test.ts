import { describe, it, expect } from 'vitest';
import { getCurrentRoles } from './roles';
import type { Team } from '../machine/hatMachine';

describe('roles', () => {
  const sampleTeam: Team = {
    id: 't1',
    name: 'Звезда',
    players: [
      { id: 'p1', name: 'Алиса' },
      { id: 'p2', name: 'Боб' },
    ],
    roundsPlayed: 0,
  };

  it('alternates describer and guesser each round when rolesMode is alternate', () => {
    // Round 0
    const r0 = getCurrentRoles({ ...sampleTeam, roundsPlayed: 0 }, 'alternate');
    expect(r0.describer.id).toBe('p1');
    expect(r0.guesser.id).toBe('p2');

    // Round 1
    const r1 = getCurrentRoles({ ...sampleTeam, roundsPlayed: 1 }, 'alternate');
    expect(r1.describer.id).toBe('p2');
    expect(r1.guesser.id).toBe('p1');

    // Round 2
    const r2 = getCurrentRoles({ ...sampleTeam, roundsPlayed: 2 }, 'alternate');
    expect(r2.describer.id).toBe('p1');
    expect(r2.guesser.id).toBe('p2');
  });

  it('keeps player 0 as describer when rolesMode is not alternate', () => {
    const r0 = getCurrentRoles({ ...sampleTeam, roundsPlayed: 0 }, 'fixed' as any);
    expect(r0.describer.id).toBe('p1');
    expect(r0.guesser.id).toBe('p2');

    const r1 = getCurrentRoles({ ...sampleTeam, roundsPlayed: 1 }, 'fixed' as any);
    expect(r1.describer.id).toBe('p1');
    expect(r1.guesser.id).toBe('p2');
  });
});
