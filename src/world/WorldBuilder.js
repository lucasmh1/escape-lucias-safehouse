import { TextureFactory } from './TextureFactory.js';
import { buildCityExterior } from './CityExterior.js';
import { buildPenthouseArchitecture } from './PenthouseArchitecture.js';
import { buildFurnitureAndProps } from './FurnitureAndProps.js';
import { buildLightingAndFX } from './LightingAndFX.js';

/**
 * Main world entrypoint for ESCAPE LUCIA'S SAFEHOUSE.
 * Assembles the Miami neon skyline, 7-room penthouse architecture, hero furniture,
 * puzzle stations, chaos props, lighting, particles, and bloom composer.
 */
export function buildWorld(scene, renderer, camera, layout, eventBus) {
  const textures = new TextureFactory();
  const dynamicTV = textures.createDynamicTV();
  const dynamicCCTV = textures.createDynamicCCTV();

  const interactables = [];
  const colliders = [];

  const exterior = buildCityExterior(scene, textures, eventBus);
  const architecture = buildPenthouseArchitecture(scene, layout, textures, interactables, colliders);
  const props = buildFurnitureAndProps(
    scene,
    layout,
    textures,
    dynamicTV,
    dynamicCCTV,
    interactables,
    colliders
  );
  const lighting = buildLightingAndFX(scene, renderer, camera, layout);

  // Wire EventBus world FX listeners so puzzles/gameplay can drive 3D visuals directly
  if (eventBus) {
    eventBus.on('world:turkeySmoke', ({ level } = {}) => {
      lighting.setTurkeySmoke(level ?? 0);
    });
    eventBus.on('world:safeOpened', () => {
      props.openSafeDoor();
    });
    eventBus.on('world:mainDoorUnlocked', () => {
      architecture.unlockMainDoor();
    });
    eventBus.on('world:tvUpdate', (info = {}) => {
      dynamicTV.drawDefault(info);
    });
    eventBus.on('world:cctvUpdate', (info = {}) => {
      dynamicCCTV.drawDefault(info);
    });
  }

  function update(dt, elapsed) {
    exterior.update(dt, elapsed);
    architecture.update(dt);
    props.update(dt, elapsed);
    lighting.update(dt, elapsed);
  }

  function setQuality(q) {
    exterior.setQuality(q);
    lighting.setQuality(q);
  }

  function resetWorld() {
    Object.values(architecture.doors).forEach((d) => d.reset());
    props.resetProps();
    lighting.setTurkeySmoke(0);
    dynamicTV.drawDefault();
    dynamicCCTV.drawDefault();
  }

  return {
    interactables,
    colliders,
    doors: architecture.doors,
    drawers: props.drawers,
    chaosProps: props.chaosProps,
    composer: lighting.composer,
    update,
    setQuality,
    updateTVCanvas: (fn) => dynamicTV.update(fn),
    updateCCTVCanvas: (fn) => dynamicCCTV.update(fn),
    triggerLightning: () => exterior.triggerLightning(),
    setTurkeySmoke: (level) => lighting.setTurkeySmoke(level),
    openSafeDoor: () => props.openSafeDoor(),
    unlockMainDoor: () => architecture.unlockMainDoor(),
    resetWorld,
  };
}
