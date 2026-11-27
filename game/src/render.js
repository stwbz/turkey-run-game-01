// Rendering: one WebGLRenderer, one scene, one chase camera. Autumn
// lighting (low amber sun + warm fog + a gradient sky dome), ACES tone
// mapping, DPR clamped. The camera trails the turkey with exponential
// smoothing and a dash-based FOV kick.
import * as THREE from 'three';
import { CONFIG, STAGES } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Exponential fog: each stage fades into its own haze colour, lerped by
  // distance inside the stage (see updateAtmosphere). Density stays low
  // enough that the track and lanes never wash out.
  scene.fog = new THREE.FogExp2(STAGES[0].fogDeep, STAGES[0].fogDensity);
  const bgColor = new THREE.Color(STAGES[0].fogDeep);
  scene.background = bgColor;

  // Gradient sky dome: amber horizon rising to a violet autumn dusk.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(STAGES[0].sky.top) },
      mid: { value: new THREE.Color(STAGES[0].sky.mid) },
      low: { value: new THREE.Color(STAGES[0].sky.low) },
    },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vPos;
      uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h))
                          : mix(low, mid, smoothstep(-0.08, 0.18, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  sky.name = 'sky';
  scene.add(sky);

  // Low amber sun + warm hemisphere fill.
  const sun = new THREE.DirectionalLight(0xffa54d, 2.7);
  sun.position.set(-120, 90, -80);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffa87a, 0x3a4a2e, 1.0);
  scene.add(hemi);
  // Warm fill from behind the camera: lifts the turkey's and farmer's
  // camera-facing sides out of the dusk shadow.
  const fill = new THREE.DirectionalLight(0xffd9a0, 0.7);
  fill.position.set(25, 30, 60);
  scene.add(fill);

  // Sun disc low on the horizon, ahead of the run.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, fog: false }),
  );
  sunDisc.position.set(-60, 42, -260);
  sunDisc.lookAt(0, 10, 0);
  scene.add(sunDisc);

  const camera = new THREE.PerspectiveCamera(CONFIG.fovBase, window.innerWidth / window.innerHeight, 0.5, 1200);
  camera.position.set(0, 6, 12);

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  const camPos = new THREE.Vector3(0, 6, 12);
  const camTarget = new THREE.Vector3();
  function updateChaseCamera(turkeyPos, dashing, dt, instant) {
    const desired = new THREE.Vector3(
      turkeyPos.x * 0.55,
      turkeyPos.y + CONFIG.chaseHeight,
      turkeyPos.z + CONFIG.chaseDistance,
    );
    const k = instant ? 1 : 1 - Math.exp(-5 * dt);
    camPos.lerp(desired, k);
    camera.position.copy(camPos);
    // Look slightly down the track: the turkey stays centre-frame and the
    // farmer looming behind it stays in the bottom of the frame.
    camTarget.lerp(new THREE.Vector3(turkeyPos.x * 0.8, turkeyPos.y + 1.2, turkeyPos.z - 10), instant ? 1 : 1 - Math.exp(-7 * dt));
    camera.lookAt(camTarget);
    const targetFov = dashing ? CONFIG.fovDash : CONFIG.fovBase;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
      camera.updateProjectionMatrix();
    }
  }

  // Atmosphere: fog colour/density and the sky gradient lerp from the
  // current stage's palette toward the next as the run crosses the stage
  // (progress 0..1). Called every frame in live play and once per staged
  // screenshot; setStage keeps the light intensities only.
  const _fogA = new THREE.Color();
  const _fogB = new THREE.Color();
  function updateAtmosphere(stage, progress) {
    const next = Math.min(STAGES.length - 1, stage + 1);
    const p = stage === STAGES.length - 1 ? 0 : Math.max(0, Math.min(1, progress));
    _fogA.setHex(STAGES[stage].fogDeep);
    _fogB.setHex(STAGES[next].fogDeep);
    bgColor.lerpColors(_fogA, _fogB, p);
    scene.fog.color.copy(bgColor);
    scene.fog.density = STAGES[stage].fogDensity + (STAGES[next].fogDensity - STAGES[stage].fogDensity) * p;
    for (const key of ['top', 'mid', 'low']) {
      _fogA.setHex(STAGES[stage].sky[key]);
      _fogB.setHex(STAGES[next].sky[key]);
      skyMat.uniforms[key].value.lerpColors(_fogA, _fogB, p);
    }
  }

  function setStage(stage) {
    sun.intensity = stage === 2 ? 1.8 : 2.7;
    hemi.intensity = stage === 2 ? 0.65 : 1.0;
    fill.intensity = stage === 2 ? 0.5 : 0.7;
  }

  return { renderer, scene, camera, updateChaseCamera, setStage, updateAtmosphere, onResize };
}
