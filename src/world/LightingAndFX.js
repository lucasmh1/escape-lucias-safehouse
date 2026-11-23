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

  // --- 2. Base Ambient & Hemisphere Fill (balanced so dark corners stay readable without washing out light marble/sofas) ---
  const hemi = new THREE.HemisphereLight(0xb896f0, 0x2c193d, 0.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x3f2a5c, 0.52);
  scene.add(ambient);

  // --- 3. Room-by-Room Neo-Noir Point Lights (calibrated to avoid bloom white-out on light surfaces) ---
  function addPoint(color, intensity, distance, x, y, z, castShadow = false, decay = 1.65) {
    const l = new THREE.PointLight(color, intensity, distance, decay);
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
  const livingMainLight = addPoint(0xd49eff, 7.5, 16, -3.8, 4.1, -1.8, true, 1.65);
  addPoint(0xaa6ef0, 5.0, 14, -3.5, 4.2, 1.4, false, 1.65); // Upper TV wall & archway lavender fill
  const crystalLampLight = addPoint(0xff4da6, 3.6, 7.0, A.coffee_table.x - 0.2, 1.05, A.coffee_table.z - 0.1, false, 1.65);
  const amberOrbLight = addPoint(0xff9b3d, 3.8, 6.5, -8.2, 0.65, -4.4, false, 1.65);
  const candleLight = addPoint(0xffaa44, 2.8, 5.5, -8.1, 0.7, -6.4, false, 1.65);
  addPoint(0x00d9ff, 4.5, 10, -7.8, 2.5, -6.8, false, 1.65); // Cool cyan city window bounce
  addPoint(0xff2d95, 4.2, 8.0, A.spiral_stair.x, 2.3, A.spiral_stair.z, false, 1.65); // Pink spiral stair glow

  // Kitchen (Ref #5)
  const kitchenSoffitLight = addPoint(0xffe0c2, 7.8, 14, A.marble_island.x, 3.05, A.marble_island.z, true, 1.65);
  addPoint(0xff4da6, 5.8, 11, 5.5, 2.4, -6.0, false, 1.65); // Hot-pink kitchen backsplash & counters
  addPoint(0xc899f5, 4.5, 11, 7.5, 3.0, 0.5, false, 1.65); // Kitchen-to-Foyer archway fill

  // Foyer (crisp luxury marble & readable reinforced door without overexposure)
  addPoint(0xdcc0fa, 6.8, 11, 11.7, 3.1, -1.0, false, 1.65);
  addPoint(0xff99cc, 3.8, 7.5, 12.6, 2.0, -1.0, false, 1.65);

  // Balcony (preserved — balanced against open night sky)
  addPoint(0x00e5ff, 14, 13, -6.2, 2.9, -9.5, false, 1.1);
  addPoint(0xff3b9a, 12, 12, -1.4, 2.9, -9.5, false, 1.1);

  // Bedroom (Ref #6 — rich hot-pink ambiance, warm yellow lamp, cyan bay window bounce)
  addPoint(0xff3b9a, 7.2, 12, -5.8, 2.95, 5.8, false, 1.65);
  addPoint(0xffd85c, 4.8, 8.0, A.bedroom_lamp.x, 1.4, A.bedroom_lamp.z, false, 1.65);
  addPoint(0x2ce6ff, 4.2, 9.0, -5.7, 1.9, 8.6, false, 1.65);

  // Bathroom (readable FM 104.7 mirror, crisp marble & illuminated glass shower)
  addPoint(0xe6c8fa, 6.2, 10, 0.2, 2.95, 5.5, false, 1.65);
  addPoint(0xff5cb0, 3.2, 6.5, A.bathroom_mirror.x - 0.65, 2.0, A.bathroom_mirror.z, false, 1.65);
  addPoint(0xa8dcff, 4.8, 7.5, A.bathroom_shower.x, 2.95, A.bathroom_shower.z, false, 1.65);

  // Security Room (dark tech walls + crisp cyan/warm readability on desks, Wall Safe & Heist Corkboard)
  addPoint(0x7ae8ff, 18, 13, 6.2, 3.05, 5.8, false, 1.2);
  addPoint(0x00e5ff, 11, 9, A.cctv_desk.x, 2.2, A.cctv_desk.z - 0.9, false, 1.2);
  addPoint(0xffba52, 10, 8, A.radio_desk.x - 0.7, 1.9, A.radio_desk.z, false, 1.2);
  addPoint(0xff66b8, 10, 8, 4.15, 2.1, 8.2, false, 1.2); // Focused accent on South-wall Safe
  addPoint(0xffe0b2, 10, 8, 8.8, 2.3, 7.25, false, 1.2); // Focused gallery light on East-wall Heist Corkboard

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

  // --- 6. Post-Processing: EffectComposer + UnrealBloomPass (high threshold so only true emissives bloom) ---
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.34, // strength
    0.45, // radius
    0.90  // threshold
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
      bloomPass.strength = 0.24;
      bloomPass.threshold = 0.90;
      livingMainLight.castShadow = true;
      kitchenSoffitLight.castShadow = false;
    } else {
      bloomPass.enabled = true;
      bloomPass.strength = 0.34;
      bloomPass.threshold = 0.90;
      livingMainLight.castShadow = true;
      kitchenSoffitLight.castShadow = true;
    }
  }

  function update(dt, elapsed) {
    // Subtle candle & amber orb flicker (balanced to avoid bloom blow-out)
    candleLight.intensity = 2.8 + Math.sin(elapsed * 11.3) * 0.45 + Math.cos(elapsed * 19.7) * 0.2;
    amberOrbLight.intensity = 3.8 + Math.sin(elapsed * 2.5) * 0.22;
    crystalLampLight.intensity = 3.6 + Math.sin(elapsed * 3.1) * 0.25;

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
