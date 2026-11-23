import * as THREE from 'three';
import { tagInteractable } from './PenthouseArchitecture.js';

/**
 * Builds all hero furniture matching the 6 reference images, plus all 5 puzzle stations,
 * pickups, clues, sliding drawers, exits, and smashable chaos props.
 */
export function buildFurnitureAndProps(scene, layout, textures, dynamicTV, dynamicCCTV, interactables, colliders) {
  const root = new THREE.Group();
  root.name = 'FurnitureAndProps';
  scene.add(root);

  const A = layout.ANCHORS;
  const drawers = {};
  const chaosProps = {};
  const pickups = [];
  const candleFlames = [];
  let safeDoorPivot = null;
  let safeKeyMesh = null;
  let safeIsOpen = false;
  let safeOpenAnim = 0;

  function addBoxCollider(id, cx, cz, w, d, maxY = 1.2) {
    colliders.push({
      id,
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minY: 0,
      maxY,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
      tag: 'furniture',
      active: true,
    });
  }

  function registerInteractable(mesh, desc) {
    const full = {
      itemData: null,
      clueId: null,
      doorId: null,
      drawerId: null,
      damageValue: 0,
      canSmash: false,
      onInteract: null,
      ...desc,
      mesh,
    };
    tagInteractable(mesh, full);
    interactables.push(full);
    return full;
  }

  function registerChaosProp(id, mesh, label, room, damageValue) {
    const origPos = mesh.position.clone();
    const origRot = mesh.rotation.clone();
    let intact = true;

    const desc = registerInteractable(mesh, {
      id,
      label,
      actionLabel: 'Inspect',
      type: 'chaos',
      room,
      canSmash: true,
      damageValue,
    });

    const propObj = {
      id,
      mesh,
      descriptor: desc,
      damageValue,
      get intact() {
        return intact;
      },
      smash() {
        if (!intact) return false;
        intact = false;
        desc.canSmash = false;
        // Dramatic topple / scatter visual
        mesh.rotation.x += 0.95;
        mesh.rotation.z += 0.65;
        mesh.position.y = Math.max(0.12, origPos.y - 0.18);
        return true;
      },
      reset() {
        intact = true;
        desc.canSmash = true;
        mesh.visible = true;
        mesh.position.copy(origPos);
        mesh.rotation.copy(origRot);
      },
    };
    mesh.userData.chaosProp = propObj;
    desc.chaosProp = propObj;
    chaosProps[id] = propObj;
    return propObj;
  }

  // Shared materials
  const matGlossWhite = new THREE.MeshStandardMaterial({ color: 0xf0e9fa, roughness: 0.16, metalness: 0.15 });
  const matPlushLavender = new THREE.MeshStandardMaterial({ color: 0xd9c8ee, roughness: 0.85, metalness: 0.02 });
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x191826, roughness: 0.32, metalness: 0.78 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xe2eaf5, roughness: 0.1, metalness: 0.92 });
  const matMarble = new THREE.MeshStandardMaterial({
    map: textures.getLavenderMarble(2, 2),
    roughness: 0.14,
    metalness: 0.1,
  });
  const matAcrylic = new THREE.MeshPhysicalMaterial({
    color: 0xd8ecff,
    transparent: true,
    opacity: 0.36,
    roughness: 0.06,
    metalness: 0.1,
  });
  const matPinkCabinet = new THREE.MeshStandardMaterial({ color: 0xb54b8c, roughness: 0.28, metalness: 0.15 });
  const matCoral = new THREE.MeshStandardMaterial({ color: 0xff6b8b, roughness: 0.78 });
  const matCyanFabric = new THREE.MeshStandardMaterial({ color: 0x00c8d8, roughness: 0.75 });
  const matTealFabric = new THREE.MeshStandardMaterial({ color: 0x184b5c, roughness: 0.85 });
  const matNeonPink = new THREE.MeshBasicMaterial({ color: 0xff2d95 });
  const matNeonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xffcf40,
    emissive: 0x664400,
    roughness: 0.2,
    metalness: 0.9,
  });

  // Helper: Potted indoor tropical palm (Refs #1, #2, #5, #6)
  function addPottedPlant(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26 * scale, 0.19 * scale, 0.42 * scale, 12),
      new THREE.MeshStandardMaterial({ color: 0xd9c2e8, roughness: 0.5 })
    );
    pot.position.y = 0.21 * scale;
    g.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x164a38, roughness: 0.65, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.95 * scale, 4), leafMat);
      leaf.scale.set(1, 1, 0.18);
      leaf.position.set(Math.cos(ang) * 0.22 * scale, 0.68 * scale, Math.sin(ang) * 0.22 * scale);
      leaf.rotation.y = -ang;
      leaf.rotation.z = -0.65;
      g.add(leaf);
    }
    root.add(g);
  }

  // =========================================================================
  // 1. LIVING ROOM & ENTERTAINMENT AREA (Refs #1, #2, #4)
  // =========================================================================

  // Ref #1: Rainy Window Corner Lounge Nook (tufted cushion, headphones, steaming mug, amber orb lamp)
  const nookRug = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.025, 2.8),
    new THREE.MeshStandardMaterial({ map: textures.getShagRug('#645582', '#3d3157', 2, 2), roughness: 0.95 })
  );
  nookRug.position.set(A.lounge_nook.x, 0.012, A.lounge_nook.z);
  root.add(nookRug);

  // Tufted floor cushion
  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.82, 0.26, 18),
    new THREE.MeshStandardMaterial({ color: 0x2c2445, roughness: 0.9 })
  );
  cushion.scale.set(1.15, 1, 0.95);
  cushion.position.set(A.lounge_nook.x, 0.13, A.lounge_nook.z);
  root.add(cushion);

  // Warm amber glowing floor orb lamp (Ref #1)
  const amberOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff8c24,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    })
  );
  amberOrb.position.set(-8.45, 0.21, -4.35);
  root.add(amberOrb);
  addPottedPlant(-8.4, -3.7, 0.85);

  // Steaming Coffee Mug (Ref #1, inspect / chaos)
  const mugGroup = new THREE.Group();
  mugGroup.position.set(A.coffee_mug.x, 0.09, A.coffee_mug.z);
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.06, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0xe8d5f5, roughness: 0.25 })
  );
  const coffeeTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.056, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.15 })
  );
  coffeeTop.rotation.x = -Math.PI / 2;
  coffeeTop.position.y = 0.066;
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.012, 8, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xe8d5f5, roughness: 0.25 })
  );
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.position.set(0.065, 0, 0);
  mugGroup.add(mugBody, coffeeTop, mugHandle);
  root.add(mugGroup);
  registerChaosProp('coffee_mug', mugGroup, 'Steaming Espresso Mug', 'living_room', 150);

  // Headphones resting on tufted cushion (Ref #1, inspect / chaos)
  const hpGroup = new THREE.Group();
  hpGroup.position.set(A.headphones.x, 0.32, A.headphones.z);
  hpGroup.rotation.y = 0.5;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 16, Math.PI), matDarkMetal);
  band.rotation.x = Math.PI / 2;
  const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 12), matDarkMetal);
  cupL.rotation.z = Math.PI / 2;
  cupL.position.set(-0.11, 0, 0);
  const cupR = cupL.clone();
  cupR.position.set(0.11, 0, 0);
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 6, 12), matNeonCyan);
  ringL.rotation.y = Math.PI / 2;
  ringL.position.set(-0.133, 0, 0);
  hpGroup.add(band, cupL, cupR, ringL);
  root.add(hpGroup);
  registerChaosProp('headphones', hpGroup, 'Studio Synth Headphones', 'living_room', 650);

  // Ref #4: Moody Candle Lanterns & Stained-Glass Neon Wall Art near NW lounge corner
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(-8.35, 0, -6.55);
  for (let i = 0; i < 2; i++) {
    const lx = i * 0.42;
    const cage = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.42 - i * 0.1, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1a1522, wireframe: true })
    );
    cage.position.set(lx, 0.21 - i * 0.05, 0);
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.22 - i * 0.05, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0d4, roughness: 0.7 })
    );
    candle.position.set(lx, 0.12, 0);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.07, 8),
      new THREE.MeshBasicMaterial({ color: 0xffbb44 })
    );
    flame.position.set(lx, 0.26 - i * 0.05, 0);
    candleFlames.push(flame);
    lanternGroup.add(cage, candle, flame);
  }
  root.add(lanternGroup);
  registerChaosProp('candle_lanterns', lanternGroup, 'Wrought-Iron Candle Lanterns', 'living_room', 2200);

  // Stained-glass neon art panel mounted on Living Room South-West wall beside spiral stair (Ref #4)
  const stainedArt = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.75, 0.08),
    new THREE.MeshStandardMaterial({
      map: textures.getStainedGlass(),
      emissiveMap: textures.getStainedGlass(),
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.75,
      roughness: 0.2,
    })
  );
  stainedArt.position.set(-8.05, 1.75, 2.34);
  root.add(stainedArt);

  // Ref #2: Plush Lavender Shag Rug & Curved White/Lavender Sectional Sofa
  const livingRug = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.35, 0.025, 32),
    new THREE.MeshStandardMaterial({ map: textures.getShagRug('#cbb4e6', '#9a78c4', 3, 3), roughness: 0.95 })
  );
  livingRug.position.set(-3.7, 0.012, -1.2);
  livingRug.receiveShadow = true;
  root.add(livingRug);

  // Curved sectional built from 7 plush cushioned wedges in an arc facing the TV (+Z)
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(A.curved_sofa.x, 0, A.curved_sofa.z);
  const sofaRadius = 2.05;
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI * 0.85 + (i / 6) * Math.PI * 0.78;
    const seg = new THREE.Group();
    const sx = Math.cos(ang) * sofaRadius;
    const sz = Math.sin(ang) * sofaRadius;
    seg.position.set(sx, 0, sz);
    seg.rotation.y = -ang + Math.PI / 2;

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.42, 0.92), matPlushLavender);
    base.position.y = 0.21;
    base.castShadow = true;
    base.receiveShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.56, 0.28), matPlushLavender);
    back.position.set(0, 0.56, -0.34);
    back.castShadow = true;
    seg.add(base, back);

    if (i % 2 === 1) {
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.34, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xff82c4, roughness: 0.9 })
      );
      pillow.position.set(0, 0.54, -0.14);
      pillow.rotation.x = -0.2;
      seg.add(pillow);
    }
    sofaGroup.add(seg);
  }
  root.add(sofaGroup);
  addBoxCollider('collider_curved_sofa', A.curved_sofa.x - 0.1, A.curved_sofa.z - 1.3, 3.6, 1.4, 0.9);

  // Matching round ottoman (Ref #2)
  const ottoman = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.52, 0.42, 18), matPlushLavender);
  ottoman.position.set(-1.75, 0.21, -1.55);
  ottoman.castShadow = true;
  root.add(ottoman);
  addBoxCollider('collider_ottoman', -1.75, -1.55, 1.1, 1.1, 0.5);

  // Round Glossy White Coffee Table (Ref #2)
  const coffeeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.66, 0.44, 24), matGlossWhite);
  coffeeTable.position.set(A.coffee_table.x, 0.22, A.coffee_table.z);
  coffeeTable.castShadow = true;
  coffeeTable.receiveShadow = true;
  root.add(coffeeTable);
  addBoxCollider('collider_coffee_table', A.coffee_table.x, A.coffee_table.z, 1.4, 1.4, 0.5);

  // Glowing Pink Crystal Table Lamp on Coffee Table (Ref #2 — high-value Chaos prop!)
  const crystalLamp = new THREE.Group();
  crystalLamp.position.set(A.coffee_table.x - 0.22, 0.44, A.coffee_table.z - 0.12);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.18, 12), matNeonPink);
  lampStem.position.y = 0.09;
  const lampShade = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffb3e6,
      emissive: 0xff2d95,
      emissiveIntensity: 1.5,
      roughness: 0.15,
    })
  );
  lampShade.scale.set(1.2, 0.72, 1.2);
  lampShade.position.y = 0.28;
  crystalLamp.add(lampStem, lampShade);
  root.add(crystalLamp);
  registerChaosProp('crystal_lamp', crystalLamp, 'Designer Pink Crystal Lamp', 'living_room', 8500);

  // TV Remote Pickup on Coffee Table
  const remoteMesh = new THREE.Group();
  remoteMesh.position.set(A.tv_remote.x, A.tv_remote.y, A.tv_remote.z);
  remoteMesh.rotation.y = 0.35;
  const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.22), matDarkMetal);
  const rLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.04), matNeonPink);
  rLed.position.set(0, 0.014, -0.06);
  remoteMesh.add(rBody, rLed);
  root.add(remoteMesh);
  registerInteractable(remoteMesh, {
    id: 'tv_remote',
    label: "Lucia's TV Remote",
    actionLabel: 'Pick Up',
    type: 'pickup',
    room: 'living_room',
    itemData: {
      id: 'tv_remote',
      name: "Lucia's Universal TV Remote",
      icon: '📺',
      description: "Chrome penthouse remote. Buttons '4', '2', and '6' are suspiciously worn down.",
    },
  });
  pickups.push(remoteMesh);

  // TV Media Console + 4K Smart TV (Puzzle #1) + Gaming Console + Luxury Vase
  const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.54, 0.56), matDarkMetal);
  tvConsole.position.set(A.tv_console.x, 0.27, A.tv_console.z);
  tvConsole.castShadow = true;
  root.add(tvConsole);
  addBoxCollider('collider_tv_console', A.tv_console.x, A.tv_console.z, 3.2, 0.6, 0.6);

  const tvGroup = new THREE.Group();
  tvGroup.position.set(A.living_tv.x, A.living_tv.y, A.living_tv.z);
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.34, 0.08), matDarkMetal);
  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.22, 1.24),
    new THREE.MeshBasicMaterial({ map: dynamicTV.texture })
  );
  tvScreen.position.z = -0.046;
  tvScreen.rotation.y = Math.PI;
  tvGroup.add(tvBezel, tvScreen);
  root.add(tvGroup);
  registerInteractable(tvGroup, {
    id: 'living_tv',
    label: '4K Smart TV',
    actionLabel: 'Use',
    type: 'puzzle',
    room: 'living_room',
  });

  // Gaming Console (Chaos prop)
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(A.gaming_console.x, A.gaming_console.y, A.gaming_console.z);
  const cBox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.26), matGlossWhite);
  const cStrip = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.02, 0.02), matNeonCyan);
  cStrip.position.z = -0.125;
  consoleGroup.add(cBox, cStrip);
  root.add(consoleGroup);
  registerChaosProp('gaming_console', consoleGroup, 'Custom Vice-Station 9 Console', 'living_room', 4500);

  // Designer Ceramic Vase on left end of TV console (Chaos prop)
  const vaseGroup = new THREE.Group();
  vaseGroup.position.set(A.tv_console.x - 1.25, 0.54, A.tv_console.z);
  const vaseBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.14, 0.42, 14),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.12, metalness: 0.35 })
  );
  vaseBody.position.y = 0.21;
  vaseGroup.add(vaseBody);
  root.add(vaseGroup);
  registerChaosProp('vase_living', vaseGroup, 'Italian Glass Vase', 'living_room', 6000);

  // =========================================================================
  // 2. KITCHEN & DINING AREA (Ref #5)
  // =========================================================================

  // Sculptural Curved Marble Island (Ref #5)
  const islandGroup = new THREE.Group();
  islandGroup.position.set(A.marble_island.x, 0, A.marble_island.z);
  const islandTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.25), matMarble);
  islandTop.position.y = 0.91;
  islandTop.castShadow = true;
  islandTop.receiveShadow = true;
  const islandBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.86, 0.92), matMarble);
  islandBase.position.y = 0.43;
  // Sculptural rounded pedestal ends (Ref #5)
  const pedL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.86, 18), matMarble);
  pedL.position.set(-1.8, 0.43, 0);
  const pedR = pedL.clone();
  pedR.position.set(1.8, 0.43, 0);
  islandGroup.add(islandTop, islandBase, pedL, pedR);
  root.add(islandGroup);
  addBoxCollider('collider_marble_island', A.marble_island.x, A.marble_island.z, 4.3, 1.3, 1.0);

  // 3 Acrylic & Chrome Barstools (Ref #5)
  [-1.2, 0, 1.2].forEach((ox) => {
    const stool = new THREE.Group();
    stool.position.set(A.marble_island.x + ox, 0, A.marble_island.z + 0.92);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 16), matChrome);
    foot.position.y = 0.02;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.64, 10), matChrome);
    pole.position.y = 0.34;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.05, 16), matAcrylic);
    seat.position.y = 0.66;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.04), matAcrylic);
    back.position.set(0, 0.8, 0.18);
    stool.add(foot, pole, seat, back);
    root.add(stool);
  });

  // Recipe Card Clue on Marble Island
  const recipeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.012, 0.36),
    new THREE.MeshStandardMaterial({
      map: textures.getNoteTexture('TURKEY RECIPE', ['375°F — 45 MIN', 'DO NOT BURN IT!', 'KEYCARD INSIDE?'], '#fff6df', '#ff2d95'),
      roughness: 0.7,
    })
  );
  recipeMesh.position.set(A.recipe_card.x, A.recipe_card.y, A.recipe_card.z);
  recipeMesh.rotation.y = 0.18;
  root.add(recipeMesh);
  registerInteractable(recipeMesh, {
    id: 'recipe_card',
    label: "Lucia's Turkey Recipe Card",
    actionLabel: 'Read',
    type: 'clue',
    clueId: 'recipe_card',
    room: 'kitchen',
  });

  // Champagne Bottles & Crystal Glasses on Marble Island (Chaos prop)
  const champGroup = new THREE.Group();
  champGroup.position.set(A.marble_island.x - 1.35, 0.96, A.marble_island.z);
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x1e5c3a, roughness: 0.12, metalness: 0.35 });
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.32, 12), bottleMat);
    b.position.set(i * 0.14, 0.16, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.12, 10), matGold);
    neck.position.set(i * 0.14, 0.34, 0);
    champGroup.add(b, neck);
  }
  root.add(champGroup);
  registerChaosProp('champagne_bottles', champGroup, 'Vintage Champagne Bottles', 'kitchen', 5200);

  // Interactive Kitchen Drawer + Oven Manual Clue inside
  const kDrawerGroup = new THREE.Group();
  kDrawerGroup.position.set(A.kitchen_drawer.x, A.kitchen_drawer.y, A.kitchen_drawer.z);
  const kDrawerFront = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.52), matPinkCabinet);
  const kDrawerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.05), matChrome);
  kDrawerHandle.position.set(0, 0, 0.28);
  kDrawerGroup.add(kDrawerFront, kDrawerHandle);

  const ovenManual = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.015, 0.3),
    new THREE.MeshStandardMaterial({
      map: textures.getNoteTexture('OVEN MANUAL', ['MAX: 550°F / 90m', 'WARNING: SMOKE!', 'IDEAL: 375°F 45m'], '#e8f4ff', '#00a8cc'),
    })
  );
  ovenManual.position.set(0, 0.12, 0.02);
  kDrawerGroup.add(ovenManual);
  root.add(kDrawerGroup);

  registerInteractable(kDrawerFront, {
    id: 'kitchen_drawer',
    label: 'Kitchen Island Drawer',
    actionLabel: 'Open',
    type: 'drawer',
    drawerId: 'kitchen_drawer',
    room: 'kitchen',
  });
  registerInteractable(ovenManual, {
    id: 'oven_manual',
    label: 'Smart Oven Manual',
    actionLabel: 'Read',
    type: 'clue',
    clueId: 'oven_manual',
    room: 'kitchen',
  });

  // North Kitchen Counters, Sink, Oven (Puzzle #2), and Refrigerator
  const counterL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 0.86), matPinkCabinet);
  counterL.position.set(3.2, 0.45, -6.95);
  const counterR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.86), matPinkCabinet);
  counterR.position.set(6.95, 0.45, -6.95);
  const cTopL = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.06, 0.9), matMarble);
  cTopL.position.set(3.2, 0.93, -6.95);
  const cTopR = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.9), matMarble);
  cTopR.position.set(6.95, 0.93, -6.95);
  root.add(counterL, counterR, cTopL, cTopR);
  addBoxCollider('collider_kitchen_north_run', 5.5, -6.9, 8.2, 1.0, 1.5);

  // Sink basin & faucet
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.52), matChrome);
  sinkBasin.position.set(A.kitchen_sink.x, 0.95, A.kitchen_sink.z);
  const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 12, Math.PI), matChrome);
  faucet.position.set(A.kitchen_sink.x, 1.12, A.kitchen_sink.z - 0.24);
  root.add(sinkBasin, faucet);

  // Smart Convection Oven + Thanksgiving Turkey inside (Puzzle #2)
  const ovenGroup = new THREE.Group();
  ovenGroup.position.set(A.kitchen_oven.x, 0, A.kitchen_oven.z);
  const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.96, 0.86), matDarkMetal);
  ovenBody.position.y = 0.48;
  const ovenGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.48, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xff6a2b,
      emissive: 0xff4500,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.78,
    })
  );
  ovenGlass.position.set(0, 0.44, 0.42);
  // Stylized roasting turkey visible behind glass
  const turkey = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x8c4218, roughness: 0.55 })
  );
  turkey.scale.set(1.3, 0.8, 0.95);
  turkey.position.set(0, 0.4, 0.18);
  const ovenPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.06), matNeonPink);
  ovenPanel.position.set(0, 0.84, 0.42);
  ovenGroup.add(ovenBody, ovenGlass, turkey, ovenPanel);
  root.add(ovenGroup);
  registerInteractable(ovenGroup, {
    id: 'kitchen_oven',
    label: 'Smart Convection Oven',
    actionLabel: 'Use',
    type: 'puzzle',
    room: 'kitchen',
  });

  // Luxury Refrigerator + Fridge Note Clue
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.25, 0.92), matChrome);
  fridge.position.set(A.kitchen_fridge.x, 1.125, A.kitchen_fridge.z);
  root.add(fridge);
  const fridgeNote = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.34, 0.02),
    new THREE.MeshStandardMaterial({
      map: textures.getNoteTexture('JASON!!', ['DO NOT TOUCH', 'MY TV CHANNELS', '4 -> 2 -> 6!'], '#fff59d', '#ff2d95'),
    })
  );
  fridgeNote.position.set(A.fridge_note.x, A.fridge_note.y, A.fridge_note.z);
  root.add(fridgeNote);
  registerInteractable(fridgeNote, {
    id: 'fridge_note',
    label: 'Sticky Note on Fridge',
    actionLabel: 'Read',
    type: 'clue',
    clueId: 'fridge_note',
    room: 'kitchen',
  });

  addPottedPlant(1.8, -5.8, 1.15);

  // =========================================================================
  // 3. FOYER
  // =========================================================================
  const foyerConsole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.82, 0.46), matMarble);
  foyerConsole.position.set(A.foyer_console.x, 0.41, A.foyer_console.z);
  root.add(foyerConsole);
  addBoxCollider('collider_foyer_console', A.foyer_console.x, A.foyer_console.z, 1.65, 0.55, 0.9);

  const sculpture = new THREE.Group();
  sculpture.position.set(A.foyer_console.x, 0.82, A.foyer_console.z);
  const scRing = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.2, 0.055, 48, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2d95, emissive: 0x99004d, metalness: 0.75, roughness: 0.15 })
  );
  scRing.position.y = 0.28;
  sculpture.add(scRing);
  root.add(sculpture);
  registerChaosProp('foyer_sculpture', sculpture, 'Vice City Neon Sculpture', 'foyer', 9500);

  // =========================================================================
  // 4. PENTHOUSE BALCONY
  // =========================================================================
  // Outdoor lounge chairs
  [-0.8, 0.8].forEach((ox) => {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.95), matDarkMetal);
    chair.position.set(A.balcony_lounge.x + ox, 0.26, A.balcony_lounge.z);
    root.add(chair);
  });
  addBoxCollider('collider_balcony_lounge', A.balcony_lounge.x, A.balcony_lounge.z, 2.6, 1.0, 0.7);

  // Utility crate + Neon-Pink Crowbar Pickup
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), matDarkMetal);
  crate.position.set(A.crowbar.x, 0.2, A.crowbar.z);
  root.add(crate);

  const crowbarGroup = new THREE.Group();
  crowbarGroup.position.set(A.crowbar.x, A.crowbar.y + 0.02, A.crowbar.z);
  crowbarGroup.rotation.y = 0.6;
  const barMat = new THREE.MeshStandardMaterial({ color: 0xff2d95, emissive: 0x55082e, metalness: 0.75, roughness: 0.25 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8), barMat);
  shaft.rotation.z = Math.PI / 2;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 12, Math.PI), barMat);
  hook.position.set(0.34, 0, 0.07);
  crowbarGroup.add(shaft, hook);
  root.add(crowbarGroup);
  registerInteractable(crowbarGroup, {
    id: 'crowbar',
    label: 'Neon-Pink Crowbar',
    actionLabel: 'Pick Up',
    type: 'pickup',
    room: 'balcony',
    itemData: {
      id: 'crowbar',
      name: 'Neon-Pink Crowbar',
      icon: '🔧',
      description: 'Heavy forged steel painted Vice City hot pink. Ideal for reckless balcony escapes.',
    },
  });
  pickups.push(crowbarGroup);

  // Balcony Escape Ledge / Coiled Grapple Rope (Chaos Escape Exit)
  const ledgeGroup = new THREE.Group();
  ledgeGroup.position.set(A.balcony_escape_ledge.x, 0, A.balcony_escape_ledge.z);
  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.06, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0xffaa2b, emissive: 0x663300, roughness: 0.7 })
  );
  coil.rotation.x = Math.PI / 2;
  coil.position.y = 0.08;
  const anchorPost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.22), matNeonPink);
  anchorPost.position.set(0, 1.1, -0.32);
  ledgeGroup.add(coil, anchorPost);
  root.add(ledgeGroup);
  registerInteractable(ledgeGroup, {
    id: 'balcony_escape_ledge',
    label: 'Balcony Escape Zipline / Ledge',
    actionLabel: 'Escape (Chaos)',
    type: 'exit',
    room: 'balcony',
  });

  // =========================================================================
  // 5. LUCIA'S BEDROOM (Ref #6)
  // =========================================================================
  // Plush blush rug (Ref #6)
  const bedRug = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.025, 4.4),
    new THREE.MeshStandardMaterial({ map: textures.getShagRug('#e899be', '#b85c8e', 3, 3), roughness: 0.95 })
  );
  bedRug.position.set(-5.7, 0.012, 6.7);
  root.add(bedRug);

  // Luxury King Bed
  const bedGroup = new THREE.Group();
  bedGroup.position.set(A.bed.x, 0, A.bed.z);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.48, 2.2), matPlushLavender);
  mattress.position.y = 0.28;
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.16, 1.55), matCoral);
  duvet.position.set(0, 0.48, 0.28);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 2.3), matPinkCabinet);
  headboard.position.set(-1.12, 0.625, 0);
  const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.75), matGlossWhite);
  pillow1.position.set(-0.78, 0.58, -0.48);
  const pillow2 = pillow1.clone();
  pillow2.position.z = 0.48;
  bedGroup.add(mattress, duvet, headboard, pillow1, pillow2);
  root.add(bedGroup);
  addBoxCollider('collider_bed', A.bed.x, A.bed.z, 2.25, 2.25, 0.8);

  // Nightstand + Voicemail Dock (Clue) + Interactive Nightstand Drawer + Nightstand Note
  const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.64), matDarkMetal);
  nightstand.position.set(A.nightstand.x, 0.31, A.nightstand.z);
  root.add(nightstand);
  addBoxCollider('collider_nightstand', A.nightstand.x, A.nightstand.z, 0.72, 0.68, 0.65);

  const vmGroup = new THREE.Group();
  vmGroup.position.set(A.voicemail_dock.x, A.voicemail_dock.y, A.voicemail_dock.z);
  const vmBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), matDarkMetal);
  const vmLed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2244 }));
  vmLed.position.set(0.07, 0.055, -0.05);
  vmGroup.add(vmBase, vmLed);
  root.add(vmGroup);
  registerInteractable(vmGroup, {
    id: 'voicemail_dock',
    label: "Lucia's Voicemail Phone",
    actionLabel: 'Listen',
    type: 'clue',
    clueId: 'voicemail_dock',
    room: 'bedroom',
  });

  // Nightstand Drawer + Hidden Note inside
  const nDrawerGroup = new THREE.Group();
  nDrawerGroup.position.set(A.nightstand_drawer.x, A.nightstand_drawer.y, A.nightstand_drawer.z);
  const nDrawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.42), matPinkCabinet);
  const nDrawerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), matChrome);
  nDrawerHandle.position.set(0, 0, -0.22);
  const nightstandNote = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.012, 0.28),
    new THREE.MeshStandardMaterial({
      map: textures.getNoteTexture('SAFE NOTE', ['4 PUZZLES = 4 DIGITS', 'TV -> OVEN -> CCTV', '-> RADIO (104.7)'], '#ffe6f2', '#ff2d95'),
    })
  );
  nightstandNote.position.set(0, 0.1, 0);
  nDrawerGroup.add(nDrawerBox, nDrawerHandle, nightstandNote);
  root.add(nDrawerGroup);

  registerInteractable(nDrawerBox, {
    id: 'nightstand_drawer',
    label: 'Nightstand Drawer',
    actionLabel: 'Open',
    type: 'drawer',
    drawerId: 'nightstand_drawer',
    room: 'bedroom',
  });
  registerInteractable(nightstandNote, {
    id: 'nightstand_note',
    label: 'Hidden Nightstand Note',
    actionLabel: 'Read',
    type: 'clue',
    clueId: 'nightstand_note',
    room: 'bedroom',
  });

  // Ref #6: Coral Sofa, Yellow Glowing Table Lamp, Glass Coffee Table & Cyan Accent Chair
  const coralSofa = new THREE.Group();
  coralSofa.position.set(A.bedroom_coral_sofa.x, 0, A.bedroom_coral_sofa.z);
  const csSeat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.86), matCoral);
  csSeat.position.y = 0.21;
  const csBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.22), matCoral);
  csBack.position.set(0, 0.56, 0.34);
  coralSofa.add(csSeat, csBack);
  root.add(coralSofa);
  addBoxCollider('collider_coral_sofa', A.bedroom_coral_sofa.x, A.bedroom_coral_sofa.z, 2.15, 0.9, 0.8);

  // Side table + Yellow Table Lamp (Ref #6 — Chaos prop)
  const lampTable = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.62, 14), matDarkMetal);
  lampTable.position.set(A.bedroom_lamp.x, 0.31, A.bedroom_lamp.z);
  root.add(lampTable);

  const bedLamp = new THREE.Group();
  bedLamp.position.set(A.bedroom_lamp.x, A.bedroom_lamp.y, A.bedroom_lamp.z);
  const blPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.28, 10), matChrome);
  blPole.position.y = 0.14;
  const blShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.28, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff078,
      emissive: 0xffd233,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    })
  );
  blShade.position.y = 0.36;
  bedLamp.add(blPole, blShade);
  root.add(bedLamp);
  registerChaosProp('bedroom_lamp', bedLamp, 'Warm Yellow Designer Lamp', 'bedroom', 3800);

  // Rounded glass coffee table + cyan accent chair (Ref #6)
  const bedTable = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.68), matAcrylic);
  bedTable.position.set(-5.6, 0.42, 7.25);
  root.add(bedTable);
  const cyanChair = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.72), matCyanFabric);
  cyanChair.position.set(-3.4, 0.325, 6.75);
  cyanChair.rotation.y = -0.5;
  root.add(cyanChair);
  addPottedPlant(-8.35, 8.65, 1.0);

  // =========================================================================
  // 6. LUXURY BATHROOM
  // =========================================================================
  const vanity = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.88, 2.1), matMarble);
  vanity.position.set(A.bathroom_vanity.x, 0.44, A.bathroom_vanity.z);
  root.add(vanity);
  addBoxCollider('collider_vanity', A.bathroom_vanity.x, A.bathroom_vanity.z, 0.8, 2.15, 0.9);

  // Steamed Backlit Bathroom Mirror (Clue -> 104.7 MHz)
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(A.bathroom_mirror.x, A.bathroom_mirror.y, A.bathroom_mirror.z);
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 1.75), matNeonPink);
  const mirrorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.05),
    new THREE.MeshStandardMaterial({
      map: textures.getBathroomMirrorTexture(),
      emissiveMap: textures.getBathroomMirrorTexture(),
      emissive: new THREE.Color(0x8866aa),
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.65,
    })
  );
  mirrorGlass.rotation.y = -Math.PI / 2;
  mirrorGlass.position.x = -0.045;
  mirrorGroup.add(mirrorFrame, mirrorGlass);
  root.add(mirrorGroup);
  registerInteractable(mirrorGroup, {
    id: 'bathroom_mirror',
    label: 'Steamed Vanity Mirror',
    actionLabel: 'Inspect',
    type: 'clue',
    clueId: 'bathroom_mirror',
    room: 'bathroom',
  });

  // Walk-in Glass Shower Enclosure
  const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.35, 2.2), matAcrylic);
  showerGlass.position.set(A.bathroom_shower.x + 1.05, 1.175, A.bathroom_shower.z);
  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), matChrome);
  showerHead.position.set(A.bathroom_shower.x, 2.45, A.bathroom_shower.z);
  root.add(showerGlass, showerHead);
  addBoxCollider('collider_shower_glass', A.bathroom_shower.x + 1.05, A.bathroom_shower.z, 0.16, 2.2, 2.4);

  // =========================================================================
  // 7. SECURITY & COMMS ROOM
  // =========================================================================

  // CCTV Multi-Monitor Desk (Puzzle #3)
  const cctvDesk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.76, 0.92), matDarkMetal);
  cctvDesk.position.set(A.cctv_desk.x, 0.38, A.cctv_desk.z);
  root.add(cctvDesk);
  addBoxCollider('collider_cctv_desk', A.cctv_desk.x, A.cctv_desk.z, 2.65, 0.96, 0.85);

  const cctvGroup = new THREE.Group();
  cctvGroup.position.set(A.cctv_desk.x, 1.25, A.cctv_desk.z + 0.12);
  const mainMon = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.82, 0.07), matDarkMetal);
  const mainScr = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, 0.74),
    new THREE.MeshBasicMaterial({ map: dynamicCCTV.texture })
  );
  mainScr.position.z = -0.04;
  mainScr.rotation.y = Math.PI;
  cctvGroup.add(mainMon, mainScr);
  root.add(cctvGroup);
  registerInteractable(cctvGroup, {
    id: 'cctv_terminal',
    label: 'CCTV Security Terminal',
    actionLabel: 'Access',
    type: 'puzzle',
    room: 'security_room',
  });

  // Spare CCTV Monitor on Desk (Chaos prop)
  const spareMon = new THREE.Group();
  spareMon.position.set(A.cctv_desk.x - 0.98, 1.02, A.cctv_desk.z + 0.05);
  spareMon.rotation.y = 0.35;
  const smBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.4, 0.06), matDarkMetal);
  const smGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), matNeonCyan);
  smGlow.position.z = -0.035;
  smGlow.rotation.y = Math.PI;
  spareMon.add(smBox, smGlow);
  root.add(spareMon);
  registerChaosProp('cctv_monitor_spare', spareMon, 'Auxiliary Security Monitor', 'security_room', 7500);

  // Heist Cash Stacks on CCTV Desk (High-value Chaos prop!)
  const cashGroup = new THREE.Group();
  cashGroup.position.set(A.cctv_desk.x + 0.98, 0.76, A.cctv_desk.z - 0.12);
  const cashMat = new THREE.MeshStandardMaterial({ map: textures.getCashTexture(), roughness: 0.65 });
  for (let i = 0; i < 4; i++) {
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.12), cashMat);
    bill.position.set((i % 2) * 0.14 - 0.07, 0.035 + Math.floor(i / 2) * 0.072, (i % 2) * 0.04);
    bill.rotation.y = i * 0.22;
    cashGroup.add(bill);
  }
  root.add(cashGroup);
  registerChaosProp('cash_stack', cashGroup, 'Stacks of Vice City Cash', 'security_room', 12000);

  // Analog Radio Transceiver Desk (Puzzle #4)
  const radioDesk = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.76, 1.85), matDarkMetal);
  radioDesk.position.set(A.radio_desk.x, 0.38, A.radio_desk.z);
  root.add(radioDesk);
  addBoxCollider('collider_radio_desk', A.radio_desk.x, A.radio_desk.z, 0.9, 1.9, 0.85);

  const radioGroup = new THREE.Group();
  radioGroup.position.set(A.radio_desk.x, 0.96, A.radio_desk.z);
  const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.74), matDarkMetal);
  const radioDial = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.14, 0.48),
    new THREE.MeshBasicMaterial({ color: 0xffaa2b })
  );
  radioDial.position.set(-0.21, 0.04, 0);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.95, 6), matChrome);
  antenna.position.set(0.1, 0.62, -0.25);
  radioGroup.add(radioBody, radioDial, antenna);
  root.add(radioGroup);
  registerInteractable(radioGroup, {
    id: 'radio_transceiver',
    label: 'Analog Radio Transceiver',
    actionLabel: 'Tune',
    type: 'puzzle',
    room: 'security_room',
  });

  // Combination Wall Safe (Puzzle #5)
  const safeGroup = new THREE.Group();
  safeGroup.position.set(A.wall_safe.x, A.wall_safe.y, A.wall_safe.z);
  const safeBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.68), matDarkMetal);
  safeGroup.add(safeBody);

  // Glowing golden Master Exit Key visible inside when door swings open
  safeKeyMesh = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 14), matGold);
  safeKeyMesh.position.set(0.06, 0, 0);
  safeGroup.add(safeKeyMesh);

  safeDoorPivot = new THREE.Group();
  safeDoorPivot.position.set(0.21, 0, -0.32);
  const safeDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.64), matChrome);
  safeDoorLeaf.position.set(0, 0, 0.32);
  const safePad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.18), matNeonPink);
  safePad.position.set(0.02, 0.05, 0.44);
  safeDoorPivot.add(safeDoorLeaf, safePad);
  safeGroup.add(safeDoorPivot);
  root.add(safeGroup);
  registerInteractable(safeGroup, {
    id: 'wall_safe',
    label: 'Combination Wall Safe',
    actionLabel: 'Unlock',
    type: 'puzzle',
    room: 'security_room',
  });

  // Heist Corkboard (Clue)
  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 1.1, 0.07),
    new THREE.MeshStandardMaterial({ map: textures.getHeistBoardTexture(), roughness: 0.8 })
  );
  boardMesh.position.set(A.heist_board.x, A.heist_board.y, A.heist_board.z);
  root.add(boardMesh);
  registerInteractable(boardMesh, {
    id: 'heist_board',
    label: "Lucia's Heist Corkboard",
    actionLabel: 'Inspect',
    type: 'clue',
    clueId: 'heist_board',
    room: 'security_room',
  });

  // =========================================================================
  // DRAWER CONTROLLERS (kitchen_drawer & nightstand_drawer)
  // =========================================================================
  function createDrawerController(id, group, baseZ, slideOffsetZ) {
    let open = false;
    let anim = 0;
    const obj = {
      id,
      group,
      get open() {
        return open;
      },
      setOpen(next) {
        open = Boolean(next);
      },
      toggle() {
        open = !open;
        return open;
      },
      update(dt) {
        const target = open ? 1 : 0;
        anim += (target - anim) * Math.min(1, dt * 8);
        group.position.z = baseZ + anim * slideOffsetZ;
      },
      reset() {
        open = false;
        anim = 0;
        group.position.z = baseZ;
      },
    };
    drawers[id] = obj;
    return obj;
  }

  createDrawerController('kitchen_drawer', kDrawerGroup, A.kitchen_drawer.z, 0.42);
  createDrawerController('nightstand_drawer', nDrawerGroup, A.nightstand_drawer.z, -0.38);

  function openSafeDoor() {
    safeIsOpen = true;
  }

  function resetProps() {
    Object.values(drawers).forEach((d) => d.reset());
    Object.values(chaosProps).forEach((p) => p.reset());
    pickups.forEach((m) => {
      m.visible = true;
    });
    safeIsOpen = false;
    safeOpenAnim = 0;
    if (safeDoorPivot) safeDoorPivot.rotation.y = 0;
  }

  function update(dt, elapsed) {
    Object.values(drawers).forEach((d) => d.update(dt));

    // Animate safe door swing
    if (safeDoorPivot) {
      const target = safeIsOpen ? 1 : 0;
      safeOpenAnim += (target - safeOpenAnim) * Math.min(1, dt * 5);
      safeDoorPivot.rotation.y = -safeOpenAnim * (Math.PI * 0.65);
    }

    // Gentle candle flame flicker
    for (let i = 0; i < candleFlames.length; i++) {
      const f = candleFlames[i];
      const s = 0.85 + Math.sin(elapsed * 14 + i * 3.1) * 0.18;
      f.scale.set(1, s, 1);
    }
  }

  return {
    root,
    drawers,
    chaosProps,
    openSafeDoor,
    resetProps,
    update,
  };
}
