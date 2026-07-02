import { assign, enqueueActions, fromCallback, setup } from 'xstate';
import type { DictionaryEntry, DifficultyLevel } from '../data/dictionary';
import { pickRandom } from '../utils/shuffle';
import { generateTeamName } from '../utils/teamName';
import { getCurrentRoles } from '../utils/roles';
import { generateId } from '../utils/id';
import { isHatRunningLow } from '../utils/lowHat';
import { getDuplicateNameReason } from '../utils/setupValidity';
import { isLocalDevEnvironment } from '../utils/isLocalDevEnvironment';

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
}

export type HatEvent =
  | { type: 'ADD_TEAM' }
  | { type: 'REMOVE_TEAM'; teamId: string }
  | { type: 'UPDATE_TEAM_NAME'; teamId: string; name: string }
  | { type: 'REGENERATE_TEAM_NAME'; teamId: string }
  | { type: 'UPDATE_PLAYER_NAME'; teamId: string; playerId: string; name: string }
  | { type: 'SET_ROUND_DURATION'; roundDurationSec: 30 | 60 | 120 }
  | { type: 'SET_ALLOW_SKIP'; allowSkip: boolean }
  | { type: 'SET_WORD_COUNT'; wordCount: number }
  | { type: 'SET_DIFFICULTY_LEVEL'; difficultyLevel: number }
  | { type: 'SET_ROLES_MODE'; rolesMode: RolesMode }
  | { type: 'SET_SOUND_ENABLED'; soundEnabled: boolean }
  | { type: 'SET_VIBRATION_ENABLED'; vibrationEnabled: boolean }
  | { type: 'DICTIONARY_LOADED'; entries: DictionaryEntry[] }
  | { type: 'START_GAME' }
  | { type: 'START_ROUND' }
  | { type: 'WORD_GUESSED' }
  | { type: 'WORD_SKIPPED' }
  | { type: 'WORD_FOUL' }
  | { type: 'DELETE_WORD' }
  | { type: 'MARK_WORD_RARE' }
  | { type: 'TICK' }
  | { type: 'RESTART' };

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
      player.name.trim().length > 0 ? player : { ...player, name: `Игрок ${index + 1}` },
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
          guard: ({ context }) => context.teams.length < MAX_TEAMS,
          actions: assign(({ context }) => ({
            teams: [...context.teams, createTeam(context.dictionary)],
          })),
        },
        REMOVE_TEAM: {
          guard: ({ context }) => context.teams.length > MIN_TEAMS,
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
                      player.id === event.playerId ? { ...player, name: event.name } : player,
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
        START_GAME: {
          guard: ({ context }) =>
            context.teams.length >= 2 &&
            context.dictionary !== null &&
            context.teams.every((team) => !getDuplicateNameReason(team)),
          actions: [
            // Fires before the assign below, so it sees the names as the
            // user actually typed them — not yet backfilled with "Игрок N"
            // placeholders for anyone left blank.
            'rememberPlayerNames',
            assign(({ context }) => {
              // No difficulty-tag filtering — the whole dictionary is the pool,
              // and pickRandom weighs each word's difficulty (length, frequency,
              // Levenshtein-neighbour frequency) against the difficulty slider,
              // excluding 0-frequency words below max difficulty. wordCount is
              // clamped to however many it actually managed to draw, since that
              // exclusion can shrink the eligible pool below the full dictionary.
              const pool = context.dictionary ?? [];
              const hat = pickRandom(pool, context.settings.wordCount, context.settings.difficultyLevel);
              return {
                hat,
                settings: { ...context.settings, wordCount: hat.length },
                currentTeamIndex: 0,
                history: [],
                currentWord: null,
                wordShownAt: null,
                teams: context.teams.map(fillBlankPlayerNames),
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
      },
    },

    roundPlaying: {
      entry: 'playRoundStartSound',
      invoke: { src: 'ticker' },
      on: {
        TICK: {
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
            target: 'gameOver',
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
            target: 'gameOver',
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
            target: 'gameOver',
          },
          {
            actions: [assign(({ context }) => resolveWord(context, 'foul')), 'playFoulSound'],
          },
        ],
        DELETE_WORD: [
          {
            guard: ({ context }) => isLocalDevEnvironment() && isHatEmpty(context),
            actions: assign(({ context }) => deleteCurrentWord(context)),
            target: 'gameOver',
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
      },
      always: [
        {
          guard: ({ context }) => context.timeRemainingSec <= 0,
          actions: assign(({ context }) => resolveTimeout(context)),
          target: 'roundEnd',
        },
      ],
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
        { guard: ({ context }) => isHatEmpty(context), target: 'gameOver' },
        { target: 'roundIntro' },
      ],
    },

    gameOver: {
      entry: 'playGameOverSound',
      on: {
        RESTART: {
          target: 'setup',
          actions: assign(({ context }) => ({
            hat: [],
            history: [],
            currentWord: null,
            wordShownAt: null,
            currentTeamIndex: 0,
            teams: context.teams.map((team) => ({ ...team, roundsPlayed: 0 })),
          })),
        },
      },
    },
  },
});
