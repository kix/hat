import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { hatMachine, MAX_TEAMS, type Team, type WordRecord } from './hatMachine';
import { dictionary } from '../data/dictionary';
import { generateTeamName } from '../utils/teamName';
import { getCurrentRoles } from '../utils/roles';
import { getTeamScore, scoreDeltaForResult } from '../utils/scoring';
import {
  getBestPlayer,
  getCurrentRoundGuessedCount,
  getEasiestWord,
  getHardestWord,
  getHintedWords,
  getLastRoundRecap,
  sortTeamsByScore,
} from '../utils/stats';

function remainingWordCount(context: { hat: unknown[]; currentWord: unknown }): number {
  return context.hat.length + (context.currentWord ? 1 : 0);
}

// Starts an actor with the dictionary already "loaded" (as it would be
// shortly after real app startup) — START_GAME requires it since the
// dictionary is now fetched asynchronously rather than bundled statically.
function startActor(machine: typeof hatMachine = hatMachine): ReturnType<typeof createActor<typeof hatMachine>> {
  const actor = createActor(machine).start();
  actor.send({ type: 'DICTIONARY_LOADED', entries: dictionary });
  return actor;
}

function addTeam(actor: ReturnType<typeof createActor<typeof hatMachine>>, player1: string, player2: string): Team {
  actor.send({ type: 'ADD_TEAM' });
  const { teams } = actor.getSnapshot().context;
  const team = teams[teams.length - 1];
  actor.send({ type: 'UPDATE_PLAYER_NAME', teamId: team.id, playerId: team.players[0].id, name: player1 });
  actor.send({ type: 'UPDATE_PLAYER_NAME', teamId: team.id, playerId: team.players[1].id, name: player2 });
  return actor.getSnapshot().context.teams.find((t) => t.id === team.id)!;
}

