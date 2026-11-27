// Farmer Holt: the chaser. Tall, straw hat, blue overalls, plaid shirt —
// built from primitives. His AI has three states the judge's brief names:
// PURSUE (closes the gap), SEARCH (wanders when the turkey hides),
// CORNER (cuts across ahead in the kitchen). He carries a lantern in the
// barn and a carving knife in the kitchen.
import * as THREE from 'three';
import { clamp, angleDiff } from './random.js';

export const FARMER_PURSUE = 'PURSUE';
export const FARMER_SEARCH = 'SEARCH';
export const FARMER_CORNER = 'CORNER';

export function buildFarmer() {
  const group = new THREE.Group();
  group.name = 'farmer-holt';

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a077, flatShading: false, roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xa83a2e, flatShading: false, roughness: 0.9 });
  const overallMat = new THREE.MeshStandardMaterial({ color: 0x2e4a7a, flatShading: false, roughness: 0.9 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xd9b36a, flatShading: false, roughness: 0.9 });

  // Legs (overalls): soft capsules, not boxes — same silhouette, rounded.
  const legGeo = new THREE.CapsuleGeometry(0.21, 0.68, 8, 16);
  const legL = new THREE.Mesh(legGeo, overallMat);
  legL.position.set(-0.28, 0.55, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, overallMat);
  legR.position.set(0.28, 0.55, 0);
  group.add(legR);
  // Torso: a wide flattened capsule in plaid red — soft shoulders, no 90°
  // corners — plus a rounded overall bib patch on the chest.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.9, 8, 16), shirtMat);
  torso.scale.set(1.15, 0.7, 0.6);
  torso.position.y = 1.72;
  group.add(torso);
  const bib = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), overallMat);
  bib.scale.set(1, 1, 0.2);
  bib.position.set(0, 1.9, 0.28);
  group.add(bib);
  // Overall straps over the bib, a soft waistband bridging legs and torso,
  // and rounded work boots. No hard box edges on the body anymore. (A flat
  // belt ring would float over the capsule torso's narrowing waist, so the
  // waist is a short wide capsule in overall blue instead.)
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), overallMat);
    strap.position.set(s * 0.3, 2.05, 0.28);
    group.add(strap);
    const boot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), bootMat);
    boot.scale.set(0.8, 0.45, 1.2);
    boot.position.set(s * 0.28, 0.13, 0.08);
    group.add(boot);
  }
  const waist = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.3, 8, 16), overallMat);
  waist.scale.set(1.25, 0.55, 0.65);
  waist.position.y = 1.18;
  group.add(waist);
  // Arms: soft capsules that swing with the walk.
  const armGeo = new THREE.CapsuleGeometry(0.16, 0.78, 8, 16);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.75, 1.7, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(0.75, 1.7, 0);
  group.add(armR);
  // Head + wide straw hat with a dark band. Smooth-shaded sphere, higher
  // segments; the brim gets a rolled torus edge so it reads soft, not cut.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), skinMat);
  head.position.y = 2.65;
  group.add(head);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.09, 32), hatMat);
  brim.position.y = 2.95;
  group.add(brim);
  const brimEdge = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 32), hatMat);
  brimEdge.rotation.x = Math.PI / 2;
  brimEdge.position.y = 2.95;
  group.add(brimEdge);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.4, 24), hatMat);
  crown.position.y = 3.15;
  group.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.49, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.9 }));
  band.position.y = 2.99;
  group.add(band);
  // Moustache: a soft flattened blob, not a box.
  const mo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 }));
  mo.scale.set(1, 0.25, 0.2);
  mo.position.set(0, 2.52, 0.4);
  group.add(mo);

  // Lantern (barn stage): warm point light in the left hand.
  const lantern = new THREE.Group();
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 }));
  lantern.add(lampBody);
  const lampGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc46b }),
  );
  lampGlow.position.y = 0.05;
  lantern.add(lampGlow);
  // Soft additive halo so the lantern reads as glowing at dusk.
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.position.y = 0.05;
  lantern.add(halo);
  const lampLight = new THREE.PointLight(0xffaa33, 12, 14, 1.8);
  lampLight.position.y = 0.1;
  lantern.add(lampLight);
  lantern.position.set(-0.75, 1.05, 0.3);
  lantern.visible = false;
  group.add(lantern);

  // Carving knife (kitchen stage): a long glinting blade in the right hand.
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.15, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xd8dee8, roughness: 0.25, metalness: 0.9 }),
  );
  blade.position.y = 0.75;
  knife.add(blade);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 }));
  handle.position.y = 0.05;
  knife.add(handle);
  knife.position.set(0.75, 1.05, 0.3);
  knife.rotation.z = -0.5;
  knife.visible = false;
  group.add(knife);

  let walkPhase = 0;
  let heading = 0; // radians, 0 = facing -z (toward the turkey, forward)
  let flickerTime = 0;
  let lanternPhase = 0;
  function pose(dt, speed, state, gap) {
    walkPhase += dt * (3 + speed * 1.1);
    const swing = Math.sin(walkPhase) * (speed > 0.5 ? 0.45 : 0.08);
    armL.rotation.x = swing;
    armR.rotation.x = -swing;
    legL.rotation.x = -swing * 0.8;
    legR.rotation.x = swing * 0.8;
    // Lantern flicker + swing: the flame shivers, and the lantern swings
    // faster when the farmer is right on the turkey's tail (< 8 m).
    flickerTime += dt;
    const close = gap !== undefined && gap < 8;
    lanternPhase += dt * (close ? 22 : 9);
    lantern.rotation.z = Math.sin(lanternPhase) * 0.25;
    lampLight.intensity = 12 + Math.sin(flickerTime * 30) * 1.6;
    // Lean into the chase; scan around while searching.
    const lean = state === FARMER_SEARCH ? 0 : clamp(speed * 0.02, 0, 0.22);
    group.rotation.x = lean;
    group.rotation.y = heading;
  }
  function setStageProps(stage) {
    lantern.visible = stage === 1;
    knife.visible = stage === 2;
  }

  return { group, pose, setStageProps, setHeading: (h) => { heading = h; }, getHeading: () => heading };
}

