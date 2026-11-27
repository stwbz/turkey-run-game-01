// Gobble Gambit — A Turkey's Thanksgiving Breakout. All tunable gameplay
// constants in one place. Units are metres, seconds, metres per second.
export const CONFIG = {
  seed: 20261127,
  // --- the run ---
  totalDistance: 1500, // metres to the freedom window
  baseSpeed: 11, // m/s cruising
  dashSpeed: 17, // m/s while dashing
  dashStaminaCost: 34, // stamina per second of dash
  staminaRegen: 16, // per second while not dashing
  staminaMax: 100,
  // --- lanes ---
  lanes: [-4, 0, 4],
  laneSwitchTime: 0.22, // seconds to slide between lanes
  // --- jump ---
  jumpVelocity: 10.5, // m/s up — peak ~2.3 m, clears every jumpable hazard
  gravity: 24,
  // --- hearts / hits ---
  heartsMax: 3,
  invulnerableSeconds: 1.6, // after a hit
  hitSlowSeconds: 0.9, // turkey stumbles at half speed after a hit
  // --- the farmer (gap in metres behind the turkey) ---
  gapStart: 18,
  gapMax: 30,
  gapCatch: 0,
  farmerBaseSpeed: 10.2, // m/s: a clean run slowly opens the gap
  farmerStageSpeed: [10.2, 10.9, 11.8], // he gets faster per stage
  farmerSprintSpeed: 15.5, // while SPOTTED
  hitGapLoss: 6, // metres the farmer gains on a hit
  cornGapGain: 0.4, // metres per corn
  // --- detection (0..100) ---
  detectRiseNear: 26, // per second while gap < 10 and in the open
  detectRiseStage3: 12, // per second in the kitchen, in the open
  detectFallHidden: 55, // per second while hidden
  detectFallFar: 18, // per second while gap > 20
  spottedSeconds: 3, // farmer sprints this long once spotted
  // --- scoring ---
  cornPoints: 10,
  featherPoints: 50,
  stageBonus: 250,
  // --- camera ---
  chaseDistance: 11.5,
  chaseHeight: 5.2,
  fovBase: 60,
  fovDash: 78,
  // --- loop ---
  step: 1 / 60,
  maxFrame: 0.25,
};

// The three stages of the escape. Hazards and decor escalate; the farmer
// gets faster and the kitchen watches hardest.
export const STAGES = [
  {
    id: 0,
    name: 'THE FARMYARD',
    sub: 'Dawn — fences and pumpkins',
    from: 0,
    to: 500,
    sky: { top: 0x6b5a9e, mid: 0xe8734a, low: 0xffb36b },
    fog: 0xf2a06e,
    fogDeep: 0x8c2d19, // warm dusk haze, lerped by distance
    fogDensity: 0.0028,
    ground: 0x8a6f45, // dry dirt track
    grass: 0x7a8a3c,
    path: 0x9c7c4e, // worn dirt path down the middle
    hazards: ['fence', 'pumpkin'],
    hazardGap: [26, 40],
  },
  {
    id: 1,
    name: 'THE BARN',
    sub: 'Dusk — hay bales and hanging knives',
    from: 500,
    to: 1000,
    sky: { top: 0x3e3358, mid: 0xb0526a, low: 0xe0784a },
    fog: 0xc98a6e,
    fogDeep: 0x1f1209, // dark enclosed barn
    fogDensity: 0.0045,
    ground: 0x6e5636,
    grass: 0x5d6e33,
    path: 0x82683f,
    hazards: ['haybale', 'crate', 'knife'],
    hazardGap: [22, 34],
  },
  {
    id: 2,
    name: 'THE KITCHEN',
    sub: 'Night — hot ovens and carving knives',
    from: 1000,
    to: 1500,
    sky: { top: 0x241f38, mid: 0x7a3a4a, low: 0xc25a3a },
    fog: 0xa86a58,
    fogDeep: 0x2b2623, // brighter contrast kitchen
    fogDensity: 0.0035,
    ground: 0x7a6a68, // worn tile
    grass: 0x4a3a34,
    path: 0x8a7a72,
    hazards: ['oven', 'knife', 'pot'],
    hazardGap: [19, 30],
  },
];

export const DEG = Math.PI / 180;
