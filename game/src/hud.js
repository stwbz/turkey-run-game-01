// The HUD: DOM over the canvas. Top bar (score, distance, hearts,
// stamina, detection eye), stage banner, farmer-gap warning, and the four
// screens: title, pause, caught, escaped. Built once; updated per frame.
import { CONFIG, STAGES } from './config.js';

export function createHUD(root) {
  root.innerHTML = `
    <div class="hud title-mode" id="hud">
      <div class="panel top-left">
        <div class="hud-title">GOBBLE GAMBIT</div>
        <div class="hud-line"><span class="hud-label">SCORE</span> <span id="hud-score">0</span></div>
        <div class="hud-line"><span class="hud-label">DISTANCE</span> <span id="hud-dist">0 m</span> / 1500 m</div>
        <div class="hud-line"><span class="hud-label">LIVES</span> <span id="hud-hearts">♥♥♥</span></div>
      </div>
      <div class="panel top-right">
        <div class="hud-line"><span class="hud-label">STAGE</span> <span id="hud-stage">THE FARMYARD</span></div>
        <div class="hud-line"><span class="hud-label">FARMER</span> <span id="hud-gap">18 m BEHIND</span></div>
        <div class="hud-line"><span class="hud-label">DETECTION</span> <span id="hud-eye">👁</span> <span id="hud-detect">0%</span></div>
        <div class="bar-row"><span class="bar-label">DASH</span><div class="bar-track"><div class="bar-fill" id="hud-stamina"></div></div></div>
      </div>
      <div class="progress"><div class="progress-fill" id="hud-progress"></div><div class="progress-marks"><span>🏡 FARMYARD</span><span>🐄 BARN</span><span>🍳 KITCHEN</span><span>🪟 FREEDOM</span></div></div>
      <div class="banner" id="hud-banner"></div>
      <div class="warn" id="hud-warn"></div>
      <div class="screen" id="screen-title">
        <h1>GOBBLE<br>GAMBIT</h1>
        <h2>A TURKEY'S THANKSGIVING BREAKOUT</h2>
        <p>Thanksgiving is coming. Farmer Holt wants you for dinner. Run 1500 m from the farmyard, through the barn, out the kitchen window — and don't get caught.</p>
        <div class="controls"><span><b>← → / A D</b> change lane</span><span><b>SPACE</b> jump</span><span><b>SHIFT</b> dash</span><span><b>S / ↓</b> hide in haystack</span><span><b>P</b> pause</span><span><b>R</b> restart</span></div>
        <button class="big-btn" id="btn-start">▶ START THE ESCAPE</button>
        <div class="best" id="hud-best"></div>
      </div>
      <div class="screen" id="screen-pause">
        <h1>PAUSED</h1>
        <p>The turkey waits. Farmer Holt does not.</p>
        <button class="big-btn" id="btn-resume">RESUME</button>
      </div>
      <div class="screen" id="screen-caught">
        <h1>CAUGHT!</h1>
        <p>Farmer Holt has you. The oven was already warm.</p>
        <div class="score-line" id="caught-score"></div>
        <div class="best" id="caught-detail"></div>
        <button class="big-btn" id="btn-retry-caught">↻ TRY AGAIN</button>
      </div>
      <div class="screen" id="screen-escaped">
        <h1>ESCAPED!</h1>
        <p>Through the kitchen window and into the woods. Happy Thanksgiving — somewhere else.</p>
        <div class="score-line" id="escaped-score"></div>
        <div class="best" id="escaped-detail"></div>
        <button class="big-btn" id="btn-retry-escaped">↻ RUN AGAIN</button>
      </div>
    </div>`;

  const hud = root.querySelector('#hud');
  const el = (id) => root.querySelector(`#${id}`);
  const scoreEl = el('hud-score');
  const distEl = el('hud-dist');
  const heartsEl = el('hud-hearts');
  const stageEl = el('hud-stage');
  const gapEl = el('hud-gap');
  const detectEl = el('hud-detect');
  const eyeEl = el('hud-eye');
  const staminaEl = el('hud-stamina');
  const progressEl = el('hud-progress');
  const bannerEl = el('hud-banner');
  const warnEl = el('hud-warn');
  const bestEl = el('hud-best');
  let bannerUntil = 0;
  let screen = 'title';

  function showBanner(text, seconds = 3) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    bannerUntil = performance.now() / 1000 + seconds;
  }
  function showWarn(text) {
    warnEl.textContent = text;
    warnEl.classList.toggle('show', !!text);
  }

  function update(run, now) {
    scoreEl.textContent = String(run.score);
    distEl.textContent = `${Math.floor(run.distance)} m`;
    heartsEl.textContent = '♥'.repeat(Math.max(0, run.hearts)) + '♡'.repeat(Math.max(0, CONFIG.heartsMax - run.hearts));
    heartsEl.classList.toggle('low', run.hearts === 1);
    stageEl.textContent = STAGES[run.stage].name;
    const gap = Math.max(0, Math.round(run.farmer.gap));
    gapEl.textContent = run.farmer.state === 'SEARCH' ? 'SEARCHING…' : `${gap} m BEHIND`;
    gapEl.classList.toggle('close', gap < 8);
    detectEl.textContent = `${Math.round(run.detection)}%`;
    eyeEl.textContent = run.detection > 66 ? '👁️' : run.detection > 33 ? '👁' : '·';
    staminaEl.style.width = `${run.stamina}%`;
    staminaEl.style.background = run.stamina < 25 ? '#e74c3c' : '#2ecc71';
    progressEl.style.width = `${Math.min(100, (run.distance / CONFIG.totalDistance) * 100)}%`;
    // The warning only makes sense while playing: on a title or end
    // screen the chase is over and the text would contradict the result.
    if (screen !== 'play') showWarn('');
    else if (run.spotted > 0) showWarn('⚠ SPOTTED! FARMER HOLT IS SPRINTING!');
    else if (gap < 6) showWarn('⚠ FARMER HOLT IS CLOSING IN…');
    else if (run.hidden) showWarn('🤫 HIDDEN IN THE HAYSTACK — HOLD STILL');
    else showWarn('');
    if (bannerUntil && now / 1000 > bannerUntil) {
      bannerEl.classList.remove('show');
      bannerUntil = 0;
    }
  }

  function showTitle(best) {
    // hideScreens() removes title-mode, so it must run FIRST.
    hideScreens();
    hud.classList.add('title-mode');
    screen = 'title';
    el('screen-title').style.display = 'flex';
    bestEl.textContent = best > 0 ? `Best escape so far: ${best} pts` : 'No turkey has escaped yet.';
  }
  function hideScreens() {
    screen = 'play';
    for (const id of ['screen-title', 'screen-pause', 'screen-caught', 'screen-escaped']) {
      el(id).style.display = 'none';
    }
    hud.classList.remove('title-mode');
  }
  function showPause() {
    hideScreens();
    screen = 'pause';
    el('screen-pause').style.display = 'flex';
  }
  function showCaught(run) {
    hideScreens();
    screen = 'caught';
    el('caught-score').textContent = `SCORE ${run.score} · ${Math.floor(run.distance)} m · ${run.corn} CORN`;
    el('caught-detail').textContent = `Caught in ${STAGES[run.stage].name} — the farmer always wins eventually.`;
    el('screen-caught').style.display = 'flex';
  }
  function showEscaped(run) {
    hideScreens();
    screen = 'escaped';
    el('escaped-score').textContent = `SCORE ${run.score} · 1500 m · ${run.corn} CORN · ${run.feathers} GOLDEN FEATHERS`;
    el('escaped-detail').textContent = 'A clean escape. The table is set — for someone else.';
    el('screen-escaped').style.display = 'flex';
  }

  return {
    update,
    showBanner,
    showTitle,
    hideScreens,
    showPause,
    showCaught,
    showEscaped,
    startBtn: el('btn-start'),
    resumeBtn: el('btn-resume'),
    retryCaughtBtn: el('btn-retry-caught'),
    retryEscapedBtn: el('btn-retry-escaped'),
  };
}
