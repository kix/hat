#!/usr/bin/env python3
"""Adds a `frequency` field to every entry in src/data/dictionary.ts, based on
the word's Zipf frequency in Russian according to rspeer/wordfreq
(https://github.com/rspeer/wordfreq). Higher = more common; unknown words
score 0.0.

Usage:
    pip install wordfreq
    python3 scripts/annotate_word_frequency.py
"""
import re
from pathlib import Path

from wordfreq import zipf_frequency

DICTIONARY_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "dictionary.ts"
LANG = "ru"

ENTRY_RE = re.compile(r'^(?P<indent>\s*)\{ word: "(?P<word>[^"]*)", difficulty: "(?P<difficulty>\w+)" \},\s*$')

OLD_INTERFACE = (
    "export interface DictionaryEntry {\n"
    "  word: string;\n"
    "  difficulty: DifficultyLevel;\n"
    "}\n"
)
NEW_INTERFACE = (
    "export interface DictionaryEntry {\n"
    "  word: string;\n"
    "  difficulty: DifficultyLevel;\n"
    "  // Zipf frequency in Russian, per rspeer/wordfreq — higher is more common,\n"
    "  // 0 means the word wasn't found in its frequency lists.\n"
    "  frequency: number;\n"
    "}\n"
)


def main() -> None:
    text = DICTIONARY_PATH.read_text(encoding="utf-8")
    if OLD_INTERFACE not in text:
        raise SystemExit("DictionaryEntry interface not found or already annotated")
    text = text.replace(OLD_INTERFACE, NEW_INTERFACE, 1)

    annotated = 0

    def annotate_line(match: re.Match) -> str:
        nonlocal annotated
        annotated += 1
        indent, word, difficulty = match.group("indent", "word", "difficulty")
        frequency = round(zipf_frequency(word.lower(), LANG), 2)
        return f'{indent}{{ word: "{word}", difficulty: "{difficulty}", frequency: {frequency} }},\n'

    lines = text.splitlines(keepends=True)
    out_lines = [ENTRY_RE.sub(annotate_line, line) for line in lines]
    DICTIONARY_PATH.write_text("".join(out_lines), encoding="utf-8")

    print(f"Annotated {annotated} entries with wordfreq Zipf frequency ({LANG}).")


if __name__ == "__main__":
    main()
