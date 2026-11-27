// The world: a straight farm track the turkey runs down. The turkey stays
// near z = 0 and the world scrolls toward the camera: hazards, pickups and
// haystacks spawn far ahead (z = -150) and recycle once they pass behind.
// Three stages re-skin the same track: farmyard, barn, kitchen.
import * as THREE from 'three';
import { CONFIG, STAGES } from './config.js';
import { mulberry32, clamp } from './random.js';

const SPAWN_Z = -150;
const DESPAWN_Z = 18;

function canvasTexture(draw, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, seed) {
  const rng = mulberry32(seed + 101);
  const group = new THREE.Group();
  scene.add(group);

  // --- ground: one long dirt track with grassy shoulders ---
  // Vertex-color variation so the big planes never read as a flat fill.
  // Vertex colors multiply the material color, so setStage only re-tints.
  function variedPlane(w, h, ws, hs, colorSeed) {
    const geo = new THREE.PlaneGeometry(w, h, ws, hs);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const vrng = mulberry32(colorSeed);
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const n = 0.9 + 0.06 * Math.sin(x * 0.35 + 1.7) * Math.cos(y * 0.09 + 0.4)
        + 0.04 * Math.sin(x * 1.3 + y * 0.23) + (vrng() - 0.5) * 0.04;
      const v = Math.max(0.78, Math.min(1, n));
      col[i * 3] = v;
      col[i * 3 + 1] = v;
      col[i * 3 + 2] = v;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }
  const groundMat = new THREE.MeshStandardMaterial({ color: STAGES[0].ground, roughness: 1, vertexColors: true });
  const ground = new THREE.Mesh(variedPlane(60, 420, 24, 84, seed + 303), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -150);
  group.add(ground);
  // Worn dirt path down the middle, slightly lighter than the track.
  const pathMat = new THREE.MeshStandardMaterial({ color: STAGES[0].path, roughness: 1, vertexColors: true });
  const path = new THREE.Mesh(variedPlane(13, 420, 6, 84, seed + 304), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -150);
  group.add(path);
  const grassMat = new THREE.MeshStandardMaterial({ color: STAGES[0].grass, roughness: 1 });
  for (const s of [-1, 1]) {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 420), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(s * 75, -0.05, -150);
    group.add(grass);
  }
  // Lane guides: faint dashed centre lines down the track.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 });
  for (const x of [-2, 2]) {
    for (let z = 10; z > -300; z -= 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.03, z);
      group.add(dash);
    }
  }

  // --- backdrop: red barn, farmhouse, silo, fences, trees, pumpkins ---
  const backdrop = new THREE.Group();
  group.add(backdrop);
  const barnMat = new THREE.MeshStandardMaterial({ color: 0xa83a2e, flatShading: true, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, flatShading: true, roughness: 0.9 });
  function barnAt(x, z, s = 1) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(16 * s, 9 * s, 12 * s), barnMat);
    body.position.y = 4.5 * s;
    b.add(body);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(6.2 * s, 6.2 * s, 12 * s, 3, 1), roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 9 * s;
    roof.scale.set(1, 1, 0.75);
    b.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(5 * s, 6 * s), new THREE.MeshStandardMaterial({ color: 0x3a2418 }));
    door.position.set(0, 3 * s, 6.05 * s);
    b.add(door);
    b.position.set(x, 0, z);
    backdrop.add(b);
  }
  barnAt(-34, -90, 1.2);
  barnAt(40, -190, 1);
  // Farmhouse + silo on the other side.
  const house = new THREE.Group();
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 10), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, flatShading: true, roughness: 0.9 }));
  houseBody.position.y = 4;
  house.add(houseBody);
  const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 5, 4), roofMat);
  houseRoof.position.y = 10.5;
  houseRoof.rotation.y = Math.PI / 4;
  house.add(houseRoof);
  house.position.set(36, 0, -60);
  backdrop.add(house);
  const silo = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc4, flatShading: true, roughness: 0.6, metalness: 0.3 }),
  );
  silo.position.set(-38, 8, -150);
  backdrop.add(silo);
  // Fence posts marching down both shoulders.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 1 });
  for (const s of [-1, 1]) {
    for (let z = 12; z > -300; z -= 14) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), postMat);
      post.position.set(s * 12, 0.8, z);
      backdrop.add(post);
    }
    for (const y of [0.7, 1.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 320), railMat);
      rail.position.set(s * 12, y, -144);
      backdrop.add(rail);
    }
  }
  // Trees and pumpkins scattered on the grass.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xc26a1a, flatShading: true, roughness: 0.9 });
  const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xe87a1a, flatShading: true, roughness: 0.8 });
  for (let i = 0; i < 26; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const x = s * (18 + rng() * 30);
    const z = 10 - rng() * 300;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 6), trunkMat);
    trunk.position.set(x, 2, z);
    backdrop.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 + rng() * 1.4, 0), leafMat);
    crown.position.set(x, 5.5, z);
    backdrop.add(crown);
  }
  for (let i = 0; i < 18; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.9 + rng() * 0.5, 8, 6), pumpkinMat);
    p.scale.y = 0.8;
    p.position.set(s * (15 + rng() * 22), 0.6, 10 - rng() * 300);
    backdrop.add(p);
  }

  // --- grass tufts and fallen leaves (instanced: two draw calls) ---
  const dummy = new THREE.Object3D();
  const tuftGeo = new THREE.ConeGeometry(0.16, 0.8, 5);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 260);
  const tuftRng = mulberry32(seed + 404);
  const tuftColors = [0x7a8a3c, 0x8a9a44, 0x6a7a30, 0xa89a4a];
  for (let i = 0; i < 260; i += 1) {
    const s = tuftRng() > 0.5 ? 1 : -1;
    const x = s * (7.5 + tuftRng() * 32);
    const z = 12 - tuftRng() * 310;
    dummy.position.set(x, 0.35, z);
    dummy.rotation.set((tuftRng() - 0.5) * 0.5, tuftRng() * Math.PI, (tuftRng() - 0.5) * 0.5);
    const sc = 0.7 + tuftRng() * 0.9;
    dummy.scale.set(sc, sc * (0.8 + tuftRng() * 0.6), sc);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, new THREE.Color(tuftColors[Math.floor(tuftRng() * tuftColors.length)]));
  }
  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  backdrop.add(tufts);
  const fallLeafGeo = new THREE.CircleGeometry(0.2, 6);
  const fallLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(fallLeafGeo, fallLeafMat, 140);
  const leafRng = mulberry32(seed + 505);
  const leafColors = [0xd96a1e, 0xc23b2e, 0xe8a81e, 0xa83a2e, 0xe87a1a];
  for (let i = 0; i < 140; i += 1) {
    const x = (leafRng() - 0.5) * 2 * (6 + leafRng() * 22);
    const z = 12 - leafRng() * 300;
    dummy.position.set(x, 0.045, z);
    dummy.rotation.set(-Math.PI / 2 + (leafRng() - 0.5) * 0.4, 0, leafRng() * Math.PI);
    const sc = 0.7 + leafRng() * 0.9;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, new THREE.Color(leafColors[Math.floor(leafRng() * leafColors.length)]));
  }
  leaves.instanceMatrix.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  backdrop.add(leaves);

  // --- denser mid-ground props on the shoulders (never in the lanes) ---
  // Local materials: this block runs before the `mats` table below.
  const hayMat2 = new THREE.MeshStandardMaterial({ color: 0xd9b36a, flatShading: true, roughness: 1 });
  const crateMat2 = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, flatShading: true, roughness: 0.9 });
  const cornMat2 = new THREE.MeshStandardMaterial({ color: 0xffd23e, flatShading: true, roughness: 0.6 });
  // Hay bales.
  const baleGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.6, 10);
  for (let i = 0; i < 10; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const bale = new THREE.Mesh(baleGeo, hayMat2);
    bale.rotation.z = Math.PI / 2;
    bale.rotation.y = rng() * Math.PI;
    bale.position.set(s * (14 + rng() * 14), 1.0, 8 - rng() * 290);
    backdrop.add(bale);
  }
  // Crates, some stacked.
  const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  for (let i = 0; i < 8; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const x = s * (13 + rng() * 10);
    const z = 8 - rng() * 290;
    const c = new THREE.Mesh(crateGeo, crateMat2);
    c.position.set(x, 0.9, z);
    c.rotation.y = rng() * 0.6;
    backdrop.add(c);
    if (rng() > 0.5) {
      const c2 = new THREE.Mesh(crateGeo, crateMat2);
      c2.scale.setScalar(0.7);
      c2.position.set(x + 0.3, 2.4, z + 0.2);
      c2.rotation.y = rng();
      backdrop.add(c2);
    }
  }
  // Lantern posts: warm glow posts along both shoulders.
  const postMat2 = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 1 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  for (let i = 0; i < 8; i += 1) {
    const s = i % 2 === 0 ? 1 : -1;
    const z = -8 - i * 36;
    const post = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.0, 6), postMat2);
    pole.position.y = 1.5;
    post.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.12), postMat2);
    arm.position.set(-s * 0.35, 2.9, 0);
    post.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 }));
    lamp.position.set(-s * 0.75, 2.6, 0);
    post.add(lamp);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lampGlowMat);
    glow.position.copy(lamp.position);
    post.add(glow);
    post.position.set(s * 10.5, 0, z);
    backdrop.add(post);
  }
  // Barrels and extra pumpkins close to the track edge.
  const barrelGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.5, 10);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 8; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const b = new THREE.Mesh(barrelGeo, barrelMat);
    b.position.set(s * (13 + rng() * 11), 0.75, 8 - rng() * 290);
    backdrop.add(b);
  }
  for (let i = 0; i < 12; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.9 + rng() * 0.4, 8, 6), pumpkinMat);
    p.scale.y = 0.8;
    p.position.set(s * (10.5 + rng() * 4), 0.6, 8 - rng() * 290);
    backdrop.add(p);
  }
  // Corn stalk clusters.
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x4a7a2e, flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 10; i += 1) {
    const s = rng() > 0.5 ? 1 : -1;
    const cx = s * (11 + rng() * 9);
    const cz = 8 - rng() * 290;
    for (let k = 0; k < 3; k += 1) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.6, 5), stalkMat);
      stalk.position.set(cx + (rng() - 0.5) * 0.8, 1.3, cz + (rng() - 0.5) * 0.8);
      stalk.rotation.z = (rng() - 0.5) * 0.25;
      backdrop.add(stalk);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 5), cornMat2);
      tip.position.set(stalk.position.x, 2.8, stalk.position.z);
      backdrop.add(tip);
    }
  }

  // --- kitchen end: the freedom window, glowing at the far end of stage 3 ---
  // Procedural kitchen tile: 128x128 canvas, 64x64 checker in muted dusty
  // terracotta + dimmed cream (the old saturated red at 5 m tiles, spread
  // over the whole 60 m ground, read as a picnic cloth to the horizon).
  // Mapped onto the 13 m path only in stage 3 (see setStage): repeat
  // 2.6x84 gives ~2.5 m tiles, and the muted taupe ground around it keeps
  // the path readable.
  function makeTileTexture(rx, ry) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#c4b294';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#96604c';
    g.fillRect(64, 0, 64, 64);
    g.fillRect(0, 64, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    return tex;
  }
  const tileTexPath = makeTileTexture(2.6, 84);

  // Barn interior frame: pillars + cross beams + roof slab. Only visible
  // in the barn stage — the turkey runs through the barn, not past it.
  const barnFrame = new THREE.Group();
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 1 });
  for (const z of [-35, -75]) {
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), beamMat);
      pillar.position.set(s * 9, 3, z);
      barnFrame.add(pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19, 0.6, 0.6), beamMat);
    beam.position.set(0, 6, z);
    barnFrame.add(beam);
  }
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 42), beamMat);
  roofSlab.position.set(0, 6.4, -55);
  barnFrame.add(roofSlab);
  barnFrame.visible = false;
  group.add(barnFrame);
  const windowFrame = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), glowMat);
  pane.position.set(0, 4, -0.1);
  windowFrame.add(pane);
  for (const [w, h, x, y] of [[10.8, 0.5, 0, 7.7], [10.8, 0.5, 0, 0.3], [0.5, 8, -5.2, 4], [0.5, 8, 5.2, 4], [0.4, 7, 0, 4], [10, 0.4, 0, 4]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), frameMat);
    bar.position.set(x, y, 0);
    windowFrame.add(bar);
  }
  const windowGlow = new THREE.PointLight(0xffe9a8, 60, 60, 1.6);
  windowGlow.position.set(0, 4, 2);
  windowFrame.add(windowGlow);
  windowFrame.position.set(0, 0, -150);
  windowFrame.visible = false;
  group.add(windowFrame);

  // --- hazard / pickup / haystack factories ---
  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x8a6a45, flatShading: true, roughness: 0.9 }),
    pumpkin: new THREE.MeshStandardMaterial({ color: 0xe87a1a, flatShading: true, roughness: 0.8 }),
    hay: new THREE.MeshStandardMaterial({ color: 0xd9b36a, flatShading: true, roughness: 1 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x9a7a4a, flatShading: true, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd8dee8, roughness: 0.25, metalness: 0.9 }),
    oven: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, flatShading: true, roughness: 0.5, metalness: 0.4 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
    pot: new THREE.MeshStandardMaterial({ color: 0x4a4a52, flatShading: true, roughness: 0.4, metalness: 0.6 }),
    corn: new THREE.MeshStandardMaterial({ color: 0xffd23e, flatShading: true, roughness: 0.6 }),
    feather: new THREE.MeshStandardMaterial({ color: 0xfff2b0, flatShading: true, roughness: 0.6, emissive: 0xaa8822, emissiveIntensity: 0.6 }),
  };
  const cornTex = canvasTexture((g) => {
    g.fillStyle = '#ffd23e';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#c9a227';
    for (let y = 8; y < 128; y += 14) for (let x = 8; x < 128; x += 14) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  });

  function makeHazard(kind) {
    const g = new THREE.Group();
    g.userData.kind = kind;
    if (kind === 'fence') {
      // A low wooden fence across one lane: jump it.
      for (const dx of [-1.4, 0, 1.4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), mats.wood);
        post.position.set(dx, 0.75, 0);
        g.add(post);
      }
      for (const y of [0.6, 1.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.12), mats.wood);
        rail.position.set(0, y, 0);
        g.add(rail);
      }
      g.userData.jumpHeight = 1.4;
    } else if (kind === 'pumpkin') {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), mats.pumpkin);
      p.scale.y = 0.85;
      p.position.y = 0.9;
      g.add(p);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.5, 6), mats.wood);
      stem.position.y = 1.8;
      g.add(stem);
      g.userData.jumpHeight = 1.7;
    } else if (kind === 'haybale') {
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.6, 10), mats.hay);
      bale.rotation.z = Math.PI / 2;
      bale.position.y = 1.0;
      g.add(bale);
      g.userData.jumpHeight = 1.9;
    } else if (kind === 'crate') {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), mats.crate);
      c.position.y = 1.0;
      g.add(c);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 2.1), mats.wood);
      edge.position.y = 2.0;
      g.add(edge);
      g.userData.jumpHeight = 1.9;
    } else if (kind === 'knife') {
      // A carving knife stuck in the ground, blade up: jump it.
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.55), mats.steel);
      blade.position.y = 1.2;
      blade.rotation.z = 0.25;
      g.add(blade);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), mats.wood);
      handle.position.set(-0.25, 0.35, 0);
      handle.rotation.z = 0.25;
      g.add(handle);
      g.userData.jumpHeight = 2.0;
    } else if (kind === 'oven') {
      // A hot oven across the lane: jump it, or it burns a heart.
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1.6), mats.oven);
      body.position.y = 1.1;
      g.add(body);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), mats.fire);
      mouth.position.set(0, 0.95, 0.85);
      g.add(mouth);
      const glow = new THREE.PointLight(0xff7a1a, 12, 14, 1.8);
      glow.position.set(0, 1.2, 1.5);
      g.add(glow);
      g.userData.jumpHeight = 2.2;
    } else if (kind === 'pot') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 1.4, 10), mats.pot);
      pot.position.y = 0.7;
      g.add(pot);
      const steam = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
      steam.position.y = 1.7;
      g.add(steam);
      g.userData.jumpHeight = 1.6;
    }
    return g;
  }

  function makeCorn() {
    const g = new THREE.Group();
    g.userData.kind = 'corn';
    const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 8), new THREE.MeshStandardMaterial({ map: cornTex, roughness: 0.6 }));
    cob.rotation.z = Math.PI / 2;
    cob.position.y = 1.1;
    g.add(cob);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x3f7a2e, flatShading: true, roughness: 0.9 }));
    leaf.rotation.z = -Math.PI / 2;
    leaf.position.set(-0.7, 1.1, 0);
    g.add(leaf);
    return g;
  }

  function makeFeather() {
    const g = new THREE.Group();
    g.userData.kind = 'feather';
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 6), mats.feather);
    f.position.y = 1.4;
    g.add(f);
    const glow = new THREE.PointLight(0xffe9a8, 5, 8, 1.8);
    glow.position.y = 1.4;
    g.add(glow);
    return g;
  }

  function makeHaystack() {
    const g = new THREE.Group();
    g.userData.kind = 'haystack';
    const stack = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.2, 8), mats.hay);
    stack.position.y = 1.6;
    g.add(stack);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 8), mats.hay);
    base.position.y = 0.4;
    g.add(base);
    return g;
  }

  // --- scrolling entities ---
  const entities = []; // { mesh, kind, lane, z, hit }
  const spawnRng = mulberry32(seed + 202);
  let nextHazardAt = 60; // distance at which the next hazard spawns
  let nextCornAt = 25;
  let nextHayAt = 120;

  function spawn(kind, lane, z) {
    let mesh;
    if (kind === 'corn') mesh = makeCorn();
    else if (kind === 'feather') mesh = makeFeather();
    else if (kind === 'haystack') mesh = makeHaystack();
    else mesh = makeHazard(kind);
    mesh.position.set(CONFIG.lanes[lane], 0, z);
    group.add(mesh);
    entities.push({ mesh, kind, lane, z, hit: false });
  }

  function update(dt, distance, speed, stage) {
    // Move everything toward the camera; the turkey stays near z = 0.
    for (let i = entities.length - 1; i >= 0; i -= 1) {
      const e = entities[i];
      e.z += speed * dt;
      e.mesh.position.z = e.z;
      if (e.kind === 'corn' || e.kind === 'feather') e.mesh.rotation.y += dt * 2;
      if (e.z > DESPAWN_Z) {
        group.remove(e.mesh);
        entities.splice(i, 1);
      }
    }
    // Spawn ahead as the run advances.
    const stageDef = STAGES[stage];
    while (distance + 150 > nextHazardAt) {
      const kinds = stageDef.hazards;
      const kind = kinds[Math.floor(spawnRng() * kinds.length)];
      const lane = Math.floor(spawnRng() * 3);
      spawn(kind, lane, SPAWN_Z - (nextHazardAt - distance));
      nextHazardAt += stageDef.hazardGap[0] + spawnRng() * (stageDef.hazardGap[1] - stageDef.hazardGap[0]);
    }
    while (distance + 150 > nextCornAt) {
      const lane = Math.floor(spawnRng() * 3);
      spawn('corn', lane, SPAWN_Z - (nextCornAt - distance));
      if (spawnRng() < 0.16) spawn('feather', (lane + 1) % 3, SPAWN_Z - (nextCornAt - distance) - 6);
      nextCornAt += 16 + spawnRng() * 22;
    }
    while (distance + 150 > nextHayAt) {
      const lane = Math.floor(spawnRng() * 3);
      spawn('haystack', lane, SPAWN_Z - (nextHayAt - distance));
      nextHayAt += 150 + spawnRng() * 90;
    }
    // The freedom window appears in the last stretch of stage 3 and
    // scrolls toward the turkey: at 1500 m it is right in front of it.
    windowFrame.visible = stage === 2 && distance > 1350;
    if (windowFrame.visible) windowFrame.position.z = -150 + (distance - 1350);
  }

  function setStage(stage) {
    const def = STAGES[stage];
    // Kitchen: the checker lives on the path runner only; the ground around
    // it stays muted taupe so the floor reads as "kitchen" without shouting.
    groundMat.map = null;
    groundMat.color.setHex(def.ground);
    groundMat.needsUpdate = true;
    if (stage === 2) {
      pathMat.map = tileTexPath;
      pathMat.color.setHex(0xffffff);
    } else {
      pathMat.map = null;
      pathMat.color.setHex(def.path);
    }
    pathMat.needsUpdate = true;
    grassMat.color.setHex(def.grass);
    barnFrame.visible = stage === 1;
  }

  function reset() {
    for (const e of entities) group.remove(e.mesh);
    entities.length = 0;
    nextHazardAt = 60;
    nextCornAt = 25;
    nextHayAt = 120;
    windowFrame.visible = false;
  }

  return { group, entities, update, setStage, reset, groundMat, grassMat, pathMat };
}
