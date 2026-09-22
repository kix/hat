import type { History, Settings, Team } from '../machine/hatMachine';

export type AchievementCategory = 'speed' | 'skill' | 'social' | 'modes';

export type AchievementId =
  | 'lightning'
  | 'erudite'
  | 'ironNerves'
  | 'streakMaster'
  | 'telepath'
  | 'cleanGame'
  | 'champion'
  | 'veteran'
  | 'perfectDuo'
  | 'partyAnimal'
  | 'customHat'
  | 'worldTraveler';

export interface AchievementDefinition {
  id: AchievementId;
  titleKey: string;
  descKey: string;
  emoji: string;
  color: string;
  category: AchievementCategory;
  xpReward: number;
  targetCount?: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'lightning',
    titleKey: 'profile.achLightning',
    descKey: 'profile.achLightningDesc',
    emoji: '⚡',
    color: 'yellow',
    category: 'speed',
    xpReward: 100,
  },
  {
    id: 'ironNerves',
    titleKey: 'profile.achIronNerves',
    descKey: 'profile.achIronNervesDesc',
    emoji: '⏳',
    color: 'red',
    category: 'speed',
    xpReward: 150,
  },
  {
    id: 'streakMaster',
    titleKey: 'profile.achStreakMaster',
    descKey: 'profile.achStreakMasterDesc',
    emoji: '🔥',
    color: 'orange',
    category: 'skill',
    xpReward: 150,
  },
  {
    id: 'telepath',
    titleKey: 'profile.achTelepath',
    descKey: 'profile.achTelepathDesc',
    emoji: '🎯',
    color: 'grape',
    category: 'skill',
    xpReward: 200,
  },
  {
    id: 'erudite',
    titleKey: 'profile.achErudite',
    descKey: 'profile.achEruditeDesc',
    emoji: '🧠',
    color: 'blue',
    category: 'skill',
    xpReward: 150,
  },
  {
    id: 'cleanGame',
    titleKey: 'profile.achCleanGame',
    descKey: 'profile.achCleanGameDesc',
    emoji: '🛡️',
    color: 'green',
    category: 'skill',
    xpReward: 150,
  },
  {
    id: 'champion',
    titleKey: 'profile.achChampion',
    descKey: 'profile.achChampionDesc',
    emoji: '🏆',
    color: 'teal',
    category: 'social',
    xpReward: 250,
    targetCount: 5,
  },
  {
    id: 'veteran',
    titleKey: 'profile.achVeteran',
    descKey: 'profile.achVeteranDesc',
    emoji: '🎖️',
    color: 'orange',
    category: 'social',
    xpReward: 250,
    targetCount: 10,
  },
  {
    id: 'perfectDuo',
    titleKey: 'profile.achPerfectDuo',
    descKey: 'profile.achPerfectDuoDesc',
    emoji: '🤝',
    color: 'indigo',
    category: 'social',
    xpReward: 150,
    targetCount: 5,
  },
  {
    id: 'partyAnimal',
    titleKey: 'profile.achPartyAnimal',
    descKey: 'profile.achPartyAnimalDesc',
    emoji: '🔞',
    color: 'pink',
    category: 'modes',
    xpReward: 100,
  },
  {
    id: 'customHat',
    titleKey: 'profile.achCustomHat',
    descKey: 'profile.achCustomHatDesc',
    emoji: '🎨',
    color: 'violet',
    category: 'modes',
    xpReward: 100,
  },
  {
    id: 'worldTraveler',
    titleKey: 'profile.achWorldTraveler',
    descKey: 'profile.achWorldTravelerDesc',
    emoji: '🌍',
    color: 'cyan',
    category: 'modes',
    xpReward: 100,
  },
];

const STORAGE_KEY_UNLOCKED = 'hat_unlocked_achievements_v1';

export function getLocalUnlockedAchievements(): Record<string, { unlockedAt: string }> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalUnlockedAchievement(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = getLocalUnlockedAchievements();
    if (!current[id]) {
      current[id] = { unlockedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(current));
    }
  } catch (e) {
    console.error('Failed to save achievement locally', e);
  }
}

export interface AchievementCheckContext {
  history: History;
  settings: Settings;
  teams: Team[];
  isWinner?: boolean;
  winningTeamId?: string;
  totalGamesCount?: number;
  totalWinsCount?: number;
  maxPartnerGamesCount?: number;
}

/**
 * Checks all achievement triggers based on game history, settings, and lifetime stats.
 * Returns array of unlocked achievement IDs.
 */
