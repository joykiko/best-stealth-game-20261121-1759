# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/joykiko/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/joykiko/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Salt & Shadow — The Harbour Run. Build a complete, original stealth game that plays offline in a desktop browser from its own files; an AI judge compares the games two at a time, places go by win rate, and the 10 best share $50.

You are Wren, a salt smuggler. Slip past the night wardens of three harbours, take the salt if you dare, and reach the rowboat unseen.

- **WASD / arrows** — move · **Shift** — run (fast, loud) · **C** — sneak
- **Mouse click** — throw a pebble to distract a guard
- **Esc** — pause · **M** — mute · **R** — retry after being spotted

Three harbours — The Quay, Warehouse Row, The Customs House — with 3, 4 and 5 patrolling wardens, 6–8 salt sacks each, and lantern-lit lanes. Patrols walk fixed routes and pause to scan at each waypoint, so a route can be learned and timed. Detection is a meter, not a switch: it fills faster up close, faster in lantern light, slower in the reeds and while sneaking — and breaking line of sight for a few seconds drops a chase back to a search, so you always get a chance to recover. Cones turn amber, then red; a `?` then a `!` rises over a guard; footsteps are drawn as rings and played as soft ticks, so you hear a patrol before you see it. All sound is synthesised with WebAudio — no sound files.

The source is split by job: `game/src/levels.js` (the maps), `game/src/guards.js` (patrols and detection), `game/src/player.js` (movement and noise), `game/src/audio.js` (synthesised sound), `game/src/render.js` (all drawing), `game/src/util.js` (math and line of sight), `game/src/main.js` (the loop and the state machine).

Screenshots in `screenshots/` are staged in-session with `?shot=title|play|chase|win`: the title, a live patrol, a chase at the edge of being caught, and a level clear at the boat.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=68t6gm6y&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
