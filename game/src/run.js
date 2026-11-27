// The run: score, distance, hearts, stamina, detection and the farmer gap.
// One step advances the turkey, the farmer AI and the world, and reports
// events (hit, corn, feather, stage, spotted, caught, escaped) for the HUD
// and the sounds. Pure logic — no three.js in here except through callers.
import { CONFIG, STAGES } from './config.js';
import { clamp } from './random.js';
import { updateFarmerAI, createFarmerAI, FARMER_SEARCH } from './farmer.js';

export function createRun() {
  return {
    distance: 0,
    score: 0,
    hearts: CONFIG.heartsMax,
    stamina: CONFIG.staminaMax,
    detection: 0,
    stage: 0,
    lane: 1, // index into CONFIG.lanes
    laneX: 0,
    y: 0, // jump height
    vy: 0,
    airborne: false,
    dashing: false,
    hidden: false,
    hideTarget: null, // the haystack entity being hidden in
    speed: 0,
    invulnerable: 0,
    hitSlow: 0,
    hitFlash: 0,
    spotted: 0, // seconds of sprint left
    spottedWarned: false,
    farmer: createFarmerAI(),
    time: 0,
    corn: 0,
    feathers: 0,
    finished: false, // caught or escaped
    escaped: false,
    grade: null,
  };
}

export function stageFor(distance) {
  if (distance >= STAGES[2].from) return 2;
  if (distance >= STAGES[1].from) return 1;
  return 0;
}