describe('setup', () => {
  it('has no dictionary until DICTIONARY_LOADED arrives', () => {
    const actor = createActor(hatMachine).start();
    expect(actor.getSnapshot().context.dictionary).toBeNull();
  });

  it('refuses to start before the dictionary has loaded, even with valid teams', () => {
    const actor = createActor(hatMachine).start(); // no startActor() — dictionary stays null
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'START_GAME' });
    expect(actor.getSnapshot().value).toBe('setup');

    actor.send({ type: 'DICTIONARY_LOADED', entries: dictionary });
    actor.send({ type: 'START_GAME' });
    expect(actor.getSnapshot().value).toBe('roundIntro');
  });

  it('refuses to start with fewer than 2 teams', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    actor.send({ type: 'START_GAME' });
    expect(actor.getSnapshot().value).toBe('setup');
  });

  it('refuses to start when two players in the same team have the same name', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'аня');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'START_GAME' });
    expect(actor.getSnapshot().value).toBe('setup');
  });

  it('allows starting with blank player names, defaulting them to "Игрок N"', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    actor.send({ type: 'ADD_TEAM' }); // second team, player names left blank
    actor.send({ type: 'START_GAME' });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('roundIntro');
    const [, blankTeam] = snapshot.context.teams;
    expect(blankTeam.players[0].name).toBe('Игрок 1');
    expect(blankTeam.players[1].name).toBe('Игрок 2');
  });

  it('leaves a filled-in player name untouched', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    actor.send({ type: 'ADD_TEAM' });
    const teamB = actor.getSnapshot().context.teams[1];
    actor.send({ type: 'UPDATE_PLAYER_NAME', teamId: teamB.id, playerId: teamB.players[0].id, name: 'Вика' });
    actor.send({ type: 'START_GAME' });
    const [, startedTeamB] = actor.getSnapshot().context.teams;
    expect(startedTeamB.players[0].name).toBe('Вика');
    expect(startedTeamB.players[1].name).toBe('Игрок 2');
  });

  it('starts the game and fills the hat once teams are valid', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'START_GAME' });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('roundIntro');
    expect(snapshot.context.hat).toHaveLength(20);
  });

  it('clamps wordCount to the size of the whole dictionary at max difficulty', () => {
    // Only at max difficulty are 0-frequency words eligible, making the full
    // dictionary the pool — anywhere below that, the eligible pool (and thus
    // the clamp) is smaller. See "excludes 0-frequency words..." below.
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel: 1 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: dictionary.length + 1 });
    actor.send({ type: 'START_GAME' });
    const snapshot = actor.getSnapshot();
    expect(snapshot.context.hat).toHaveLength(dictionary.length);
    expect(snapshot.context.settings.wordCount).toBe(dictionary.length);
  });

  it('excludes 0-frequency words unless difficulty is at max', () => {
    const zeroFrequencyCount = dictionary.filter((entry) => entry.frequency === 0).length;
    expect(zeroFrequencyCount).toBeGreaterThan(0);

    const belowMax = startActor();
    addTeam(belowMax, 'Аня', 'Боря');
    addTeam(belowMax, 'Вика', 'Гриша');
    belowMax.send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel: 0.9 });
    belowMax.send({ type: 'SET_WORD_COUNT', wordCount: 2000 });
    belowMax.send({ type: 'START_GAME' });
    expect(belowMax.getSnapshot().context.hat.some((entry) => entry.frequency === 0)).toBe(false);

    const atMax = startActor();
    addTeam(atMax, 'Аня', 'Боря');
    addTeam(atMax, 'Вика', 'Гриша');
    atMax.send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel: 1 });
    atMax.send({ type: 'SET_WORD_COUNT', wordCount: 2000 });
    atMax.send({ type: 'START_GAME' });
    expect(atMax.getSnapshot().context.hat.some((entry) => entry.frequency === 0)).toBe(true);
  });

  it('biases word selection toward the requested difficulty level', () => {
    function drawHat(difficultyLevel: number) {
      const actor = startActor();
      addTeam(actor, 'Аня', 'Боря');
      addTeam(actor, 'Вика', 'Гриша');
      actor.send({ type: 'SET_DIFFICULTY_LEVEL', difficultyLevel });
      actor.send({ type: 'SET_WORD_COUNT', wordCount: 500 });
      actor.send({ type: 'START_GAME' });
      return actor.getSnapshot().context.hat;
    }
    const average = (hat: ReturnType<typeof drawHat>, pick: (entry: (typeof hat)[number]) => number) =>
      hat.reduce((sum, entry) => sum + pick(entry), 0) / hat.length;

    const easyHat = drawHat(0);
    const hardHat = drawHat(1);

    // Harder words skew longer and rarer (lower Zipf frequency) than easier ones.
    expect(average(hardHat, (entry) => entry.word.length)).toBeGreaterThan(average(easyHat, (entry) => entry.word.length));
    expect(average(easyHat, (entry) => entry.frequency)).toBeGreaterThan(average(hardHat, (entry) => entry.frequency));
  });

  it(`refuses to add more than ${MAX_TEAMS} teams`, () => {
    const actor = startActor();
    for (let i = 0; i < MAX_TEAMS; i++) {
      actor.send({ type: 'ADD_TEAM' });
    }
    expect(actor.getSnapshot().context.teams).toHaveLength(MAX_TEAMS);

    actor.send({ type: 'ADD_TEAM' });
    expect(actor.getSnapshot().context.teams).toHaveLength(MAX_TEAMS);
  });

  it('fires rememberPlayerNames on START_GAME with the names as typed, not the "Игрок N" fallback', () => {
    const rememberPlayerNames = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { rememberPlayerNames } }));
    addTeam(actor, 'Аня', 'Боря');
    actor.send({ type: 'ADD_TEAM' }); // second team, player names left blank
    actor.send({ type: 'START_GAME' });

    expect(rememberPlayerNames).toHaveBeenCalledTimes(1);
    const seenContext = rememberPlayerNames.mock.calls[0][0].context;
    const [teamA, teamB] = seenContext.teams;
    expect(teamA.players.map((p: { name: string }) => p.name)).toEqual(['Аня', 'Боря']);
    expect(teamB.players.map((p: { name: string }) => p.name)).toEqual(['', '']); // not yet backfilled
  });

  it('draws new team names from the dictionary once it has loaded', () => {
    const actor = createActor(hatMachine).start();
    actor.send({
      type: 'DICTIONARY_LOADED',
      entries: [{ word: 'Особоеслово', difficulty: 'easy', frequency: 0, levenshtein_zipf_frequency: 0 }],
    });
    actor.send({ type: 'ADD_TEAM' });
    const [team] = actor.getSnapshot().context.teams;
    expect(team.name.endsWith('Особоеслово')).toBe(true);

    actor.send({ type: 'REGENERATE_TEAM_NAME', teamId: team.id });
    const [regenerated] = actor.getSnapshot().context.teams;
    expect(regenerated.name.endsWith('Особоеслово')).toBe(true);
  });
});

