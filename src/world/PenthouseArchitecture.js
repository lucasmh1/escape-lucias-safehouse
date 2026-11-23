import * as THREE from 'three';

/**
 * Helper to tag every mesh inside an Object3D with the interactable descriptor.
 */
export function tagInteractable(obj, descriptor) {
  obj.userData.interactable = descriptor;
  obj.traverse((child) => {
    if (child.isMesh) {
      child.userData.interactable = descriptor;
    }
  });
}

/**
 * Builds the 7-room penthouse architectural shell directly from RoomLayout.js:
 * - Floors with procedural marble, dark wood, wet slate, and plush rugs
 * - Walls, rain-streaked panoramic windows, 4-panel bedroom bay window, balcony glass railings
 * - Living Room curved overhead mezzanine with chrome/glass rail, glossy white columns & pink-lit spiral staircase (Ref #2)
 * - Kitchen reflective lavender soffit ceiling with recessed spotlights (Ref #5)
 * - All 5 interactive doors (sliding balcony glass, bedroom, bathroom, locked security door, reinforced main entrance)
 */
export function buildPenthouseArchitecture(scene, layout, textures, interactables, colliders) {
  const root = new THREE.Group();
  root.name = 'PenthouseArchitecture';
  scene.add(root);

  const wallColliders = layout.buildWallColliders();
  wallColliders.forEach((c) => colliders.push(c));

  // Shared materials
  const matDarkWood = new THREE.MeshStandardMaterial({
    map: textures.getDarkWood(5, 5),
    roughness: 0.32,
    metalness: 0.08,
  });
  const matMarble = new THREE.MeshStandardMaterial({
    map: textures.getLavenderMarble(4, 4),
    roughness: 0.14,
    metalness: 0.12,
  });
  const matBalconyFloor = new THREE.MeshStandardMaterial({
    color: 0x1a1726,
    roughness: 0.22,
    metalness: 0.3,
  });
  const matSecurityFloor = new THREE.MeshStandardMaterial({
    map: textures.getDarkWood(3, 3),
    color: 0x6a6e88,
    roughness: 0.42,
    metalness: 0.22,
  });
  const matWallLavender = new THREE.MeshStandardMaterial({
    color: 0x3b2c52,
    roughness: 0.65,
    metalness: 0.05,
  });
  const matWallPink = new THREE.MeshStandardMaterial({
    color: 0x6b2656,
    roughness: 0.58,
    metalness: 0.05,
  });
  const matWallDark = new THREE.MeshStandardMaterial({
    color: 0x1e192b,
    roughness: 0.6,
    metalness: 0.15,
  });
  const matGlossWhite = new THREE.MeshStandardMaterial({
    color: 0xebe4f5,
    roughness: 0.16,
    metalness: 0.18,
  });
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xdce4f0,
    roughness: 0.12,
    metalness: 0.92,
  });
  const matMullion = new THREE.MeshStandardMaterial({
    color: 0x171422,
    roughness: 0.32,
    metalness: 0.72,
  });
  const matRainGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8db8e8,
    map: textures.getRainGlass(),
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
  });
  const matRailingGlass = new THREE.MeshPhysicalMaterial({
    color: 0x99d6ff,
    transparent: true,
    opacity: 0.26,
    roughness: 0.05,
    metalness: 0.15,
    depthWrite: false,
  });
  const matCeiling = new THREE.MeshStandardMaterial({
    color: 0x261d38,
    roughness: 0.75,
    metalness: 0.05,
  });
  const matSoffit = new THREE.MeshStandardMaterial({
    map: textures.getSoffitCeiling(),
    roughness: 0.12,
    metalness: 0.45,
    emissive: 0x3a1842,
    emissiveIntensity: 0.35,
  });

  // --- 1. Floors & Ceilings for all 7 rooms ---
  Object.values(layout.ROOMS).forEach((room) => {
    const w = room.maxX - room.minX;
    const d = room.maxZ - room.minZ;
    const cx = (room.minX + room.maxX) * 0.5;
    const cz = (room.minZ + room.maxZ) * 0.5;

    let floorMat = matDarkWood;
    if (room.id === 'kitchen' || room.id === 'foyer' || room.id === 'bathroom') floorMat = matMarble;
    else if (room.id === 'balcony') floorMat = matBalconyFloor;
    else if (room.id === 'security_room') floorMat = matSecurityFloor;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat);
    floor.position.set(cx, -0.1, cz);
    floor.receiveShadow = true;
    root.add(floor);

    if (!room.openAir) {
      const ceilMat = room.id === 'bedroom' ? matWallPink : matCeiling;
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), ceilMat);
      ceiling.position.set(cx, room.ceilingY + 0.1, cz);
      root.add(ceiling);
    }
  });

  // Exterior architectural slab underneath the penthouse so it looks like a real high-rise tower
  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(24, 16, 22),
    new THREE.MeshStandardMaterial({ color: 0x100d1a, roughness: 0.8 })
  );
  towerBase.position.set(2.2, -8.2, -1.0);
  root.add(towerBase);

  // --- 2. Build Walls, Panoramic Rain Windows, Bay Window & Railings from WALL_SEGMENTS ---
  const T = layout.WALL_THICKNESS;
  layout.WALL_SEGMENTS.forEach((seg) => {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const isHorizontal = Math.abs(dx) >= Math.abs(dz);
    const length = isHorizontal ? Math.abs(dx) : Math.abs(dz);
    const cx = (seg.x1 + seg.x2) * 0.5;
    const cz = (seg.z1 + seg.z2) * 0.5;
    const w = isHorizontal ? length + T : T;
    const d = isHorizontal ? T : length + T;

    if (seg.kind === 'solid') {
      let mat = matWallLavender;
      if (seg.id.startsWith('bedroom')) mat = matWallPink;
      else if (seg.id.startsWith('security') || seg.id === 'part_bath_sec') mat = matWallDark;

      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, seg.height, d), mat);
      wall.position.set(cx, seg.height * 0.5, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      root.add(wall);

      // Subtle neon cove trim near ceiling
      const trimColor = seg.id.startsWith('bedroom')
        ? 0xff2d95
        : seg.id.startsWith('security')
          ? 0x00f0ff
          : 0xb05cff;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length : 0.05, 0.04, isHorizontal ? 0.05 : length),
        new THREE.MeshBasicMaterial({ color: trimColor })
      );
      trim.position.set(cx, seg.height - 0.06, cz);
      root.add(trim);
    } else if (seg.kind === 'window') {
      const isBay = seg.id === 'bedroom_south_bay';
      const sillH = isBay ? 0.85 : 0.14;
      const headH = 0.25;
      const glassH = seg.height - sillH - headH;

      // Sill (hot pink wall below Bedroom bay window per Ref #6, low mullion curb for panoramic windows)
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(w, sillH, d),
        isBay ? matWallPink : matMullion
      );
      sill.position.set(cx, sillH * 0.5, cz);
      root.add(sill);

      // Header
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(w, headH, d),
        isBay ? matWallPink : matMullion
      );
      header.position.set(cx, seg.height - headH * 0.5, cz);
      root.add(header);

      // Glass pane
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length : 0.04, glassH, isHorizontal ? 0.04 : length),
        matRainGlass
      );
      glass.position.set(cx, sillH + glassH * 0.5, cz);
      root.add(glass);

      // Vertical mullions (4 panels for bedroom bay window per Ref #6; panoramic spacing for living room)
      const panels = isBay ? 4 : Math.max(2, Math.round(length / 2.4));
      for (let i = 0; i <= panels; i++) {
        const frac = i / panels;
        const mx = isHorizontal ? seg.x1 + dx * frac : cx;
        const mz = isHorizontal ? cz : seg.z1 + dz * frac;
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, glassH, 0.1),
          isBay ? matGlossWhite : matMullion
        );
        mullion.position.set(mx, sillH + glassH * 0.5, mz);
        root.add(mullion);
      }
    } else if (seg.kind === 'railing') {
      // Balcony glass railing with chrome top rail and posts
      const railGlass = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length : 0.04, seg.height - 0.12, isHorizontal ? 0.04 : length),
        matRailingGlass
      );
      railGlass.position.set(cx, (seg.height - 0.12) * 0.5 + 0.06, cz);
      root.add(railGlass);

      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length + 0.08 : 0.08, 0.07, isHorizontal ? 0.08 : length + 0.08),
        matChrome
      );
      topRail.position.set(cx, seg.height, cz);
      root.add(topRail);

      const postCount = Math.max(2, Math.round(length / 2.2));
      for (let i = 0; i <= postCount; i++) {
        const frac = i / postCount;
        const px = isHorizontal ? seg.x1 + dx * frac : cx;
        const pz = isHorizontal ? cz : seg.z1 + dz * frac;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, seg.height, 8), matChrome);
        post.position.set(px, seg.height * 0.5, pz);
        root.add(post);
      }
    }
  });

  // --- 3. Headers above Doors & Open Archways ---
  function addWallHeader(x, z, width, orient, doorTopY, ceilingY, mat = matWallLavender) {
    const h = ceilingY - doorTopY;
    if (h <= 0.02) return;
    const w = orient === 'x' ? width : T;
    const d = orient === 'x' ? T : width;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, doorTopY + h * 0.5, z);
    root.add(mesh);
  }

  Object.values(layout.DOORS).forEach((d) => {
    const ceilY = d.id === 'door_balcony' ? 4.8 : d.id === 'door_main_entrance' ? 3.6 : 3.4;
    addWallHeader(d.x, d.z, d.width, d.orientation, d.height, ceilY);
  });
  // Kitchen <-> Foyer open archway header (z: -2.2..0.2)
  addWallHeader(10.0, -1.0, 2.4, 'z', 2.75, 3.6);
  // Living <-> Kitchen height transition bulkhead (from y=3.6 to y=4.8 at x=1.0)
  addWallHeader(1.0, -2.5, 10.0, 'z', 3.6, 4.8, matGlossWhite);

  // --- 4. Hero Architectural Features from Reference Images ---
  // Ref #2: Glossy white cylindrical penthouse columns
  const columnCoords = [
    [-8.55, -7.05],
    [-8.55, -2.5],
    [-2.4, -7.05],
    [0.95, -6.3],
    [0.95, 1.3],
  ];
  columnCoords.forEach(([cx, cz]) => {
    const colH = cx < 0.5 ? 4.8 : 3.6;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, colH, 18), matGlossWhite);
    col.position.set(cx, colH * 0.5, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    root.add(col);
    colliders.push({
      id: `col_${cx}_${cz}`,
      minX: cx - 0.36,
      maxX: cx + 0.36,
      minY: 0,
      maxY: colH,
      minZ: cz - 0.36,
      maxZ: cz + 0.36,
      tag: 'column',
      active: true,
    });
  });

  // Ref #2: Curved Overhead Mezzanine Gallery & Chrome/Glass Rail in Living Room
  const mezGroup = new THREE.Group();
  mezGroup.position.set(-4.0, 3.25, -2.5);
  // Curved cantilevered gallery deck around the south & east edges of the Living Room
  const mezRing = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 5.2, 28, 1, -Math.PI * 0.1, Math.PI * 1.15),
    matGlossWhite
  );
  mezRing.rotation.x = -Math.PI / 2;
  mezGroup.add(mezRing);

  const mezFascia = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.38, 28, 1, true, -Math.PI * 0.1, Math.PI * 1.15),
    matGlossWhite
  );
  mezFascia.position.y = 0.19;
  mezGroup.add(mezFascia);

  const mezGlassRail = new THREE.Mesh(
    new THREE.CylinderGeometry(3.46, 3.46, 0.85, 28, 1, true, -Math.PI * 0.1, Math.PI * 1.15),
    matRailingGlass
  );
  mezGlassRail.position.y = 0.82;
  mezGroup.add(mezGlassRail);

  const mezTopBar = new THREE.Mesh(
    new THREE.TorusGeometry(3.46, 0.035, 8, 28, Math.PI * 1.15),
    matChrome
  );
  mezTopBar.rotation.x = Math.PI / 2;
  mezTopBar.rotation.z = -Math.PI * 0.1;
  mezTopBar.position.y = 1.24;
  mezGroup.add(mezTopBar);

  // Recessed spotlights along mezzanine underside
  const spotEmissive = new THREE.MeshBasicMaterial({ color: 0xffd1f0 });
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.05 + (i / 7) * Math.PI * 1.05;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10), spotEmissive);
    lamp.position.set(Math.cos(a) * 3.85, -0.02, Math.sin(a) * 3.85);
    mezGroup.add(lamp);
  }
  root.add(mezGroup);

  // Ref #2: Pink-lit Spiral Staircase at ANCHORS.spiral_stair (-7.6, 0, 0.8)
  const stairAnchor = layout.ANCHORS.spiral_stair;
  const stairGroup = new THREE.Group();
  stairGroup.position.set(stairAnchor.x, 0, stairAnchor.z);
  const centerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.8, 12), matChrome);
  centerPole.position.y = 1.9;
  stairGroup.add(centerPole);

  const stepMat = new THREE.MeshStandardMaterial({
    color: 0xe6d8f7,
    emissive: 0xff2d95,
    emissiveIntensity: 0.22,
    roughness: 0.25,
    metalness: 0.35,
  });
  for (let s = 0; s < 14; s++) {
    const ang = s * 0.42;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.34), stepMat);
    step.position.set(Math.cos(ang) * 0.52, 0.24 + s * 0.24, Math.sin(ang) * 0.52);
    step.rotation.y = -ang;
    stairGroup.add(step);

    // Outer chrome baluster
    const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), matChrome);
    bal.position.set(Math.cos(ang) * 0.96, 0.68 + s * 0.24, Math.sin(ang) * 0.96);
    stairGroup.add(bal);
  }
  root.add(stairGroup);
  colliders.push({
    id: 'spiral_stair_collider',
    minX: stairAnchor.x - 1.05,
    maxX: stairAnchor.x + 1.05,
    minY: 0,
    maxY: 3.6,
    minZ: stairAnchor.z - 1.05,
    maxZ: stairAnchor.z + 1.05,
    tag: 'architecture',
    active: true,
  });

  // Ref #5: Reflective Lavender Soffit Ceiling over Kitchen Marble Island
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 3.2), matSoffit);
  soffit.position.set(5.5, 3.42, -3.0);
  root.add(soffit);
  const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  for (let ix = -2; ix <= 2; ix += 2) {
    for (let iz = -1; iz <= 1; iz += 2) {
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), warmBulbMat);
      bulb.position.set(5.5 + ix, 3.3, -3.0 + iz * 0.75);
      root.add(bulb);
    }
  }

  // --- 5. Interactive Doors (Sliding Balcony, Hinged Rooms, Reinforced Main Entrance) ---
  const doors = {};
  let mainDoorLedMat = null;
  let securityDoorLedMat = null;

  Object.values(layout.DOORS).forEach((def) => {
    const collider = layout.buildDoorCollider(def);
    colliders.push(collider);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(def.x, 0, def.z);
    root.add(doorGroup);

    let animProgress = 0; // 0 = closed, 1 = open
    let isOpen = false;
    let isLocked = Boolean(def.locked);

    let leftPanel = null;
    let rightPanel = null;
    let pivot = null;

    if (def.type === 'sliding') {
      // Sliding glass balcony doors
      const halfW = def.width * 0.5;
      const frameMat = matMullion;
      const buildSlidingPanel = (offsetX) => {
        const p = new THREE.Group();
        p.position.x = offsetX;
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(halfW - 0.08, def.height - 0.16, 0.05),
          matRainGlass
        );
        glass.position.y = def.height * 0.5;
        p.add(glass);

        const topF = new THREE.Mesh(new THREE.BoxGeometry(halfW, 0.08, 0.09), frameMat);
        topF.position.y = def.height - 0.04;
        const botF = new THREE.Mesh(new THREE.BoxGeometry(halfW, 0.08, 0.09), frameMat);
        botF.position.y = 0.04;
        const leftF = new THREE.Mesh(new THREE.BoxGeometry(0.08, def.height, 0.09), frameMat);
        leftF.position.set(-halfW * 0.5 + 0.04, def.height * 0.5, 0);
        const rightF = new THREE.Mesh(new THREE.BoxGeometry(0.08, def.height, 0.09), frameMat);
        rightF.position.set(halfW * 0.5 - 0.04, def.height * 0.5, 0);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.14), matChrome);
        handle.position.set(offsetX < 0 ? halfW * 0.5 - 0.14 : -halfW * 0.5 + 0.14, 1.15, 0);
        p.add(topF, botF, leftF, rightF, handle);
        return p;
      };
      leftPanel = buildSlidingPanel(-halfW * 0.5);
      rightPanel = buildSlidingPanel(halfW * 0.5);
      doorGroup.add(leftPanel, rightPanel);
    } else if (def.type === 'exit') {
      // Heavy reinforced penthouse Main Entrance door (orientation: 'z')
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x201c2e,
        roughness: 0.35,
        metalness: 0.78,
      });
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.14, def.height, def.width - 0.06), panelMat);
      leaf.position.set(0, def.height * 0.5, 0);
      doorGroup.add(leaf);

      // Steel reinforcement crossbars
      for (let ry of [0.6, 1.35, 2.05]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, def.width - 0.16), matChrome);
        bar.position.set(0, ry, 0);
        doorGroup.add(bar);
      }

      // Electronic Master Key Lock Box + LED indicator
      const lockBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.16), matMullion);
      lockBox.position.set(-0.08, 1.28, 0.55);
      doorGroup.add(lockBox);

      mainDoorLedMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), mainDoorLedMat);
      led.position.set(-0.18, 1.34, 0.55);
      doorGroup.add(led);
    } else {
      // Hinged interior door (orientation: 'x')
      pivot = new THREE.Group();
      pivot.position.set(-def.width * 0.5, 0, 0);
      doorGroup.add(pivot);

      const isSec = def.id === 'door_security';
      const leafMat = new THREE.MeshStandardMaterial({
        color: isSec ? 0x25283d : def.id === 'door_bedroom' ? 0x57264e : 0x3b2d54,
        roughness: isSec ? 0.3 : 0.45,
        metalness: isSec ? 0.65 : 0.15,
      });
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.04, def.height - 0.04, 0.08), leafMat);
      leaf.position.set(def.width * 0.5, def.height * 0.5, 0);
      leaf.castShadow = true;
      pivot.add(leaf);

      // Chrome lever handle on both sides
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.18), matChrome);
      handle.position.set(def.width - 0.18, 1.05, 0);
      pivot.add(handle);

      if (isSec) {
        // Keycard reader LED
        securityDoorLedMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
        const reader = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.14), matMullion);
        reader.position.set(def.width - 0.18, 1.32, 0);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), securityDoorLedMat);
        led.position.set(def.width - 0.18, 1.38, -0.08);
        pivot.add(reader, led);
      }
    }

    const descriptor = {
      id: def.id,
      mesh: doorGroup,
      label: def.label,
      actionLabel: def.type === 'exit' ? 'Unlock / Escape' : isLocked ? 'Unlock' : 'Open',
      type: def.type === 'exit' ? 'exit' : 'door',
      room: def.roomA,
      doorId: def.id,
      canSmash: false,
      damageValue: 0,
      onInteract: null,
    };
    tagInteractable(doorGroup, descriptor);
    interactables.push(descriptor);

    const doorObj = {
      id: def.id,
      def,
      group: doorGroup,
      collider,
      descriptor,
      get open() {
        return isOpen;
      },
      get locked() {
        return isLocked;
      },
      setOpen(nextOpen) {
        isOpen = Boolean(nextOpen);
        collider.active = !isOpen;
        if (def.type !== 'exit') {
          descriptor.actionLabel = isOpen ? 'Close' : isLocked ? 'Unlock' : 'Open';
        }
      },
      setLocked(nextLocked) {
        isLocked = Boolean(nextLocked);
        if (def.id === 'door_security' && securityDoorLedMat) {
          securityDoorLedMat.color.setHex(isLocked ? 0xff2244 : 0x22ff88);
        }
        if (def.id === 'door_main_entrance' && mainDoorLedMat) {
          mainDoorLedMat.color.setHex(isLocked ? 0xff2244 : 0x22ff88);
        }
        if (def.type !== 'exit') {
          descriptor.actionLabel = isOpen ? 'Close' : isLocked ? 'Unlock' : 'Open';
        }
      },
      toggle() {
        if (isLocked) return false;
        this.setOpen(!isOpen);
        return true;
      },
      update(dt) {
        const target = isOpen ? 1 : 0;
        animProgress += (target - animProgress) * Math.min(1, dt * 7);
        if (def.type === 'sliding' && leftPanel && rightPanel) {
          const halfW = def.width * 0.5;
          const slide = animProgress * (halfW * 0.85);
          leftPanel.position.x = -halfW * 0.5 - slide;
          rightPanel.position.x = halfW * 0.5 + slide;
        } else if (pivot) {
          const swing = (def.swingDir || 1) * (Math.PI * 0.52);
          pivot.rotation.y = animProgress * swing;
        }
      },
      reset() {
        isLocked = Boolean(def.locked);
        isOpen = false;
        animProgress = 0;
        collider.active = true;
        this.setLocked(isLocked);
        this.setOpen(false);
      },
    };

    doors[def.id] = doorObj;
  });

  function unlockMainDoor() {
    if (doors.door_main_entrance) {
      doors.door_main_entrance.setLocked(false);
    }
  }

  function update(dt) {
    Object.values(doors).forEach((d) => d.update(dt));
  }

  return {
    root,
    doors,
    update,
    unlockMainDoor,
  };
}
