// Game state for Emberfall: the duel's rules, turns, resonance, burn,
// block, and the win/loss flow. Rendering lives in render.js, the
// opponent's choices in ai.js; this file owns only what happens.

import { buildDeck, shuffle, RESONANCE, SUITS } from './cards.js';
import { planIntent, planTurn } from './ai.js';

export const MAX_LIFE = 30;
export const HAND_SIZE = 5;

let uidCounter = 1;

function makeFighter(name, isAi) {
  return {
    name, isAi,
    life: MAX_LIFE, maxLife: MAX_LIFE,
    block: 0, ember: 0, maxEmber: 3,
    hand: [], deck: [], discard: [],
    burn: 0, burnTurns: 0,
    lastDamage: 0, resonanceDamage: 0,
    emberLossNext: 0,
  };
}

export function createGame(rand) {
  const state = {
    rand,
    phase: 'title', // title | deal | player | enemy | win | loss
    round: 1,
    player: makeFighter('Wren, Emberkeeper', false),
    ai: makeFighter('Vex, Ash Warden', true),
    suitsPlayed: new Set(),
    log: ['The table is set. Four embers burn.'],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, roundsPlayed: 0, heals: 0 },
    floaters: [],   // {x,y,text,color,life,max}
    particles: [],  // {x,y,vx,vy,life,max,color,size}
    shake: 0,
    playedCard: null, // {card, byAi, timer}
    enemyQueue: [],
    enemyTimer: 0,
    dealTimer: 0,
    intent: null,
    hoverIndex: -1,
    selectedIndex: -1,
    muted: false,
    winTimer: 0,
    onSound: null, // set by main.js: (name) => void
  };

  state.sound = (name) => { if (state.onSound && !state.muted) state.onSound(name); };
  state.logLine = (text) => { state.log.push(text); if (state.log.length > 5) state.log.shift(); };
  state.addFloater = (x, y, text, color) => {
    state.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 });
  };
  state.burst = (x, y, color, n = 18, speed = 260) => {
    for (let i = 0; i < n; i++) {
      const a = state.rand() * Math.PI * 2;
      const v = speed * (0.3 + state.rand() * 0.7);
      state.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
        life: 0.6 + state.rand() * 0.5, max: 1.1, color, size: 2 + state.rand() * 4,
      });
    }
  };

  // ---- core rules -------------------------------------------------------
  state.drawCards = (fighter, n) => {
    for (let i = 0; i < n; i++) {
      if (fighter.deck.length === 0) {
        if (fighter.discard.length === 0) return;
        fighter.deck = shuffle(fighter.discard.splice(0), state.rand);
        state.logLine(`${fighter.name} reshuffles the discard.`);
      }
      const card = fighter.deck.pop();
      card.uid = uidCounter++;
      card.x = 640; card.y = 400; // dealt from the deck pile, slides out
      card.tx = 0; card.ty = 0; card.scale = 1; card.faceUp = !fighter.isAi;
      card.played = false;
      fighter.hand.push(card);
    }
  };

  state.heal = (fighter, amount) => {
    const before = fighter.life;
    fighter.life = Math.min(fighter.maxLife, fighter.life + amount);
    const gained = fighter.life - before;
    if (gained > 0) {
      state.stats.heals += gained;
      state.addFloater(fighter.isAi ? 640 : 640, fighter.isAi ? 150 : 640, `+${gained} ♥`, '#7ee2a0');
    }
  };

  state.addBlock = (fighter, amount) => {
    fighter.block += amount;
    state.addFloater(640, fighter.isAi ? 150 : 640, `+${amount} block`, '#7ec8ff');
  };

  state.dealDamage = (target, amount, sourceName) => {
    let remaining = amount;
    if (target.block > 0) {
      const absorbed = Math.min(target.block, remaining);
      target.block -= absorbed;
      remaining -= absorbed;
      if (absorbed > 0) state.addFloater(640, target.isAi ? 150 : 640, `-${absorbed} blocked`, '#9db8d6');
    }
    if (remaining > 0) {
      target.life = Math.max(0, target.life - remaining);
      state.addFloater(640, target.isAi ? 170 : 660, `-${remaining}`, '#ff6b5e');
      state.shake = Math.min(14, 4 + remaining);
      state.burst(640, target.isAi ? 170 : 660, '#ffb199', 14 + remaining);
      if (target.isAi) state.stats.damageDealt += remaining;
      else state.stats.damageTaken += remaining;
      target.lastDamage = remaining;
    }
    return remaining;
  };

  state.applyBurn = (fighter) => {
    if (fighter.burnTurns > 0 && fighter.burn > 0) {
      state.logLine(`${fighter.name} burns for ${fighter.burn}.`);
      state.dealDamage(fighter, fighter.burn, 'burn');
      fighter.burnTurns -= 1;
      if (fighter.burnTurns === 0) fighter.burn = 0;
    }
  };

  // ---- playing a card ---------------------------------------------------
  state.playCard = (fighter, index) => {
    const card = fighter.hand[index];
    if (!card || card.cost > fighter.ember) return false;
    fighter.ember -= card.cost;
    fighter.hand.splice(index, 1);
    state.stats.cardsPlayed += 1;
    state.playedCard = { card, byAi: fighter.isAi, timer: 0.55 };
    state.sound('play');
    state.burst(640, 400, SUITS[card.suit].color, 10, 160);

    const foe = fighter.isAi ? state.player : state.ai;
    const me = fighter;
    let dmg = card.value;
    if (!fighter.isAi && fighter.resonanceDamage > 0) {
      dmg += fighter.resonanceDamage; // flame resonance bank, spent on this hit
      fighter.resonanceDamage = 0;
    }
    if (card.kind === 'attack' || card.kind === 'drain' || card.kind === 'sabotage') {
      if (card.extra && card.extra.counter && foe === state.ai && state.intent && state.intent.kind === 'attack') {
        dmg += card.extra.counter;
        state.logLine('Moonbeam catches Vex mid-strike! +4.');
      }
      state.dealDamage(foe, dmg, card.name);
      state.logLine(`${me.name} plays ${card.name} — ${dmg} damage.`);
      if (card.extra && card.extra.heal) state.heal(me, card.extra.heal);
      if (card.extra && card.extra.burn) {
        foe.burn = card.extra.burn; foe.burnTurns = card.extra.burnTurns;
        state.logLine(`${foe.name} is burning.`);
      }
      if (card.extra && card.extra.emberLoss) {
        foe.emberLossNext = card.extra.emberLoss;
        state.logLine(`${foe.name} loses ${card.extra.emberLoss} ember next turn.`);
      }
    } else if (card.kind === 'guard') {
      state.addBlock(me, card.value);
      state.logLine(`${me.name} raises ${card.value} block.`);
    } else if (card.kind === 'heal') {
      state.heal(me, card.value);
      state.logLine(`${me.name} heals ${card.value}.`);
    }
    if (card.extra && card.extra.draw) state.drawCards(me, card.extra.draw);

    // Resonance: second card of a suit in one turn triggers its bonus.
    if (!fighter.isAi) {
      if (state.suitsPlayed.has(card.suit)) {
        const res = RESONANCE[card.suit];
        state.logLine(`Resonance — ${SUITS[card.suit].name}! ${res.text}.`);
        res.apply(state);
        state.sound('resonance');
      } else {
        state.suitsPlayed.add(card.suit);
      }
    }
    fighter.discard.push(card);
    state.checkEnd();
    return true;
  };

  state.checkEnd = () => {
    if (state.phase === 'win' || state.phase === 'loss') return;
    if (state.ai.life <= 0) {
      state.phase = 'win';
      state.winTimer = 0;
      state.sound('win');
      state.logLine('Vex falls. The embers are yours.');
      for (let i = 0; i < 5; i++) state.burst(300 + i * 170, 300, ['#ff5a3c', '#38b6ff', '#4ade80', '#c084fc'][i], 26, 340);
    } else if (state.player.life <= 0) {
      state.phase = 'loss';
      state.winTimer = 0;
      state.sound('loss');
      state.logLine('The last ember gutters out.');
    }
  };

  // ---- turns ------------------------------------------------------------
  state.startDuel = () => {
    state.player = makeFighter('Wren, Emberkeeper', false);
    state.ai = makeFighter('Vex, Ash Warden', true);
    state.round = 1;
    state.stats = { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, roundsPlayed: 0, heals: 0 };
    state.log = ['The duel begins. Wren faces Vex, the Ash Warden.'];
    state.floaters = []; state.particles = [];
    state.player.deck = shuffle(buildDeck(), state.rand);
    state.ai.deck = shuffle(buildDeck(), state.rand);
    state.beginRound();
  };

  state.beginRound = () => {
    state.stats.roundsPlayed += 1;
    state.suitsPlayed = new Set();
    state.player.resonanceDamage = 0;
    const maxEmber = Math.min(3 + state.round - 1, 10);
    for (const f of [state.player, state.ai]) {
      f.maxEmber = maxEmber;
      f.ember = Math.max(0, maxEmber - f.emberLossNext);
      f.emberLossNext = 0;
      f.block = 0;
    }
    state.applyBurn(state.player);
    state.applyBurn(state.ai);
    state.checkEnd();
    if (state.phase === 'win' || state.phase === 'loss') return;
    state.drawCards(state.player, HAND_SIZE - state.player.hand.length);
    state.drawCards(state.ai, HAND_SIZE - state.ai.hand.length);
    state.intent = planIntent(state.ai, state.player);
    state.phase = 'deal';
    state.dealTimer = 0.9;
    state.logLine(`Round ${state.round} — ${maxEmber} ember each.`);
    state.sound('deal');
  };

  state.endPlayerTurn = () => {
    if (state.phase !== 'player') return;
    state.phase = 'enemy';
    state.enemyQueue = planTurn(state.ai, state.player);
    state.enemyTimer = 0.7;
    state.selectedIndex = -1;
    state.logLine('Vex takes the table…');
  };

  state.enemyStep = (dt) => {
    state.enemyTimer -= dt;
    if (state.enemyTimer > 0) return;
    if (state.enemyQueue.length === 0) {
      state.round += 1;
      state.beginRound();
      return;
    }
    const card = state.enemyQueue.shift();
    const idx = state.ai.hand.indexOf(card);
    if (idx >= 0) state.playCard(state.ai, idx);
    state.enemyTimer = 0.85;
  };

  // ---- per-frame update ---------------------------------------------------
  state.update = (dt) => {
    state.shake = Math.max(0, state.shake - dt * 30);
    for (const f of state.floaters) f.life -= dt;
    state.floaters = state.floaters.filter((f) => f.life > 0);
    for (const p of state.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    if (state.playedCard) {
      state.playedCard.timer -= dt;
      if (state.playedCard.timer <= 0) state.playedCard = null;
    }
    if (state.phase === 'deal') {
      state.dealTimer -= dt;
      if (state.dealTimer <= 0) state.phase = 'player';
    } else if (state.phase === 'enemy') {
      state.enemyStep(dt);
    } else if (state.phase === 'win' || state.phase === 'loss') {
      state.winTimer += dt;
      if (state.winTimer > 1.2 && state.rand() < dt * 2) {
        state.burst(200 + state.rand() * 880, 200 + state.rand() * 300,
          ['#ff5a3c', '#38b6ff', '#4ade80', '#c084fc'][Math.floor(state.rand() * 4)], 8, 200);
      }
    }
    // Cards glide toward their targets.
    const lerp = (a, b, t) => a + (b - a) * Math.min(1, t * 10);
    for (const f of [state.player, state.ai]) {
      for (const c of f.hand) {
        c.x = lerp(c.x, c.tx, dt);
        c.y = lerp(c.y, c.ty, dt);
      }
    }
    if (state.playedCard) {
      const c = state.playedCard.card;
      c.x = lerp(c.x, 640, dt);
      c.y = lerp(c.y, 400, dt);
    }
  };

  return state;
}
