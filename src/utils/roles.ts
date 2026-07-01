import type { Player, RolesMode, Team } from '../machine/hatMachine';

export function getCurrentRoles(team: Team, rolesMode: RolesMode): { describer: Player; guesser: Player } {
  const describerIndex = rolesMode === 'alternate' ? team.roundsPlayed % 2 : 0;
  const guesserIndex = describerIndex === 0 ? 1 : 0;
  return { describer: team.players[describerIndex], guesser: team.players[guesserIndex] };
}
