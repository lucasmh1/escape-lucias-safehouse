import * as THREE from 'three';
import { EventBus } from './core/EventBus.js';
import { GameState } from './core/GameState.js';
import * as RoomLayout from './core/RoomLayout.js';
import { buildWorld } from './world/WorldBuilder.js';
import { PlayerController } from './gameplay/PlayerController.js';
import { InteractionSystem } from './gameplay/InteractionSystem.js';
import { PuzzleManager } from './puzzles/PuzzleManager.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { VisualPolish } from './audio/VisualPolish.js';

function initGame() {
  const gameContainer = document.getElementById('game-container');
  const fxContainer = document.getElementById('fx-overlay-container');
  const uiRoot = document.getElementById('ui-root');

  if (!gameContainer || !uiRoot) {
    console.error('[main] Missing #game-container or #ui-root in index.html');
    return;
  }

  // 1. Core Bus & State
  const bus = new EventBus();
  const gameState = new GameState(bus);

  // 2. Three.js Scene, Camera & Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090514);

  const camera = new THREE.PerspectiveCamera(
    68,
    window.innerWidth / window.innerHeight,
    0.1,
    240
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  gameContainer.appendChild(renderer.domElement);

  // 3. Build 3D World
  const world = buildWorld(scene, renderer, camera, RoomLayout, bus);

  // 4. Gameplay Systems
  const player = new PlayerController(
    camera,
    renderer.domElement,
    bus,
    gameState,
    RoomLayout,
    world.colliders
  );
  const interaction = new InteractionSystem(camera, scene, bus, gameState, world);

  // 5. Puzzles
  const puzzleManager = new PuzzleManager(bus, gameState, world);

  // 6. Audio & Visual Polish
  const audio = new AudioManager(bus, gameState);
  const visualPolish = new VisualPolish(fxContainer, renderer, world, bus, gameState);
  visualPolish.applyQuality(gameState.data.settings.quality);

  // 7. UI & Story Manager
  const uiManager = new UIManager(uiRoot, bus, gameState, puzzleManager);
  uiManager.init();

  // --- Camera Cinematics ---
  function enableMenuOrbit() {
    player.setCinematicMode(true, (cam, _dt, elapsed) => {
      const t = elapsed * 0.14;
      const cx = -3.4 + Math.cos(t) * 3.1;
      const cz = -1.6 + Math.sin(t) * 2.4;
      const cy = 2.05 + Math.sin(t * 1.4) * 0.18;
      cam.position.set(cx, cy, cz);
      cam.lookAt(-5.4, 1.15, -4.4);
    });
  }

  function enableEndingOrbit(endingId) {
    player.setCinematicMode(true, (cam, _dt, elapsed) => {
      const t = elapsed * 0.25;
      if (endingId === 'TOTAL_CHAOS') {
        cam.position.set(-4.0 + Math.sin(t) * 2.2, 2.2, -9.2);
        cam.lookAt(-4.0, 1.3, -18.0);
      } else if (endingId === 'INTERNET_VICTIM') {
        cam.position.set(-3.2 + Math.sin(t * 1.5) * 0.6, 1.45, 0.2);
        cam.lookAt(-3.2, 1.38, 2.22);
      } else {
        cam.position.set(11.4, 1.85, -1.0 + Math.sin(t) * 0.8);
        cam.lookAt(13.5, 1.35, -1.0);
      }
    });
  }

  // Sync loaded save state into 3D world (doors, drawers, picked-up items, safe, smoke)
  function syncWorldFromState() {
    const d = gameState.data;

    // Hide already-collected pickup meshes
    for (const item of world.interactables) {
      if (item.type === 'pickup' && item.itemData?.id && gameState.hasItem(item.itemData.id)) {
        if (item.mesh) item.mesh.visible = false;
      }
    }

    // Sync doors
    if (d.doors) {
      for (const [doorId, st] of Object.entries(d.doors)) {
        const doorObj = world.doors?.[doorId];
        if (doorObj && typeof doorObj.setOpen === 'function') {
          doorObj.setOpen(Boolean(st.open));
        }
        if (doorId === 'door_main_entrance' && !st.locked) {
          world.unlockMainDoor?.();
        }
      }
    }

    // Sync drawers
    if (d.drawers) {
      for (const [drawerId, isOpen] of Object.entries(d.drawers)) {
        const drawerObj = world.drawers?.[drawerId];
        if (drawerObj && typeof drawerObj.setOpen === 'function') {
          drawerObj.setOpen(Boolean(isOpen));
        }
      }
    }

    // Sync safe & smoke
    if (d.flags?.safeOpened || d.puzzles?.safe?.solved) {
      world.openSafeDoor?.();
    }
    if (d.flags?.ovenExploded) {
      world.setTurkeySmoke?.(1.0);
    } else if (d.puzzles?.turkey?.solved) {
      world.setTurkeySmoke?.(0.15);
    }

    // Restore player position if saved
    if (d.playerTransform) {
      const { x, y, z, yaw, pitch } = d.playerTransform;
      player.setPosition(x, y, z, yaw, pitch);
    } else {
      player.reset();
    }
  }

  function startNewGame() {
    audio.resume();
    gameState.reset();
    world.resetWorld?.();
    interaction.reset();
    puzzleManager.reset();
    player.setCinematicMode(false);
    player.reset();
    gameState.setPhase('playing');
    uiManager.showHUD();
    player.lock();

    bus.emit('ui:subtitle', {
      speaker: 'LUCIA (NOTE)',
      text: "Jason—don't panic. Check the voicemail dock in the bedroom, find my remote on the coffee table, and whatever you do, DON'T burn the turkey.",
      duration: 7000,
    });
  }

  function continueGame() {
    audio.resume();
    if (!gameState.load()) {
      startNewGame();
      return;
    }
    world.resetWorld?.();
    interaction.reset();
    player.setCinematicMode(false);
    syncWorldFromState();
    gameState.setPhase('playing');
    uiManager.showHUD();
    player.lock();
    bus.emit('ui:toast', { text: 'Loaded saved escape progress.', type: 'info' });
  }

  // --- Lifecycle Event Wiring ---
  bus.on('game:new', () => startNewGame());
  bus.on('game:restart', () => startNewGame());
  bus.on('game:continue', () => continueGame());

  bus.on('game:pause', () => {
    if (gameState.phase === 'playing') {
      gameState.setPhase('paused');
      player.unlock();
      gameState.save(player.getTransform());
    }
  });

  bus.on('game:resume', () => {
    audio.resume();
    if (gameState.phase === 'paused' || gameState.phase === 'modal') {
      gameState.setPhase('playing');
      player.lock();
    }
  });

  bus.on('game:save', () => {
    const ok = gameState.save(player.getTransform());
    bus.emit('ui:toast', {
      text: ok ? 'Progress saved.' : 'Could not save progress.',
      type: ok ? 'success' : 'warning',
    });
  });

  bus.on('game:menu', () => {
    if (gameState.phase === 'playing' || gameState.phase === 'paused') {
      gameState.save(player.getTransform());
    }
    gameState.setPhase('menu');
    player.unlock();
    enableMenuOrbit();
    uiManager.showMainMenu();
  });

  bus.on('modal:open', () => {
    if (gameState.phase === 'playing') {
      gameState.setPhase('modal');
      player.unlock();
    }
  });

  bus.on('modal:close', () => {
    if (gameState.phase === 'modal') {
      gameState.setPhase('playing');
    }
  });

  bus.on('game:ending', ({ endingId } = {}) => {
    const id = endingId || 'CLEAN_GETAWAY';
    gameState.setFlag('endingTriggered', id);
    gameState.setPhase('ending');
    player.unlock();
    enableEndingOrbit(id);
    if (id === 'TOTAL_CHAOS') {
      bus.emit('sfx:play', { name: 'ending_chaos' });
    } else if (id === 'INTERNET_VICTIM') {
      bus.emit('sfx:play', { name: 'ending_internet' });
    } else {
      bus.emit('sfx:play', { name: 'ending_clean' });
    }
  });

  // Start in Main Menu with live penthouse orbit
  gameState.setPhase('menu');
  enableMenuOrbit();

  // Resize Handling
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (world.composer && typeof world.composer.setSize === 'function') {
      world.composer.setSize(w, h);
    }
  }
  window.addEventListener('resize', onResize);

  // Expose safe inspection handle for QA / debugging
  window.__LUCIA_GAME__ = {
    bus,
    gameState,
    world,
    player,
    interaction,
    puzzleManager,
    uiManager,
    audio,
    visualPolish,
    RoomLayout,
  };

  // --- Main Animation Loop ---
  let lastTime = performance.now();
  let elapsed = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;

    gameState.tick(dt);
    player.update(dt, elapsed);

    if (gameState.phase === 'playing' || gameState.phase === 'modal') {
      interaction.update(dt);
    }

    world.update(dt, elapsed);
    audio.update(dt);
    visualPolish.update(dt, elapsed);
    uiManager.update(dt);

    const useComposer =
      world.composer &&
      gameState.data.settings.quality !== 'low';
    if (useComposer) {
      world.composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