describe('sound and vibration settings', () => {
  it('defaults sound on and vibration off', () => {
    const actor = startActor();
    const { settings } = actor.getSnapshot().context;
    expect(settings.soundEnabled).toBe(true);
    expect(settings.vibrationEnabled).toBe(false);
  });

  it('toggles independently via SET_SOUND_ENABLED / SET_VIBRATION_ENABLED', () => {
    const actor = startActor();
    actor.send({ type: 'SET_SOUND_ENABLED', soundEnabled: false });
    actor.send({ type: 'SET_VIBRATION_ENABLED', vibrationEnabled: true });
    const { settings } = actor.getSnapshot().context;
    expect(settings.soundEnabled).toBe(false);
    expect(settings.vibrationEnabled).toBe(true);
  });
});

describe('generateTeamName', () => {
  it('produces a non-empty "adjective noun" string without a dictionary', () => {
    const name = generateTeamName();
    expect(name).toMatch(/^\S+ \S+$/);
  });

  it('produces a non-empty "adjective noun" string with an empty dictionary', () => {
    const name = generateTeamName([]);
    expect(name).toMatch(/^\S+ \S+$/);
  });

  it('draws the noun from the dictionary once one is loaded', () => {
    const dictionaryEntries = [
      { word: 'Уникальноеслово', difficulty: 'easy' as const, frequency: 0, levenshtein_zipf_frequency: 0 },
    ];
    const name = generateTeamName(dictionaryEntries);
    expect(name.endsWith('Уникальноеслово')).toBe(true);
  });
});

describe('roles rotation', () => {
  function playOutRound(actor: ReturnType<typeof createActor<typeof hatMachine>>) {
    actor.send({ type: 'START_ROUND' });
    vi.advanceTimersByTime(120_000);
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('alternates describer/guesser between a team\'s successive rounds', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROLES_MODE', rolesMode: 'alternate' });
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 10 });
    actor.send({ type: 'START_GAME' });

    const round1Roles = getCurrentRoles(teamA, 'alternate'); // roundsPlayed: 0 at game start

    playOutRound(actor); // team A round 1, times out
    playOutRound(actor); // team B round 1, times out
    const secondTurnTeamA = actor.getSnapshot().context.teams.find((t) => t.id === teamA.id)!;
    const round2Roles = getCurrentRoles(secondTurnTeamA, 'alternate');

    expect(round1Roles.describer.id).toBe(teamA.players[0].id);
    expect(round2Roles.describer.id).toBe(teamA.players[1].id);
    expect(round2Roles.describer.id).toBe(round1Roles.guesser.id);
    expect(round2Roles.guesser.id).toBe(round1Roles.describer.id);
  });

  it('keeps fixed roles across a team\'s successive rounds', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROLES_MODE', rolesMode: 'fixed' });
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 10 });
    actor.send({ type: 'START_GAME' });

    playOutRound(actor);
    playOutRound(actor);
    const secondTurnTeamA = actor.getSnapshot().context.teams.find((t) => t.id === teamA.id)!;
    const roles = getCurrentRoles(secondTurnTeamA, 'fixed');
    expect(roles.describer.id).toBe(teamA.players[0].id);
    expect(roles.guesser.id).toBe(teamA.players[1].id);
  });
});

