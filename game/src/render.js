// All canvas drawing for Emberfall: the moody table, the cards (colour AND
// shape per suit), the HUD with life totals and ember, the intent bubble,
// the title / win / loss screens, particles and floating damage numbers.

import { SUITS } from './cards.js';

export const W = 1280;
export const H = 800;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Suit glyphs, drawn as shapes so a suit reads without any text.
export function drawGlyph(ctx, glyph, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.beginPath();
  if (glyph === 'triangle') {
    ctx.moveTo(cx, cy - s * 0.55);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
    ctx.lineTo(cx - s * 0.5, cy + s * 0.4);
    ctx.closePath(); ctx.fill();
  } else if (glyph === 'droplet') {
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.bezierCurveTo(cx + s * 0.45, cy - s * 0.05, cx + s * 0.38, cy + s * 0.45, cx, cy + s * 0.45);
    ctx.bezierCurveTo(cx - s * 0.38, cy + s * 0.45, cx - s * 0.45, cy - s * 0.05, cx, cy - s * 0.6);
    ctx.closePath(); ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.moveTo(cx - s * 0.45, cy + s * 0.4);
    ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.5, cx + s * 0.45, cy - s * 0.4);
    ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.5, cx - s * 0.45, cy + s * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.3); ctx.quadraticCurveTo(cx, cy, cx + s * 0.35, cy - s * 0.3); ctx.stroke();
  } else { // crescent: outer disc minus an offset disc, one path, nonzero winding
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.22, cy - s * 0.12, s * 0.44, 0, Math.PI * 2, true);
    ctx.fill();
  }
}

function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#2a1e3f'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#6b4fa1'; ctx.stroke();
  rr(ctx, x + 6, y + 6, w - 12, h - 12, 7);
  ctx.strokeStyle = 'rgba(255,150,60,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ff8c3c';
  ctx.fillRect(-w * 0.14, -w * 0.14, w * 0.28, w * 0.28);
  ctx.restore();
}

export function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const suit = SUITS[card.suit];
  const playable = opts.playable !== false;
  ctx.save();
  if (opts.hover) { ctx.shadowColor = suit.color; ctx.shadowBlur = 22; }
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = opts.dim ? '#cfc4a8' : '#f7ead0';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = opts.selected ? 5 : 3;
  ctx.strokeStyle = opts.selected ? '#ffd166' : suit.color;
  ctx.stroke();
  // Cost gem, top left.
  ctx.beginPath(); ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = card.cost <= (opts.ember ?? 99) ? '#ff8c3c' : '#8a7f72'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff2d9'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(w * 0.11)}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 20, y + 21);
  // Suit glyph, top right.
  drawGlyph(ctx, suit.glyph, x + w - 22, y + 20, 22, suit.color);
  // Big glyph centre.
  drawGlyph(ctx, suit.glyph, x + w / 2, y + h * 0.36, w * 0.42, suit.color);
  // Name.
  ctx.fillStyle = '#2b2118';
  ctx.font = `bold ${Math.round(w * 0.095)}px Georgia, serif`;
  ctx.fillText(card.name, x + w / 2, y + h * 0.58);
  // Headline number.
  const label = card.kind === 'guard' ? 'BLOCK' : card.kind === 'heal' ? 'HEAL' : 'DMG';
  ctx.font = `bold ${Math.round(w * 0.2)}px Georgia, serif`;
  ctx.fillStyle = suit.dark;
  ctx.fillText(String(card.value), x + w / 2, y + h * 0.72);
  ctx.font = `bold ${Math.round(w * 0.07)}px Georgia, serif`;
  ctx.fillStyle = '#6b5a44';
  ctx.fillText(label, x + w / 2, y + h * 0.79);
  // Effect text.
  ctx.font = `${Math.round(w * 0.068)}px Georgia, serif`;
  ctx.fillStyle = '#4a3d2c';
  const lines = wrapText(ctx, card.text, w - 16);
  lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, x + w / 2, y + h * 0.87 + i * Math.round(w * 0.075)));
  if (!playable) {
    ctx.fillStyle = 'rgba(60,50,40,0.35)';
    rr(ctx, x, y, w, h, 12); ctx.fill();
  }
  ctx.restore();
}

