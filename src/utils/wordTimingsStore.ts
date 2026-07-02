const STORAGE_KEY = 'hat:wordTimings';

export interface WordTiming {
  word: string;
  timeMs: number;
}

// localStorage can be unavailable (private browsing, quota exceeded, disabled)
// — treat it as a nice-to-have and fail silently rather than breaking play.

function isWordTiming(value: unknown): value is WordTiming {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WordTiming).word === 'string' &&
    typeof (value as WordTiming).timeMs === 'number'
  );
}

export function getStoredWordTimings(): WordTiming[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isWordTiming) : [];
  } catch {
    return [];
  }
}

export function recordWordTiming(word: string, timeMs: number): void {
  try {
    const existing = getStoredWordTimings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, { word, timeMs }]));
  } catch {
    // ignore
  }
}

export function clearStoredWordTimings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
