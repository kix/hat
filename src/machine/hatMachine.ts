import { assign, enqueueActions, fromCallback, setup } from 'xstate';
import type { DictionaryEntry, DifficultyLevel } from '../data/dictionary';
import { pickRandom } from '../utils/shuffle';
import { generateTeamName } from '../utils/teamName';
import { getCurrentRoles } from '../utils/roles';
import { generateId } from '../utils/id';
import { isHatRunningLow } from '../utils/lowHat';
import { getDuplicateNameReason } from '../utils/setupValidity';
import { isLocalDevEnvironment } from '../utils/isLocalDevEnvironment';
import { tr } from '../i18n/lang';

export type { DifficultyLevel } from '../data/dictionary';

export const MAX_TEAMS = 6;
export const MIN_TEAMS = 2;

export type RolesMode = 'alternate' | 'fixed';
export type WordResult = 'guessed' | 'skipped' | 'foul' | 'timeout';

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: [Player, Player];
  roundsPlayed: number;
}

export interface WordRecord {
  readonly word: string;
  readonly difficulty: DifficultyLevel;
  readonly teamId: string;
  readonly describerId: string;
  readonly guesserId: string;
  readonly result: WordResult;
  readonly timeMs: number;
  readonly roundIndex: number;
}

export type History = WordRecord[];

export interface Settings {
  roundDurationSec: 30 | 60 | 120;
  allowSkip: boolean;
  wordCount: number;
  // 0 (easiest) to 1 (hardest) — see pickRandom in utils/shuffle.ts for how
  // this is weighed against each word's length and frequency.
  difficultyLevel: number;
  rolesMode: RolesMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wordPack: 'standard' | 'frequent' | 'custom';
  customWords: string[];
  gameMode?: 'teams' | 'pairs';
}

export interface HatContext {
  teams: Team[];
  settings: Settings;
  // The word dictionary is loaded asynchronously (see App.tsx) and reported
  // in via DICTIONARY_LOADED — null until then. Starting a game requires it.
  dictionary: DictionaryEntry[] | null;
  hat: DictionaryEntry[];
  currentWord: DictionaryEntry | null;
  wordShownAt: number | null;
  timeRemainingSec: number;
  currentTeamIndex: number;
  history: History;
  isLocalLobby?: boolean;
}

export type HatEvent =
  | { type: 'ADD_TEAM' }
  | { type: 'REMOVE_TEAM'; teamId: string }
  | { type: 'UPDATE_TEAM_NAME'; teamId: string; name: string }
  | { type: 'REGENERATE_TEAM_NAME'; teamId: string }
  | { type: 'UPDATE_PLAYER_NAME'; teamId: string; playerId: string; name: string; newPlayerId?: string }
  | { type: 'SET_ROUND_DURATION'; roundDurationSec: 30 | 60 | 120 }
  | { type: 'SET_ALLOW_SKIP'; allowSkip: boolean }
  | { type: 'SET_WORD_COUNT'; wordCount: number }
  | { type: 'SET_DIFFICULTY_LEVEL'; difficultyLevel: number }
  | { type: 'SET_ROLES_MODE'; rolesMode: RolesMode }
  | { type: 'SET_SOUND_ENABLED'; soundEnabled: boolean }
  | { type: 'SET_VIBRATION_ENABLED'; vibrationEnabled: boolean }
  | { type: 'SET_WORD_PACK'; wordPack: 'standard' | 'frequent' | 'custom' }
  | { type: 'SET_CUSTOM_WORDS'; customWords: string[] }
  | { type: 'SET_GAME_MODE'; gameMode: 'teams' | 'pairs' }
  | { type: 'DICTIONARY_LOADED'; entries: DictionaryEntry[] }
  | { type: 'START_GAME' }
  | { type: 'START_ROUND' }
  | { type: 'WORD_GUESSED' }
  | { type: 'WORD_SKIPPED' }
  | { type: 'WORD_FOUL' }
  | { type: 'DELETE_WORD' }
  | { type: 'MARK_WORD_RARE' }
  | { type: 'TICK' }
  | { type: 'RESTART' }
  | { type: 'FINISH_ROUND' }
  | { type: 'EXIT_GAME' }
  | { type: 'OPEN_REVIEW' }
  | { type: 'UPDATE_WORD_RESULT'; word: string; result: WordResult }
  | { type: 'CONFIRM_REVIEW' };

