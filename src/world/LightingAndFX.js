import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Sets up the Vice City / Miami neo-noir lighting rig, exponential fog,
 * coffee steam & dynamic oven turkey smoke particle systems, candle flicker,
 * and EffectComposer + UnrealBloomPass with quality preset support.
 */
export function buildLightingAndFX(scene, renderer, camera, layout) {
  const A = layout.ANCHORS;

  // --- 1. Exponential Neon Night Fog ---
  scene.fog = new THREE.FogExp2(0x130824, 0.0105);

  // --- 2. Base Ambient & Hemisphere Fill ---
  const hemi = new THREE.HemisphereLight(0xb88cff, 0x261233, 0.72);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x3a2454, 0.45);
  scene.add(ambient);

  // --- 3. Room-by-Room Neo-Noir Point & Spot Lights ---
  function addPoint(color, intensity, distance, x, y, z, castShadow = false) {
    const l = new THREE.PointLight(color, intensity, distance, 1.4);
    l.position.set(x, y, z);
    if (castShadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(512, 512);
      l.shadow.bias = -0.002;
    }
    scene.add(l);
    return l;
  }

  // Living Room (Refs #1, #2, #4)
  const livingMainLight = addPoint(0xd48cff, 2.2, 14, -3.8, 4.1, -1.8, true);
  const crystalLampLight = addPoint(0xff3b9a, 1.6, 6.5, A.coffee_table.x - 0.2, 1.0, A.coffee_table.z - 0.1);
  const amberOrbLight = addPoint(0xff9b3d, 1.5, 5.5, -8.2, 0.65, -4.4);
  const candleLight = addPoint(0xffaa44, 1.1, 4.5, -8.1, 0.7, -6.4);
  addPoint(0x00d9ff, 1.1, 9.0, -7.8, 2.4, -7.0); // Cool cyan city window bounce
  addPoint(0xff2d95, 1.2, 7.0, A.spiral_stair.x, 2.2, A.spiral_stair.z); // Pink spiral stair glow

  // Kitchen (Ref #5)
  const kitchenSoffitLight = addPoint(0xffe1c4, 2.4, 12, A.marble_island.x, 3.0, A.marble_island.z, true);
  addPoint(0xff3b9a, 1.8, 9.5, 5.5, 2.2, -6.2); // Hot-pink kitchen backsplash & counters

  // Foyer
  addPoint(0xc98cff, 1.6, 8.5, 11.7, 3.0, -1.0);

  // Balcony
  addPoint(0x00e5ff, 1.6, 11, -6.0, 2.8, -9.5);
  addPoint(0xff2d95, 1.4, 10, -1.5, 2.8, -9.5);

  // Bedroom (Ref #6)
  addPoint(0xff2d95, 2.2, 11, -5.8, 2.9, 6.0); // Lush hot-pink bedroom ambiance
  addPoint(0xffdd66, 1.7, 6.5, A.bedroom_lamp.x, 1.35, A.bedroom_lamp.z); // Warm yellow lamp
  addPoint(0x00e5ff, 0.9, 7.5, -5.7, 1.8, 8.8); // Cyan ocean bay window reflection

  // Bathroom
  addPoint(0xe6b8ff, 1.8, 8.5, 0.2, 2.8, 5.8);
  addPoint(0xff4da6, 1.1, 5.5, A.bathroom_mirror.x - 0.5, 1.8, A.bathroom_mirror.z);

  // Security Room
  addPoint(0x00e5ff, 1.9, 10, A.cctv_desk.x, 2.3, A.cctv_desk.z - 0.8);
  addPoint(0xffaa33, 1.1, 6.0, A.radio_desk.x - 0.6, 1.6, A.radio_desk.z);
  addPoint(0xff2d95, 1.0, 6.0, A.wall_safe.x + 0.8, 1.9, A.wall_safe.z);

  // --- 4. Steaming Coffee Mug Particles (Ref #1) ---
  const steamCount = 24;
  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(steamCount * 3);
  const steamData = [];
  for (let i = 0; i < steamCount; i++) {
    const t = Math.random();
    steamData.push({ t, speed: 0.35 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 });
    steamPos[i * 3] = A.coffee_mug.x;
    steamPos[i * 3 + 1] = 0.2 + t * 0.65;
    steamPos[i * 3 + 2] = A.coffee_mug.z;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({
    color: 0xe6d6ff,
    size: 0.12,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const steamPoints = new THREE.Points(steamGeo, steamMat);
  scene.add(steamPoints);

  // --- 5. Dynamic Turkey Oven Smoke Particles ---
  const smokeCount = 80;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeData = [];
  for (let i = 0; i < smokeCount; i++) {
    smokeData.push({
      t: Math.random(),
      speed: 0.28 + Math.random() * 0.35,
      ox: (Math.random() - 0.5) * 0.6,
      oz: (Math.random() - 0.5) * 0.4,
    });
    smokePos[i * 3] = A.kitchen_oven.x;
    smokePos[i * 3 + 1] = 0.85;
    smokePos[i * 3 + 2] = A.kitchen_oven.z + 0.45;
  }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smokeMat = new THREE.PointsMaterial({
    color: 0x998ea8,
    size: 0.42,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const smokePoints = new THREE.Points(smokeGeo, smokeMat);
  smokePoints.visible = false;
  scene.add(smokePoints);

  let turkeySmokeLevel = 0;
  function setTurkeySmoke(level) {
    turkeySmokeLevel = Math.max(0, Math.min(1, Number(level) || 0));
    smokePoints.visible = turkeySmokeLevel > 0.02;
    smokeMat.opacity = turkeySmokeLevel * 0.62;
    smokeMat.color.setHex(turkeySmokeLevel > 0.7 ? 0x453d4f : 0xcbc2d9);
  }

  // --- 6. Post-Processing: EffectComposer + UnrealBloomPass ---
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.48, // strength
    0.55, // radius
    0.68  // threshold
  );
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  const onResize = () => {
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  function setQuality(q) {
    if (q === 'low') {
      bloomPass.enabled = false;
      livingMainLight.castShadow = false;
      kitchenSoffitLight.castShadow = false;
    } else if (q === 'medium') {
      bloomPass.enabled = true;
      bloomPass.strength = 0.34;
      livingMainLight.castShadow = true;
      kitchenSoffitLight.castShadow = false;
    } else {
      bloomPass.enabled = true;
      bloomPass.strength = 0.5;
      livingMainLight.castShadow = true;
      kitchenSoffitLight.castShadow = true;
    }
  }

  function update(dt, elapsed) {
    // Subtle candle & amber orb flicker
    candleLight.intensity = 1.05 + Math.sin(elapsed * 11.3) * 0.18 + Math.cos(elapsed * 19.7) * 0.08;
    amberOrbLight.intensity = 1.45 + Math.sin(elapsed * 2.5) * 0.08;
    crystalLampLight.intensity = 1.55 + Math.sin(elapsed * 3.1) * 0.1;

    // Update coffee steam
    const sp = steamGeo.attributes.position.array;
    for (let i = 0; i < steamCount; i++) {
      const d = steamData[i];
      d.t += dt * d.speed;
      if (d.t > 1) d.t -= 1;
      sp[i * 3] = A.coffee_mug.x + Math.sin(elapsed * 2.2 + d.phase + d.t * 4) * 0.045;
      sp[i * 3 + 1] = 0.18 + d.t * 0.65;
      sp[i * 3 + 2] = A.coffee_mug.z + Math.cos(elapsed * 1.9 + d.phase) * 0.04;
    }
    steamGeo.attributes.position.needsUpdate = true;

    // Update turkey smoke if active
    if (turkeySmokeLevel > 0.02) {
      const mp = smokeGeo.attributes.position.array;
      for (let i = 0; i < smokeCount; i++) {
        const d = smokeData[i];
        d.t += dt * d.speed * (0.6 + turkeySmokeLevel);
        if (d.t > 1) d.t -= 1;
        const spread = 0.25 + d.t * (0.9 + turkeySmokeLevel * 1.3);
        mp[i * 3] = A.kitchen_oven.x + d.ox * spread + Math.sin(elapsed + i) * 0.08;
        mp[i * 3 + 1] = 0.85 + d.t * 2.4;
        mp[i * 3 + 2] = A.kitchen_oven.z + 0.45 + d.oz * spread;
      }
      smokeGeo.attributes.position.needsUpdate = true;
    }
  }

  return {
    composer,
    bloomPass,
    update,
    setQuality,
    setTurkeySmoke,
    dispose() {
      window.removeEventListener('resize', onResize);
    },
  };
}