describe('round play', () => {
  it('runs a full game to completion via WORD_GUESSED and picks the correct winner', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    const teamB = addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 4 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_GUESSED' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('gameOver');
    expect(snapshot.context.hat).toHaveLength(0);
    expect(getTeamScore(snapshot.context.history, teamA.id)).toBe(4);
    expect(getTeamScore(snapshot.context.history, teamB.id)).toBe(0);
    const [winner] = sortTeamsByScore(snapshot.context.teams, snapshot.context.history);
    expect(winner.id).toBe(teamA.id);
  });

  it('ignores WORD_SKIPPED when skipping is disallowed', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ALLOW_SKIP', allowSkip: false });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const before = actor.getSnapshot().context;
    actor.send({ type: 'WORD_SKIPPED' });
    const after = actor.getSnapshot().context;
    expect(after.hat).toHaveLength(before.hat.length);
    expect(after.history).toHaveLength(0);
    expect(after.currentWord).toEqual(before.currentWord);
  });

  it('penalizes the team by 1 point on WORD_SKIPPED when allowed', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ALLOW_SKIP', allowSkip: true });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    actor.send({ type: 'WORD_SKIPPED' });
    const { context } = actor.getSnapshot();
    expect(context.history).toHaveLength(1);
    expect(context.history[0].result).toBe('skipped');
    expect(getTeamScore(context.history, teamA.id)).toBe(-1);
  });

  it('penalizes the team by 1 point on WORD_FOUL', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    actor.send({ type: 'WORD_FOUL' });
    const { context } = actor.getSnapshot();
    expect(context.history).toHaveLength(1);
    expect(context.history[0].result).toBe('foul');
    expect(getTeamScore(context.history, teamA.id)).toBe(-1);
  });
});

describe('low-hat guessed sound', () => {
  it('plays the normal guessed sound while the hat still has 5+ words left', () => {
    const playGuessedSound = vi.fn();
    const playLowHatGuessedSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playGuessedSound, playLowHatGuessedSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 6 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' }); // hat: 5 remaining

    actor.send({ type: 'WORD_GUESSED' }); // guarded on pre-action hat.length === 5
    expect(playGuessedSound).toHaveBeenCalledTimes(1);
    expect(playLowHatGuessedSound).not.toHaveBeenCalled();
  });

  it('plays the low-hat sound once fewer than 5 words remain', () => {
    const playGuessedSound = vi.fn();
    const playLowHatGuessedSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playGuessedSound, playLowHatGuessedSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 6 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' }); // hat: 5 remaining

    actor.send({ type: 'WORD_GUESSED' }); // hat.length was 5 -> normal sound, hat now 4
    actor.send({ type: 'WORD_GUESSED' }); // hat.length was 4 -> low-hat sound

    expect(playGuessedSound).toHaveBeenCalledTimes(1);
    expect(playLowHatGuessedSound).toHaveBeenCalledTimes(1);
  });

  it('plays the low-hat sound on the final guess that empties the hat', () => {
    const playGuessedSound = vi.fn();
    const playLowHatGuessedSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playGuessedSound, playLowHatGuessedSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 1 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' }); // hat: 0 remaining, currentWord holds the only word

    actor.send({ type: 'WORD_GUESSED' });
    expect(actor.getSnapshot().value).toBe('gameOver');
    expect(playLowHatGuessedSound).toHaveBeenCalledTimes(1);
    expect(playGuessedSound).not.toHaveBeenCalled();
  });
});

describe('game over sound', () => {
  it('plays once the game ends, and not before', () => {
    const playGameOverSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playGameOverSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 1 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });
    expect(playGameOverSound).not.toHaveBeenCalled();

    actor.send({ type: 'WORD_GUESSED' });
    expect(actor.getSnapshot().value).toBe('gameOver');
    expect(playGameOverSound).toHaveBeenCalledTimes(1);
  });
});

describe('round start sound', () => {
  it('plays once a round starts, and not before', () => {
    const playRoundStartSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playRoundStartSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    expect(playRoundStartSound).not.toHaveBeenCalled();

    actor.send({ type: 'START_ROUND' });
    expect(actor.getSnapshot().value).toBe('roundPlaying');
    expect(playRoundStartSound).toHaveBeenCalledTimes(1);
  });

  it('plays again for each subsequent round', () => {
    vi.useFakeTimers();
    const playRoundStartSound = vi.fn();
    const actor = startActor(hatMachine.provide({ actions: { playRoundStartSound } }));
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 10 });
    actor.send({ type: 'START_GAME' });

    actor.send({ type: 'START_ROUND' }); // team A's round
    expect(playRoundStartSound).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000); // times out, hands off to team B

    actor.send({ type: 'START_ROUND' }); // team B's round
    expect(playRoundStartSound).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('round timer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a timed-out word to the hat instead of discarding it', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });

    const hatAtRoundStart = actor.getSnapshot().context.hat; // 5 words
    actor.send({ type: 'START_ROUND' });
    const drawnWord = actor.getSnapshot().context.currentWord!;
    vi.advanceTimersByTime(30_000);

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('roundIntro'); // moved on to team B, hat not empty
    expect(snapshot.context.hat).toHaveLength(hatAtRoundStart.length); // word returned, none lost
    expect(snapshot.context.hat).toContainEqual(drawnWord);
    expect(snapshot.context.history).toHaveLength(1);
    expect(snapshot.context.history[0].result).toBe('timeout');
    expect(snapshot.context.currentWord).toBeNull();
  });
});