function createTeam(dictionaryEntries: DictionaryEntry[] | null): Team {
  return {
    id: generateId(),
    name: generateTeamName(dictionaryEntries),
    players: [
      { id: generateId(), name: '' },
      { id: generateId(), name: '' },
    ],
    roundsPlayed: 0,
  };
}

// Player names are optional in setup; anyone left blank gets the same
// "Игрок N" placeholder shown in the input as their real name for the game.
function fillBlankPlayerNames(team: Team): Team {
  return {
    ...team,
    players: team.players.map((player, index) =>
      player.name.trim().length > 0 ? player : { ...player, name: tr('default.playerN', { n: index + 1 }) },
    ) as [Player, Player],
  };
}

export function createInitialContext(): HatContext {
  return {
    // Two teams are always present so the game can start right away — this
    // is also MIN_TEAMS, so REMOVE_TEAM refuses to drop below it.
    teams: [createTeam(null), createTeam(null)],
    settings: {
      roundDurationSec: 60,
      allowSkip: false,
      wordCount: 20,
      difficultyLevel: 0.5,
      rolesMode: 'alternate',
      soundEnabled: true,
      vibrationEnabled: false,
      wordPack: 'frequent',
      customWords: [],
      gameMode: 'teams',
    },
    dictionary: null,
    hat: [],
    currentWord: null,
    wordShownAt: null,
    timeRemainingSec: 0,
    currentTeamIndex: 0,
    history: [],
  };
}

function buildWordRecord(context: HatContext, currentWord: DictionaryEntry, result: WordResult): WordRecord {
  const team = context.teams[context.currentTeamIndex];
  const roles = getCurrentRoles(team, context.settings.rolesMode);
  return {
    word: currentWord.word,
    difficulty: currentWord.difficulty,
    teamId: team.id,
    describerId: roles.describer.id,
    guesserId: roles.guesser.id,
    result,
    timeMs: Date.now() - (context.wordShownAt ?? Date.now()),
    roundIndex: team.roundsPlayed,
  };
}

// Records the outcome of context.currentWord and draws the next word from the
// hat, if any is left. Whether the transition actually leaves roundPlaying is
// decided by a guard evaluated against the *pre-action* hat length.
function resolveWord(context: HatContext, result: Exclude<WordResult, 'timeout'>): Partial<HatContext> {
  const currentWord = context.currentWord;
  if (!currentWord || context.wordShownAt === null) return {};
  const record = buildWordRecord(context, currentWord, result);

  if (context.timeRemainingSec <= 0) {
    return {
      history: [...context.history, record],
      currentWord: null,
      wordShownAt: null,
    };
  }

  const [nextWord, ...rest] = context.hat;
  if (!nextWord) {
    return {
      history: [...context.history, record],
      currentWord: null,
      wordShownAt: null,
    };
  }

  return {
    history: [...context.history, record],
    hat: rest,
    currentWord: nextWord,
    wordShownAt: Date.now(),
  };
}

// Records context.currentWord as timed-out and returns it to the hat at a
// random position — unlike guessed/skipped/foul, a timeout doesn't resolve
// the word, so it stays in play for a future team to draw.
function resolveTimeout(context: HatContext): Partial<HatContext> {
  const currentWord = context.currentWord;
  if (!currentWord || context.wordShownAt === null) return {};
  const record = buildWordRecord(context, currentWord, 'timeout');
  const insertAt = Math.floor(Math.random() * (context.hat.length + 1));
  const hat = [...context.hat.slice(0, insertAt), currentWord, ...context.hat.slice(insertAt)];
  return {
    history: [...context.history, record],
    hat,
    currentWord: null,
    wordShownAt: null,
  };
}

function isHatEmpty(context: HatContext): boolean {
  return context.hat.length === 0;
}

// Drops all in-progress game state back to a clean slate but keeps the
// team roster and settings, so a new game with the same teams can start
// right away — used by both RESTART (from gameOver) and EXIT_GAME (from
// mid-game).
function resetToSetup(context: HatContext): Partial<HatContext> {
  return {
    hat: [],
    history: [],
    currentWord: null,
    wordShownAt: null,
    currentTeamIndex: 0,
    teams: context.teams.map((team) => ({ ...team, roundsPlayed: 0 })),
  };
}

// Matches the value the vite.config.ts dev-server middleware writes to disk.
const RARE_WORD_FREQUENCY = 0.05;

