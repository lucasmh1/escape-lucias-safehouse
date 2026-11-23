import * as THREE from 'three';

const WALK_SPEED = 3.4;
const SPRINT_SPEED = 5.6;
const ACCELERATION = 18.0;
const DECELERATION = 14.0;
const KEY_TURN_SPEED = 1.9;
const MAX_PITCH = Math.PI / 2 - 0.08;
const MOUSE_SPIKE_LIMIT = 180;

const BOB_FREQ_WALK = 8.4;
const BOB_FREQ_SPRINT = 11.8;
const BOB_AMP_Y_WALK = 0.028;
const BOB_AMP_Y_SPRINT = 0.046;
const BOB_AMP_X_WALK = 0.011;
const BOB_AMP_X_SPRINT = 0.019;

// Safety outer bounds of the entire penthouse + balcony + foyer
const WORLD_BOUNDS = {
  minX: -8.85,
  maxX: 13.35,
  minZ: -11.35,
  maxZ: 9.35,
};

/**
 * First-person player controller with PointerLock mouse look, smooth WASD + Shift
 * acceleration/damping, footstep-synced head-bob, AABB sliding collision detection,
 * clean pause/modal pointer management, and cinematic camera override support.
 */
export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {typeof import('../core/RoomLayout.js')} layout
   * @param {Array<{id:string, minX:number, maxX:number, minY:number, maxY:number, minZ:number, maxZ:number, active?:boolean, doorId?:string}>} colliders
   */
  constructor(camera, domElement, eventBus, gameState, layout, colliders = []) {
    this.camera = camera;
    this.domElement = domElement;
    this.bus = eventBus;
    this.gameState = gameState;
    this.layout = layout;
    this.colliders = colliders;

    this.eyeHeight = layout?.PLAYER_EYE_HEIGHT ?? 1.65;
    this.radius = layout?.PLAYER_RADIUS ?? 0.34;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;

    this._locked = false;
    this._suppressPauseOnUnlock = false;
    this._keys = new Set();

    // Head-bob & footstep state
    this._bobPhase = 0;
    this._bobOffsetY = 0;
    this._bobOffsetX = 0;
    this._lastStepHalfCycle = 0;

    // Room tracking
    this._currentRoomId = null;

    // Cinematic override state
    this._cinematicActive = false;
    this._cinematicFn = null;
    this._cinematicElapsed = 0;

    // Reusable scratch vectors
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wishDir = new THREE.Vector3();

    this.camera.rotation.order = 'YXZ';

    this._unsubs = [];
    this._bindEvents();
    this.reset();
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      if (this._isTypingTarget(e.target)) return;

      const code = e.code;
      const phase = this.gameState.phase;

      // TAB toggles inventory in playing or modal phase
      if (code === 'Tab') {
        if (phase === 'playing' || phase === 'modal') {
          e.preventDefault();
          if (!e.repeat) {
            this.bus.emit('ui:inventory:toggle');
          }
        }
        return;
      }

      // ESC pauses cleanly (when pointer lock is not active) or closes modal / resumes
      if (code === 'Escape' && !e.repeat) {
        if (phase === 'playing' && !this._locked) {
          this.bus.emit('game:pause');
        } else if (phase === 'paused') {
          this.bus.emit('game:resume');
        } else if (phase === 'modal') {
          this.bus.emit('modal:close');
        }
        return;
      }

      // H requests progressive hint while playing
      if (code === 'KeyH' && !e.repeat && phase === 'playing') {
        this.bus.emit('ui:hint');
        return;
      }

      // Movement keys
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight'
      ) {
        this._keys.add(code);
      }
    };

    this._onKeyUp = (e) => {
      this._keys.delete(e.code);
    };

    this._onMouseMove = (e) => {
      if (!this._locked || this._cinematicActive || this.gameState.phase !== 'playing') {
        return;
      }
      const dx = THREE.MathUtils.clamp(e.movementX || 0, -MOUSE_SPIKE_LIMIT, MOUSE_SPIKE_LIMIT);
      const dy = THREE.MathUtils.clamp(e.movementY || 0, -MOUSE_SPIKE_LIMIT, MOUSE_SPIKE_LIMIT);
      const sens = (this.gameState.data?.settings?.sensitivity ?? 1.0) * 0.0022;

      this.yaw -= dx * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -MAX_PITCH, MAX_PITCH);
    };

    this._onCanvasClick = () => {
      if (this.gameState.phase === 'playing' && !this._cinematicActive && !this._locked) {
        this.lock();
      }
    };

    this._onPointerLockChange = () => {
      const wasLocked = this._locked;
      this._locked = document.pointerLockElement === this.domElement;
      this.bus.emit('player:pointerLock', { locked: this._locked });

      if (!this._locked) {
        this._keys.clear();
        // If user pressed ESC during active gameplay (pointer lock dropped naturally), pause cleanly
        if (
          wasLocked &&
          !this._suppressPauseOnUnlock &&
          !this._cinematicActive &&
          this.gameState.phase === 'playing'
        ) {
          this.bus.emit('game:pause');
        }
      } else {
        this._suppressPauseOnUnlock = false;
      }
    };

    this._onPointerLockError = () => {
      this._locked = false;
    };

    this._onWindowBlur = () => {
      this._keys.clear();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockError);
    window.addEventListener('blur', this._onWindowBlur);
    if (this.domElement) {
      this.domElement.addEventListener('click', this._onCanvasClick);
    }

    // EventBus lifecycle subscriptions
    this._unsubs.push(
      this.bus.on('modal:open', () => {
        this._suppressPauseOnUnlock = true;
        this._keys.clear();
        this.unlock();
      }),
      this.bus.on('modal:close', () => {
        this._suppressPauseOnUnlock = false;
      }),
      this.bus.on('game:pause', () => {
        this._suppressPauseOnUnlock = true;
        this._keys.clear();
        this.unlock();
      }),
      this.bus.on('game:resume', () => {
        this._suppressPauseOnUnlock = false;
        this.lock();
      }),
      this.bus.on('game:menu', () => {
        this._suppressPauseOnUnlock = true;
        this._keys.clear();
        this.unlock();
      }),
      this.bus.on('game:ending', () => {
        this._suppressPauseOnUnlock = true;
        this._keys.clear();
        this.unlock();
      })
    );
  }

  _isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  /**
   * Request PointerLock on the canvas element.
   */
  lock() {
    if (!this.domElement || this._cinematicActive) return;
    if (document.pointerLockElement === this.domElement) {
      this._locked = true;
      return;
    }
    try {
      const result = this.domElement.requestPointerLock?.();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          // Ignore browser gesture / rapid-relock rejection
        });
      }
    } catch {
      // Ignore in environments without PointerLock support
    }
  }

  /**
   * Exit PointerLock cleanly.
   */
  unlock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }
    this._locked = false;
  }

  /**
   * @returns {boolean}
   */
  isLocked() {
    return this._locked;
  }

  /**
   * Teleport player to exact position and look angles.
   */
  setPosition(x, y, z, yaw = this.yaw, pitch = this.pitch) {
    this.position.set(x, y ?? this.eyeHeight, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = THREE.MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH);
    this._bobOffsetY = 0;
    this._bobOffsetX = 0;
    this._syncCamera();
    this._updateRoomTracking(true);
  }

  /**
   * @returns {{ x: number, y: number, z: number, yaw: number, pitch: number }}
   */
  getTransform() {
    return {
      x: Number(this.position.x.toFixed(3)),
      y: Number(this.position.y.toFixed(3)),
      z: Number(this.position.z.toFixed(3)),
      yaw: Number(this.yaw.toFixed(4)),
      pitch: Number(this.pitch.toFixed(4)),
    };
  }

  /**
   * Enable or disable cinematic camera override mode (for Main Menu orbit or Endings).
   * @param {boolean} active
   * @param {(camera: THREE.PerspectiveCamera, dt: number, elapsed: number) => void} [fn]
   */
  setCinematicMode(active, fn = null) {
    this._cinematicActive = Boolean(active);
    this._cinematicFn = active ? fn : null;
    this._cinematicElapsed = 0;
    if (this._cinematicActive) {
      this._suppressPauseOnUnlock = true;
      this._keys.clear();
      this.velocity.set(0, 0, 0);
      this.unlock();
    } else {
      this._suppressPauseOnUnlock = false;
      this._syncCamera();
    }
  }

  /**
   * Reset player to default spawn point and clear movement state.
   */
  reset() {
    const spawn = this.layout?.PLAYER_SPAWN || {
      x: -1.5,
      y: this.eyeHeight,
      z: -0.6,
      yaw: 0.65,
      pitch: -0.04,
    };
    this._keys.clear();
    this._cinematicActive = false;
    this._cinematicFn = null;
    this._cinematicElapsed = 0;
    this._bobPhase = 0;
    this._bobOffsetY = 0;
    this._bobOffsetX = 0;
    this._lastStepHalfCycle = 0;
    this._currentRoomId = null;
    this.setPosition(spawn.x, spawn.y, spawn.z, spawn.yaw, spawn.pitch);
  }

  /**
   * Per-frame update.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const clampedDt = Math.min(dt, 0.05);

    if (this._cinematicActive) {
      this._cinematicElapsed += clampedDt;
      if (typeof this._cinematicFn === 'function') {
        this._cinematicFn(this.camera, clampedDt, this._cinematicElapsed);
      }
      return;
    }

    if (this.gameState.phase !== 'playing') {
      return;
    }

    // Optional keyboard look fallback when not pointer-locked (great for accessibility & automated tests)
    if (!this._locked) {
      if (this._keys.has('ArrowLeft')) this.yaw += KEY_TURN_SPEED * clampedDt;
      if (this._keys.has('ArrowRight')) this.yaw -= KEY_TURN_SPEED * clampedDt;
    }

    // Build horizontal movement basis from yaw
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._wishDir.set(0, 0, 0);
    if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) this._wishDir.add(this._forward);
    if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) this._wishDir.sub(this._forward);
    if (this._keys.has('KeyD')) this._wishDir.add(this._right);
    if (this._keys.has('KeyA')) this._wishDir.sub(this._right);

    const hasInput = this._wishDir.lengthSq() > 0.0001;
    const isSprinting =
      hasInput && (this._keys.has('ShiftLeft') || this._keys.has('ShiftRight'));
    const targetSpeed = isSprinting ? SPRINT_SPEED : WALK_SPEED;

    if (hasInput) {
      this._wishDir.normalize();
      const targetVx = this._wishDir.x * targetSpeed;
      const targetVz = this._wishDir.z * targetSpeed;
      const blend = 1 - Math.exp(-ACCELERATION * clampedDt);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, blend);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, blend);
    } else {
      const damping = Math.exp(-DECELERATION * clampedDt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
      if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.005) this.velocity.z = 0;
    }

    // Apply axis-separated AABB sliding collision
    const dx = this.velocity.x * clampedDt;
    const dz = this.velocity.z * clampedDt;
    const prevX = this.position.x;
    const prevZ = this.position.z;

    if (dx !== 0) {
      this.position.x += dx;
      if (this._resolveAxis('x')) {
        this.velocity.x = 0;
      }
    }
    if (dz !== 0) {
      this.position.z += dz;
      if (this._resolveAxis('z')) {
        this.velocity.z = 0;
      }
    }

    // Clamp inside outer penthouse safety bounds
    this.position.x = THREE.MathUtils.clamp(this.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
    this.position.y = this.eyeHeight;

    // Track room changes
    this._updateRoomTracking(false);

    // Actual horizontal speed after collision sliding (prevents bobbing when walking into a wall)
    const actualDist = Math.hypot(this.position.x - prevX, this.position.z - prevZ);
    const actualSpeed = clampedDt > 0 ? actualDist / clampedDt : 0;

    this._updateHeadBob(clampedDt, actualSpeed, isSprinting);
    this._syncCamera();
  }

  /**
   * Resolve AABB collisions along a single horizontal axis ('x' or 'z').
   * @param {'x' | 'z'} axis
   * @returns {boolean} true if a collision occurred
   */
  _resolveAxis(axis) {
    let collided = false;
    const r = this.radius;
    const doorsState = this.gameState.data?.doors;

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (!c || c.active === false) continue;
      if (c.doorId && doorsState?.[c.doorId]?.open) continue;
      // Ignore overhead beams or tiny floor trims
      if (c.maxY <= 0.15 || c.minY >= this.eyeHeight + 0.2) continue;

      const minX = c.minX - r;
      const maxX = c.maxX + r;
      const minZ = c.minZ - r;
      const maxZ = c.maxZ + r;

      if (
        this.position.x > minX &&
        this.position.x < maxX &&
        this.position.z > minZ &&
        this.position.z < maxZ
      ) {
        collided = true;
        if (axis === 'x') {
          const pushLeft = this.position.x - minX;
          const pushRight = maxX - this.position.x;
          this.position.x = pushLeft < pushRight ? minX : maxX;
        } else {
          const pushNorth = this.position.z - minZ;
          const pushSouth = maxZ - this.position.z;
          this.position.z = pushNorth < pushSouth ? minZ : maxZ;
        }
      }
    }

    return collided;
  }

  _updateHeadBob(dt, speed, isSprinting) {
    if (speed > 0.35) {
      const freq = isSprinting ? BOB_FREQ_SPRINT : BOB_FREQ_WALK;
      const ampY = isSprinting ? BOB_AMP_Y_SPRINT : BOB_AMP_Y_WALK;
      const ampX = isSprinting ? BOB_AMP_X_SPRINT : BOB_AMP_X_WALK;

      const speedFactor = THREE.MathUtils.clamp(speed / WALK_SPEED, 0.3, 1.5);
      this._bobPhase += dt * freq * Math.min(speedFactor, 1.25);

      const targetY = Math.sin(this._bobPhase) * ampY;
      const targetX = Math.cos(this._bobPhase * 0.5) * ampX;
      const smooth = 1 - Math.exp(-16 * dt);
      this._bobOffsetY = THREE.MathUtils.lerp(this._bobOffsetY, targetY, smooth);
      this._bobOffsetX = THREE.MathUtils.lerp(this._bobOffsetX, targetX, smooth);

      // Emit footstep at each downward trough of the bob wave (every 2*PI shifted by 3*PI/2)
      const stepIndex = Math.floor((this._bobPhase + Math.PI * 0.5) / (Math.PI * 2));
      if (stepIndex > this._lastStepHalfCycle) {
        this._lastStepHalfCycle = stepIndex;
        const room = this.layout?.getRoomAt?.(this.position.x, this.position.z);
        this.bus.emit('player:footstep', {
          surface: room?.surface || 'wood',
          sprint: isSprinting,
        });
      }
    } else {
      const settle = Math.exp(-10 * dt);
      this._bobOffsetY *= settle;
      this._bobOffsetX *= settle;
      if (Math.abs(this._bobOffsetY) < 0.0005) this._bobOffsetY = 0;
      if (Math.abs(this._bobOffsetX) < 0.0005) this._bobOffsetX = 0;
    }
  }

  _updateRoomTracking(forceEmit) {
    if (!this.layout?.getRoomAt) return;
    const room = this.layout.getRoomAt(this.position.x, this.position.z);
    if (!room) return;
    if (forceEmit || room.id !== this._currentRoomId) {
      this._currentRoomId = room.id;
      if (this.gameState.data) {
        this.gameState.data.currentRoom = room.id;
      }
      this.bus.emit('player:roomChanged', {
        roomId: room.id,
        roomName: room.name,
        surface: room.surface,
      });
    }
  }

  _syncCamera() {
    // Apply lateral head-bob along camera right vector
    const rightX = Math.cos(this.yaw) * this._bobOffsetX;
    const rightZ = -Math.sin(this.yaw) * this._bobOffsetX;

    this.camera.position.set(
      this.position.x + rightX,
      this.position.y + this._bobOffsetY,
      this.position.z + rightZ
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  /**
   * Remove all DOM & EventBus listeners.
   */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockError);
    window.removeEventListener('blur', this._onWindowBlur);
    if (this.domElement) {
      this.domElement.removeEventListener('click', this._onCanvasClick);
    }
    for (const unsub of this._unsubs) {
      unsub();
    }
    this._unsubs.length = 0;
  }
}

export default PlayerController;