// One fixed step. `input` = { left, right, jump, dash, hide } booleans for
// this step; `world` = the world module (entities + helpers).
export function updateRun(run, input, world, dt) {
  const events = [];
  if (run.finished) return events;
  run.time += dt;

  // --- lane switching ---
  if (input.left && run.lane > 0) {
    run.lane -= 1;
    input.left = false;
  }
  if (input.right && run.lane < 2) {
    run.lane += 1;
    input.right = false;
  }
  const targetX = CONFIG.lanes[run.lane];
  const dx = targetX - run.laneX;
  const stepX = (CONFIG.lanes[1] - CONFIG.lanes[0]) / CONFIG.laneSwitchTime * dt;
  run.laneX += clamp(dx, -stepX, stepX);

  // --- dash + stamina ---
  const wantDash = input.dash && run.stamina > 1 && !run.hidden;
  if (wantDash) {
    run.stamina = Math.max(0, run.stamina - CONFIG.dashStaminaCost * dt);
    run.dashing = true;
  } else {
    run.dashing = false;
    run.stamina = Math.min(CONFIG.staminaMax, run.stamina + CONFIG.staminaRegen * dt);
  }

  // --- jump ---
  if (input.jump && !run.airborne && !run.hidden) {
    run.vy = CONFIG.jumpVelocity;
    run.airborne = true;
  }
  if (run.airborne) {
    run.vy -= CONFIG.gravity * dt;
    run.y += run.vy * dt;
    if (run.y <= 0) {
      run.y = 0;
      run.vy = 0;
      run.airborne = false;
    }
  }

  // --- hide: duck into the nearest haystack in our lane ---
  if (input.hide && !run.hidden) {
    const near = world.entities.find(
      (e) => e.kind === 'haystack' && e.lane === run.lane && e.z > -6 && e.z < 6,
    );
    if (near) {
      run.hidden = true;
      run.hideTarget = near;
      events.push('hide');
    }
  }
  if (run.hidden) {
    // Stay tucked behind the stack while it scrolls past, then slip out.
    const t = run.hideTarget;
    if (!t || t.z > 8 || !world.entities.includes(t)) {
      run.hidden = false;
      run.hideTarget = null;
      events.push('unhide');
    }
  }

  // --- speed, distance, stage ---
  let speed = run.dashing ? CONFIG.dashSpeed : CONFIG.baseSpeed;
  if (run.hitSlow > 0) {
    run.hitSlow -= dt;
    speed *= 0.5;
  }
  run.speed = run.hidden ? 0 : speed;
  if (!run.hidden) run.distance += run.speed * dt;
  const stage = stageFor(run.distance);
  if (stage !== run.stage) {
    run.stage = stage;
    run.score += CONFIG.stageBonus;
    events.push('stage');
  }

  // --- detection ---
  const gap = run.farmer.gap;
  if (run.hidden) {
    run.detection = Math.max(0, run.detection - CONFIG.detectFallHidden * dt);
  } else if (gap < 10) {
    run.detection = Math.min(100, run.detection + CONFIG.detectRiseNear * dt);
  } else if (run.stage === 2) {
    run.detection = Math.min(100, run.detection + CONFIG.detectRiseStage3 * dt);
  } else if (gap > 20) {
    run.detection = Math.max(0, run.detection - CONFIG.detectFallFar * dt);
  }
  if (run.detection >= 100 && run.spotted <= 0) {
    run.spotted = CONFIG.spottedSeconds;
    run.detection = 60; // after the sprint, suspicion drops but not to zero
    events.push('spotted');
  }
  if (run.spotted > 0) run.spotted -= dt;

  // --- farmer AI ---
  updateFarmerAI(run.farmer, dt, {
    turkeySpeed: run.speed,
    hidden: run.hidden,
    stage: run.stage,
    spotted: run.spotted > 0,
    stageSpeeds: CONFIG.farmerStageSpeed,
    sprintSpeed: CONFIG.farmerSprintSpeed,
    baseSpeed: CONFIG.farmerBaseSpeed,
  });

  // --- farmer catches the turkey ---
  if (run.farmer.gap <= CONFIG.gapCatch && run.invulnerable <= 0) {
    run.hearts -= 1;
    run.invulnerable = CONFIG.invulnerableSeconds;
    run.hitFlash = 0.5;
    run.farmer.gap = 15;
    events.push('caught-by-farmer');
    if (run.hearts <= 0) {
      run.finished = true;
      run.escaped = false;
      run.grade = 'CAUGHT';
      events.push('gameover');
    }
  }

  // --- collisions + pickups ---
  if (run.invulnerable > 0) run.invulnerable -= dt;
  if (run.hitFlash > 0) run.hitFlash -= dt;
  const laneX = run.laneX;
  for (const e of [...world.entities]) {
    if (e.z < -2 || e.z > 2) continue;
    if (Math.abs(CONFIG.lanes[e.lane] - laneX) > 1.7) continue;
    if (e.kind === 'corn' || e.kind === 'feather') {
      const pts = e.kind === 'corn' ? CONFIG.cornPoints : CONFIG.featherPoints;
      run.score += pts;
      run.farmer.gap = Math.min(CONFIG.gapMax, run.farmer.gap + CONFIG.cornGapGain);
      if (e.kind === 'corn') run.corn += 1;
      else run.feathers += 1;
      events.push(e.kind);
      world.entities.splice(world.entities.indexOf(e), 1);
      e.mesh.visible = false;
    } else if (e.kind === 'haystack') {
      // Haystacks are shelter, not hazards: running into one hides you.
      if (!run.hidden && run.invulnerable <= 0) {
        run.hidden = true;
        run.hideTarget = e;
        events.push('hide');
      }
    } else if (!e.tested && run.invulnerable <= 0 && !run.hidden) {
      // A hazard: test once, at the instant it crosses the turkey's line
      // (z near 0). Jumping clears it when the turkey's feet are above
      // the hazard's top at that instant — so jump timing matters, and a
      // hazard taller than the jump's peak must be dodged, not jumped.
      if (Math.abs(e.z) <= 0.6) {
        e.tested = true;
        const need = e.mesh.userData.jumpHeight ?? 1.5;
        if (run.y < need) {
          e.hit = true;
          run.hearts -= 1;
          run.invulnerable = CONFIG.invulnerableSeconds;
          run.hitFlash = 0.5;
          run.hitSlow = CONFIG.hitSlowSeconds;
          run.farmer.gap = Math.max(2, run.farmer.gap - CONFIG.hitGapLoss);
          events.push('hit');
          if (run.hearts <= 0) {
            run.finished = true;
            run.escaped = false;
            run.grade = 'CAUGHT';
            events.push('gameover');
          }
        }
      }
    }
  }

  // --- escape! ---
  if (run.distance >= CONFIG.totalDistance && !run.finished) {
    run.finished = true;
    run.escaped = true;
    run.grade = 'ESCAPED';
    run.score += 500;
    events.push('escaped');
  }
  return events;
}