// Dev-only word-list curation (see DeleteWordButton and vite.config.ts's
// delete-word middleware): drops the current word from the dictionary
// outright, so it can't be drawn again, and advances to the next one.
// Unlike resolveWord, this doesn't record a WordRecord — it isn't a real
// guess/skip/foul, just editorial removal.
function deleteCurrentWord(context: HatContext): Partial<HatContext> {
  const currentWord = context.currentWord;
  if (!currentWord) return {};
  const dictionary = (context.dictionary ?? []).filter((entry) => entry.word !== currentWord.word);

  const [nextWord, ...rest] = context.hat;
  if (!nextWord) {
    return { dictionary, currentWord: null, wordShownAt: null };
  }
  return { dictionary, hat: rest, currentWord: nextWord, wordShownAt: Date.now() };
}

// Dev-only word-list curation: recalibrates a word wordfreq scored as
// completely unattested (frequency 0) to a small non-zero frequency, so it
// stops being excluded outright below max difficulty (see pickRandom's
// 0-frequency exclusion) without claiming it's actually common. Doesn't
// advance the round — the current word stays in play.
function markCurrentWordRare(context: HatContext): Partial<HatContext> {
  const currentWord = context.currentWord;
  if (!currentWord) return {};
  const applyRareFrequency = (entry: DictionaryEntry): DictionaryEntry =>
    entry.word === currentWord.word ? { ...entry, frequency: RARE_WORD_FREQUENCY } : entry;
  return {
    dictionary: (context.dictionary ?? []).map(applyRareFrequency),
    currentWord: applyRareFrequency(currentWord),
  };
}

