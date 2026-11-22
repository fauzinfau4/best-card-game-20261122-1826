# Emberfall — Duel of the Four Embers

An original card duel for make.fun's best-card-game-20261122-1826 bounty.
You are Wren, Emberkeeper; across the table sits Vex, the Ash Warden.
Both start at 30 life. Spend ember to play cards; first to 0 life loses.

## The rules

- **Ember:** each round both duelists gain ember — 3 in round 1, +1 per
  round, up to 10. Every card costs ember. Unspent ember is lost.
- **Four suits, told apart by colour AND shape:** Flame is a red triangle,
  Tide a blue droplet, Thorn a green leaf, Moon a violet crescent.
- **Resonance:** play two cards of one suit in a turn and that suit's
  bonus fires — Flame +3 damage, Tide heal 3, Thorn +4 block, Moon draw 1.
- **Readable opponent:** at the start of your turn Vex commits to its
  first card and shows its intent ("Vex plans: Strike 8 · Flame"), so you
  can block it, heal through it, or punish it with Moonbeam's counter.
- **The deck:** 12 original cards, two copies each — strikes, guards,
  heals, draws, burn and a sabotage that steals the foe's ember.
- Block absorbs damage and fades at the next round; burn ticks at the
  start of a turn; a spent deck reshuffles from the discard.

## How to play

- **Mouse** — hover a card to lift it, click to play it
- **1–5** — play a card from your hand
- **Enter / Space** — end turn · **R** — restart · **M** — mute

## Run it

Serve `game/` with any static server and open `game/index.html` in a
desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every file the game loads lives under
`game/`, and all sound is synthesized live with WebAudio.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/main.js` — entry point: loop, Hi-DPI canvas, wiring
- `game/src/cards.js` — the 12-card catalogue, the four suits, Resonance
- `game/src/state.js` — the duel's rules: turns, damage, block, burn, win/loss
- `game/src/ai.js` — Vex's choices: telegraphed intent, greedy turn plan
- `game/src/render.js` — all canvas drawing: table, cards, HUD, screens
- `game/src/audio.js` — synthesized sounds (WebAudio, no files)
- `game/src/input.js` — mouse and keyboard
- `game/src/shots.js` — staged screenshot moments (`?shot=title|play|win|loss`)
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only)
- `screenshots/` — real renders of the game's own code in a browser

## License

MIT — see `LICENSE`.
