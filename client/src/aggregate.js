// Shared aggregation helpers used both for the live-updating host view
// (accumulating one state:live-answer at a time) and the final state:reveal
// view (computed once from the full results array) — same shape either way.

export function countsByOption(optionCount, answerIndexes) {
  const counts = new Array(optionCount).fill(0);
  answerIndexes.forEach((idx) => {
    if (idx !== null && idx !== undefined && idx >= 0 && idx < optionCount) counts[idx]++;
  });
  return counts;
}

const STOPWORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su',
  'per', 'tra', 'fra', 'e', 'o', 'ma', 'che', 'non', 'è', 'sono', 'ho', 'ha', 'the', 'a', 'an',
  'and', 'or', 'is', 'are', 'of', 'to', 'in',
]);

export function wordFrequency(texts) {
  const freq = new Map();
  texts.forEach((raw) => {
    (raw || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}']+/u)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      .forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  });
  return Array.from(freq.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
}

export function ratingDistribution(values, min, max) {
  const counts = {};
  for (let i = min; i <= max; i++) counts[i] = 0;
  let sum = 0;
  let n = 0;
  values.forEach((v) => {
    if (v === null || v === undefined) return;
    if (counts[v] !== undefined) counts[v]++;
    sum += v;
    n++;
  });
  return { counts, average: n ? sum / n : null, count: n };
}
