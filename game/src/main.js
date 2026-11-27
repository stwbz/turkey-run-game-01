// Boot and the one loop. Input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. Screens: title, play, paused, caught,
// escaped.
//
// ?seed=N fixes the world. ?shot=title|chase|caught|escaped (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CONFIG, STAGES } from './config.js';
import { createRenderer } from './render.js';
import { buildWorld } from './world.js';
import { buildTurkey } from './turkey.js';
import { buildFarmer, FARMER_SEARCH, FARMER_CORNER } from './farmer.js';
import { createRun, updateRun, stageFor } from './run.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE } from './input.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { createParticles } from './particles.js';

const BEST_KEY = 'gobble-gambit-best-v1';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
if (Number.isInteger(seedParam)) CONFIG.seed = seedParam >>> 0;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const { renderer, scene, camera, updateChaseCamera, setStage, updateAtmosphere } = createRenderer(canvas);
const world = buildWorld(scene, CONFIG.seed);
const turkey = buildTurkey();
scene.add(turkey.group);
const farmer = buildFarmer();
scene.add(farmer.group);
const particles = createParticles(scene, CONFIG.seed);

const hud = createHUD(document.getElementById('hud-root'));
const input = createInput(window);
const audio = createAudio();

let run = createRun();
let screen = 'title';
let prevHeld = { left: false, right: false, jump: false, dash: false, hide: false };
let stageShown = 0;
let farmerFx = 2.6; // the farmer's lateral screen position, eased toward its target
let endPendingAt = 0; // hit-stop: wall time when the end screen may appear
let shakeAmp = 0;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

// Edge-triggered input: lane switches and jumps fire once per press, while
// dash and hide read the held state.
function stepInput() {
  const held = input.held();
  const edge = {
    left: held.left && !prevHeld.left,
    right: held.right && !prevHeld.right,
    jump: held.jump && !prevHeld.jump,
    dash: held.dash,
    hide: held.hide,
  };
  prevHeld = held;
  return edge;
}

function placeActors() {
  // Turkey runs at z = 0. The farmer trails between the camera and the
  // turkey, looming at the bottom of the frame: his screen position maps
  // the gap (close gap = right on the turkey's tail, far gap = near the
  // camera's bottom edge), while the HUD carries the exact metres.
  turkey.group.position.set(run.laneX, run.y, 0);
  const gap = run.farmer.gap;
  const fz = 3 + Math.max(0, gap) * 0.12;
  // The farmer stalks a lane to the turkey's right, so the camera still
  // sees the turkey — he only cuts straight in when he corners it (or
  // wanders while searching). The lateral position eases, never snaps.
  const targetFx =
    run.farmer.state === FARMER_SEARCH
      ? run.farmer.searchX
      : run.farmer.state === FARMER_CORNER
        ? run.laneX
        : Math.min(4.8, Math.max(-4.8, run.laneX + 2.6));
  farmerFx += (targetFx - farmerFx) * 0.15;
  farmer.group.position.set(farmerFx, 0, fz);
  farmer.group.rotation.y = 0; // faces the turkey (forward, -z)
  farmer.setStageProps(run.stage);
  farmer.setHeading(0);
}

function startRun() {
  run = createRun();
  world.reset();
  world.setStage(0);
  setStage(0);
  stageShown = 0;
  endPendingAt = 0;
  screen = 'play';
  hud.hideScreens();
  audio.ensure();
  audio.gobble();
  hud.showBanner('🏡 STAGE 1 — THE FARMYARD · RUN!', 3);
  announce('Running. Farmyard, 1500 metres to the freedom window.');
}