function drawHpBar(ctx, x, y, w, life, maxLife, block, burn, label, alignRight) {
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = '#f3e6c8';
  ctx.fillText(label, alignRight ? x + w : x, y - 8);
  // Hearts.
  ctx.font = '20px serif';
  ctx.fillStyle = '#ff6b5e';
  const hearts = '♥'.repeat(Math.max(0, Math.ceil(life / 3)));
  ctx.fillText(hearts, alignRight ? x + w : x, y + 44);
  rr(ctx, x, y, w, 16, 8);
  ctx.fillStyle = '#3a2c22'; ctx.fill();
  rr(ctx, x, y, w * Math.max(0, life / maxLife), 16, 8);
  ctx.fillStyle = life > 10 ? '#e0483e' : '#ff8c3c'; ctx.fill();
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${life} / ${maxLife}`, x + w / 2, y + 13);
  if (block > 0) {
    ctx.fillStyle = '#7ec8ff';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(`🛡 ${block} block`, alignRight ? x + w : x, y + 66);
  }
  if (burn > 0) {
    ctx.fillStyle = '#ff9a3c';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(`🔥 burn ${burn}`, alignRight ? x + w : x, y + 88);
  }
}

// Hand targets: where each card glides to. Called every frame.
export function layoutHands(state) {
  const pw = state.player.hand;
  pw.forEach((c, i) => {
    const cx = 640 + (i - (pw.length - 1) / 2) * 132;
    c.tx = cx - 75;
    c.ty = (state.hoverIndex === i || state.selectedIndex === i) ? 545 : 572;
  });
  state.ai.hand.forEach((c, i) => {
    const cx = 640 + (i - (state.ai.hand.length - 1) / 2) * 74;
    c.tx = cx - 31;
    c.ty = 64;
  });
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state.shake > 0.5) {
    ctx.translate((state.rand() - 0.5) * state.shake, (state.rand() - 0.5) * state.shake);
  }
  drawTable(ctx, state);
  if (state.phase !== 'title') drawDuel(ctx, state);
  drawParticles(ctx, state);
  drawFloaters(ctx, state);
  if (state.phase === 'title') drawTitle(ctx, state);
  if (state.phase === 'win') drawEndScreen(ctx, state, true);
  if (state.phase === 'loss') drawEndScreen(ctx, state, false);
  ctx.restore();
}

function drawTable(ctx, state) {
  // Felt table, radial glow, faint suit sigils in the corners.
  const g = ctx.createRadialGradient(640, 380, 80, 640, 400, 720);
  g.addColorStop(0, '#3d2b4d');
  g.addColorStop(0.55, '#2a1c33');
  g.addColorStop(1, '#171021');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.10;
  const corners = [
    ['triangle', 70, 90, '#ff5a3c'], ['droplet', 1210, 90, '#38b6ff'],
    ['leaf', 70, 710, '#4ade80'], ['crescent', 1210, 710, '#c084fc'],
  ];
  for (const [glyph, x, y, color] of corners) drawGlyph(ctx, glyph, x, y, 90, color);
  ctx.globalAlpha = 1;
  // Centre emblem.
  ctx.strokeStyle = 'rgba(255,209,102,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(640, 400, 120, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(640, 400, 96, 0, Math.PI * 2); ctx.stroke();
}

function drawDuel(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, 52);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('EMBERFALL', 20, 35);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#d8c9a8';
  ctx.fillText(`Round ${state.round}  ·  Damage dealt ${state.stats.damageDealt}  ·  Cards played ${state.stats.cardsPlayed}`, 190, 34);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9db8d6';
  ctx.fillText('1–5 play card · Enter end turn · R restart · M mute', 1260, 34);

  // Enemy portrait + HP.
  ctx.beginPath(); ctx.arc(96, 150, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2c4d'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#c084fc'; ctx.stroke();
  drawGlyph(ctx, 'crescent', 96, 150, 44, '#c084fc');
  ctx.font = 'bold 13px Georgia, serif'; ctx.fillStyle = '#e3c8ff'; ctx.textAlign = 'center';
  ctx.fillText('VEX', 96, 212);
  drawHpBar(ctx, 170, 128, 340, state.ai.life, state.ai.maxLife, state.ai.block, state.ai.burn, 'Vex, the Ash Warden', false);
  // Enemy hand (card backs).
  for (const c of state.ai.hand) drawCardBack(ctx, c.x, c.y, 62, 88);
  // Intent bubble — the readable, counterable tell. Drawn after the hand
  // so it sits on top, clear of the card backs.
  if (state.intent && (state.phase === 'player' || state.phase === 'deal')) {
    const bubble = state.intent.label;
    ctx.font = 'bold 17px Georgia, serif';
    const bw = ctx.measureText(bubble).width + 36;
    rr(ctx, 560, 185, bw, 40, 20);
    ctx.fillStyle = state.intent.kind === 'attack' ? 'rgba(224,72,62,0.92)' : 'rgba(58,90,140,0.92)';
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(bubble, 578, 211);
    ctx.fillStyle = '#ffd166';
    ctx.font = '15px Georgia, serif';
    ctx.fillText('READ IT — Moonbeam hits harder when Vex strikes', 578, 248);
  }

  // Player HP, bottom left above the hand.
  drawHpBar(ctx, 40, 700, 300, state.player.life, state.player.maxLife, state.player.block, state.player.burn, 'Wren, Emberkeeper', false);

  // Ember orbs.
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = '#ffb199';
  ctx.fillText('EMBER', 380, 712);
  for (let i = 0; i < state.player.maxEmber; i++) {
    ctx.beginPath(); ctx.arc(392 + i * 24, 732, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < state.player.ember ? '#ff8c3c' : '#4a3a30';
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffd166'; ctx.stroke();
  }
  ctx.fillStyle = '#d8c9a8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(`${state.player.ember} / ${state.player.maxEmber}`, 392 + state.player.maxEmber * 24 + 8, 737);

  // Deck + discard counts.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, 40, 600, 92, 60, 8); ctx.fill();
  ctx.fillStyle = '#d8c9a8'; ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(`Deck ${state.player.deck.length}`, 86, 626);
  ctx.fillText(`Discard ${state.player.discard.length}`, 86, 646);

  // Played card, centre table.
  if (state.playedCard) {
    const c = state.playedCard.card;
    drawCard(ctx, c, c.x - 82, c.y - 115, 164, 230, { ember: 99 });
  }

  // Player hand.
  state.player.hand.forEach((c, i) => {
    const hover = state.hoverIndex === i;
    const selected = state.selectedIndex === i;
    const w = hover ? 162 : 150;
    const h = hover ? 226 : 210;
    const x = c.x - (w - 150) / 2;
    const y = c.y - (h - 210) / 2;
    drawCard(ctx, c, x, y, w, h, {
      hover, selected, ember: state.player.ember,
      playable: c.cost <= state.player.ember && state.phase === 'player',
    });
    if (hover || selected) {
      ctx.font = 'bold 13px Georgia, serif';
      ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, c.x + 75, c.y - 12);
    }
  });

  // End Turn button.
  const canEnd = state.phase === 'player';
  rr(ctx, 1060, 700, 180, 56, 12);
  ctx.fillStyle = canEnd ? '#ff8c3c' : '#4a3a30'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffd166'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(state.phase === 'enemy' ? 'Vex is playing…' : 'END TURN ⏎', 1150, 736);

  // Resonance tracker, left column: which suits you have played this turn.
  // Log and hint, left column too — clear of the played card in the centre.
  if (state.phase !== 'win' && state.phase !== 'loss') {
    ctx.textAlign = 'left'; ctx.font = '15px Georgia, serif';
    state.log.slice(-4).forEach((line, i) => {
      ctx.fillStyle = `rgba(216,201,168,${0.45 + i * 0.18})`;
      ctx.fillText(line, 40, 300 + i * 20);
    });
    ctx.fillStyle = '#9db8d6';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText('Two cards of one suit in a turn', 40, 400);
    ctx.fillText('trigger its Resonance.', 40, 420);
    ctx.textAlign = 'left'; ctx.font = 'bold 14px Georgia, serif';
    ctx.fillStyle = '#d8c9a8';
    ctx.fillText('Resonance this turn:', 40, 460);
    let rx = 52;
    for (const key of Object.keys(SUITS)) {
      const played = state.suitsPlayed.has(key);
      ctx.globalAlpha = played ? 1 : 0.25;
      drawGlyph(ctx, SUITS[key].glyph, rx, 488, 22, SUITS[key].color);
      ctx.globalAlpha = 1;
      rx += 34;
    }
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, state) {
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - (1.1 - f.life) * 50);
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(10,6,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ff5a3c'; ctx.shadowBlur = 30;
  ctx.fillText('EMBERFALL', 640, 210);
  ctx.shadowBlur = 0;
  ctx.font = 'italic 28px Georgia, serif';
  ctx.fillStyle = '#f3e6c8';
  ctx.fillText('Duel of the Four Embers', 640, 258);
  // Four suits.
  let sx = 640 - 3 * 70;
  for (const key of Object.keys(SUITS)) {
    drawGlyph(ctx, SUITS[key].glyph, sx, 330, 52, SUITS[key].color);
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillStyle = SUITS[key].color;
    ctx.fillText(SUITS[key].name, sx, 380);
    sx += 70;
  }
  ctx.font = '19px Georgia, serif';
  ctx.fillStyle = '#d8c9a8';
  ctx.fillText('You are Wren, Emberkeeper. Vex, the Ash Warden, holds the table.', 640, 440);
  ctx.fillText('Spend ember to play cards. Two cards of one suit in a turn', 640, 472);
  ctx.fillText('trigger its Resonance. Read Vex’s intent — then break it.', 640, 504);
  ctx.fillText('First to 0 life loses. 30 life each. No luck but the draw.', 640, 536);
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillStyle = '#ffd166';
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 350);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK or press ENTER to begin', 640, 620);
  ctx.globalAlpha = 1;
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#9db8d6';
  ctx.fillText('Mouse or keys 1–5 to play · Enter to end turn · R to restart · M to mute', 640, 668);
  ctx.fillText('An original card duel — no borrowed game, no borrowed art.', 640, 700);
}

function drawEndScreen(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(20,40,16,0.78)' : 'rgba(40,10,10,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 78px Georgia, serif';
  ctx.fillStyle = won ? '#ffd166' : '#ff8c8c';
  ctx.shadowColor = won ? '#ffd166' : '#ff5a3c'; ctx.shadowBlur = 26;
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', 640, 260);
  ctx.shadowBlur = 0;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#f3e6c8';
  ctx.fillText(won
    ? 'Vex falls. The four embers burn for Wren.'
    : 'The last ember gutters out. Vex keeps the table.', 640, 312);
  // Stats.
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#d8c9a8';
  const s = state.stats;
  const score = s.damageDealt * 10 + s.cardsPlayed * 5 + (won ? 500 : 0);
  ctx.fillText(`Ember Score  ${score}`, 640, 380);
  ctx.fillText(`Damage dealt ${s.damageDealt}   ·   Damage taken ${s.damageTaken}`, 640, 416);
  ctx.fillText(`Cards played ${s.cardsPlayed}   ·   Rounds ${s.roundsPlayed}   ·   Healed ${s.heals}`, 640, 452);
  ctx.fillText(`Wren ${state.player.life} ♥  —  Vex ${state.ai.life} ♥`, 640, 488);
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 350);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('Press R to duel again', 640, 560);
  ctx.globalAlpha = 1;
}
