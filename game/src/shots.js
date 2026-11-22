// Screenshot staging: puts the live game into a chosen moment so the
// screenshots show the duel at its best — the title, a mid-duel table
// with a card in play, the victory flourish and the defeat screen.
// Every staged frame is still the game's own code rendering its own
// state; nothing is drawn for the camera that the game cannot do.
// Usage: index.html?shot=title | play | win | loss

import { CARD_DEFS } from './cards.js';
import { layoutHands } from './render.js';
import { planIntent } from './ai.js';

function makeCardInstance(def, x, y) {
  return { ...def, uid: 1000 + Math.floor(Math.random() * 9000), x, y, tx: x, ty: y, scale: 1, faceUp: true, played: false };
}

function findDef(id) {
  return CARD_DEFS.find((d) => d.id === id);
}

function snapHands(state) {
  layoutHands(state);
  for (const f of [state.player, state.ai]) {
    for (const c of f.hand) { c.x = c.tx; c.y = c.ty; }
  }
}

export function stageShot(state, name) {
  if (name === 'title') {
    state.phase = 'title';
    return;
  }
  state.startDuel();
  if (name === 'play') {
    // Round 3, mid-duel: Wren ahead on life, a Wildfire on the table,
    // a full hand with a playable Moonbeam against Vex's telegraphed strike.
    state.round = 3;
    state.player.life = 24;
    state.player.block = 4;
    state.player.maxEmber = 5;
    state.player.ember = 5;
    state.ai.life = 17;
    state.ai.maxEmber = 5;
    state.ai.ember = 2;
    state.player.hand = ['cinder', 'wildfire', 'bramble', 'moonbeam', 'starlight'].map((id) => makeCardInstance(findDef(id), 640, 400));
    state.ai.hand = ['ignite', 'surge', 'whip', 'eclipse', 'calm'].map((id) => makeCardInstance(findDef(id), 640, 64));
    for (const c of state.ai.hand) c.faceUp = false;
    state.suitsPlayed.add('flame');
    state.playedCard = { card: makeCardInstance(findDef('wildfire'), 640, 400), byAi: false, timer: 10 };
    state.playedCard.card.x = 640; state.playedCard.card.y = 400;
    // Recompute the intent from the staged hand so the bubble and the log agree.
    state.intent = planIntent(state.ai, state.player);
    state.log = [
      'Wren plays Wildfire — 8 damage.',
      'Resonance — Flame! +3 damage.',
      state.intent.label,
      'Round 3 — 5 ember each.',
    ];
    state.stats.damageDealt = 13;
    state.stats.cardsPlayed = 6;
    state.stats.roundsPlayed = 3;
    state.phase = 'player';
    snapHands(state);
  } else if (name === 'win') {
    state.round = 4;
    state.player.life = 18;
    state.player.block = 2;
    state.ai.life = 0;
    state.stats = { damageDealt: 34, damageTaken: 12, cardsPlayed: 11, roundsPlayed: 4, heals: 6 };
    state.log = ['Wren plays Eclipse — 10 damage.', 'Vex falls. The embers are yours.'];
    state.phase = 'win';
    state.winTimer = 0.5;
    for (let i = 0; i < 5; i++) state.burst(300 + i * 170, 300, ['#ff5a3c', '#38b6ff', '#4ade80', '#c084fc'][i], 20, 300);
  } else if (name === 'loss') {
    state.round = 3;
    state.player.life = 0;
    state.ai.life = 9;
    state.stats = { damageDealt: 21, damageTaken: 30, cardsPlayed: 8, roundsPlayed: 3, heals: 4 };
    state.log = ['Vex plays Eclipse — 10 damage.', 'The last ember gutters out.'];
    state.phase = 'loss';
    state.winTimer = 0.5;
  }
}
