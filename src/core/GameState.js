const SAVE_KEY = 'escape_lucias_safehouse_save_v1';
const SETTINGS_KEY = 'escape_lucias_safehouse_settings_v1';
const LEADERBOARD_KEY = 'escape_lucias_safehouse_leaderboard_v1';

export const DEFAULT_SETTINGS = Object.freeze({
  masterVol: 0.75,
  ambientVol: 0.65,
  sfxVol: 0.85,
  sensitivity: 1.0,
  quality: 'high', // 'low' | 'medium' | 'high'
});

function createFreshState(settings = DEFAULT_SETTINGS) {
  return {
    phase: 'menu', // 'menu' | 'playing' | 'paused' | 'modal' | 'ending' | 'results'
    elapsedTime: 0,
    currentRoom: 'living_room',
    inventory: [], // Array of { id, name, icon, description, category }
    clues: [], // Array of { id, title, text, room, puzzleId }
    puzzles: {
      tv: { solved: false, digit: null, channel: 1, sequence: [], attempts: 0 },
      turkey: { solved: false, digit: null, burned: false, temp: 350, time: 30, attempts: 0 },
      security: { solved: false, digit: null, selectedCam: 0, attempts: 0 },
      radio: { solved: false, digit: null, frequency: 92.5, attempts: 0 },
      safe: { solved: false, codeEntered: '', attempts: 0 },
    },
    stats: {
      failedAttempts: 0,
      internetArguments: 0,
      safehouseDamage: 0,
      objectsBroken: 0,
      hintsUsed: 0,
    },
    settings: { ...DEFAULT_SETTINGS, ...settings },
    doors: {
      door_balcony: { open: false, locked: false },
      door_bedroom: { open: false, locked: false },
      door_bathroom: { open: false, locked: false },
      door_security: { open: false, locked: true },
      door_main_entrance: { open: false, locked: true },
    },
    drawers: {}, // { [drawerId]: boolean (open) }
    flags: {
      voicemailHeard: false,
      ovenExploded: false,
      safeOpened: false,
      balconyChaosReady: false,
      endingTriggered: null, // 'CLEAN_GETAWAY' | 'TOTAL_CHAOS' | 'INTERNET_VICTIM' | null
    },
    playerTransform: null, // { x, y, z, yaw, pitch }
  };
}

