/** Tiny WebAudio synth. Unlock on first gesture. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.06, slide = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  shoot: () => beep(880, 0.06, "square", 0.035, -420),
  jump: () => beep(240, 0.09, "triangle", 0.05, 180),
  hit: () => beep(140, 0.12, "sawtooth", 0.07, -80),
  hurt: () => beep(90, 0.18, "square", 0.06, -40),
  pickup: () => beep(660, 0.14, "sine", 0.05, 400),
  boom: () => beep(70, 0.28, "sawtooth", 0.08, -30),
  ui: () => beep(520, 0.08, "triangle", 0.04, 80),
  shop: () => beep(400, 0.12, "sine", 0.05, 220),
  extract: () => beep(280, 0.4, "triangle", 0.06, 420),
  level: () => beep(620, 0.22, "sine", 0.05, 500),
};