export function checkAchievements(ctx: AchievementCheckContext): AchievementId[] {
  const {
    history,
    settings,
    teams,
    isWinner = false,
    winningTeamId,
    totalGamesCount = 1,
    totalWinsCount = 0,
    maxPartnerGamesCount = 1,
  } = ctx;

  const unlocked: AchievementId[] = [];

  // 1. Lightning: any guessed word under 3s (3000ms)
  const hasLightning = history.some(
    (r) => r.result === 'guessed' && typeof r.timeMs === 'number' && r.timeMs > 0 && r.timeMs < 3000
  );
  if (hasLightning) unlocked.push('lightning');

  // 2. Erudite: guessed word length >= 12 or difficulty hard
  const hasErudite = history.some(
    (r) => r.result === 'guessed' && (r.word.length >= 12 || r.difficulty === 'hard')
  );
  if (hasErudite) unlocked.push('erudite');

  // 3. Iron Nerves: guessed word with timeMs >= (roundDurationSec - 2) * 1000 or near expiration
  const durationMs = (settings.roundDurationSec || 60) * 1000;
  const hasIronNerves = history.some(
    (r) => r.result === 'guessed' && typeof r.timeMs === 'number' && r.timeMs >= Math.max(0, durationMs - 2500)
  );
  if (hasIronNerves) unlocked.push('ironNerves');

  // 4. Streak Master: 4+ consecutive guessed words in a round turn
  const roundStreaks = new Map<string, { current: number; max: number }>();
  history.forEach((rec) => {
    const key = `${rec.teamId}_${rec.roundIndex}`;
    const entry = roundStreaks.get(key) || { current: 0, max: 0 };
    if (rec.result === 'guessed') {
      entry.current++;
      if (entry.current > entry.max) entry.max = entry.current;
    } else {
      entry.current = 0;
    }
    roundStreaks.set(key, entry);
  });
  let maxStreak = 0;
  roundStreaks.forEach((val) => {
    if (val.max > maxStreak) maxStreak = val.max;
  });
  if (maxStreak >= 4) unlocked.push('streakMaster');

  // 5. Telepath: 5+ words guessed in a single round by any team/player
  const roundCounts = new Map<string, number>();
  history.forEach((rec) => {
    if (rec.result === 'guessed') {
      const key = `${rec.teamId}_${rec.roundIndex}`;
      roundCounts.set(key, (roundCounts.get(key) || 0) + 1);
    }
  });
  let maxRoundGuesses = 0;
  roundCounts.forEach((count) => {
    if (count > maxRoundGuesses) maxRoundGuesses = count;
  });
  if (maxRoundGuesses >= 5) unlocked.push('telepath');

  // 6. Clean Game: winning team has 0 fouls
  if (winningTeamId) {
    const teamFouls = history.filter((r) => r.teamId === winningTeamId && r.result === 'foul').length;
    if (teamFouls === 0 && history.some((r) => r.teamId === winningTeamId && r.result === 'guessed')) {
      unlocked.push('cleanGame');
    }
  } else if (isWinner && teams.length > 0) {
    const fouls = history.filter((r) => r.result === 'foul').length;
    if (fouls === 0) unlocked.push('cleanGame');
  }

  // 7. Champion: 5+ wins
  if (totalWinsCount >= 5 || (isWinner && totalWinsCount + 1 >= 5)) {
    unlocked.push('champion');
  }

  // 8. Veteran: 10+ games
  if (totalGamesCount >= 10) {
    unlocked.push('veteran');
  }

  // 9. Perfect Duo: 5+ games with same partner
  if (maxPartnerGamesCount >= 5) {
    unlocked.push('perfectDuo');
  }

  // 10. Party Animal: played with 'party18'
  if (settings.wordPack === 'party18') {
    unlocked.push('partyAnimal');
  }

  // 11. Custom Hat: played with 'custom'
  if (settings.wordPack === 'custom' || (settings.customWords && settings.customWords.length > 0)) {
    unlocked.push('customHat');
  }

  // 12. World Traveler: played with thematic pack
  const thematicPacks: string[] = ['movies', 'food', 'geography', 'gaming', 'animals', 'celebrities', 'tech'];
  if (thematicPacks.includes(settings.wordPack as string)) {
    unlocked.push('worldTraveler');
  }

  return unlocked;
}

/**
 * Checks which achievements from the current game were NOT yet unlocked locally,
 * marks them as unlocked in storage, and returns them for celebration display.
 */
export function getAndSaveNewlyUnlockedAchievements(
  ctx: AchievementCheckContext
): AchievementDefinition[] {
  const triggeredIds = checkAchievements(ctx);
  const stored = getLocalUnlockedAchievements();
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const id of triggeredIds) {
    if (!stored[id]) {
      saveLocalUnlockedAchievement(id);
      const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
      if (def) {
        newlyUnlocked.push(def);
      }
    }
  }

  return newlyUnlocked;
}
