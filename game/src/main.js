// Emberfall entry point: wires the state, the renderer, the input and
// the sound together, runs the frame loop, and stages screenshots.

import { createGame } from './state.js';
import { render, layoutHands, W, H } from './render.js';
import { attachInput } from './input.js';
import { playSound } from './audio.js';
import { stageShot } from './shots.js';
import { makeRand } from './cards.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261122);
const shot = params.get('shot');

const state = createGame(makeRand(seed));
state.onSound = playSound;
attachInput(canvas, state);

// Hi-DPI: keep the 1280x800 layout crisp on retina displays.
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

if (shot) stageShot(state, shot);

window.__game = { state, canvas };

let last = performance.now();
let shotReadyAt = shot ? last + 1600 : last + 400;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.update(dt);
  layoutHands(state);
  render(ctx, state);
  if (!window.__shotReady && now >= shotReadyAt) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
