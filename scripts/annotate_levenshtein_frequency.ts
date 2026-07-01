// Scans src/data/dictionary.ts and, for every word, checks its nearest
// neighbours in Levenshtein (edit-distance) space for a more common
// relative — e.g. a diminutive or case-form that wordfreq doesn't know
// borrows some standing from a close, well-attested word. If the
// strongest such neighbour outranks the word itself, the word's frequency
// is replaced with 25% of that neighbour's frequency; otherwise it's left
// as-is. The result is written back as a new `levenshtein_zipf_frequency`
// field.
//
// Usage: node scripts/annotate_levenshtein_frequency.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICTIONARY_PATH = resolve(__dirname, '../src/data/dictionary.ts');

// Neighbours farther apart than this are ignored entirely.
const MAX_DISTANCE = 2;
// How much of a stronger neighbour's frequency a word borrows.
const BLEED_FACTOR = 0.25;

interface ParsedEntry {
  indent: string;
  word: string;
  difficulty: string;
  frequency: number;
}

const ENTRY_RE = /^(\s*)\{ word: "([^"]*)", difficulty: "(\w+)", frequency: ([\d.]+) \},\s*$/;

// Exact Levenshtein distance via the standard two-row DP. Word lengths here
// are small (Russian nouns, mostly under ~20 characters), so O(len_a * len_b)
// per call is cheap — the real cost driver is how many calls happen at all,
// which the BK-tree below keeps far below the full n² pair count.
function levenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;

  let previousRow = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) previousRow[j] = j;

  for (let i = 1; i <= n; i++) {
    const currentRow = new Array<number>(m + 1);
    currentRow[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1, // deletion
        currentRow[j - 1] + 1, // insertion
        previousRow[j - 1] + cost, // substitution
      );
    }
    previousRow = currentRow;
  }

  return previousRow[m];
}

// A BK-tree indexes points in a metric space (here, words under edit
// distance) so that "everything within distance d of X" can be found
// without comparing X against every other point — comparisons that don't
// satisfy the triangle inequality against the distances already computed
// while descending the tree get pruned outright.
interface BKNode {
  word: string;
  children: Map<number, BKNode>;
}

class BKTree {
  private root: BKNode | null = null;

  insert(word: string): void {
    if (!this.root) {
      this.root = { word, children: new Map() };
      return;
    }
    let node = this.root;
    for (;;) {
      const distance = levenshtein(node.word, word);
      if (distance === 0) return; // duplicate word, nothing to do
      const child = node.children.get(distance);
      if (!child) {
        node.children.set(distance, { word, children: new Map() });
        return;
      }
      node = child;
    }
  }

  neighborsWithin(query: string, maxDistance: number): Array<{ word: string; distance: number }> {
    const results: Array<{ word: string; distance: number }> = [];
    if (!this.root) return results;

    const stack: BKNode[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      const distance = levenshtein(node.word, query);
      if (distance > 0 && distance <= maxDistance) results.push({ word: node.word, distance });
      const lo = distance - maxDistance;
      const hi = distance + maxDistance;
      for (const [edgeDistance, child] of node.children) {
        if (edgeDistance >= lo && edgeDistance <= hi) stack.push(child);
      }
    }
    return results;
  }
}

function parseEntries(lines: string[]): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const line of lines) {
    const match = ENTRY_RE.exec(line);
    if (!match) continue;
    const [, indent, word, difficulty, frequency] = match;
    entries.push({ indent, word, difficulty, frequency: Number(frequency) });
  }
  return entries;
}

function main(): void {
  const text = readFileSync(DICTIONARY_PATH, 'utf-8');
  const lines = text.split('\n');
  const entries = parseEntries(lines);
  if (entries.length === 0) throw new Error('No dictionary entries found — did the file format change?');

  console.log(`Indexing ${entries.length} words into a BK-tree...`);
  const tree = new BKTree();
  for (const entry of entries) tree.insert(entry.word);

  const frequencyByWord = new Map(entries.map((entry) => [entry.word, entry.frequency]));
  const blendedByWord = new Map<string, number>();

  let processed = 0;
  for (const entry of entries) {
    const neighbors = tree.neighborsWithin(entry.word, MAX_DISTANCE);
    let strongestNeighborFrequency = -Infinity;
    for (const { word } of neighbors) {
      const neighborFrequency = frequencyByWord.get(word);
      if (neighborFrequency !== undefined && neighborFrequency > strongestNeighborFrequency) {
        strongestNeighborFrequency = neighborFrequency;
      }
    }

    const result =
      strongestNeighborFrequency > entry.frequency
        ? Math.round(strongestNeighborFrequency * BLEED_FACTOR * 100) / 100
        : entry.frequency;
    blendedByWord.set(entry.word, result);

    processed += 1;
    if (processed % 5000 === 0) console.log(`  ...${processed}/${entries.length}`);
  }

  const OLD_INTERFACE_TAIL = '  frequency: number;\n}\n';
  const NEW_INTERFACE_TAIL =
    '  frequency: number;\n' +
    '  // `frequency`, unless a word one or two edits away (see\n' +
    '  // scripts/annotate_levenshtein_frequency.ts) is more common — in which case\n' +
    '  // this is 25% of that stronger neighbour\'s frequency instead.\n' +
    '  levenshtein_zipf_frequency: number;\n' +
    '}\n';
  if (!text.includes(OLD_INTERFACE_TAIL)) {
    throw new Error('DictionaryEntry interface not found in the expected shape, or already annotated');
  }

  const outLines = lines.map((line) => {
    const match = ENTRY_RE.exec(line);
    if (!match) return line;
    const [, indent, word, difficulty, frequency] = match;
    const blended = blendedByWord.get(word);
    return `${indent}{ word: "${word}", difficulty: "${difficulty}", frequency: ${frequency}, levenshtein_zipf_frequency: ${blended} },`;
  });

  const outText = outLines.join('\n').replace(OLD_INTERFACE_TAIL, NEW_INTERFACE_TAIL);
  writeFileSync(DICTIONARY_PATH, outText, 'utf-8');

  console.log(`Blended Levenshtein-neighbour frequency for ${entries.length} entries.`);
}

main();