describe('remaining word count after each action', () => {
  it('WORD_GUESSED removes the word from the hat for good', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const before = remainingWordCount(actor.getSnapshot().context);
    actor.send({ type: 'WORD_GUESSED' });
    expect(remainingWordCount(actor.getSnapshot().context)).toBe(before - 1);
  });

  it('WORD_SKIPPED (when allowed) removes the word from the hat for good', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ALLOW_SKIP', allowSkip: true });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const before = remainingWordCount(actor.getSnapshot().context);
    actor.send({ type: 'WORD_SKIPPED' });
    expect(remainingWordCount(actor.getSnapshot().context)).toBe(before - 1);
  });

  it('WORD_FOUL removes the word from the hat for good', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const before = remainingWordCount(actor.getSnapshot().context);
    actor.send({ type: 'WORD_FOUL' });
    expect(remainingWordCount(actor.getSnapshot().context)).toBe(before - 1);
  });

  it('DELETE_WORD removes the word from the hat and from the dictionary itself', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const deletedWord = actor.getSnapshot().context.currentWord!.word;
    const before = remainingWordCount(actor.getSnapshot().context);
    actor.send({ type: 'DELETE_WORD' });
    const snapshot = actor.getSnapshot();
    expect(remainingWordCount(snapshot.context)).toBe(before - 1);
    expect(snapshot.context.dictionary!.some((entry) => entry.word === deletedWord)).toBe(false);
    // No WordRecord for it — this isn't a real guess/skip/foul.
    expect(snapshot.context.history).toHaveLength(0);
  });

  it('MARK_WORD_RARE sets the current word\'s frequency to 0.05 without advancing the round', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const markedWord = actor.getSnapshot().context.currentWord!.word;
    const before = remainingWordCount(actor.getSnapshot().context);
    actor.send({ type: 'MARK_WORD_RARE' });
    const snapshot = actor.getSnapshot();

    expect(remainingWordCount(snapshot.context)).toBe(before);
    expect(snapshot.context.currentWord!.word).toBe(markedWord);
    expect(snapshot.context.currentWord!.frequency).toBe(0.05);
    expect(snapshot.context.dictionary!.find((entry) => entry.word === markedWord)!.frequency).toBe(0.05);
    expect(snapshot.context.history).toHaveLength(0);
  });

  it('a timeout keeps the word in play — remaining count is unchanged', () => {
    vi.useFakeTimers();
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const before = remainingWordCount(actor.getSnapshot().context);
    vi.advanceTimersByTime(30_000);
    expect(remainingWordCount(actor.getSnapshot().context)).toBe(before);
    vi.useRealTimers();
  });
});

describe('scoring (pure functions)', () => {
  it('maps results to score deltas', () => {
    expect(scoreDeltaForResult('guessed')).toBe(1);
    expect(scoreDeltaForResult('skipped')).toBe(-1);
    expect(scoreDeltaForResult('foul')).toBe(-1);
    expect(scoreDeltaForResult('timeout')).toBe(0);
  });

  it('sums deltas per team from history', () => {
    const history = [
      { teamId: 'a', result: 'guessed' },
      { teamId: 'a', result: 'guessed' },
      { teamId: 'a', result: 'foul' },
      { teamId: 'b', result: 'skipped' },
      { teamId: 'b', result: 'timeout' },
    ] as const;
    expect(getTeamScore([...history] as never, 'a')).toBe(1);
    expect(getTeamScore([...history] as never, 'b')).toBe(-1);
  });
});

