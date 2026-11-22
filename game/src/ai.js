// Vex, the Ash Warden — the opponent AI for Emberfall.
//
// The AI is readable and counterable by design: at the start of your turn
// it commits to its first card and shows you its intent ("Vex plans:
// Strike 8"), so Moonbeam's counter and your blocks are real decisions,
// not guesses. After that first card it plays greedily: heal when hurt,
// guard when you threaten a big hit, otherwise the biggest damage it can
// afford, and it never spends ember it does not have.

import { SUITS } from './cards.js';

export function planIntent(ai, player) {
  // Choose the first card of the coming enemy turn now, and describe it.
  if (ai.hand.length === 0) return { label: 'Vex plans: Pass', kind: 'pass', damage: 0 };
  const best = chooseCard(ai, player, true);
  if (!best) return { label: 'Vex plans: Pass', kind: 'pass', damage: 0 };
  return describeIntent(best.card, ai);
}

export function describeIntent(card, ai) {
  const suit = SUITS[card.suit];
  if (card.kind === 'attack' || card.kind === 'drain' || card.kind === 'sabotage') {
    return { label: `Vex plans: Strike ${card.value} · ${suit.name}`, kind: 'attack', damage: card.value, card };
  }
  if (card.kind === 'guard') {
    return { label: `Vex plans: Guard ${card.value} · ${suit.name}`, kind: 'guard', damage: 0, card };
  }
  return { label: `Vex plans: Mend ${card.value} · ${suit.name}`, kind: 'heal', damage: 0, card };
}

// Pick the best affordable card. firstPick=true keeps the intent honest:
// the AI's first play is the card it announced.
export function chooseCard(ai, player, firstPick = false) {
  const affordable = ai.hand
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.cost <= ai.ember);
  if (affordable.length === 0) return null;

  const score = ({ card }) => {
    let s = 0;
    if (card.kind === 'attack' || card.kind === 'drain' || card.kind === 'sabotage') {
      s = card.value * 2 - card.cost;
      if (player.block >= card.value) s -= 3; // don't waste a strike on a wall
      if (card.extra && card.extra.counter && player.intentAttack) s += 4;
      if (card.extra && card.extra.burn) s += 2;
    } else if (card.kind === 'guard') {
      s = player.lastDamage >= 6 ? card.value : card.value * 0.4;
      if (ai.life >= 26) s -= 4; // healthy wardens don't hide
    } else if (card.kind === 'heal') {
      s = ai.life <= 14 ? card.value * 2 : card.value * 0.3;
    }
    if (card.extra && card.extra.draw) s += 1.5;
    if (card.extra && card.extra.emberLoss) s += 2;
    return s;
  };
  affordable.sort((a, b) => score(b) - score(a));
  return affordable[0];
}

// Build the enemy's whole turn as a queue of card plays, first card first.
export function planTurn(ai, player) {
  const plays = [];
  const sim = { ...ai, hand: [...ai.hand], ember: ai.ember };
  const intentCard = ai.intent && ai.intent.card;
  if (intentCard) {
    const idx = sim.hand.indexOf(intentCard);
    if (idx >= 0 && intentCard.cost <= sim.ember) {
      plays.push(intentCard);
      sim.hand.splice(idx, 1);
      sim.ember -= intentCard.cost;
    }
  }
  // Then keep playing while something affordable is worth it.
  for (let guard = 0; guard < 6; guard++) {
    const pick = chooseCard(sim, player);
    if (!pick) break;
    if (pick.card.kind === 'heal' && sim.life > 24) break;
    if (pick.card.kind === 'guard' && sim.life > 24 && player.lastDamage < 5) break;
    plays.push(pick.card);
    sim.hand.splice(pick.i, 1);
    sim.ember -= pick.card.cost;
  }
  return plays;
}
