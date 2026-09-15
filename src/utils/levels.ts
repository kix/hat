/**
 * Leveling and Experience Points (XP) progression system for Hat game players.
 */

export interface LevelThreshold {
  level: number;
  minXP: number;
  titleKey: string;
  badgeColor: string;
  emoji: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minXP: 0, titleKey: 'levels.rank1', badgeColor: 'gray', emoji: '🧢' },
  { level: 2, minXP: 150, titleKey: 'levels.rank2', badgeColor: 'blue', emoji: '🎩' },
  { level: 3, minXP: 400, titleKey: 'levels.rank3', badgeColor: 'cyan', emoji: '🎓' },
  { level: 4, minXP: 800, titleKey: 'levels.rank4', badgeColor: 'teal', emoji: '🧠' },
  { level: 5, minXP: 1400, titleKey: 'levels.rank5', badgeColor: 'yellow', emoji: '⚡' },
  { level: 6, minXP: 2200, titleKey: 'levels.rank6', badgeColor: 'grape', emoji: '🔮' },
  { level: 7, minXP: 3200, titleKey: 'levels.rank7', badgeColor: 'orange', emoji: '🏆' },
  { level: 8, minXP: 4500, titleKey: 'levels.rank8', badgeColor: 'red', emoji: '👑' },
  { level: 9, minXP: 6000, titleKey: 'levels.rank9', badgeColor: 'pink', emoji: '🌟' },
  { level: 10, minXP: 8000, titleKey: 'levels.rank10', badgeColor: 'violet', emoji: '⚜️' },
];

export interface PlayerLevelInfo {
  level: number;
  totalXP: number;
  titleKey: string;
  badgeColor: string;
  emoji: string;
  currentLevelMinXP: number;
  nextLevelXP: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

/**
 * Calculates level details from total XP.
 */
export function getLevelFromXP(totalXP: number): PlayerLevelInfo {
  const xp = Math.max(0, Math.floor(totalXP));

  let currentThreshold = LEVEL_THRESHOLDS[0];
  let nextMinXP = LEVEL_THRESHOLDS[1].minXP;

  if (xp >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].minXP) {
    const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const extraXP = xp - maxThreshold.minXP;
    const additionalLevels = Math.floor(extraXP / 2500);
    const lvl = maxThreshold.level + additionalLevels;
    const lvlMinXP = maxThreshold.minXP + additionalLevels * 2500;
    const lvlNextXP = lvlMinXP + 2500;

    return {
      level: lvl,
      totalXP: xp,
      titleKey: maxThreshold.titleKey,
      badgeColor: maxThreshold.badgeColor,
      emoji: maxThreshold.emoji,
      currentLevelMinXP: lvlMinXP,
      nextLevelXP: lvlNextXP,
      xpIntoLevel: xp - lvlMinXP,
      xpForNextLevel: 2500,
      progressPercent: Math.min(100, Math.round(((xp - lvlMinXP) / 2500) * 100)),
    };
  }

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXP) {
      currentThreshold = LEVEL_THRESHOLDS[i];
      nextMinXP = LEVEL_THRESHOLDS[i + 1]?.minXP ?? (currentThreshold.minXP + 2000);
      break;
    }
  }

  const xpIntoLevel = xp - currentThreshold.minXP;
  const xpForNextLevel = nextMinXP - currentThreshold.minXP;
  const progressPercent = xpForNextLevel > 0
    ? Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpForNextLevel) * 100)))
    : 100;

  return {
    level: currentThreshold.level,
    totalXP: xp,
    titleKey: currentThreshold.titleKey,
    badgeColor: currentThreshold.badgeColor,
    emoji: currentThreshold.emoji,
    currentLevelMinXP: currentThreshold.minXP,
    nextLevelXP: nextMinXP,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent,
  };
}

export interface GameXPBreakdown {
  totalXP: number;
  participationXP: number;
  victoryXP: number;
  wordsXP: number;
  fastWordsBonusXP: number;
  cleanGameBonusXP: number;
  wordsCount: number;
  fastWordsCount: number;
}

/**
 * Calculates XP earned by a player in a specific game.
 */
export function calculateGameXP(
  history: any[],
  userId?: string,
  isWinner = false,
  teamId?: string
): GameXPBreakdown {
  const participationXP = 50;
  const victoryXP = isWinner ? 100 : 0;

  let wordsCount = 0;
  let fastWordsCount = 0;

  if (userId) {
    history.forEach((rec) => {
      if (rec.result === 'guessed' && (rec.guesserId === userId || rec.describerId === userId)) {
        wordsCount++;
        if (rec.timeMs && rec.timeMs < 3000) {
          fastWordsCount++;
        }
      }
    });
  } else {
    // If no userId, count all guessed words
    history.forEach((rec) => {
      if (rec.result === 'guessed') {
        wordsCount++;
        if (rec.timeMs && rec.timeMs < 3000) {
          fastWordsCount++;
        }
      }
    });
  }

  const wordsXP = wordsCount * 10;
  const fastWordsBonusXP = fastWordsCount * 5;

  let cleanGameBonusXP = 0;
  if (isWinner && teamId) {
    const fouls = history.filter((r) => r.teamId === teamId && r.result === 'foul').length;
    if (fouls === 0) {
      cleanGameBonusXP = 30;
    }
  }

  const totalXP = participationXP + victoryXP + wordsXP + fastWordsBonusXP + cleanGameBonusXP;

  return {
    totalXP,
    participationXP,
    victoryXP,
    wordsXP,
    fastWordsBonusXP,
    cleanGameBonusXP,
    wordsCount,
    fastWordsCount,
  };
}

/**
 * Calculates total XP from all historical games and achievements.
 */
export function calculateTotalPlayerXP(
  participations: any[],
  userId: string,
  achievements: { id: string; unlocked: boolean }[] = []
): { totalXP: number; gamesXP: number; achievementsXP: number } {
  let gamesXP = 0;

  participations.forEach((part) => {
    const history = part.games?.history_data || [];
    const isWinner = Boolean(part.is_winner);
    const breakdown = calculateGameXP(history, userId, isWinner, part.team_name);
    gamesXP += breakdown.totalXP;
  });

  const achievementXPRewards: Record<string, number> = {
    lightning: 100,
    erudite: 150,
    ironNerves: 150,
    champion: 250,
    telepath: 200,
    veteran: 250,
    perfectDuo: 150,
    cleanGame: 150,
  };

  let achievementsXP = 0;
  achievements.forEach((ach) => {
    if (ach.unlocked && achievementXPRewards[ach.id]) {
      achievementsXP += achievementXPRewards[ach.id];
    }
  });

  return {
    totalXP: gamesXP + achievementsXP,
    gamesXP,
    achievementsXP,
  };
}