describe('gameOver stats', () => {
  // Insertion position for a timed-out word is random; pin it to the front of
  // the hat so team B's next round deterministically draws it first.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function playScenario() {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    const teamB = addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROLES_MODE', rolesMode: 'fixed' });
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 6 });
    actor.send({ type: 'START_GAME' });

    // Team A's turn: 3 guesses, then the round times out on the 4th word
    // (it goes back to the front of the hat).
    actor.send({ type: 'START_ROUND' });
    vi.advanceTimersByTime(3000);
    actor.send({ type: 'WORD_GUESSED' }); // word1, 3000ms
    vi.advanceTimersByTime(1000);
    actor.send({ type: 'WORD_GUESSED' }); // word2, 1000ms
    vi.advanceTimersByTime(2000);
    actor.send({ type: 'WORD_GUESSED' }); // word3, 2000ms
    vi.advanceTimersByTime(24_000); // remaining time on word4 -> timeout, 24000ms

    // Team B's turn: draws the returned word4 first and guesses it almost
    // instantly, then finishes word5 (guessed) and word6 (foul).
    actor.send({ type: 'START_ROUND' });
    vi.advanceTimersByTime(200);
    actor.send({ type: 'WORD_GUESSED' }); // word4 again, 200ms
    vi.advanceTimersByTime(4000);
    actor.send({ type: 'WORD_GUESSED' }); // word5, 4000ms
    vi.advanceTimersByTime(500);
    actor.send({ type: 'WORD_FOUL' }); // word6, 500ms

    return { actor, teamA, teamB };
  }

  it('derives winner, best player, hardest and easiest word from history', () => {
    const { actor, teamA, teamB } = playScenario();
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('gameOver');
    const { context } = snapshot;

    expect(getTeamScore(context.history, teamA.id)).toBe(3); // 3 guessed
    expect(getTeamScore(context.history, teamB.id)).toBe(1); // 2 guessed - 1 foul

    const [winner, loser] = sortTeamsByScore(context.teams, context.history);
    expect(winner.id).toBe(teamA.id);
    expect(loser.id).toBe(teamB.id);

    const bestPlayer = getBestPlayer(context.teams, context.history);
    expect(bestPlayer?.player.id).toBe(teamA.players[1].id); // fixed guesser for team A
    expect(bestPlayer?.guessedCount).toBe(3);

    expect(getHardestWord(context.history)?.timeMs).toBe(4000);
    expect(getHardestWord(context.history)?.teamId).toBe(teamB.id);
    expect(getEasiestWord(context.history)?.timeMs).toBe(200);
    expect(getEasiestWord(context.history)?.teamId).toBe(teamB.id);
  });

  it('flags the timed-out word that the next team then guessed almost instantly', () => {
    const { actor, teamA, teamB } = playScenario();
    const { context } = actor.getSnapshot();

    const hinted = getHintedWords(context.teams, context.history);
    expect(hinted).toHaveLength(1);
    expect(hinted[0].strugglingTeamId).toBe(teamA.id);
    expect(hinted[0].strugglingTimeMs).toBe(24_000);
    expect(hinted[0].helpedTeamId).toBe(teamB.id);
    expect(hinted[0].helpedTimeMs).toBe(200);
  });
});

describe('getHintedWords (pure function)', () => {
  const teamA: Team = { id: 'a', name: 'A', players: [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }], roundsPlayed: 0 };
  const teamB: Team = { id: 'b', name: 'B', players: [{ id: 'b1', name: 'B1' }, { id: 'b2', name: 'B2' }], roundsPlayed: 0 };
  const teamC: Team = { id: 'c', name: 'C', players: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }], roundsPlayed: 0 };
  const teams: Team[] = [teamA, teamB, teamC];

  function record(overrides: Partial<WordRecord>): WordRecord {
    return {
      word: 'Кошка',
      difficulty: 'easy',
      teamId: teamA.id,
      describerId: teamA.players[0].id,
      guesserId: teamA.players[1].id,
      result: 'guessed',
      timeMs: 1000,
      roundIndex: 0,
      ...overrides,
    };
  }

  it('flags a timeout immediately followed by a quick guess from the next team', () => {
    const history = [
      record({ teamId: teamA.id, result: 'timeout', timeMs: 25_000 }),
      record({ teamId: teamB.id, result: 'guessed', timeMs: 300 }),
    ];
    expect(getHintedWords(teams, history)).toHaveLength(1);
  });

  it('does not flag it when a team other than the immediate follower gets it', () => {
    const history = [
      record({ teamId: teamA.id, result: 'timeout', timeMs: 25_000 }),
      record({ teamId: teamC.id, result: 'guessed', timeMs: 300 }), // C follows B, not A
    ];
    expect(getHintedWords(teams, history)).toHaveLength(0);
  });

  it('does not flag it when the follow-up guess is not fast', () => {
    const history = [
      record({ teamId: teamA.id, result: 'timeout', timeMs: 25_000 }),
      record({ teamId: teamB.id, result: 'guessed', timeMs: 20_000 }),
    ];
    expect(getHintedWords(teams, history)).toHaveLength(0);
  });
});

