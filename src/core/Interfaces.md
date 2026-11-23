# ESCAPE LUCIA'S SAFEHOUSE — Module Interfaces & Event Contract

All modules communicate via the shared `EventBus` (`src/core/EventBus.js`) and read/mutate state through `GameState` (`src/core/GameState.js`). All 3D coordinates come from `src/core/RoomLayout.js`.

---

## 1. Interactable Descriptor (`mesh.userData.interactable`)

Every interactive 3D object registered in `world.interactables` MUST attach `userData.interactable` on the raycast target mesh (or group children) with:

```js
{
  id: 'living_tv',           // Unique string ID (see canonical IDs below)
  mesh: THREE.Object3D,      // Highlighted root mesh/group
  label: '4K Smart TV',      // Display name in HUD prompt
  actionLabel: 'Use',        // Verb shown in "[E] Use 4K Smart TV"
  type: 'puzzle',            // 'puzzle' | 'pickup' | 'door' | 'drawer' | 'clue' | 'inspect' | 'chaos' | 'exit'
  room: 'living_room',       // Room ID from RoomLayout.ROOMS
  itemData: null,            // Optional { id, name, icon, description } for type === 'pickup'
  clueId: null,              // Optional clue ID for type === 'clue'
  doorId: null,              // Optional door ID for type === 'door' | 'exit'
  drawerId: null,            // Optional drawer ID for type === 'drawer'
  damageValue: 0,            // Optional $ value for chaos props (smashable with [F])
  canSmash: false,           // If true, player can press [F] to kick/smash it
  onInteract: null,          // Optional callback(context)
}
```

### Canonical Interactable IDs
- **Puzzles**: `living_tv`, `kitchen_oven`, `cctv_terminal`, `radio_transceiver`, `wall_safe`
- **Pickups**: `tv_remote`, `crowbar`
- **Clues / Story**: `voicemail_dock`, `recipe_card`, `fridge_note`, `bathroom_mirror`, `heist_board`, `nightstand_note`, `oven_manual`
- **Doors**: `door_balcony`, `door_bedroom`, `door_bathroom`, `door_security`, `door_main_entrance`
- **Drawers**: `kitchen_drawer`, `nightstand_drawer`
- **Exits**: `door_main_entrance` (Clean Getaway or Total Chaos with `master_exit_key`), `balcony_escape_ledge` (Total Chaos escape when `safehouseDamage >= 35000` or with `crowbar`)
- **Inspect / Chaos Props**: `coffee_mug`, `headphones`, `gaming_console`, `crystal_lamp`, `vase_living`, `champagne_bottles`, `cash_stack`, `bedroom_lamp`, `cctv_monitor_spare`, etc.

### Canonical Inventory Item IDs
- `tv_remote` — Lucia's Universal TV Remote (found on living room coffee table)
- `security_keycard` — Security Room Keycard (earned from Turkey Oven puzzle)
- `crowbar` — Heavy Neon-Pink Crowbar (found on Balcony)
- `master_exit_key` — Master Penthouse Exit Key (earned from Safe puzzle)

### Canonical Puzzle IDs & Safe Code
- `tv` -> Safe Digit #1: **`7`** (Channel sequence: `Ch 4 -> Ch 2 -> Ch 6`)
- `turkey` -> Safe Digit #2: **`4`** + `security_keycard` (Settings: `375°F`, `45 min`; Chaos burn: `550°F`, `90 min`)
- `security` -> Safe Digit #3: **`9`** (Corrupted feed: `Balcony Cam`, anomaly timestamp `02:14 -> 02:19`)
- `radio` -> Safe Digit #4: **`2`** (Target frequency: `104.7 MHz`)
- `safe` -> Code **`7492`** -> Grants `master_exit_key`

### Canonical Ending IDs
- `CLEAN_GETAWAY`
- `TOTAL_CHAOS`
- `INTERNET_VICTIM`

---

## 2. EventBus Events

### Lifecycle & UI
- `game:new` — Start fresh game
- `game:continue` — Load saved game
- `game:pause` — Pause gameplay & unlock pointer
- `game:resume` — Resume gameplay & lock pointer
- `game:restart` — Reset & start fresh game
- `game:menu` — Return to Main Menu
- `game:ending` — `{ endingId: 'CLEAN_GETAWAY' | 'TOTAL_CHAOS' | 'INTERNET_VICTIM', reason?: string }`
- `modal:open` — `{ modalId, data }` (automatically unlocks pointer, sets phase `'modal'`)
- `modal:close` — `{ modalId? }` (returns phase to `'playing'` and offers pointer re-lock)
- `ui:toast` — `{ text, type?: 'info' | 'success' | 'warning' | 'danger' | 'clue', duration?: number }`
- `ui:subtitle` — `{ speaker, text, duration?: number }`
- `ui:hint` — Request next progressive hint
- `ui:inventory:toggle` — Toggle Inventory modal (`TAB`)

