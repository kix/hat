import type { HatContext } from '../machine/hatMachine';

export interface SetupValidity {
  canStart: boolean;
  reasons: string[];
}

// Mirrors the START_GAME guard in hatMachine.ts so the UI can explain *why*
// the button is disabled — the guard itself is an inline lambda and isn't
// exported separately.
export function getSetupValidity(context: HatContext): SetupValidity {
  const reasons: string[] = [];

  if (context.teams.length < 2) {
    reasons.push('Нужно как минимум 2 команды');
  }
  if (context.settings.difficulties.length === 0) {
    reasons.push('Выберите хотя бы одну сложность слов');
  }

  return { canStart: reasons.length === 0, reasons };
}
