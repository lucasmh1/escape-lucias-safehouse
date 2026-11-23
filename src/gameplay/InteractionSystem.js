import * as THREE from 'three';
import { DOORS } from '../core/RoomLayout.js';

const INTERACT_REACH = 3.2;
const CENTER_NDC = new THREE.Vector2(0, 0);

const PUZZLE_ID_BY_OBJECT = Object.freeze({
  living_tv: 'tv',
  kitchen_oven: 'turkey',
  cctv_terminal: 'security',
  radio_transceiver: 'radio',
  wall_safe: 'safe',
});

const DEFAULT_ITEMS = Object.freeze({
  tv_remote: {
    id: 'tv_remote',
    name: "Lucia's Universal TV Remote",
    icon: '📺',
    description: 'Controls the 4K Smart TV in the Living Room. Slightly sticky from Miami humidity.',
    category: 'tool',
  },
  crowbar: {
    id: 'crowbar',
    name: 'Neon-Pink Crowbar',
    icon: '🔧',
    description: 'Heavy-duty pry bar left on the balcony. Great for "improvised" exits.',
    category: 'tool',
  },
});

const HIGHLIGHT_COLORS = Object.freeze({
  puzzle: new THREE.Color(0x00f0ff),
  clue: new THREE.Color(0xa855f7),
  pickup: new THREE.Color(0x00f0ff),
  chaos: new THREE.Color(0xff5500),
  exit: new THREE.Color(0xff2a85),
  default: new THREE.Color(0xff2a85),
});

const PHYSICS_GRAVITY = 14.5;
const PHYSICS_BOUNDS = {
  minX: -8.65,
  maxX: 13.15,
  minZ: -11.15,
  maxZ: 9.15,
};

/**
 * Center-screen raycasting interaction system supporting:
 * - 3.2m reach with wall occlusion
 * - Non-destructive emissive + subtle scale-pulse hover highlighting
 * - Contextual [E] interactions (puzzles, pickups, doors, drawers, clues, inspects, exits)
 * - Smooth animated hinged/sliding doors & drawers synced with GameState + colliders
 * - [F] physical knock-over / throw / smash chaos physics with gravity & floor bounces
 */
export class InteractionSystem {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {object} world Returned by WorldBuilder.buildWorld
   */
  constructor(camera, scene, eventBus, gameState, world) {
    this.camera = camera;
    this.scene = scene;
    this.bus = eventBus;
    this.gameState = gameState;
    this.world = world;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = INTERACT_REACH;

    this._hovered = null;
    this._hoverTime = 0;

    // Maps Object3D -> interactable descriptor for fast lookup
    this._meshToInteractable = new WeakMap();
    // Original scale & material backups so hover highlighting never breaks materials
    this._originalScale = new WeakMap();
    this._clonedMaterialCache = new WeakMap(); // Mesh -> { originalMat, highlightMat, baseEmissive, baseIntensity }

    // Door & drawer animation state
    this._doorAnims = new Map(); // doorId -> { progress, target, rattleTime, baseData }
    this._drawerAnims = new Map(); // drawerId -> { progress, target, basePos }

    // Chaos prop physics state
    this._propInitialTransforms = new Map(); // id -> { mesh, pos, rot, visible }
    this._activePhysics = new Map(); // id -> { mesh, vel, angVel, floorY, bounces }
    this._smashedCounts = new Map(); // id -> number of times smashed/kicked

    // Reusable scratch vectors
    this._camDir = new THREE.Vector3();
    this._camRight = new THREE.Vector3();

    this._unsubs = [];
    this._indexWorld();
    this._bindEvents();
  }