// --- the chase AI ---
// gap: metres behind the turkey. Returns the new gap and state.
// turkeySpeed: current forward speed. hidden: turkey is in a haystack.
// stage: 0 farmyard, 1 barn, 2 kitchen. spotted: detection hit 100.
export function updateFarmerAI(ai, dt, opts) {
  const { turkeySpeed, hidden, stage, spotted, stageSpeeds, sprintSpeed, baseSpeed } = opts;
  let { gap, state, stateTime, searchX } = ai;

  if (state === FARMER_SEARCH) {
    // He has lost the trail: wanders near the last seen lane, gap holds.
    stateTime += dt;
    searchX = Math.sin(stateTime * 0.8) * 3;
    if (stateTime > 2.5) {
      state = FARMER_PURSUE;
      stateTime = 0;
    }
  } else if (state === FARMER_CORNER && stage === 2) {
    // Kitchen: he cuts across ahead — the gap closes no matter what.
    stateTime += dt;
    gap -= (sprintSpeed * 0.6) * dt;
    if (stateTime > 2.2) {
      state = FARMER_PURSUE;
      stateTime = 0;
    }
  } else {
    state = FARMER_PURSUE;
    stateTime = 0;
    const farmerSpeed = spotted ? sprintSpeed : stageSpeeds[stage];
    gap += (turkeySpeed - farmerSpeed) * dt;
    if (hidden) {
      // Hiding breaks the chase: he stops, looks around, loses the trail.
      state = FARMER_SEARCH;
      stateTime = 0;
    } else if (stage === 2 && gap < 8 && ai.cornerCooldown <= 0) {
      state = FARMER_CORNER;
      stateTime = 0;
      ai.cornerCooldown = 9;
    }
  }
  if (ai.cornerCooldown > 0) ai.cornerCooldown -= dt;
  gap = clamp(gap, -2, 30);
  ai.gap = gap;
  ai.state = state;
  ai.stateTime = stateTime;
  ai.searchX = searchX;
  return ai;
}

export function createFarmerAI() {
  return { gap: 18, state: FARMER_PURSUE, stateTime: 0, searchX: 0, cornerCooldown: 6 };
}
