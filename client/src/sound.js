let audioCtx;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function noiseHit(ctx, time, duration, gain) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1600;
  bandpass.Q.value = 0.6;

  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + duration);

  noise.connect(bandpass).connect(env).connect(ctx.destination);
  noise.start(time);
  noise.stop(time + duration);
}

// Synthesized snare-style drum roll that accelerates into a final crash.
// Returns the total duration in milliseconds so callers can time the payoff.
export function playDrumRoll(totalDurationSec = 1.8) {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.05;
  let t = start;
  let interval = 0.15;
  const rollEnd = start + totalDurationSec;

  while (t < rollEnd) {
    noiseHit(ctx, t, Math.min(interval * 0.85, 0.09), 0.3);
    t += interval;
    interval = Math.max(0.032, interval * 0.87);
  }

  noiseHit(ctx, rollEnd, 0.6, 0.65);

  return Math.round((rollEnd + 0.6 - start) * 1000);
}