function stepGame(dt) {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    audio.setMuted(!audio.isMuted());
  }
  if (actions & ACTION_PAUSE) {
    screen = 'pause';
    hud.showPause();
    return;
  }
  if (actions & ACTION_RESTART) {
    startRun();
    return;
  }
  const events = updateRun(run, stepInput(), world, dt);
  // The world keeps crawling while the turkey hides, so the haystack
  // slides past and the turkey slips out after a couple of seconds.
  // Once finished, the world freezes for the hit-stop beat.
  const worldSpeed = run.finished ? 0 : (run.hidden ? 2.5 : run.speed);
  world.update(dt, run.distance, worldSpeed, run.stage);
  if (run.stage !== stageShown) {
    stageShown = run.stage;
    world.setStage(run.stage);
    setStage(run.stage);
    hud.showBanner(`🍂 STAGE ${run.stage + 1} — ${STAGES[run.stage].name} · ${STAGES[run.stage].sub}`, 3);
    audio.gobble();
  }
  for (const ev of events) {
    if (ev === 'corn' || ev === 'feather') particles.burstSparkle(turkey.group.position);
    else if (ev === 'hit' || ev === 'caught-by-farmer') particles.burstFeathers(turkey.group.position);
    if (ev === 'corn') audio.chime();
    else if (ev === 'feather') audio.featherChime();
    else if (ev === 'hit') {
      audio.thud();
      hud.showBanner('💥 OUCH! FARMER HOLT GAINS ON YOU', 2);
    } else if (ev === 'caught-by-farmer') {
      audio.thud();
      hud.showBanner('🖐 FARMER HOLT GRABBED YOU — BREAK FREE!', 2);
    } else if (ev === 'spotted') {
      audio.sting();
    } else if (ev === 'hide') {
      hud.showBanner('🤫 HIDDEN — HE LOST YOUR TRAIL', 2);
    } else if (ev === 'stage') {
      // banner handled above
    }
  }
  if (run.finished) {
    // Hit-stop: hold the frozen frame 0.15 s before the end screen, so
    // the catch/escape lands instead of flashing past.
    if (!endPendingAt) endPendingAt = performance.now() + 150;
    if (performance.now() >= endPendingAt) {
      endPendingAt = 0;
      if (run.score > readBest()) saveBest(run.score);
      if (run.escaped) {
        audio.fanfare();
        screen = 'escaped';
        hud.showEscaped(run);
        announce(`Escaped! Score ${run.score}.`);
      } else {
        audio.crashSound();
        screen = 'caught';
        hud.showCaught(run);
        announce(`Caught. Score ${run.score}.`);
      }
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CONFIG.maxFrame);
  last = now;
  if (screen === 'play') {
    accumulator += dt;
    while (accumulator >= CONFIG.step) {
      stepGame(CONFIG.step);
      accumulator -= CONFIG.step;
      if (screen !== 'play') break;
    }
    // Dust puffs at the turkey's feet while running, and on landing.
    dustTimer -= dt;
    if (dustTimer <= 0 && run.speed > 5 && !run.airborne && !run.hidden && !run.finished) {
      dustTimer = 0.14;
      particles.puffDust(turkey.group.position);
    }
    if (wasAirborne && !run.airborne && !run.finished) particles.puffDust(turkey.group.position);
    wasAirborne = run.airborne;
  } else if (screen === 'title') {
    // Idle drift on the title screen: the world lives behind the menu.
    world.update(dt, run.distance, 2, 0);
    hud.update(run, now);
  }
  if (screen === 'play' || screen === 'pause' || screen === 'caught' || screen === 'escaped') {
    placeActors();
    turkey.pose({ speed: run.speed, airborne: run.airborne, y: run.y, dashing: run.dashing, hidden: run.hidden, hitFlash: run.hitFlash }, dt);
    farmer.pose(dt, run.farmer.state === FARMER_SEARCH ? 2 : 10.5, run.farmer.state, run.farmer.gap);
    updateChaseCamera(turkey.group.position, run.dashing, dt, false);
    hud.update(run, now);
  }
  // Fog and sky lerp toward the next stage as the run crosses this one.
  const stageDef = STAGES[run.stage];
  const stageProg = Math.max(0, Math.min(1, (run.distance - stageDef.from) / (stageDef.to - stageDef.from)));
  updateAtmosphere(run.stage, stageProg);
  // Camera shake, live play only: a micro-shake while the farmer closes
  // in, a hard shake on a hit. Never in screenshot mode (frame() never
  // runs there), so staged framing stays neutral.
  if (screen === 'play') {
    if (run.hitFlash > 0) shakeAmp = 0.35;
    else if (run.farmer.gap < 6) shakeAmp = (6 - run.farmer.gap) * 0.025;
    else shakeAmp = Math.max(0, shakeAmp - dt * 0.8);
    if (shakeAmp > 0) {
      camera.position.x += Math.sin(now * 0.047) * shakeAmp;
      camera.position.y += Math.cos(now * 0.039) * shakeAmp;
    }
  }
  particles.update(dt);
  renderer.render(scene, camera);
}