export class GameState {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.bus = eventBus;
    const savedSettings = this._loadSettings();
    this.data = createFreshState(savedSettings);
  }

  get phase() {
    return this.data.phase;
  }

  setPhase(phase) {
    const prev = this.data.phase;
    if (prev === phase) return;
    this.data.phase = phase;
    this.bus.emit('state:phase', { phase, prev });
  }

  reset() {
    const currentSettings = { ...this.data.settings };
    this.data = createFreshState(currentSettings);
    this.bus.emit('state:reset', this.data);
  }

  tick(dt) {
    if (this.data.phase === 'playing' || this.data.phase === 'modal') {
      this.data.elapsedTime += dt;
    }
  }

  // --- Inventory ---
  hasItem(itemId) {
    return this.data.inventory.some((item) => item.id === itemId);
  }

  addItem(item) {
    if (!item || !item.id || this.hasItem(item.id)) return false;
    this.data.inventory.push({
      id: item.id,
      name: item.name || item.id,
      icon: item.icon || '🔑',
      description: item.description || '',
      category: item.category || 'item',
    });
    this.bus.emit('inventory:added', item);
    this.bus.emit('state:changed', { type: 'inventory', item });
    return true;
  }

  removeItem(itemId) {
    const idx = this.data.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;
    const [removed] = this.data.inventory.splice(idx, 1);
    this.bus.emit('inventory:removed', removed);
    return true;
  }

  // --- Clues ---
  hasClue(clueId) {
    return this.data.clues.some((c) => c.id === clueId);
  }

  addClue(clue) {
    if (!clue || !clue.id || this.hasClue(clue.id)) return false;
    this.data.clues.push({
      id: clue.id,
      title: clue.title || 'Clue',
      text: clue.text || '',
      room: clue.room || this.data.currentRoom,
      puzzleId: clue.puzzleId || null,
    });
    this.bus.emit('clue:added', clue);
    this.bus.emit('state:changed', { type: 'clue', clue });
    return true;
  }

  // --- Puzzles ---
  isPuzzleSolved(puzzleId) {
    return Boolean(this.data.puzzles[puzzleId]?.solved);
  }

  getSolvedCount() {
    return Object.values(this.data.puzzles).filter((p) => p.solved).length;
  }

  markPuzzleSolved(puzzleId, extra = {}) {
    const p = this.data.puzzles[puzzleId];
    if (!p || p.solved) return false;
    p.solved = true;
    Object.assign(p, extra);
    this.bus.emit('puzzle:solved', { puzzleId, state: { ...p } });
    this.bus.emit('state:changed', { type: 'puzzle', puzzleId });
    this.save();
    return true;
  }

  // --- Stats ---
  incrementFailedAttempt(puzzleId = null) {
    this.data.stats.failedAttempts += 1;
    if (puzzleId && this.data.puzzles[puzzleId]) {
      this.data.puzzles[puzzleId].attempts += 1;
    }
    this.bus.emit('state:stats', { ...this.data.stats });
  }

  incrementInternetArguments(amount = 1) {
    this.data.stats.internetArguments += amount;
    this.bus.emit('state:stats', { ...this.data.stats });
    return this.data.stats.internetArguments;
  }

  addSafehouseDamage(dollars, reason = 'Property damage', countAsBroken = false) {
    this.data.stats.safehouseDamage += Math.max(0, Math.round(dollars));
    if (countAsBroken) {
      this.data.stats.objectsBroken += 1;
    }
    if (this.data.stats.safehouseDamage >= 35000) {
      this.data.flags.balconyChaosReady = true;
    }
    this.bus.emit('chaos:damage', {
      amount: dollars,
      total: this.data.stats.safehouseDamage,
      objectsBroken: this.data.stats.objectsBroken,
      reason,
    });
    this.bus.emit('state:stats', { ...this.data.stats });
  }

  incrementHintsUsed() {
    this.data.stats.hintsUsed += 1;
    this.bus.emit('state:stats', { ...this.data.stats });
  }

  // --- Doors / Drawers / Flags ---
  setDoorState(doorId, patch) {
    if (!this.data.doors[doorId]) {
      this.data.doors[doorId] = { open: false, locked: false };
    }
    Object.assign(this.data.doors[doorId], patch);
    this.bus.emit('door:state', { doorId, ...this.data.doors[doorId] });
  }

  setDrawerState(drawerId, open) {
    this.data.drawers[drawerId] = Boolean(open);
    this.bus.emit('drawer:state', { drawerId, open: Boolean(open) });
  }

  setFlag(key, value) {
    this.data.flags[key] = value;
    this.bus.emit('state:flag', { key, value });
  }

  // --- Settings ---
  updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data.settings));
    } catch {
      // Ignore storage quota / private mode errors
    }
    this.bus.emit('settings:changed', { ...this.data.settings });
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS };
  }

  // --- Save / Load ---
  hasSave() {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  save(playerTransform = null) {
    if (playerTransform) {
      this.data.playerTransform = playerTransform;
    }
    try {
      const snapshot = {
        ...this.data,
        phase: 'playing',
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      this.bus.emit('game:saved', { savedAt: snapshot.savedAt });
      return true;
    } catch (err) {
      console.warn('[GameState] Failed to save:', err);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const fresh = createFreshState(this.data.settings);
      this.data = {
        ...fresh,
        ...parsed,
        puzzles: { ...fresh.puzzles, ...(parsed.puzzles || {}) },
        stats: { ...fresh.stats, ...(parsed.stats || {}) },
        doors: { ...fresh.doors, ...(parsed.doors || {}) },
        drawers: { ...(parsed.drawers || {}) },
        flags: { ...fresh.flags, ...(parsed.flags || {}) },
        settings: { ...this.data.settings, ...(parsed.settings || {}) },
      };
      this.bus.emit('state:loaded', this.data);
      return true;
    } catch (err) {
      console.warn('[GameState] Failed to load save:', err);
      return false;
    }
  }

  clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }

  // --- Leaderboard ---
  getLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recordLeaderboardEntry(endingId) {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ending: endingId,
      elapsedTime: Math.round(this.data.elapsedTime),
      puzzlesSolved: this.getSolvedCount(),
      failedAttempts: this.data.stats.failedAttempts,
      internetArguments: this.data.stats.internetArguments,
      safehouseDamage: this.data.stats.safehouseDamage,
      date: new Date().toISOString(),
    };
    const list = this.getLeaderboard();
    list.push(entry);
    list.sort((a, b) => a.elapsedTime - b.elapsedTime);
    const trimmed = list.slice(0, 12);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
    return entry;
  }
}

export default GameState;
