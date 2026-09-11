import { describe, it, expect, vi } from 'vitest';
import { renderResultCard } from './renderResultCard';
import type { History, Settings, Team } from '../../machine/hatMachine';

function createMockCanvas(): HTMLCanvasElement {
  const mockCtx = {
    canvas: { width: 0, height: 0 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
  };

  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockCtx),
    toBlob: vi.fn((cb) => cb(new Blob(['mock-png'], { type: 'image/png' }))),
  } as unknown as HTMLCanvasElement;
}

const mockTeams: Team[] = [
  { id: 't1', name: 'Команда 1', players: [{ id: 'p1', name: 'Алиса' }, { id: 'p2', name: 'Боб' }], roundsPlayed: 1 },
  { id: 't2', name: 'Команда 2', players: [{ id: 'p3', name: 'Вика' }, { id: 'p4', name: 'Глеб' }], roundsPlayed: 1 },
  { id: 't3', name: 'Команда 3', players: [{ id: 'p5', name: 'Дима' }, { id: 'p6', name: 'Елена' }], roundsPlayed: 1 },
];

const mockHistory: History = [
  { word: 'Шляпа', difficulty: 'easy', result: 'guessed', teamId: 't1', describerId: 'p1', guesserId: 'p2', roundIndex: 0, timeMs: 1500 },
  { word: 'Кот', difficulty: 'easy', result: 'guessed', teamId: 't1', describerId: 'p2', guesserId: 'p1', roundIndex: 0, timeMs: 3200 },
  { word: 'Дом', difficulty: 'easy', result: 'guessed', teamId: 't2', describerId: 'p3', guesserId: 'p4', roundIndex: 0, timeMs: 2100 },
];

const mockSettings: Settings = {
  roundDurationSec: 30,
  allowSkip: true,
  wordCount: 30,
  difficultyLevel: 0.5,
  rolesMode: 'alternate',
  soundEnabled: true,
  vibrationEnabled: true,
  wordPack: 'frequent',
  customWords: [],
  gameMode: 'teams',
  enableReview: true,
};

describe('renderResultCard', () => {
  it('sets canvas dimensions to 1080x1920 for stories format', () => {
    const canvas = createMockCanvas();
    renderResultCard(canvas, {
      teams: mockTeams,
      history: mockHistory,
      settings: mockSettings,
      format: 'stories',
      lang: 'ru',
    });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('sets canvas dimensions to 1080x1350 for post format', () => {
    const canvas = createMockCanvas();
    renderResultCard(canvas, {
      teams: mockTeams,
      history: mockHistory,
      settings: mockSettings,
      format: 'post',
      lang: 'en',
    });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
  });

  it('handles 4+ teams with podium and remaining teams list', () => {
    const canvas = createMockCanvas();
    const fourTeams: Team[] = [
      ...mockTeams,
      { id: 't4', name: 'Команда 4', players: [{ id: 'p7', name: 'Жора' }, { id: 'p8', name: 'Зоя' }], roundsPlayed: 1 },
    ];

    expect(() => {
      renderResultCard(canvas, {
        teams: fourTeams,
        history: mockHistory,
        settings: mockSettings,
        format: 'stories',
        lang: 'ru',
      });
    }).not.toThrow();
  });

  it('handles pairs mode and empty history gracefully', () => {
    const canvas = createMockCanvas();
    expect(() => {
      renderResultCard(canvas, {
        teams: mockTeams.slice(0, 2),
        history: [],
        settings: { ...mockSettings, gameMode: 'pairs' },
        format: 'post',
        lang: 'ru',
      });
    }).not.toThrow();
  });
});
