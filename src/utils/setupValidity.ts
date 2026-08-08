import type { HatContext, Team } from '../machine/hatMachine';
import { tr } from '../i18n/lang';

export interface SetupValidity {
  canStart: boolean;
  reasons: string[];
}

// Blank names are fine (they get backfilled with "Игрок N" on start), so
// only two non-blank, case-insensitively equal names within the same team
// count as a duplicate.
export function getDuplicateNameReason(team: Team): string | null {
  const [a, b] = team.players;
  const nameA = a.name.trim();
  const nameB = b.name.trim();
  if (nameA.length === 0 || nameB.length === 0 || nameA.toLowerCase() !== nameB.toLowerCase()) {
    return null;
  }
  return tr('validity.confuse', { a: nameA, b: nameB });
}

// Mirrors the START_GAME guard in hatMachine.ts so the UI can explain *why*
// the button is disabled — the guard itself is an inline lambda and isn't
// exported separately.
export function getSetupValidity(context: HatContext): SetupValidity {
  const reasons: string[] = [];

  if (context.settings.gameMode === 'pairs') {
    if (context.teams.length < 1) {
      reasons.push(tr('validity.needOneTeam'));
    }
  } else {
    if (context.teams.length < 2) {
      reasons.push(tr('validity.needTwoTeams'));
    }
  }
  for (const team of context.teams) {
    const duplicateReason = getDuplicateNameReason(team);
    if (duplicateReason) {
      reasons.push(duplicateReason);
    }
  }

  return { canStart: reasons.length === 0, reasons };
}
