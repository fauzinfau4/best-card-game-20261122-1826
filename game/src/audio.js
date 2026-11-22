// Synthesized sound for Emberfall: no audio files, everything is built
// live with WebAudio so the game stays a handful of static files.

let ctx = null;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  const ac = audioCtx();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playSound(name) {
  try {
    if (name === 'play') { tone(520, 0.12, 'triangle', 0.14, 0, 780); tone(180, 0.1, 'sine', 0.1, 0, 90); }
    else if (name === 'deal') { tone(300, 0.08, 'triangle', 0.08, 0, 420); tone(340, 0.08, 'triangle', 0.08, 0.08, 460); }
    else if (name === 'resonance') { tone(660, 0.14, 'sine', 0.12); tone(880, 0.16, 'sine', 0.12, 0.07); tone(1320, 0.2, 'sine', 0.08, 0.14); }
    else if (name === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, i * 0.12));
    } else if (name === 'loss') {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sine', 0.12, i * 0.14));
    } else if (name === 'click') { tone(700, 0.05, 'square', 0.05); }
  } catch { /* audio is decoration; never break the game */ }
}
