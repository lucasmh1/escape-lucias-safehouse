import * as THREE from 'three';

/**
 * Builds the entire Miami / Vice City neo-noir exterior surrounding Lucia's Penthouse:
 * - Split hot-magenta / electric-cyan skyscraper skyline (Ref #1 & #3)
 * - Glowing neon billboards visible through the panoramic Living Room windows (Ref #1)
 * - Rain-slicked wet boulevard below with animated moving traffic headlights/taillights (Ref #3)
 * - Dark midnight ocean with glowing cyan shoreline & silhouetted palm trees outside the Bedroom bay window (Ref #6)
 * - Animated falling rain streaks & periodic storm lightning flashes
 */
export function buildCityExterior(scene, textures, eventBus) {
  const root = new THREE.Group();
  root.name = 'CityExterior';
  scene.add(root);

  const STREET_Y = -16;

  // --- 1. Night Sky Dome with Vice City Magenta/Violet/Cyan Horizon ---
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#04030d');
  skyGrad.addColorStop(0.45, '#120829');
  skyGrad.addColorStop(0.68, '#36104a');
  skyGrad.addColorStop(0.82, '#691558');
  skyGrad.addColorStop(1, '#081b2e');
  sctx.fillStyle = skyGrad;
  sctx.fillRect(0, 0, 512, 256);
  // Subtle stars
  sctx.fillStyle = 'rgba(255, 240, 255, 0.75)';
  for (let i = 0; i < 140; i++) {
    sctx.fillRect((i * 89) % 512, (i * 37) % 120, 1.5, 1.5);
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(185, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  root.add(skyDome);

  // --- 2. Ground Plane & Wet Neon Boulevard (Ref #3) ---
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x070610,
    roughness: 0.75,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = STREET_Y - 0.1;
  root.add(ground);

  const roadTex = textures.getWetBoulevard();
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.14,
    metalness: 0.65,
    emissive: new THREE.Color(0x160922),
    emissiveMap: roadTex,
    emissiveIntensity: 0.65,
  });

  // Main North-South Boulevard running along the West side (visible from Living Room & Balcony)
  const boulevardW = new THREE.Mesh(new THREE.PlaneGeometry(18, 220), roadMat);
  boulevardW.rotation.x = -Math.PI / 2;
  boulevardW.position.set(-28, STREET_Y, -35);
  root.add(boulevardW);

  // Cross Avenue running East-West to the North (visible from Balcony)
  const boulevardN = new THREE.Mesh(new THREE.PlaneGeometry(220, 18), roadMat);
  boulevardN.rotation.x = -Math.PI / 2;
  boulevardN.position.set(-10, STREET_Y + 0.02, -32);
  root.add(boulevardN);

  // --- 3. South Midnight Ocean, Dusk Horizon & Cyan Shore Glow (Ref #6, outside Bedroom Bay Window) ---
  const oceanGeo = new THREE.PlaneGeometry(260, 140);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0b2c4d,
    emissive: 0x08385c,
    emissiveIntensity: 1.05,
    roughness: 0.16,
    metalness: 0.65,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-10, -4.2, 72);
  root.add(ocean);

  // Glowing cyan bioluminescent shoreline wave strips clearly visible through the 4-panel bay window (Ref #6)
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.78,
  });
  const waveStrip = new THREE.Mesh(new THREE.PlaneGeometry(80, 3.6), waveMat);
  waveStrip.rotation.x = -Math.PI / 2;
  waveStrip.position.set(-6, -4.0, 24);
  root.add(waveStrip);

  const waveStripFar = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x38d8ff, transparent: true, opacity: 0.45 })
  );
  waveStripFar.rotation.x = -Math.PI / 2;
  waveStripFar.position.set(-6, -4.05, 38);
  root.add(waveStripFar);

  // Soft purple-magenta dusk horizon glow behind the ocean & palms (Ref #6)
  const makeGlowTexture = (innerColor, outerColor) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const gctx = c.getContext('2d');
    const rg = gctx.createRadialGradient(128, 150, 12, 128, 150, 128);
    rg.addColorStop(0, innerColor);
    rg.addColorStop(0.55, outerColor);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = rg;
    gctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const southHorizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(95, 38),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('rgba(255, 65, 175, 0.75)', 'rgba(130, 35, 175, 0.32)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  southHorizonGlow.position.set(-6, 4.5, 68);
  southHorizonGlow.rotation.y = Math.PI;
  root.add(southHorizonGlow);

  // Split Hot-Magenta (West/Left) & Electric-Cyan (North-East/Right) Atmospheric Skyline Mist (Ref #3)
  const magentaMist = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 65),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('rgba(255, 35, 140, 0.58)', 'rgba(160, 20, 110, 0.22)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  magentaMist.position.set(-34, 8, -72);
  root.add(magentaMist);

  const cyanMist = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 65),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('rgba(0, 235, 255, 0.52)', 'rgba(0, 120, 185, 0.2)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  cyanMist.position.set(22, 8, -72);
  root.add(cyanMist);

  const westMist = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 65),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('rgba(255, 40, 155, 0.48)', 'rgba(110, 20, 140, 0.18)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  westMist.position.set(-72, 8, -10);
  westMist.rotation.y = Math.PI / 2;
  root.add(westMist);

  // --- 4. Split Magenta / Cyan Miami Skyscrapers (Ref #1 & #3) ---
  const matMagenta = new THREE.MeshStandardMaterial({
    map: textures.getSkyscraperFacade('magenta'),
    emissiveMap: textures.getSkyscraperFacade('magenta'),
    emissive: new THREE.Color(0xff4da6),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.6,
  });
  const matCyan = new THREE.MeshStandardMaterial({
    map: textures.getSkyscraperFacade('cyan'),
    emissiveMap: textures.getSkyscraperFacade('cyan'),
    emissive: new THREE.Color(0x2ceeff),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.6,
  });
  const matMixed = new THREE.MeshStandardMaterial({
    map: textures.getSkyscraperFacade('mixed'),
    emissiveMap: textures.getSkyscraperFacade('mixed'),
    emissive: new THREE.Color(0xc57aff),
    emissiveIntensity: 0.85,
    roughness: 0.3,
    metalness: 0.6,
  });

  const rooftopBeacons = [];
  const buildings = [
    // West side skyline (hot-magenta dominant, visible through Living Room West rain window)
    { x: -38, z: -12, w: 12, d: 12, h: 48, style: 'magenta', billboard: ['VICE NIGHTS', 'OCEAN DRIVE • LIVE', '#ff2d95', '#00f0ff'] },
    { x: -46, z: 10, w: 14, d: 13, h: 58, style: 'magenta' },
    { x: -42, z: -30, w: 11, d: 11, h: 42, style: 'mixed', billboard: ['MALIBU CLUB', 'VIP PENTHOUSE', '#ff2d95', '#ffbe3b'] },
    { x: -62, z: -18, w: 16, d: 16, h: 72, style: 'magenta' },
    { x: -60, z: 22, w: 15, d: 14, h: 50, style: 'mixed' },
    { x: -35, z: -52, w: 14, d: 12, h: 64, style: 'magenta' },

    // North skyline (split magenta left -> electric cyan right, visible from Balcony & Living Room)
    { x: -24, z: -58, w: 14, d: 14, h: 70, style: 'magenta' },
    { x: -12, z: -50, w: 11, d: 11, h: 52, style: 'mixed', billboard: ['VICE FM 104.7', 'NEON NIGHTS RADIO', '#00f0ff', '#ff2d95'] },
    { x: 4, z: -54, w: 13, d: 13, h: 66, style: 'cyan' },
    { x: 20, z: -48, w: 14, d: 12, h: 58, style: 'cyan', billboard: ['MIAMI 84', 'SYNTHWAVE DISTRICT', '#00f0ff', '#b86bff'] },
    { x: 36, z: -44, w: 16, d: 14, h: 62, style: 'cyan' },
    { x: -5, z: -78, w: 18, d: 16, h: 86, style: 'magenta' },
    { x: 18, z: -76, w: 18, d: 16, h: 82, style: 'cyan' },
    { x: 44, z: -20, w: 15, d: 15, h: 54, style: 'cyan' },
    { x: 48, z: 6, w: 14, d: 16, h: 46, style: 'mixed' },
  ];

  const neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff2d95 });
  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });

  buildings.forEach((b) => {
    const mat = b.style === 'cyan' ? matCyan : b.style === 'mixed' ? matMixed : matMagenta;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, STREET_Y + b.h * 0.5, b.z);
    root.add(mesh);

    // Glowing rooftop neon crown bar
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.35, 0.55, b.d + 0.35),
      b.style === 'cyan' ? neonCyanMat : neonMagentaMat
    );
    crown.position.set(b.x, STREET_Y + b.h + 0.25, b.z);
    root.add(crown);

    // Radio spire + blinking aviation beacon
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x26263a })
    );
    spire.position.set(b.x, STREET_Y + b.h + 3.2, b.z);
    root.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), beaconMat.clone());
    beacon.position.set(b.x, STREET_Y + b.h + 6.2, b.z);
    beacon.userData.phase = (b.x + b.z) * 0.17;
    root.add(beacon);
    rooftopBeacons.push(beacon);

    // Optional holographic skyscraper billboard facing the penthouse
    if (b.billboard) {
      const [title, sub, c1, c2] = b.billboard;
      const bbTex = textures.getNeonBillboard(title, sub, c1, c2);
      const bb = new THREE.Mesh(
        new THREE.PlaneGeometry(b.w * 0.95, b.w * 0.48),
        new THREE.MeshBasicMaterial({ map: bbTex, side: THREE.DoubleSide })
      );
      bb.position.set(b.x, 4.5, b.z);
      // Place on the face closest to penthouse origin (0, 2, 0)
      if (Math.abs(b.x) > Math.abs(b.z)) {
        bb.position.x = b.x + (b.x < 0 ? b.w * 0.52 : -b.w * 0.52);
        bb.rotation.y = b.x < 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        bb.position.z = b.z + (b.z < 0 ? b.d * 0.52 : -b.d * 0.52);
        bb.rotation.y = b.z < 0 ? 0 : Math.PI;
      }
      root.add(bb);
    }
  });

  // --- 5. Silhouetted 3D Miami Palm Trees (Ref #3 & #6) ---
  const palmTrees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x160e1c, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x0b171f,
    emissive: 0x12061c,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  function createPalmTree(x, y, z, height = 14, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Slightly curved segmented trunk
    const segments = 5;
    const segH = height / segments;
    let curX = 0;
    for (let i = 0; i < segments; i++) {
      const rBot = (0.36 - i * 0.04) * scale;
      const rTop = (0.32 - i * 0.04) * scale;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.15, 7), trunkMat);
      seg.position.set(curX, i * segH + segH * 0.5, 0);
      seg.rotation.z = -0.05 * i;
      curX += 0.16 * i * scale;
      group.add(seg);
    }

    const crown = new THREE.Group();
    crown.position.set(curX, height, 0);
    const frondCount = 9;
    for (let f = 0; f < frondCount; f++) {
      const ang = (f / frondCount) * Math.PI * 2;
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(0.65 * scale, 4.4 * scale, 4),
        frondMat
      );
      frond.scale.set(1, 1, 0.16);
      frond.position.set(Math.cos(ang) * 1.9 * scale, -0.35 * scale, Math.sin(ang) * 1.9 * scale);
      frond.rotation.y = -ang;
      frond.rotation.z = -Math.PI * 0.62;
      crown.add(frond);
    }
    group.add(crown);
    group.userData.crown = crown;
    group.userData.phase = x * 0.3 + z * 0.2;
    root.add(group);
    palmTrees.push(group);
  }

  // Palms outside the Bedroom 4-panel Bay Window (Ref #6) — crowns framed cleanly against dusk sky & ocean!
  createPalmTree(-7.6, -4.5, 16.5, 7.6, 0.85);
  createPalmTree(-5.2, -4.5, 18.2, 8.2, 0.92);
  createPalmTree(-3.2, -4.5, 16.8, 7.1, 0.8);
  createPalmTree(-10.2, -4.5, 21.0, 9.0, 0.95);
  // Palms along the wet neon boulevard (Ref #3)
  for (let i = 0; i < 6; i++) {
    createPalmTree(-18, STREET_Y, -18 - i * 14, 13, 0.95);
    createPalmTree(-38, STREET_Y, -18 - i * 14, 13, 0.95);
  }

  // --- 6. Animated Boulevard Traffic (Headlights & Taillights, Ref #3) ---
  const trafficCars = [];
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e56 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x161224, metalness: 0.8, roughness: 0.25 });

  for (let i = 0; i < 12; i++) {
    const car = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.2), bodyMat);
    chassis.position.y = 0.55;
    car.add(chassis);

    const isHead = i % 2 === 0;
    const lightMat = isHead ? headMat : tailMat;
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), lightMat);
    const l2 = l1.clone();
    l1.position.set(-0.62, 0.55, isHead ? 2.12 : -2.12);
    l2.position.set(0.62, 0.55, isHead ? 2.12 : -2.12);
    car.add(l1, l2);

    const laneX = isHead ? -24.5 : -31.5;
    const startZ = -110 + i * 18;
    car.position.set(laneX, STREET_Y, startZ);
    car.userData = { speed: isHead ? 16 + (i % 4) * 3 : -(15 + (i % 3) * 4) };
    root.add(car);
    trafficCars.push(car);
  }

  // --- 7. Animated Rain Particle System around Balcony & Exterior Windows ---
  const MAX_RAIN = 900;
  const rainPositions = new Float32Array(MAX_RAIN * 6); // 2 vertices per streak
  const rainSeeds = [];
  for (let i = 0; i < MAX_RAIN; i++) {
    // Concentrate rain outside North & West windows + around Balcony
    const zone = i % 3;
    let rx, rz;
    if (zone === 0) {
      rx = -18 + Math.random() * 24;
      rz = -17 + Math.random() * 10;
    } else if (zone === 1) {
      rx = -18 + Math.random() * 8.5;
      rz = -10 + Math.random() * 16;
    } else {
      rx = -12 + Math.random() * 14;
      rz = 10 + Math.random() * 10;
    }
    const ry = -2 + Math.random() * 16;
    const speed = 13 + Math.random() * 7;
    rainSeeds.push({ x: rx, y: ry, z: rz, speed });
    const idx = i * 6;
    rainPositions[idx] = rx;
    rainPositions[idx + 1] = ry;
    rainPositions[idx + 2] = rz;
    rainPositions[idx + 3] = rx - 0.08;
    rainPositions[idx + 4] = ry - 0.65;
    rainPositions[idx + 5] = rz;
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0x99d6ff,
    transparent: true,
    opacity: 0.42,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  root.add(rainLines);

  // --- 8. Storm Lightning Light ---
  const lightningLight = new THREE.DirectionalLight(0xc2e0ff, 0);
  lightningLight.position.set(-25, 22, -25);
  scene.add(lightningLight);

  let lightningTimer = 14;
  let lightningIntensity = 0;
  let activeRainCount = MAX_RAIN;

  function triggerLightning() {
    lightningIntensity = 4.2;
    lightningTimer = 16 + Math.random() * 18;
    eventBus?.emit('world:lightning', { intensity: 1.0 });
  }

  function setQuality(q) {
    if (q === 'low') {
      activeRainCount = 260;
      rainGeo.setDrawRange(0, activeRainCount * 2);
    } else if (q === 'medium') {
      activeRainCount = 550;
      rainGeo.setDrawRange(0, activeRainCount * 2);
    } else {
      activeRainCount = MAX_RAIN;
      rainGeo.setDrawRange(0, MAX_RAIN * 2);
    }
  }

  function update(dt, elapsed) {
    // Animate rain streaks
    const pos = rainGeo.attributes.position.array;
    for (let i = 0; i < activeRainCount; i++) {
      const s = rainSeeds[i];
      s.y -= s.speed * dt;
      if (s.y < -3) s.y = 14;
      const idx = i * 6;
      pos[idx] = s.x;
      pos[idx + 1] = s.y;
      pos[idx + 2] = s.z;
      pos[idx + 3] = s.x - 0.09;
      pos[idx + 4] = s.y - 0.68;
      pos[idx + 5] = s.z;
    }
    rainGeo.attributes.position.needsUpdate = true;

    // Animate boulevard traffic
    for (let i = 0; i < trafficCars.length; i++) {
      const car = trafficCars[i];
      car.position.z += car.userData.speed * dt;
      if (car.position.z > 65) car.position.z = -120;
      if (car.position.z < -120) car.position.z = 65;
    }

    // Sway palm fronds gently
    for (let i = 0; i < palmTrees.length; i++) {
      const p = palmTrees[i];
      p.userData.crown.rotation.z = Math.sin(elapsed * 1.1 + p.userData.phase) * 0.04;
    }

    // Blink rooftop beacons
    for (let i = 0; i < rooftopBeacons.length; i++) {
      const b = rooftopBeacons[i];
      const on = Math.sin(elapsed * 2.4 + b.userData.phase) > 0.2;
      b.visible = on;
    }

    // Subtle ocean cyan shore shimmer
    waveMat.opacity = 0.42 + Math.sin(elapsed * 1.6) * 0.16;

    // Storm lightning countdown & decay
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      triggerLightning();
    }
    if (lightningIntensity > 0.01) {
      lightningIntensity = Math.max(0, lightningIntensity - dt * 9.5);
      lightningLight.intensity = lightningIntensity;
    } else {
      lightningLight.intensity = 0;
    }
  }

  return {
    root,
    update,
    setQuality,
    triggerLightning,
  };
}
