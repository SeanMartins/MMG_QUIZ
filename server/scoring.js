// Kahoot-style scoring: correct answers earn between 50% and 100% of the
// question's base points depending on how quickly the team answered.
export function computePoints({ correct, points, timeTakenMs, timeLimitSeconds }) {
  if (!correct) return 0;
  // Floor of 50% keeps a correct-but-slow answer worth something,
  // so speed rewards effort without fully punishing careful teams.
  const timeLimitMs = timeLimitSeconds * 1000;
  const clampedTime = Math.min(Math.max(timeTakenMs, 0), timeLimitMs);
  const remainingFraction = 1 - clampedTime / timeLimitMs;
  return Math.round(points * (0.5 + 0.5 * remainingFraction));
}
