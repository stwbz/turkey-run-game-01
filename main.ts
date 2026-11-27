// Gobble Gambit — A Turkey's Thanksgiving Breakout (turkey-run-game-01 entry, Node 22, standard library only):
// a 3D third-person turkey escape runner over a farm track at autumn dusk. The game is this
// directory's game/ folder — plain static files a desktop browser loads offline (game/index.html
// and its ES modules, Three.js r187 vendored under game/vendor/, no network request) — and this
// program hands it in. It copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// Put 4 PNG or JPEG screenshots in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's cap for screenshots (reference/gate.json): each screenshot at most 256 KiB.
// Check the entrypoint's own inputs before copying anything, so a bad entry fails here with a
// clear message instead of being refused by the scorer after the hand-in.
const SCREENSHOT_MAX_BYTES = 262144;

function fail(message: string): never {
  console.error(`Gobble Gambit hand-in failed: ${message}`);
  process.exit(1);
}

const entrypoint = join(here, 'game', 'index.html');
if (!existsSync(entrypoint)) fail(`game/index.html is missing (${entrypoint})`);
if (statSync(entrypoint).size > 1048576) {
  fail(`game/index.html is ${statSync(entrypoint).size} bytes, over the 1 MiB cap (1048576)`);
}

// The scorer also caps game/ at 48 MiB in total: sum it before copying, so
// an over-budget entry fails here with a clear message.
const GAME_MAX_BYTES = 50331648;
function dirBytes(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? dirBytes(p) : st.size;
  }
  return total;
}
const gameBytes = dirBytes(join(here, 'game'));
if (gameBytes > GAME_MAX_BYTES) {
  fail(`game/ is ${gameBytes} bytes, over the 48 MiB cap (${GAME_MAX_BYTES})`);
}

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail(`screenshots/ is missing (${shotsDir})`);
const shots = readdirSync(shotsDir).sort().filter((name) => statSync(join(shotsDir, name)).isFile());
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ holds ${shots.length} files, need 3 or 4`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > SCREENSHOT_MAX_BYTES) {
    fail(`screenshots/${name} is ${size} bytes, over the 256 KiB cap (${SCREENSHOT_MAX_BYTES})`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