function handleConfirm() {
  if (screen === 'title') {
    startRun();
  } else if (screen === 'caught' || screen === 'escaped') {
    startRun();
  } else if (screen === 'pause') {
    screen = 'play';
    hud.hideScreens();
    input.takeActions();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') {
    screen = 'pause';
    hud.showPause();
  }
});

hud.startBtn.addEventListener('click', () => {
  audio.ensure();
  handleConfirm();
});
hud.resumeBtn.addEventListener('click', handleConfirm);
hud.retryCaughtBtn.addEventListener('click', handleConfirm);
hud.retryEscapedBtn.addEventListener('click', handleConfirm);
window.addEventListener('keydown', (e) => {
  const resume = e.code === 'Enter' || e.code === 'Space' ||
    (screen === 'pause' && (e.code === 'KeyP' || e.code === 'Escape'));
  if (screen !== 'play' && resume) {
    e.preventDefault();
    handleConfirm();
  }
});

// --- screenshot mode ---
let accumulator = 0;
let last = performance.now();
let dustTimer = 0;
let wasAirborne = false;

if (shot) {
  const staged = stageShot(shot, world);
  run = staged.run;
  screen = staged.screen;
  world.setStage(run.stage);
  setStage(run.stage);
  stageShown = run.stage;
  const shotDef = STAGES[run.stage];
  updateAtmosphere(run.stage, Math.max(0, Math.min(1, (run.distance - shotDef.from) / (shotDef.to - shotDef.from))));
  placeActors();
  turkey.pose({ speed: run.speed, airborne: run.airborne, y: run.y, dashing: false, hidden: run.hidden, hitFlash: 0 }, 0);
  farmer.pose(0, 10.5, run.farmer.state, run.farmer.gap);
  updateChaseCamera(turkey.group.position, false, 0, true);
  if (staged.screen === 'title') {
    hud.showTitle(readBest());
  } else if (staged.screen === 'caught') {
    hud.showCaught(run);
  } else if (staged.screen === 'escaped') {
    hud.showEscaped(run);
  } else {
    hud.hideScreens();
    hud.showBanner(staged.run.stage === 1 ? '🐄 STAGE 2 — THE BARN · HE IS RIGHT BEHIND YOU!' : '🏡 STAGE 1 — THE FARMYARD', 3);
    hud.update(run, performance.now());
  }
  hud.update(run, performance.now());
  // Seed the shot with a little life: dust behind the running turkey,
  // feathers where it was just caught, sparkle on the win.
  if (shot === 'chase') {
    particles.puffDust(turkey.group.position);
    particles.puffDust(turkey.group.position);
  } else if (shot === 'caught') {
    particles.burstFeathers(turkey.group.position);
  } else if (shot === 'escaped') {
    particles.burstSparkle(turkey.group.position);
    particles.puffDust(turkey.group.position);
  }
  for (let i = 0; i < 8; i += 1) particles.update(0.06);
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  hud.showTitle(readBest());
  updateChaseCamera(turkey.group.position, false, 0, true);
  announce('Gobble Gambit. Press Enter or click Start to run.');
  requestAnimationFrame(frame);
}

// Test seam for the smoke test: no gameplay logic lives behind it.
window.__TEST__ = {
  ready: true,
  state: () => ({
    screen,
    stage: run.stage,
    score: run.score,
    distance: Math.round(run.distance),
    hearts: run.hearts,
    gap: Math.round(run.farmer.gap * 10) / 10,
    farmerState: run.farmer.state,
    detection: Math.round(run.detection),
    finished: run.finished,
    escaped: run.escaped,
  }),
};
