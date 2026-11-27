# Gobble Gambit — A Turkey's Thanksgiving Breakout

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/stwbz/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/stwbz/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

A 3D third-person turkey escape runner for the [make.fun bounty "Make the best turkey escape game"](https://make.fun/bounty/turkey-run-game-01). Thanksgiving is coming. Farmer Holt wants you for dinner. Run 1500 m from the farmyard, through the barn, out the kitchen window — and don't get caught.

## The game

- **Three stages, escalating danger:** the farmyard at dawn (fences, pumpkins), the barn at dusk (hay bales, crates, hanging knives, the farmer's lantern), the kitchen at night (hot ovens, carving knives, pots).
- **Farmer Holt chases, searches and corners you.** He closes the gap when you stumble, sprints when he spots you, and cuts across ahead in the kitchen. Hide in a haystack to break his trail.
- **Run, jump, dash, hide:** change lanes, jump fences and knives, dash on clear stretches (stamina), duck into haystacks. Collect corn (+10) and golden feathers (+50).
- **HUD:** score, distance (x m / 1500 m), 3 hearts, dash stamina, detection eye, farmer gap, and a route progress bar.
- **Screens:** title, pause, CAUGHT! and ESCAPED! end screens, restart. Synthesized WebAudio sounds (gobbles, chimes, chase sting) — no audio files.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# game/ is on http://localhost:8080
```

Controls: **← → / A D** change lane · **SPACE** jump · **SHIFT** dash · **S / ↓** hide in haystack · **P** pause · **R** restart · **M** mute.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library. Three.js r187 is vendored under `game/vendor/` as `three.module.min.js`. Everything loads offline — no network requests.

Entered on [make.fun](https://make.fun/bounty/turkey-run-game-01?ref=50xvw0ff).