  _indexWorld() {
    if (!this.world) return;

    const interactables = this.world.interactables || [];
    for (const desc of interactables) {
      if (!desc || !desc.mesh) continue;
      this._registerInteractableMesh(desc);
      // Snapshot initial transform for reset()
      if (!this._propInitialTransforms.has(desc.id)) {
        this._propInitialTransforms.set(desc.id, {
          mesh: desc.mesh,
          pos: desc.mesh.position.clone(),
          rot: desc.mesh.rotation.clone(),
          visible: desc.mesh.visible,
        });
      }
    }

    // Initialize door animation entries
    const doorsMap = this.world.doors || {};
    for (const [doorId, doorObj] of Object.entries(doorsMap)) {
      const state = this.gameState.data?.doors?.[doorId];
      const open = Boolean(state?.open);
      const locked = state?.locked ?? Boolean(DOORS[doorId]?.locked);
      const baseData = this._captureDoorBase(doorObj);
      this._doorAnims.set(doorId, {
        progress: open ? 1 : 0,
        target: open ? 1 : 0,
        rattleTime: 0,
        baseData,
        managed: typeof doorObj?.setOpen === 'function',
      });
      if (typeof doorObj?.setLocked === 'function') doorObj.setLocked(locked);
      if (typeof doorObj?.setOpen === 'function') {
        doorObj.setOpen(open);
      } else {
        this._applyDoorTransform(doorId, doorObj, open ? 1 : 0, 0);
      }
      this._syncDoorCollider(doorId, open);
    }

    // Initialize drawer animation entries
    const drawersMap = this.world.drawers || {};
    for (const [drawerId, drawerObj] of Object.entries(drawersMap)) {
      const open = Boolean(this.gameState.data?.drawers?.[drawerId]);
      const managed = typeof drawerObj?.setOpen === 'function';
      const mesh = drawerObj?.mesh || drawerObj?.group || drawerObj;
      this._drawerAnims.set(drawerId, {
        progress: open ? 1 : 0,
        target: open ? 1 : 0,
        basePos: mesh?.position ? mesh.position.clone() : null,
        managed,
      });
      if (managed) {
        drawerObj.setOpen(open);
      } else if (mesh?.position) {
        this._applyDrawerTransform(drawerId, drawerObj, open ? 1 : 0);
      }
    }
  }

  _registerInteractableMesh(desc) {
    this._meshToInteractable.set(desc.mesh, desc);
    if (!desc.mesh.userData) desc.mesh.userData = {};
    if (!desc.mesh.userData.interactable) {
      desc.mesh.userData.interactable = desc;
    }
    desc.mesh.traverse((child) => {
      this._meshToInteractable.set(child, desc);
    });
  }

  _captureDoorBase(doorObj) {
    if (!doorObj) return {};
    const pivot = doorObj.pivot || doorObj.group || doorObj.mesh || doorObj;
    const leftLeaf = doorObj.leftLeaf || null;
    const rightLeaf = doorObj.rightLeaf || null;
    return {
      pivotRotY: pivot?.rotation ? pivot.rotation.y : 0,
      pivotPos: pivot?.position ? pivot.position.clone() : new THREE.Vector3(),
      leftPos: leftLeaf?.position ? leftLeaf.position.clone() : null,
      rightPos: rightLeaf?.position ? rightLeaf.position.clone() : null,
    };
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      if (this._isTypingTarget(e.target)) return;
      if (this.gameState.phase !== 'playing') return;

      if (e.code === 'KeyE') {
        this.interact();
      } else if (e.code === 'KeyF') {
        this.smash();
      }
    };

    window.addEventListener('keydown', this._onKeyDown);