describe('getLastRoundRecap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns null before any round has been played', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'START_GAME' });

    const { context } = actor.getSnapshot();
    expect(getLastRoundRecap(context.teams, context.history)).toBeNull();
  });

  it('recaps the words the previous team guessed once their round times out', () => {
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_ROUND_DURATION', roundDurationSec: 30 });
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });

    actor.send({ type: 'START_ROUND' });
    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_GUESSED' });
    vi.advanceTimersByTime(30_000); // times out on the 3rd word, hands off to team B

    const { context } = actor.getSnapshot();
    const recap = getLastRoundRecap(context.teams, context.history);
    expect(recap?.team.id).toBe(teamA.id);
    expect(recap?.guessed).toHaveLength(2);
    expect(recap?.guessed.every((record) => record.result === 'guessed')).toBe(true);
  });

  it('recaps the finishing team\'s round even when a guess ends the game mid-round (no roundEnd/timeout)', () => {
    // WORD_GUESSED can jump straight from roundPlaying to gameOver when it
    // empties the hat, skipping roundEnd's entry action entirely — so
    // currentTeamIndex/roundsPlayed are NOT advanced for this final round.
    const actor = startActor();
    const teamA = addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 2 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_GUESSED' }); // empties the hat -> straight to gameOver

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('gameOver');
    const recap = getLastRoundRecap(snapshot.context.teams, snapshot.context.history);
    expect(recap?.team.id).toBe(teamA.id);
    expect(recap?.guessed).toHaveLength(2);
  });

  it('reports an empty list when the team guessed nothing that round (pure function)', () => {
    const team: Team = {
      id: 'a',
      name: 'A',
      players: [
        { id: 'a1', name: 'A1' },
        { id: 'a2', name: 'A2' },
      ],
      roundsPlayed: 1,
    };
    const other: Team = {
      id: 'b',
      name: 'B',
      players: [
        { id: 'b1', name: 'B1' },
        { id: 'b2', name: 'B2' },
      ],
      roundsPlayed: 0,
    };
    const history: WordRecord[] = [
      {
        word: 'Кошка',
        difficulty: 'easy',
        teamId: team.id,
        describerId: team.players[0].id,
        guesserId: team.players[1].id,
        result: 'foul',
        timeMs: 1000,
        roundIndex: 0,
      },
    ];

    const recap = getLastRoundRecap([team, other], history);
    expect(recap?.team.id).toBe(team.id);
    expect(recap?.guessed).toEqual([]);
  });
});

describe('getCurrentRoundGuessedCount', () => {
  it('is 0 before any word has been guessed this round', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    const { context } = actor.getSnapshot();
    expect(getCurrentRoundGuessedCount(context.teams, context.history, context.currentTeamIndex)).toBe(0);
  });

  it('counts only the words guessed in the round currently in progress', () => {
    const actor = startActor();
    addTeam(actor, 'Аня', 'Боря');
    addTeam(actor, 'Вика', 'Гриша');
    actor.send({ type: 'SET_WORD_COUNT', wordCount: 5 });
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'START_ROUND' });

    actor.send({ type: 'WORD_GUESSED' });
    actor.send({ type: 'WORD_FOUL' }); // does not count toward "guessed"
    actor.send({ type: 'WORD_GUESSED' });

    const { context } = actor.getSnapshot();
    expect(getCurrentRoundGuessedCount(context.teams, context.history, context.currentTeamIndex)).toBe(2);
  });
});
