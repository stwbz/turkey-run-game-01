// The turkey: built from plain three.js primitives, no borrowed art.
// Brown body, fanned tail, red wattle, orange beak. Pose is driven by the
// run state: run bob, jump tuck, dash lean, hide crouch.
import * as THREE from 'three';

const BROWN = 0x7a4a26;
const DARK = 0x5a3418;
const CREAM = 0xe8d8b0;
const RED = 0xc23b2e;
const ORANGE = 0xe87a1a;

export function buildTurkey() {
  const group = new THREE.Group();
  group.name = 'turkey';

  // Soft-rounded cartoon: smooth shading + higher segments on every
  // organic part, so the turkey shares one visual language with the
  // softened farmer. (The tail fan stays flat 4-sided cones — feathers.)
  const bodyMat = new THREE.MeshStandardMaterial({ color: BROWN, flatShading: false, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: DARK, flatShading: false, roughness: 0.9 });
  const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, flatShading: false, roughness: 0.9 });

  // Body: a plump ellipsoid, tilted slightly forward.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 18), bodyMat);
  body.scale.set(1, 1.15, 1.25);
  body.position.y = 1.35;
  body.rotation.x = 0.25;
  group.add(body);

  // Breast patch.
  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), creamMat);
  breast.scale.set(0.9, 1, 0.7);
  breast.position.set(0, 1.25, 0.55);
  group.add(breast);

  // Tail fan: seven flattened cones fanned behind, big enough to read as
  // the turkey's silhouette from the chase camera.
  const tailMat = new THREE.MeshStandardMaterial({ color: DARK, flatShading: true, roughness: 0.9 });
  const tail = new THREE.Group();
  tail.position.set(0, 1.5, -0.95);
  for (let i = -3; i <= 3; i += 1) {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.7, 4), tailMat);
    feather.scale.set(1, 1, 0.28);
    feather.rotation.x = -0.7;
    feather.rotation.z = i * 0.26;
    feather.position.set(i * 0.28, 0.6, 0);
    tail.add(feather);
    // Cream tip on each feather.
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 4), creamMat);
    tip.scale.set(1, 1, 0.28);
    tip.rotation.x = -0.7;
    tip.rotation.z = i * 0.26;
    tip.position.set(i * 0.28, 1.28, -0.48);
    tail.add(tip);
  }
  group.add(tail);

  // Neck + head.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 16), darkMat);
  neck.position.set(0, 2.25, 0.55);
  neck.rotation.x = 0.25;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), new THREE.MeshStandardMaterial({ color: 0xd95f4a, flatShading: false, roughness: 0.8 }));
  head.position.set(0, 2.8, 0.72);
  group.add(head);
  // Beak, bigger so it reads at a glance, plus the red snood over it.
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 12), new THREE.MeshStandardMaterial({ color: ORANGE, flatShading: false, roughness: 0.7 }));
  beak.rotation.x = Math.PI / 2 + 0.15;
  beak.position.set(0, 2.76, 1.12);
  group.add(beak);
  const snood = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.38, 12), new THREE.MeshStandardMaterial({ color: RED, flatShading: false, roughness: 0.8 }));
  snood.rotation.x = Math.PI - 0.25;
  snood.position.set(0, 2.72, 1.14);
  group.add(snood);
  // Wattle: the red flap under the beak.
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: RED, flatShading: false, roughness: 0.8 }));
  wattle.scale.set(0.8, 1.4, 0.6);
  wattle.position.set(0, 2.55, 0.98);
  group.add(wattle);
  // Eyes: white ring with a dark pupil, so the face reads at a glance.
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xfdf3e0 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1210 });
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeWhite);
    white.position.set(s * 0.2, 2.88, 0.94);
    group.add(white);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat);
    eye.position.set(s * 0.2, 2.88, 1.01);
    group.add(eye);
  }

  // Wings: flattened ellipsoids that flap while running, with cream tips
  // (children of the wings, so they flap along) for shape against the body.
  const wingGeo = new THREE.SphereGeometry(0.55, 16, 12);
  const tipGeo = new THREE.SphereGeometry(0.34, 16, 12);
  const wingL = new THREE.Mesh(wingGeo, darkMat);
  wingL.scale.set(0.42, 1.0, 1.2);
  wingL.position.set(-0.82, 1.45, 0.1);
  const tipL = new THREE.Mesh(tipGeo, creamMat);
  tipL.position.set(0, -0.55, -0.1);
  wingL.add(tipL);
  group.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, darkMat);
  wingR.scale.set(0.42, 1.0, 1.2);
  wingR.position.set(0.82, 1.45, 0.1);
  const tipR = new THREE.Mesh(tipGeo, creamMat);
  tipR.position.set(0, -0.55, -0.1);
  wingR.add(tipR);
  group.add(wingR);

  // Legs: thin orange cylinders with three flat toes fanning forward.
  const legMat = new THREE.MeshStandardMaterial({ color: ORANGE, flatShading: false, roughness: 0.8 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), legMat);
  legL.position.set(-0.3, 0.35, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.3;
  group.add(legR);
  for (const lx of [-0.3, 0.3]) {
    for (const a of [-0.5, 0, 0.5]) {
      const toe = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 5), legMat);
      toe.rotation.x = Math.PI / 2 - 0.15;
      toe.rotation.y = a;
      toe.position.set(lx + Math.sin(a) * 0.12, 0.06, 0.16);
      group.add(toe);
    }
  }

  // A soft blob shadow under the bird so it reads on any ground.
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  group.add(blob);

  let runPhase = 0;
  function pose(s, dt) {
    // s: { speed, airborne, vy, y, dashing, hidden, hitFlash }
    // Waddle: side-to-side tilt at ~16 rad/s at cruise speed, with a run bob.
    runPhase += dt * (5 + s.speed * 1.0);
    const bob = Math.abs(Math.sin(runPhase)) * 0.15;
    group.position.y = s.y + bob;
    group.rotation.x = s.dashing ? 0.28 : s.airborne ? -0.25 : 0.08;
    group.rotation.z = Math.sin(runPhase) * 0.14;
    // Wings flap harder when dashing, fold when hidden.
    const flap = s.hidden ? 0.15 : 0.55 + Math.sin(runPhase * 2) * 0.35 + (s.dashing ? 0.3 : 0);
    wingL.rotation.z = flap;
    wingR.rotation.z = -flap;
    // Squash & stretch: hide = squash flat into the haystack, jump = stretch tall.
    let tsx = 1;
    let tsy = 1;
    let tsz = 1;
    if (s.hidden) {
      tsx = 1.2;
      tsy = 0.45;
      tsz = 1.2;
    } else if (s.airborne) {
      tsx = 0.9;
      tsy = 1.15;
      tsz = 0.9;
    }
    const k = Math.min(1, dt * 8);
    group.scale.x += (tsx - group.scale.x) * k;
    group.scale.y += (tsy - group.scale.y) * k;
    group.scale.z += (tsz - group.scale.z) * k;
    // Hit flash: blink the body red briefly.
    bodyMat.color.setHex(s.hitFlash > 0 ? 0xd8402e : BROWN);
    blob.material.opacity = s.airborne ? 0.12 : 0.3;
    blob.scale.setScalar(s.airborne ? 0.7 : 1);
  }

  return { group, pose };
}
