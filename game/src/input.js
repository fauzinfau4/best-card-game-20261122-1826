// Mouse + keyboard input for Emberfall: click a card to play it, hover
// to lift it, keys 1–5 to play from the hand, Enter to end the turn.

export function attachInput(canvas, state) {
  function cardAt(mx, my) {
    // Topmost card first: later cards in the hand overlap earlier ones.
    for (let i = state.player.hand.length - 1; i >= 0; i--) {
      const c = state.player.hand[i];
      const hover = state.hoverIndex === i || state.selectedIndex === i;
      const w = hover ? 162 : 150;
      const h = hover ? 226 : 210;
      const x = c.x - (w - 150) / 2;
      const y = c.y - (h - 210) / 2;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) return i;
    }
    return -1;
  }

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toCanvas(e);
    state.hoverIndex = state.phase === 'player' ? cardAt(x, y) : -1;
  });

  canvas.addEventListener('click', (e) => {
    const { x, y } = toCanvas(e);
    if (state.phase === 'title') { state.startDuel(); return; }
    if (state.phase === 'win' || state.phase === 'loss') return;
    if (state.phase !== 'player') return;
    // End Turn button.
    if (x >= 1060 && x <= 1240 && y >= 700 && y <= 756) { state.endPlayerTurn(); return; }
    const i = cardAt(x, y);
    if (i >= 0) {
      const card = state.player.hand[i];
      if (card.cost <= state.player.ember) state.playCard(state.player, i);
      else state.sound('click');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') { state.muted = !state.muted; return; }
    if (e.key === 'r' || e.key === 'R') {
      if (state.phase !== 'title') state.startDuel();
      return;
    }
    if (state.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) { state.startDuel(); return; }
    if (state.phase === 'win' || state.phase === 'loss') return;
    if (state.phase !== 'player') return;
    if (e.key >= '1' && e.key <= '5') {
      const i = Number(e.key) - 1;
      const card = state.player.hand[i];
      if (card && card.cost <= state.player.ember) state.playCard(state.player, i);
      else state.sound('click');
    } else if (e.key === 'Enter' || e.key === ' ') {
      state.endPlayerTurn();
    }
  });
}
