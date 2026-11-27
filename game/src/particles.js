// Particles: one THREE.Points cloud, CPU-updated. Feather bursts on hits,
// golden sparkles on pickups, dust puffs at the turkey's feet while running.
// Purely cosmetic — no gameplay state lives here. All randomness is seeded
// (same seed, same frame), matching the rest of the game: no Math.random.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

const COUNT = 240;

function spriteTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createParticles(scene, seed) {
  const rng = mulberry32(seed + 606);
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i += 1) positions[i * 3 + 1] = -100; // parked below ground
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.55,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: spriteTexture(),
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const vel = new Float32Array(COUNT * 3);
  const life = new Float32Array(COUNT);
  const maxLife = new Float32Array(COUNT);
  const base = new Float32Array(COUNT * 3);
  const grav = new Float32Array(COUNT);
  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, r, g, b, ttl, gravity) {
    const i = cursor;
    cursor = (cursor + 1) % COUNT;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    vel[i * 3] = vx;
    vel[i * 3 + 1] = vy;
    vel[i * 3 + 2] = vz;
    base[i * 3] = r;
    base[i * 3 + 1] = g;
    base[i * 3 + 2] = b;
    life[i] = ttl;
    maxLife[i] = ttl;
    grav[i] = gravity;
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  function burstFeathers(p) {
    // Brown-orange feathers with cream tips, 20 in a burst.
    for (let k = 0; k < 20; k += 1) {
      const a = rng() * Math.PI * 2;
      const sp = 1.5 + rng() * 3.5;
      const cream = rng() > 0.6;
      spawn(
        p.x + (rng() - 0.5) * 0.6, p.y + 1.2 + rng() * 0.8, p.z + (rng() - 0.5) * 0.6,
        Math.cos(a) * sp, 1.5 + rng() * 3, Math.sin(a) * sp,
        cream ? 0.95 : 0.85, cream ? 0.85 : 0.5, cream ? 0.6 : 0.2,
        1.1 + rng() * 0.7, 2.2,
      );
    }
  }

  function burstSparkle(p) {
    for (let k = 0; k < 18; k += 1) {
      const a = rng() * Math.PI * 2;
      const sp = 0.8 + rng() * 2;
      spawn(
        p.x + (rng() - 0.5) * 0.8, p.y + 1.0 + rng() * 0.6, p.z + (rng() - 0.5) * 0.8,
        Math.cos(a) * sp, 0.8 + rng() * 2.2, Math.sin(a) * sp,
        1.0, 0.8, 0.35, 0.7 + rng() * 0.5, -0.6,
      );
    }
  }

  function puffDust(p) {
    for (let k = 0; k < 5; k += 1) {
      spawn(
        p.x + (rng() - 0.5) * 0.9, 0.15 + rng() * 0.25, p.z + 0.3 + rng() * 0.8,
        (rng() - 0.5) * 1.2, 0.4 + rng() * 0.7, 0.8 + rng() * 1.2,
        0.85, 0.62, 0.38, 0.6 + rng() * 0.4, 0.6,
      );
    }
  }

  function update(dt) {
    for (let i = 0; i < COUNT; i += 1) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        positions[i * 3 + 1] = -100;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
        continue;
      }
      vel[i * 3 + 1] -= grav[i] * dt;
      // Mild horizontal drag so bursts settle instead of sliding forever.
      vel[i * 3] *= (1 - dt * 0.6);
      vel[i * 3 + 2] *= (1 - dt * 0.6);
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (positions[i * 3 + 1] < 0.05 && grav[i] > 0) {
        positions[i * 3 + 1] = 0.05;
        vel[i * 3 + 1] = 0;
      }
      const f = life[i] / maxLife[i];
      colors[i * 3] = base[i * 3] * f;
      colors[i * 3 + 1] = base[i * 3 + 1] * f;
      colors[i * 3 + 2] = base[i * 3 + 2] * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { update, burstFeathers, burstSparkle, puffDust };
}