export const hatMachine = setup({
  types: {
    context: {} as HatContext,
    events: {} as HatEvent,
  },
  actors: {
    ticker: fromCallback(({ sendBack }) => {
      const id = setInterval(() => sendBack({ type: 'TICK' }), 1000);
      return () => clearInterval(id);
    }),
  },
  actions: {
    playRoundStartSound: () => {},
    playTickSound: () => {},
    playGuessedSound: () => {},
    playLowHatGuessedSound: () => {},
    playSkipSound: () => {},
    playFoulSound: () => {},
    playGameOverSound: () => {},
    rememberPlayerNames: () => {},
  },
}).createMachine({
  id: 'hat',
  context: createInitialContext(),
  initial: 'setup',
  // Handled globally (not scoped to `setup`) since the dictionary load is
  // kicked off once, independently of whatever state the app happens to be
  // in when the network/import resolves.
  on: {
    DICTIONARY_LOADED: {
      actions: assign(({ event }) => ({ dictionary: event.entries })),
    },
  },
  states: {
    setup: {
      on: {
        ADD_TEAM: {
          guard: ({ context }) => context.settings.gameMode !== 'pairs' && context.teams.length < MAX_TEAMS,
          actions: assign(({ context }) => ({
            teams: [...context.teams, createTeam(context.dictionary)],
          })),
        },
        REMOVE_TEAM: {
          guard: ({ context }) => context.settings.gameMode !== 'pairs' && context.teams.length > MIN_TEAMS,
          actions: assign(({ context, event }) => ({
            teams: context.teams.filter((team) => team.id !== event.teamId),
          })),
        },
        UPDATE_TEAM_NAME: {
          actions: assign(({ context, event }) => ({
            teams: context.teams.map((team) =>
              team.id === event.teamId ? { ...team, name: event.name } : team,
            ),
          })),
        },
        REGENERATE_TEAM_NAME: {
          actions: assign(({ context, event }) => ({
            teams: context.teams.map((team) =>
              team.id === event.teamId ? { ...team, name: generateTeamName(context.dictionary) } : team,
            ),
          })),
        },
        UPDATE_PLAYER_NAME: {
          actions: assign(({ context, event }) => ({
            teams: context.teams.map((team) =>
              team.id === event.teamId
                ? {
                    ...team,
                    players: team.players.map((player) =>
                      player.id === event.playerId
                        ? { id: event.newPlayerId ?? player.id, name: event.name }
                        : player,
                    ) as [Player, Player],
                  }
                : team,
            ),
          })),
        },
        SET_ROUND_DURATION: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, roundDurationSec: event.roundDurationSec },
          })),
        },
        SET_ALLOW_SKIP: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, allowSkip: event.allowSkip },
          })),
        },
        SET_WORD_COUNT: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, wordCount: event.wordCount },
          })),
        },
        SET_DIFFICULTY_LEVEL: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, difficultyLevel: event.difficultyLevel },
          })),
        },
        SET_ROLES_MODE: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, rolesMode: event.rolesMode },
          })),
        },
        SET_SOUND_ENABLED: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, soundEnabled: event.soundEnabled },
          })),
        },
        SET_VIBRATION_ENABLED: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, vibrationEnabled: event.vibrationEnabled },
          })),
        },
        SET_WORD_PACK: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, wordPack: event.wordPack },
          })),
        },
        SET_CUSTOM_WORDS: {
          actions: assign(({ context, event }) => ({
            settings: { ...context.settings, customWords: event.customWords },
          })),
        },
        SET_GAME_MODE: {
          actions: assign(({ context, event }) => {
            let teams = context.teams;
            if (event.gameMode === 'pairs') {
              teams = [context.teams[0] || createTeam(context.dictionary)];
            } else {
              if (teams.length < 2) {
                teams = [teams[0] || createTeam(context.dictionary), createTeam(context.dictionary)];
              }
            }
            return {
              settings: { ...context.settings, gameMode: event.gameMode },
              teams,
            };
          }),
        },
        START_GAME: {
          guard: ({ context }) =>
            (context.settings.gameMode === 'pairs' ? context.teams.length === 1 : context.teams.length >= 2) &&
            context.dictionary !== null &&
            context.teams.every((team) => !getDuplicateNameReason(team)),
          actions: [
            // Fires before the assign below, so it sees the names as the
            // user actually typed them — not yet backfilled with "Игрок N"
            // placeholders for anyone left blank.
            'rememberPlayerNames',
            assign(({ context }) => {
              let pool = context.dictionary ?? [];
              if (context.settings.wordPack === 'frequent') {
                pool = pool.filter((w) => w.frequency >= 3.0 || w.levenshtein_zipf_frequency >= 3.0);
                if (pool.length === 0) pool = context.dictionary ?? [];
              } else if (context.settings.wordPack === 'custom') {
                pool = context.settings.customWords.map((word) => ({
                  word,
                  difficulty: 'easy',
                  frequency: 4.0,
                  levenshtein_zipf_frequency: 4.0,
                }));
              }
              const hat = pickRandom(pool, context.settings.wordCount, context.settings.difficultyLevel);
              const teams = context.teams.map(fillBlankPlayerNames);
              if (context.settings.gameMode === 'pairs' && teams[0]) {
                const [p1, p2] = teams[0].players;
                teams[0].name = `${p1.name} & ${p2.name}`;
              }
              return {
                hat,
                settings: { ...context.settings, wordCount: hat.length },
                currentTeamIndex: 0,
                history: [],
                currentWord: null,
                wordShownAt: null,
                teams,
              };
            }),
          ],
          target: 'roundIntro',
        },
      },
    },

    roundIntro: {
      on: {
        START_ROUND: {
          actions: assign(({ context }) => {
            const [word, ...rest] = context.hat;
            return {
              currentWord: word,
              hat: rest,
              wordShownAt: Date.now(),
              timeRemainingSec: context.settings.roundDurationSec,
            };
          }),
          target: 'roundPlaying',
        },
        EXIT_GAME: {
          target: 'setup',
          actions: assign(({ context }) => resetToSetup(context)),
        },
        OPEN_REVIEW: {
          target: 'roundReview',
        },
      },
    },

    roundPlaying: {
      entry: 'playRoundStartSound',
      invoke: { src: 'ticker' },
      on: {
        TICK: {
          guard: ({ context }) => context.timeRemainingSec > 0,
          actions: enqueueActions(({ context, enqueue }) => {
            const timeRemainingSec = context.timeRemainingSec - 1;
            enqueue.assign({ timeRemainingSec });
            if (timeRemainingSec > 0 && timeRemainingSec <= 10) {
              enqueue('playTickSound');
            }
          }),
        },
        WORD_GUESSED: [
          {
            guard: ({ context }) => isHatEmpty(context),
            actions: [assign(({ context }) => resolveWord(context, 'guessed')), 'playLowHatGuessedSound'],
            target: 'roundEnd',
          },
          {
            guard: ({ context }) => isHatRunningLow(context.hat.length),
            actions: [assign(({ context }) => resolveWord(context, 'guessed')), 'playLowHatGuessedSound'],
          },
          {
            actions: [assign(({ context }) => resolveWord(context, 'guessed')), 'playGuessedSound'],
          },
        ],
        WORD_SKIPPED: [
          {
            guard: ({ context }) => context.settings.allowSkip && isHatEmpty(context),
            actions: [assign(({ context }) => resolveWord(context, 'skipped')), 'playSkipSound'],
            target: 'roundEnd',
          },
          {
            guard: ({ context }) => context.settings.allowSkip,
            actions: [assign(({ context }) => resolveWord(context, 'skipped')), 'playSkipSound'],
          },
        ],
        WORD_FOUL: [
          {
            guard: ({ context }) => isHatEmpty(context),
            actions: [assign(({ context }) => resolveWord(context, 'foul')), 'playFoulSound'],
            target: 'roundEnd',
          },
          {
            actions: [assign(({ context }) => resolveWord(context, 'foul')), 'playFoulSound'],
          },
        ],
        DELETE_WORD: [
          {
            guard: ({ context }) => isLocalDevEnvironment() && isHatEmpty(context),
            actions: assign(({ context }) => deleteCurrentWord(context)),
            target: 'roundEnd',
          },
          {
            guard: () => isLocalDevEnvironment(),
            actions: assign(({ context }) => deleteCurrentWord(context)),
          },
        ],
        MARK_WORD_RARE: {
          guard: () => isLocalDevEnvironment(),
          actions: assign(({ context }) => markCurrentWordRare(context)),
        },
        FINISH_ROUND: {
          actions: assign(({ context }) => {
            if (context.currentWord) {
              return resolveTimeout(context);
            }
            return {};
          }),
          target: 'roundEnd',
        },
        EXIT_GAME: {
          target: 'setup',
          actions: assign(({ context }) => resetToSetup(context)),
        },
      },
    },

    roundEnd: {
      entry: assign(({ context }) => {
        const teams = context.teams.map((team, index) =>
          index === context.currentTeamIndex ? { ...team, roundsPlayed: team.roundsPlayed + 1 } : team,
        );
        return {
          teams,
          currentTeamIndex: (context.currentTeamIndex + 1) % teams.length,
        };
      }),
      always: [
        { target: 'roundReview' },
      ],
    },

    roundReview: {
      on: {
        UPDATE_WORD_RESULT: {
          actions: assign(({ context, event }) => {
            const { word, result: newResult } = event;
            const lastRecord = context.history[context.history.length - 1];
            if (!lastRecord) return {};

            const recordIndex = context.history.findIndex(
              (r) => r.word === word && r.teamId === lastRecord.teamId && r.roundIndex === lastRecord.roundIndex
            );
            if (recordIndex === -1) return {};

            const oldRecord = context.history[recordIndex];
            const oldResult = oldRecord.result;
            if (oldResult === newResult) return {};

            const newHistory = [...context.history];
            newHistory[recordIndex] = { ...oldRecord, result: newResult };

            let newHat = [...context.hat];
            const wasInHat = oldResult === 'timeout';
            const shouldBeInHat = newResult === 'timeout';

            if (wasInHat && !shouldBeInHat) {
              newHat = newHat.filter((w) => w.word !== word);
            } else if (!wasInHat && shouldBeInHat) {
              const entry = (context.dictionary ?? []).find((w) => w.word === word) || {
                word,
                difficulty: oldRecord.difficulty,
                frequency: 4.0,
                levenshtein_zipf_frequency: 4.0,
              };
              const insertAt = Math.floor(Math.random() * (newHat.length + 1));
              newHat = [...newHat.slice(0, insertAt), entry, ...newHat.slice(insertAt)];
            }

            return {
              history: newHistory,
              hat: newHat,
            };
          }),
        },
        CONFIRM_REVIEW: [
          { guard: ({ context }) => isHatEmpty(context), target: 'gameOver' },
          { target: 'roundIntro' },
        ],
        EXIT_GAME: {
          target: 'setup',
          actions: assign(({ context }) => resetToSetup(context)),
        },
      },
    },

    gameOver: {
      entry: 'playGameOverSound',
      on: {
        RESTART: {
          target: 'setup',
          actions: assign(({ context }) => resetToSetup(context)),
        },
        OPEN_REVIEW: {
          target: 'roundReview',
        },
      },
    },
  },
});
