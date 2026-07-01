const STORAGE_KEY = 'hat:playerNames';

// localStorage can be unavailable (private browsing, quota exceeded, disabled)
// — treat it as a nice-to-have and fail silently rather than breaking setup.

export function getStoredPlayerNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberPlayerName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const existing = getStoredPlayerNames();
    if (existing.some((known) => known.toLowerCase() === trimmed.toLowerCase())) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, trimmed]));
  } catch {
    // ignore
  }
}
