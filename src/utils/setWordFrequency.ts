import { isLocalDevEnvironment } from './isLocalDevEnvironment';

// Dev-only: asks the Vite dev server (see vite.config.ts's set-word-frequency
// middleware) to recalibrate a word's frequency to 0.05 in
// src/data/dictionary.ts. A no-op outside a local dev server, where there's
// no dev server to talk to (or it's not the developer's own machine).
export async function markWordRareInDictionary(word: string): Promise<void> {
  if (!isLocalDevEnvironment()) return;
  try {
    await fetch('/__set-word-frequency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    });
  } catch {
    // ignore — MARK_WORD_RARE still updates this session's in-memory
    // dictionary even if the dev server call fails.
  }
}
