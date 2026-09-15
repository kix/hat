import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function main() {
  console.log('Fetching word statistics from Supabase...');

  // 1. Fetch from word_solution_times
  const { data: solutionTimes, error: stErr } = await supabase
    .from('word_solution_times')
    .select('word, time_ms');

  if (stErr) {
    console.error('Error fetching word_solution_times:', stErr);
  }

  // 2. Fetch from games history_data
  const { data: games, error: gErr } = await supabase
    .from('games')
    .select('history_data');

  if (gErr) {
    console.error('Error fetching games:', gErr);
  }

  // Aggregate stats per word: word -> { count, totalTimeMs, maxTimeMs, minTimeMs, times: [] }
  const statsMap = new Map();

  function recordTime(word, timeMs) {
    if (!word || typeof timeMs !== 'number' || timeMs <= 0) return;
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return;

    if (!statsMap.has(cleanWord)) {
      statsMap.set(cleanWord, {
        word: cleanWord,
        count: 0,
        totalTimeMs: 0,
        maxTimeMs: 0,
        minTimeMs: Infinity,
        times: [],
      });
    }

    const item = statsMap.get(cleanWord);
    item.count += 1;
    item.totalTimeMs += timeMs;
    item.maxTimeMs = Math.max(item.maxTimeMs, timeMs);
    item.minTimeMs = Math.min(item.minTimeMs, timeMs);
    item.times.push(timeMs);
  }

  if (solutionTimes) {
    solutionTimes.forEach((row) => {
      recordTime(row.word, row.time_ms);
    });
  }

  if (games) {
    games.forEach((game) => {
      const history = game.history_data || [];
      history.forEach((rec) => {
        if (rec.word && typeof rec.timeMs === 'number' && rec.timeMs > 0) {
          recordTime(rec.word, rec.timeMs);
        }
      });
    });
  }

  const list = Array.from(statsMap.values()).map((item) => {
    const avgTimeMs = Math.round(item.totalTimeMs / item.count);
    return {
      word: item.word,
      count: item.count,
      avgTimeSec: Number((avgTimeMs / 1000).toFixed(1)),
      avgTimeMs,
      maxTimeSec: Number((item.maxTimeMs / 1000).toFixed(1)),
      maxTimeMs: item.maxTimeMs,
      minTimeSec: Number((item.minTimeMs / 1000).toFixed(1)),
    };
  });

  // Sort by average time descending (or by max time if count == 1)
  // Let's provide ranking by avg time and max time
  const byAvgTime = [...list].sort((a, b) => b.avgTimeMs - a.avgTimeMs);
  const byMaxTime = [...list].sort((a, b) => b.maxTimeMs - a.maxTimeMs);

  console.log('\n--- TOP 20 BY AVG TIME ---');
  console.log(JSON.stringify(byAvgTime.slice(0, 20), null, 2));

  console.log('\n--- TOP 20 BY MAX TIME ---');
  console.log(JSON.stringify(byMaxTime.slice(0, 20), null, 2));

  console.log(`\nTotal unique words analyzed: ${list.length}`);
}

main();
