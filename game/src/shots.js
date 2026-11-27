// Screenshot scenes behind ?shot=title|chase|caught|escaped. Each one
// plays the real rules forward from a fresh run for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame. No wall
// clock, no unseeded random: the staged state is a pure function of
// (shot, seed).
import { CONFIG, STAGES } from './config.js';
import { createRun, updateRun, stageFor } from './run.js';
import { clamp } from './random.js';

const STEP = CONFIG.step;

// Autopilot: run toward the freedom window, jumping hazards in our lane,
// dashing on clear stretches, hiding when the farmer is close and a
// haystack is near.
function autopilot(run, world) {
  const input = { left: false, right: false, jump: false, dash: false, hide: false };
  // Find the nearest hazard ahead in our lane.
  let threat = null;
  for (const e of world.entities) {
    if (e.z < -30 || e.z > 0) continue;
    if (Math.abs(CONFIG.lanes[e.lane] - run.laneX) > 1.7) continue;
    if (e.kind === 'corn' || e.kind === 'feather' || e.kind === 'haystack') continue;
    if (!threat || e.z > threat.z) threat = e;
  }
  // Jump late, near the peak: the jump peaks ~0.44 s after takeoff, which
  // at full speed is ~5 m — so jumping at ~5 m out puts the turkey's feet
  // above every jumpable hazard exactly as it crosses the line.
  if (threat && threat.z > -5.5 && threat.z < -2.5 && !run.airborne) input.jump = true;
  // Dodge to a free lane if the threat is too close to jump or too tall.
  if (threat && threat.z > -3.5 && !run.airborne) {
    const free = [0, 1, 2].find((l) => {
      if (l === run.lane) return false;
      return !world.entities.some(
        (e) => e.lane === l && e.z > -12 && e.z < 2 && e.kind !== 'corn' && e.kind !== 'feather' && e.kind !== 'haystack',
      );
    });
    if (free !== undefined) {
      if (free < run.lane) input.left = true;
      else input.right = true;
    }
  }
  // Collect corn in our lane: nothing to do, running into it collects it.
  // Hide when the farmer is very close and a haystack is beside us.
  if (run.farmer.gap < 7) {
    const hay = world.entities.find((e) => e.kind === 'haystack' && e.lane === run.lane && e.z > -6 && e.z < 6);
    if (hay) input.hide = true;
  }
  // Dash on clear stretches with stamina to spare.
  input.dash = !threat && run.stamina > 40 && !run.hidden;
  return input;
}

function runSteps(run, world, seconds, stopWhen) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(run, world);
    const events = updateRun(run, input, world, STEP);
    // The world keeps crawling while the turkey hides, so the haystack
    // slides past and the turkey slips out after a couple of seconds.
    world.update(STEP, run.distance, run.hidden ? 2.5 : run.speed, run.stage);
    if (run.finished) break;
    if (stopWhen && stopWhen(run)) break;
  }
}

export function stageShot(name, world) {
  const run = createRun();
  world.reset();
  if (name === 'title') {
    // Run ~6 s into the farmyard: turkey mid-stride, farmer visible behind,
    // first fence ahead. Title screen overlays it.
    runSteps(run, world, 6);
    run.farmer.gap = 12;
    run.detection = 18;
    // Idle title state: the HUD must read 0 m, not a mid-run distance.
    run.distance = 0;
    run.score = 0;
    run.corn = 0;
    run.feathers = 0;
    return { screen: 'title', run };
  }
  if (name === 'chase') {
    // Stage 2 (the barn), farmer closing in: run until the gap is under 7 m
    // or 40 s pass, so the frame shows the chase at its tensest.
    runSteps(run, world, 40, (r) => r.stage >= 1 && r.farmer.gap < 7);
    // Stage the tension directly: the farmer right on the turkey's tail,
    // detection high, warning on screen.
    run.farmer.gap = 5.5;
    run.detection = 72;
    return { screen: 'play', run };
  }
  if (name === 'caught') {
    // Play until the turkey is caught (or force it after 60 s): the
    // CAUGHT! screen over a real run.
    runSteps(run, world, 60, (r) => r.finished);
    if (!run.finished) {
      run.hearts = 0;
      run.finished = true;
      run.escaped = false;
      run.grade = 'CAUGHT';
    }
    run.farmer.gap = 1;
    return { screen: 'caught', run };
  }
  // escaped: play the whole 1500 m with the autopilot. If it cannot make
  // it in 180 s, stage the win on a late-kitchen run instead: hearts
  // restored, distance set, grade ESCAPED — the frame is the win screen
  // over a real late-kitchen scene either way.
  runSteps(run, world, 180, (r) => r.finished);
  if (!run.escaped) {
    run.hearts = CONFIG.heartsMax;
    run.distance = CONFIG.totalDistance;
    run.stage = 2;
    run.score += 500;
    run.finished = true;
    run.escaped = true;
    run.grade = 'ESCAPED';
  }
  run.farmer.gap = 25;
  run.detection = 0;
  return { screen: 'escaped', run };
}
