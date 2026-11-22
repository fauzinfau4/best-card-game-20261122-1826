// Card catalogue for Emberfall: every card's identity, suit and effect.
// The four suits are told apart by colour AND shape, never by text alone:
// Flame is a red triangle, Tide a blue droplet, Thorn a green leaf,
// Moon a violet crescent. Playing two cards of one suit in a turn
// triggers that suit's Resonance bonus.

export const SUITS = {
  flame: { name: 'Flame', color: '#ff5a3c', dark: '#c22e12', light: '#ffb199', glyph: 'triangle' },
  tide:  { name: 'Tide',  color: '#38b6ff', dark: '#0f6fb0', light: '#a8dcff', glyph: 'droplet' },
  thorn: { name: 'Thorn', color: '#4ade80', dark: '#1d7a3d', light: '#b5f2c8', glyph: 'leaf' },
  moon:  { name: 'Moon',  color: '#c084fc', dark: '#7a3fd1', light: '#e3c8ff', glyph: 'crescent' },
};

// kind: 'attack' | 'guard' | 'heal' | 'draw' | 'drain' | 'sabotage'
// value: the headline number (damage, block or healing).
// extra: { draw, burn, emberLoss, counter } — secondary effects.
export const CARD_DEFS = [
  { id: 'cinder',   name: 'Cinder Slash', suit: 'flame', cost: 1, kind: 'attack', value: 4,
    text: 'Deal 4 damage.' },
  { id: 'wildfire', name: 'Wildfire',     suit: 'flame', cost: 3, kind: 'attack', value: 8,
    text: 'Deal 8 damage.' },
  { id: 'ignite',   name: 'Ignite',       suit: 'flame', cost: 2, kind: 'attack', value: 3,
    text: 'Deal 3 damage. Burn 2 for 2 turns.', extra: { burn: 2, burnTurns: 2 } },
  { id: 'surge',    name: 'Tidal Surge',  suit: 'tide',  cost: 2, kind: 'attack', value: 5,
    text: 'Deal 5 damage. Heal 2.', extra: { heal: 2 } },
  { id: 'calm',     name: 'Deep Calm',    suit: 'tide',  cost: 1, kind: 'heal',   value: 6,
    text: 'Heal 6 life.' },
  { id: 'undertow', name: 'Undertow',     suit: 'tide',  cost: 2, kind: 'drain',  value: 4,
    text: 'Deal 4 damage. Heal 4.', extra: { heal: 4 } },
  { id: 'whip',     name: 'Thorn Whip',   suit: 'thorn', cost: 1, kind: 'attack', value: 3,
    text: 'Deal 3 damage. Draw 1 card.', extra: { draw: 1 } },
  { id: 'bramble',  name: 'Bramble Guard',suit: 'thorn', cost: 2, kind: 'guard',  value: 8,
    text: 'Gain 8 block.' },
  { id: 'snare',    name: 'Root Snare',   suit: 'thorn', cost: 2, kind: 'sabotage', value: 2,
    text: 'Deal 2 damage. Foe loses 2 ember next turn.', extra: { emberLoss: 2 } },
  { id: 'moonbeam', name: 'Moonbeam',     suit: 'moon',  cost: 2, kind: 'attack', value: 6,
    text: 'Deal 6 damage. +4 if the foe plans to attack.', extra: { counter: 4 } },
  { id: 'eclipse',  name: 'Eclipse',      suit: 'moon',  cost: 4, kind: 'attack', value: 10,
    text: 'Deal 10 damage.' },
  { id: 'starlight',name: 'Starlight Mend', suit: 'moon', cost: 2, kind: 'heal',  value: 4,
    text: 'Heal 4 life. Draw 1 card.', extra: { draw: 1 } },
];

// Resonance: the bonus for playing a second card of the same suit in one turn.
export const RESONANCE = {
  flame: { text: 'Resonance: +3 damage', apply: (s) => { s.player.resonanceDamage += 3; } },
  tide:  { text: 'Resonance: heal 3',    apply: (s) => { s.heal(s.player, 3); } },
  thorn: { text: 'Resonance: +4 block',  apply: (s) => { s.addBlock(s.player, 4); } },
  moon:  { text: 'Resonance: draw 1',    apply: (s) => { s.drawCards(s.player, 1); } },
};

export function buildDeck() {
  // Two copies of each of the 12 cards: a 24-card deck, shuffled by the caller.
  const deck = [];
  for (const def of CARD_DEFS) deck.push({ ...def }, { ...def });
  return deck;
}

export function shuffle(deck, rand) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Small deterministic RNG (mulberry32) so staged screenshots are reproducible.
export function makeRand(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