    this._unsubs.push(
      this.bus.on('door:toggle', ({ doorId } = {}) => {
        if (doorId) this.toggleDoor(doorId);
      }),
      this.bus.on('door:state', ({ doorId, open, locked } = {}) => {
        if (!doorId) return;
        const doorObj = this.world?.doors?.[doorId];
        if (typeof locked === 'boolean' && typeof doorObj?.setLocked === 'function') {
          doorObj.setLocked(locked);
        }
        if (typeof open === 'boolean' && typeof doorObj?.setOpen === 'function') {
          doorObj.setOpen(open);
        }
        const anim = this._doorAnims.get(doorId);
        if (anim && typeof open === 'boolean') {
          anim.target = open ? 1 : 0;
        }
        if (typeof open === 'boolean') {
          this._syncDoorCollider(doorId, open);
        }
      }),
      this.bus.on('drawer:toggle', ({ drawerId } = {}) => {
        if (drawerId) this.toggleDrawer(drawerId);
      }),
      this.bus.on('drawer:state', ({ drawerId, open } = {}) => {
        if (!drawerId) return;
        const drawerObj = this.world?.drawers?.[drawerId];
        if (typeof drawerObj?.setOpen === 'function') {
          drawerObj.setOpen(Boolean(open));
        }
        const anim = this._drawerAnims.get(drawerId);
        if (anim) {
          anim.target = open ? 1 : 0;
        }
      }),
      this.bus.on('state:loaded', () => {
        this._syncFromGameState();
      })
    );
  }

  _isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  /**
   * Sync doors, drawers, and picked-up items after loading a saved game.
   */
  _syncFromGameState() {
    const doors = this.gameState.data?.doors || {};
    for (const [doorId, st] of Object.entries(doors)) {
      const open = Boolean(st?.open);
      const locked = Boolean(st?.locked);
      const doorObj = this.world?.doors?.[doorId];
      if (typeof doorObj?.setLocked === 'function') doorObj.setLocked(locked);
      if (typeof doorObj?.setOpen === 'function') doorObj.setOpen(open);
      const anim = this._doorAnims.get(doorId);
      if (anim) {
        anim.progress = open ? 1 : 0;
        anim.target = open ? 1 : 0;
        if (!anim.managed && doorObj) {
          this._applyDoorTransform(doorId, doorObj, anim.progress, 0);
        }
      }
      this._syncDoorCollider(doorId, open);
    }

    const drawers = this.gameState.data?.drawers || {};
    for (const [drawerId, open] of Object.entries(drawers)) {
      const drawerObj = this.world?.drawers?.[drawerId];
      if (typeof drawerObj?.setOpen === 'function') drawerObj.setOpen(Boolean(open));
      const anim = this._drawerAnims.get(drawerId);
      if (anim) {
        anim.progress = open ? 1 : 0;
        anim.target = open ? 1 : 0;
        if (!anim.managed && drawerObj) {
          this._applyDrawerTransform(drawerId, drawerObj, anim.progress);
        }
      }
    }

    // Hide already picked-up items
    const interactables = this.world?.interactables || [];
    for (const desc of interactables) {
      if (desc?.type === 'pickup') {
        const itemId = desc.itemData?.id || desc.id;
        if (this.gameState.hasItem(itemId)) {
          desc._pickedUp = true;
          if (desc.mesh) desc.mesh.visible = false;
        }
      }
    }
  }

  /**
   * Per-frame update: raycast hover, emissive pulse, door/drawer animations, chaos physics.
   * @param {number} dt
   */
  update(dt) {
    const clampedDt = Math.min(dt, 0.05);

    this._updateDoors(clampedDt);
    this._updateDrawers(clampedDt);
    this._updatePhysics(clampedDt);

    if (this.gameState.phase !== 'playing') {
      if (this._hovered) {
        this._setHovered(null);
      }
      return;
    }

    const hitDesc = this._raycastInteractable();
    if (hitDesc !== this._hovered) {
      this._setHovered(hitDesc);
    }

    if (this._hovered) {
      this._hoverTime += clampedDt;
      this._updateHoverVisual(this._hovered, this._hoverTime);
    }
  }

  /**
   * Cast center-screen ray within 3.2m reach respecting wall occlusion.
   */
  _raycastInteractable() {
    this.raycaster.setFromCamera(CENTER_NDC, this.camera);
    this.raycaster.far = INTERACT_REACH;

    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const obj = hit.object;

      if (!obj || !obj.visible) continue;
      if (obj.isPoints || obj.isLine || obj.isSprite) continue;
      if (obj.userData?.ignoreRaycast) continue;

      // Check if an ancestor is hidden
      if (!this._isEffectivelyVisible(obj)) continue;

      const desc = this._findInteractable(obj);
      if (desc) {
        if (desc._pickedUp || desc.disabled) continue;
        return desc;
      }

      // Hit a solid non-interactable blocker (wall/furniture) closer than any interactable behind it
      // Allow transparent glass panes to be raycasted through if tagged, otherwise occlude
      if (obj.material && obj.material.transparent && obj.material.opacity < 0.35) {
        continue;
      }
      return null;
    }

    return null;
  }

  _isEffectivelyVisible(obj) {
    let curr = obj;
    while (curr) {
      if (curr.visible === false) return false;
      curr = curr.parent;
    }
    return true;
  }

  _findInteractable(obj) {
    let curr = obj;
    while (curr) {
      if (curr.userData?.interactable) {
        return curr.userData.interactable;
      }
      const mapped = this._meshToInteractable.get(curr);
      if (mapped) return mapped;
      curr = curr.parent;
    }
    return null;
  }

  _setHovered(nextDesc) {
    if (this._hovered) {
      this._clearHoverVisual(this._hovered);
    }
    this._hovered = nextDesc || null;
    this._hoverTime = 0;

    if (this._hovered) {
      this._prepareHoverVisual(this._hovered);
    }

    this.bus.emit('interaction:hover', { interactable: this._hovered });
  }

  _shouldScalePulse(desc) {
    if (!desc?.mesh) return false;
    // Do not scale doors, drawers, or large fixed architectural fixtures
    if (desc.type === 'door' || desc.type === 'drawer' || desc.type === 'exit') return false;
    if (desc.id === 'living_tv' || desc.id === 'kitchen_oven' || desc.id === 'wall_safe') return false;
    return true;
  }

  _prepareHoverVisual(desc) {
    const root = desc.mesh;
    if (!root) return;

    if (!this._originalScale.has(root)) {
      this._originalScale.set(root, root.scale.clone());
    }

    root.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (this._clonedMaterialCache.has(child)) return;

      const originalMat = child.material;
      if (Array.isArray(originalMat)) {
        const clonedArr = originalMat.map((m) => (m?.emissive ? m.clone() : m));
        const meta = clonedArr.map((m) => ({
          baseEmissive: m?.emissive ? m.emissive.clone() : null,
          baseIntensity: m?.emissiveIntensity ?? 1,
        }));
        this._clonedMaterialCache.set(child, { originalMat, highlightMat: clonedArr, meta });
        child.material = clonedArr;
      } else if (originalMat.emissive) {
        const highlightMat = originalMat.clone();
        this._clonedMaterialCache.set(child, {
          originalMat,
          highlightMat,
          baseEmissive: originalMat.emissive.clone(),
          baseIntensity: originalMat.emissiveIntensity ?? 1,
        });
        child.material = highlightMat;
      }
    });
  }

  _updateHoverVisual(desc, t) {
    const root = desc.mesh;
    if (!root) return;

    const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
    const tint = HIGHLIGHT_COLORS[desc.type] || HIGHLIGHT_COLORS.default;

    if (this._shouldScalePulse(desc)) {
      const baseScale = this._originalScale.get(root);
      if (baseScale) {
        const factor = 1.0 + 0.028 * pulse;
        root.scale.set(baseScale.x * factor, baseScale.y * factor, baseScale.z * factor);
      }
    }

    const isLargeFixture =
      desc.type === 'door' ||
      desc.type === 'exit' ||
      desc.id === 'living_tv' ||
      desc.id === 'kitchen_oven' ||
      desc.id === 'wall_safe';

    const lerpWeight = isLargeFixture ? 0.12 + 0.08 * pulse : 0.28 + 0.18 * pulse;
    const targetIntensity = isLargeFixture ? 0.14 + 0.12 * pulse : 0.32 + 0.28 * pulse;

    root.traverse((child) => {
      const entry = this._clonedMaterialCache.get(child);
      if (!entry) return;

      if (Array.isArray(entry.highlightMat)) {
        entry.highlightMat.forEach((mat, idx) => {
          const m = entry.meta[idx];
          if (mat?.emissive && m?.baseEmissive) {
            mat.emissive.copy(m.baseEmissive).lerp(tint, lerpWeight);
            mat.emissiveIntensity = Math.max(m.baseIntensity, targetIntensity);
          }
        });
      } else if (entry.highlightMat?.emissive) {
        entry.highlightMat.emissive.copy(entry.baseEmissive).lerp(tint, lerpWeight);
        entry.highlightMat.emissiveIntensity = Math.max(entry.baseIntensity, targetIntensity);
      }
    });
  }

  _clearHoverVisual(desc) {
    const root = desc.mesh;
    if (!root) return;

    const baseScale = this._originalScale.get(root);
    if (baseScale) {
      root.scale.copy(baseScale);
    }

    root.traverse((child) => {
      const entry = this._clonedMaterialCache.get(child);
      if (!entry) return;

      // Restore original material so zero side effects remain
      child.material = entry.originalMat;
      if (Array.isArray(entry.highlightMat)) {
        entry.highlightMat.forEach((m, idx) => {
          if (m !== entry.originalMat[idx]) m?.dispose?.();
        });
      } else if (entry.highlightMat && entry.highlightMat !== entry.originalMat) {
        entry.highlightMat.dispose?.();
      }
      this._clonedMaterialCache.delete(child);
    });
  }

  /**
   * Perform contextual [E] interaction on the currently hovered object.
   */
  interact() {
    const desc = this._hovered;
    if (!desc || this.gameState.phase !== 'playing') return false;

    this.bus.emit('interaction:trigger', { interactable: desc, action: 'use' });

    if (typeof desc.onInteract === 'function') {
      desc.onInteract({
        gameState: this.gameState,
        eventBus: this.bus,
        world: this.world,
        interactable: desc,
        action: 'use',
      });
    }

    switch (desc.type) {
      case 'puzzle': {
        const puzzleId = desc.puzzleId || PUZZLE_ID_BY_OBJECT[desc.id] || desc.id;
        this.bus.emit('sfx:play', { name: 'interact' });
        this.bus.emit('puzzle:open', { puzzleId });
        return true;
      }

      case 'pickup': {
        const itemId = desc.itemData?.id || desc.id;
        const item = desc.itemData || DEFAULT_ITEMS[itemId] || {
          id: itemId,
          name: desc.label || itemId,
          icon: '🎒',
          description: '',
          category: 'item',
        };
        const added = this.gameState.addItem(item);
        desc._pickedUp = true;
        if (desc.mesh) desc.mesh.visible = false;
        this._setHovered(null);
        this.bus.emit('sfx:play', { name: 'pickup' });
        if (added) {
          this.bus.emit('ui:toast', {
            text: `Picked up ${item.name}`,
            type: 'success',
            duration: 3200,
          });
        }
        return true;
      }

      case 'door': {
        const doorId = desc.doorId || desc.id;
        this.toggleDoor(doorId);
        return true;
      }

      case 'drawer': {
        const drawerId = desc.drawerId || desc.id;
        this.toggleDrawer(drawerId);
        return true;
      }

      case 'exit': {
        return this._handleExitInteract(desc);
      }

      case 'clue': {
        const isVoicemail = desc.id === 'voicemail_dock';
        this.bus.emit('sfx:play', { name: isVoicemail ? 'voicemail_beep' : 'interact' });
        if (isVoicemail) {
          this.gameState.setFlag('voicemailHeard', true);
        }
        this.bus.emit('modal:open', {
          modalId: isVoicemail ? 'voicemail' : 'clue',
          data: {
            clueId: desc.clueId || desc.id,
            id: desc.id,
            label: desc.label,
            room: desc.room,
          },
        });
        return true;
      }

      case 'inspect': {
        this.bus.emit('sfx:play', { name: 'interact' });
        this.bus.emit('interaction:inspect', {
          id: desc.id,
          label: desc.label,
          room: desc.room,
        });
        if (desc.inspectText) {
          this.bus.emit('ui:subtitle', {
            speaker: 'You',
            text: desc.inspectText,
            duration: 4200,
          });
        }
        return true;
      }

      case 'chaos': {
        this.bus.emit('sfx:play', { name: 'interact' });
        this.bus.emit('interaction:inspect', {
          id: desc.id,
          label: desc.label,
          room: desc.room,
        });
        this.bus.emit('ui:toast', {
          text: `${desc.label} — Press [F] to knock over & smash!`,
          type: 'info',
          duration: 2400,
        });
        return true;
      }

      default: {
        this.bus.emit('sfx:play', { name: 'interact' });
        return true;
      }
    }
  }

  _handleExitInteract(desc) {
    const id = desc.doorId || desc.id;

    if (id === 'door_main_entrance') {
      const hasKey = this.gameState.hasItem('master_exit_key');
      const doorState = this.gameState.data?.doors?.door_main_entrance;

      if (hasKey || (doorState && !doorState.locked)) {
        this.gameState.setDoorState('door_main_entrance', { locked: false, open: true });
        this.bus.emit('world:mainDoorUnlocked');
        this.bus.emit('sfx:play', { name: 'door_open' });

        const damage = this.gameState.data?.stats?.safehouseDamage ?? 0;
        const endingId = damage >= 30000 ? 'TOTAL_CHAOS' : 'CLEAN_GETAWAY';
        const reason =
          endingId === 'TOTAL_CHAOS'
            ? `Escaped through the Main Entrance leaving $${damage.toLocaleString()} in penthouse wreckage!`
            : 'Unlocked the Main Entrance with the Master Exit Key and slipped into the Miami night!';

        this.bus.emit('game:ending', { endingId, reason });
        return true;
      }

      this.bus.emit('sfx:play', { name: 'door_locked' });
      const anim = this._doorAnims.get('door_main_entrance');
      if (anim) anim.rattleTime = 0.35;
      this.bus.emit('ui:toast', {
        text: 'Reinforced Main Entrance is locked. Find the Master Exit Key in Lucia’s Safe.',
        type: 'warning',
        duration: 3800,
      });
      return false;
    }

    if (id === 'balcony_escape_ledge') {
      const damage = this.gameState.data?.stats?.safehouseDamage ?? 0;
      const hasCrowbar = this.gameState.hasItem('crowbar');
      const chaosReady = Boolean(this.gameState.data?.flags?.balconyChaosReady);

      if (damage >= 35000 || chaosReady || hasCrowbar) {
        this.bus.emit('sfx:play', { name: 'crash' });
        this.bus.emit('sfx:crash', { id, amount: 5000 });
        this.gameState.addSafehouseDamage(5000, 'Smashed balcony emergency escape glass', true);
        const reason = hasCrowbar
          ? 'Pried open the balcony emergency zipline with Lucia’s neon-pink crowbar!'
          : 'Turned the penthouse into a warzone and vaulted off the balcony fire-escape!';
        this.bus.emit('game:ending', { endingId: 'TOTAL_CHAOS', reason });
        return true;
      }

      this.bus.emit('sfx:play', { name: 'door_locked' });
      this.bus.emit('ui:toast', {
        text: 'Tempered balcony glass! Grab the Crowbar or cause $35,000+ in chaos to break out here.',
        type: 'info',
        duration: 3800,
      });
      return false;
    }

    return false;
  }

  /**
   * Perform physical knock-over / throw / smash interaction [F] on chaos props.
   */
  smash() {
    const desc = this._hovered;
    if (!desc || this.gameState.phase !== 'playing') return false;

    const isSmashable =
      desc.canSmash === true || desc.type === 'chaos' || (desc.damageValue && desc.damageValue > 0);
    if (!isSmashable) return false;

    const mesh = desc.mesh;
    if (!mesh) return false;

    this.bus.emit('interaction:trigger', { interactable: desc, action: 'smash' });

    const prevCount = this._smashedCounts.get(desc.id) || 0;
    this._smashedCounts.set(desc.id, prevCount + 1);

    // Compute launch velocity along camera look direction + upward arc
    this.camera.getWorldDirection(this._camDir);
    this._camDir.y = 0;
    if (this._camDir.lengthSq() < 0.001) {
      this._camDir.set(0, 0, -1);
    } else {
      this._camDir.normalize();
    }
    this._camRight.set(-this._camDir.z, 0, this._camDir.x);

    const lateral = (Math.random() - 0.5) * 1.8;
    const speed = 4.2 + Math.random() * 1.4;
    const vel = new THREE.Vector3(
      this._camDir.x * speed + this._camRight.x * lateral,
      2.3 + Math.random() * 1.2,
      this._camDir.z * speed + this._camRight.z * lateral
    );

    const angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 11,
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 11
    );

    // Estimate resting floor Y from bounding box (fallback 0.14m)
    let floorY = 0.14;
    try {
      const box = new THREE.Box3().setFromObject(mesh);
      const halfH = (box.max.y - box.min.y) * 0.5;
      if (Number.isFinite(halfH) && halfH > 0.04 && halfH < 1.2) {
        floorY = Math.min(halfH, 0.35);
      }
    } catch {
      // keep default
    }

    this._activePhysics.set(desc.id, {
      mesh,
      vel,
      angVel,
      floorY,
      bounces: 0,
    });

    // Apply safehouse damage (full value on first smash, smaller follow-up kick damage up to 2 extra times)
    const baseValue = desc.damageValue || 2500;
    let damageApplied = 0;
    if (prevCount === 0) {
      damageApplied = baseValue;
      this.gameState.addSafehouseDamage(damageApplied, `Smashed ${desc.label}`, true);
    } else if (prevCount <= 2) {
      damageApplied = Math.round(Math.min(750, baseValue * 0.15));
      this.gameState.addSafehouseDamage(damageApplied, `Kicked ${desc.label} across the room`, false);
    }

    this.bus.emit('sfx:play', { name: 'crash', volume: 0.95 });
    this.bus.emit('sfx:crash', { id: desc.id, label: desc.label, amount: damageApplied });

    if (typeof desc.onInteract === 'function') {
      desc.onInteract({
        gameState: this.gameState,
        eventBus: this.bus,
        world: this.world,
        interactable: desc,
        action: 'smash',
      });
    }

    return true;
  }

  /**
   * Toggle a door open/closed, respecting locks and required inventory items.
   */
  toggleDoor(doorId) {
    const doorDef = DOORS[doorId];
    const doorState = this.gameState.data?.doors?.[doorId] || {
      open: false,
      locked: Boolean(doorDef?.locked),
    };

    if (doorState.locked) {
      const reqItem = doorDef?.requiresItem;
      if (reqItem && this.gameState.hasItem(reqItem)) {
        this.gameState.setDoorState(doorId, { locked: false, open: true });
        this.bus.emit('sfx:play', { name: 'door_open' });
        this.bus.emit('ui:toast', {
          text: `Unlocked ${doorDef?.label || doorId}!`,
          type: 'success',
          duration: 3000,
        });
        return true;
      }

      this.bus.emit('sfx:play', { name: 'door_locked' });
      const anim = this._doorAnims.get(doorId);
      if (anim) anim.rattleTime = 0.35;

      const neededLabel = reqItem ? reqItem.replace(/_/g, ' ') : 'a key';
      this.bus.emit('ui:toast', {
        text: `${doorDef?.label || 'Door'} is locked. Requires ${neededLabel}.`,
        type: 'warning',
        duration: 3200,
      });
      return false;
    }

    const nextOpen = !doorState.open;
    this.gameState.setDoorState(doorId, { open: nextOpen });
    this.bus.emit('sfx:play', { name: 'door_open' });
    return true;
  }

  /**
   * Toggle a drawer open/closed.
   */
  toggleDrawer(drawerId) {
    const nextOpen = !this.gameState.data?.drawers?.[drawerId];
    this.gameState.setDrawerState(drawerId, nextOpen);
    this.bus.emit('sfx:play', { name: 'drawer_slide' });
    return true;
  }

  _syncDoorCollider(doorId, open) {
    const colliders = this.world?.colliders;
    if (!Array.isArray(colliders)) return;
    for (let i = 0; i < colliders.length; i++) {
      if (colliders[i]?.doorId === doorId) {
        colliders[i].active = !open;
      }
    }
  }

  _updateDoors(dt) {
    const doorsMap = this.world?.doors;
    if (!doorsMap) return;

    for (const [doorId, anim] of this._doorAnims.entries()) {
      const doorObj = doorsMap[doorId];
      if (!doorObj) continue;

      let rattleOffset = 0;
      let hadRattle = false;
      if (anim.rattleTime > 0) {
        hadRattle = true;
        anim.rattleTime = Math.max(0, anim.rattleTime - dt);
        rattleOffset = Math.sin(anim.rattleTime * 58) * 0.025 * (anim.rattleTime / 0.35);
      }

      // If WorldBuilder/PenthouseArchitecture manages door animation via setOpen/update,
      // only apply locked-door rattle feedback on the door group.
      if (anim.managed) {
        if (hadRattle && doorObj.group?.position && anim.baseData?.pivotPos) {
          doorObj.group.position.x = anim.baseData.pivotPos.x + rattleOffset;
        }
        continue;
      }

      let dirty = hadRattle;

      if (Math.abs(anim.progress - anim.target) > 0.001) {
        const blend = 1 - Math.exp(-7.5 * dt);
        anim.progress = THREE.MathUtils.lerp(anim.progress, anim.target, blend);
        if (Math.abs(anim.progress - anim.target) <= 0.002) {
          anim.progress = anim.target;
        }
        dirty = true;
      }

      if (dirty) {
        this._applyDoorTransform(doorId, doorObj, anim.progress, rattleOffset);
      }
    }
  }

  _applyDoorTransform(doorId, doorObj, progress, rattleOffset) {
    const anim = this._doorAnims.get(doorId);
    const base = anim?.baseData || {};
    const def = doorObj.def || DOORS[doorId] || {};

    // Smooth ease-out curve
    const t = 1 - Math.pow(1 - progress, 3);

    if (def.type === 'sliding' || doorObj.type === 'sliding') {
      const slideDist = doorObj.slideDistance ?? (def.width ? def.width * 0.42 : 1.15);
      if (doorObj.leftLeaf && doorObj.rightLeaf && base.leftPos && base.rightPos) {
        doorObj.leftLeaf.position.x = base.leftPos.x - slideDist * t + rattleOffset;
        doorObj.rightLeaf.position.x = base.rightPos.x + slideDist * t - rattleOffset;
      } else {
        const mesh = doorObj.pivot || doorObj.mesh || doorObj;
        if (mesh?.position && base.pivotPos) {
          mesh.position.x = base.pivotPos.x + slideDist * t + rattleOffset;
        }
      }
      return;
    }

    // Hinged door
    const pivot = doorObj.pivot || doorObj.mesh || doorObj;
    if (pivot?.rotation) {
      const swingDir = def.swingDir ?? 1;
      const openAngle = (doorObj.openAngle ?? Math.PI * 0.52) * swingDir;
      pivot.rotation.y = (base.pivotRotY ?? 0) + openAngle * t + rattleOffset;
    }
  }

  _updateDrawers(dt) {
    const drawersMap = this.world?.drawers;
    if (!drawersMap) return;

    for (const [drawerId, anim] of this._drawerAnims.entries()) {
      if (anim.managed) continue;
      if (Math.abs(anim.progress - anim.target) <= 0.001) continue;
      const drawerObj = drawersMap[drawerId];
      if (!drawerObj) continue;

      const blend = 1 - Math.exp(-9.0 * dt);
      anim.progress = THREE.MathUtils.lerp(anim.progress, anim.target, blend);
      if (Math.abs(anim.progress - anim.target) <= 0.002) {
        anim.progress = anim.target;
      }
      this._applyDrawerTransform(drawerId, drawerObj, anim.progress);
    }
  }

  _applyDrawerTransform(drawerId, drawerObj, progress) {
    const anim = this._drawerAnims.get(drawerId);
    const mesh = drawerObj?.mesh || drawerObj;
    if (!mesh?.position || !anim?.basePos) return;

    const t = 1 - Math.pow(1 - progress, 3);
    const pullDist = drawerObj.pullDistance ?? 0.36;
    const axis = drawerObj.pullAxis || { x: 0, y: 0, z: 1 };

    mesh.position.set(
      anim.basePos.x + (axis.x || 0) * pullDist * t,
      anim.basePos.y + (axis.y || 0) * pullDist * t,
      anim.basePos.z + (axis.z || 0) * pullDist * t
    );
  }

  _updatePhysics(dt) {
    if (this._activePhysics.size === 0) return;

    for (const [id, body] of this._activePhysics.entries()) {
      const { mesh, vel, angVel, floorY } = body;
      if (!mesh) {
        this._activePhysics.delete(id);
        continue;
      }

      // Gravity
      vel.y -= PHYSICS_GRAVITY * dt;

      // Integrate position & rotation
      mesh.position.x += vel.x * dt;
      mesh.position.y += vel.y * dt;
      mesh.position.z += vel.z * dt;

      mesh.rotation.x += angVel.x * dt;
      mesh.rotation.y += angVel.y * dt;
      mesh.rotation.z += angVel.z * dt;

      // Keep inside penthouse bounds with bounce
      if (mesh.position.x < PHYSICS_BOUNDS.minX) {
        mesh.position.x = PHYSICS_BOUNDS.minX;
        vel.x = Math.abs(vel.x) * 0.48;
      } else if (mesh.position.x > PHYSICS_BOUNDS.maxX) {
        mesh.position.x = PHYSICS_BOUNDS.maxX;
        vel.x = -Math.abs(vel.x) * 0.48;
      }

      if (mesh.position.z < PHYSICS_BOUNDS.minZ) {
        mesh.position.z = PHYSICS_BOUNDS.minZ;
        vel.z = Math.abs(vel.z) * 0.48;
      } else if (mesh.position.z > PHYSICS_BOUNDS.maxZ) {
        mesh.position.z = PHYSICS_BOUNDS.maxZ;
        vel.z = -Math.abs(vel.z) * 0.48;
      }

      // Floor collision & bounce
      if (mesh.position.y <= floorY) {
        mesh.position.y = floorY;
        if (Math.abs(vel.y) > 1.25 && body.bounces < 2) {
          this.bus.emit('sfx:play', { name: 'crash', volume: 0.45 });
        }
        body.bounces += 1;
        vel.y = -vel.y * 0.38;
        vel.x *= 0.7;
        vel.z *= 0.7;
        angVel.multiplyScalar(0.62);

        if (Math.abs(vel.y) < 0.25) {
          vel.y = 0;
        }
      }

      // Sleep when settled
      const linearSpeedSq = vel.lengthSq();
      const angSpeedSq = angVel.lengthSq();
      if (mesh.position.y <= floorY + 0.005 && linearSpeedSq < 0.015 && angSpeedSq < 0.04) {
        vel.set(0, 0, 0);
        angVel.set(0, 0, 0);
        this._activePhysics.delete(id);
      }
    }
  }

  /**
   * Reset hover state, doors, drawers, pickups, and chaos prop transforms.
   */
  reset() {
    this._setHovered(null);
    this._activePhysics.clear();
    this._smashedCounts.clear();

    // Restore all indexed props & pickups
    for (const [id, snap] of this._propInitialTransforms.entries()) {
      if (snap.mesh) {
        snap.mesh.position.copy(snap.pos);
        snap.mesh.rotation.copy(snap.rot);
        snap.mesh.visible = snap.visible;
      }
    }

    const interactables = this.world?.interactables || [];
    for (const desc of interactables) {
      if (desc) desc._pickedUp = false;
    }

    // Reset doors to closed
    for (const [doorId, anim] of this._doorAnims.entries()) {
      anim.progress = 0;
      anim.target = 0;
      anim.rattleTime = 0;
      const doorObj = this.world?.doors?.[doorId];
      if (typeof doorObj?.reset === 'function') {
        doorObj.reset();
      } else if (doorObj) {
        this._applyDoorTransform(doorId, doorObj, 0, 0);
      }
      this._syncDoorCollider(doorId, false);
    }

    // Reset drawers to closed
    for (const [drawerId, anim] of this._drawerAnims.entries()) {
      anim.progress = 0;
      anim.target = 0;
      const drawerObj = this.world?.drawers?.[drawerId];
      if (typeof drawerObj?.reset === 'function') {
        drawerObj.reset();
      } else if (drawerObj) {
        this._applyDrawerTransform(drawerId, drawerObj, 0);
      }
    }
  }

  /**
   * Clean up listeners and highlight clones.
   */
  destroy() {
    this._setHovered(null);
    window.removeEventListener('keydown', this._onKeyDown);
    for (const unsub of this._unsubs) {
      unsub();
    }
    this._unsubs.length = 0;
  }
}

export default InteractionSystem;
