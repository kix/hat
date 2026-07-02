// Dev-only: asks the Vite dev server (see vite.config.ts's delete-word
// middleware) to remove a word from src/data/dictionary.ts outright. A
// no-op in production, where there's no dev server to talk to.
export async function deleteWordFromDictionary(word: string): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    await fetch('/__delete-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    });
  } catch {
    // ignore — DELETE_WORD still removes it from this session's in-memory
    // dictionary even if the dev server call fails.
  }
}