### Gameplay & Interaction
- `interaction:hover` — `{ interactable | null }`
- `interaction:trigger` — `{ interactable, action: 'use' | 'smash' }`
- `player:roomChanged` — `{ roomId, roomName, surface }`
- `player:footstep` — `{ surface: 'marble' | 'wood' | 'carpet' | 'balcony', sprint: boolean }`
- `door:toggle` — `{ doorId }`
- `door:state` — `{ doorId, open, locked }`
- `drawer:toggle` — `{ drawerId }`
- `drawer:state` — `{ drawerId, open }`
- `chaos:damage` — `{ amount, total, objectsBroken, reason }`

### Puzzles & World FX
- `puzzle:open` — `{ puzzleId }`
- `puzzle:solved` — `{ puzzleId, state }`
- `puzzle:failed` — `{ puzzleId, reason? }`
- `world:lightning` — Triggered by `CityExterior` on lightning flash
- `world:turkeySmoke` — `{ level: 0..1 }`
- `world:safeOpened` — Opens 3D safe door
- `world:mainDoorUnlocked` — Updates 3D main entrance lock LED to green
- `world:tvUpdate` — `{ channel, title, ticker, solved }`
- `world:cctvUpdate` — `{ activeCam, anomalyFlagged }`

### Audio SFX
- `sfx:play` — `{ name, volume?, pitch? }`
  Supported names: `ui_click`, `interact`, `pickup`, `door_open`, `door_locked`, `drawer_slide`, `tv_channel`, `tv_static`, `oven_click`, `oven_ding`, `oven_alarm`, `radio_lock`, `safe_beep`, `safe_error`, `safe_unlock`, `voicemail_beep`, `crash`, `hint`, `ending_clean`, `ending_chaos`, `ending_internet`
- `audio:radioStatic` — `{ active: boolean, clarity: 0..1 }` (1 = crystal clear, 0 = pure static)

---

## 3. Module Entrypoints Expected by `src/main.js`

1. `src/world/WorldBuilder.js`:
   `export function buildWorld(scene, renderer, camera, layout, eventBus)`
   Returns `{ interactables, colliders, doors, drawers, chaosProps, composer, update(dt, elapsed), setQuality(q), updateTVCanvas(fn), updateCCTVCanvas(fn), triggerLightning(), setTurkeySmoke(level), openSafeDoor(), unlockMainDoor(), resetWorld() }`

2. `src/gameplay/PlayerController.js`:
   `export class PlayerController` — `new PlayerController(camera, domElement, eventBus, gameState, layout, colliders)`
   Methods: `update(dt)`, `lock()`, `unlock()`, `isLocked()`, `setPosition(x, y, z, yaw, pitch)`, `getTransform()`, `setCinematicMode(active, fn)`, `reset()`

3. `src/gameplay/InteractionSystem.js`:
   `export class InteractionSystem` — `new InteractionSystem(camera, scene, eventBus, gameState, world)`
   Methods: `update(dt)`, `interact()`, `smash()`, `reset()`

4. `src/puzzles/PuzzleManager.js`:
   `export class PuzzleManager` — `new PuzzleManager(eventBus, gameState, world)`
   Methods: `openPuzzle(puzzleId)`, `getPuzzle(puzzleId)`, `getHint()`, `reset()`

5. `src/ui/UIManager.js`:
   `export class UIManager` — `new UIManager(rootEl, eventBus, gameState, puzzleManager)`
   Methods: `init()`, `update(dt)`, `showMainMenu()`, `showHUD()`, `openPuzzleModal(puzzleId)`, `showEnding(endingId)`, `destroy()`

6. `src/audio/AudioManager.js`:
   `export class AudioManager` — `new AudioManager(eventBus, gameState)`
   Methods: `resume()`, `playSfx(name, opts)`, `setRoomAtmosphere(roomId)`, `update(dt)`

7. `src/audio/VisualPolish.js`:
   `export class VisualPolish` — `new VisualPolish(containerEl, renderer, world, eventBus, gameState)`
   Methods: `update(dt, elapsed)`, `applyQuality(quality)`, `triggerGlitch(duration)`, `triggerLightningFlash()`
