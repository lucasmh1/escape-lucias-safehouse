import { TVDebatePuzzle } from './TVDebatePuzzle.js';
import { TurkeyOvenPuzzle } from './TurkeyOvenPuzzle.js';
import { SecurityFootagePuzzle } from './SecurityFootagePuzzle.js';
import { RadioFrequencyPuzzle } from './RadioFrequencyPuzzle.js';
import { SafePuzzle } from './SafePuzzle.js';

export const PUZZLE_ORDER = Object.freeze(['tv', 'turkey', 'security', 'radio', 'safe']);

/**
 * Coordinates all 5 interconnected puzzles, progressive 3-tier hints,
 * world feedback hooks, and modal open/close lifecycles.
 */
export class PuzzleManager {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {object} [world]
   */
  constructor(eventBus, gameState, world = null) {
    this.bus = eventBus;
    this.gameState = gameState;
    this.world = world;

    this.puzzles = {
      tv: new TVDebatePuzzle(eventBus, gameState),
      turkey: new TurkeyOvenPuzzle(eventBus, gameState),
      security: new SecurityFootagePuzzle(eventBus, gameState),
      radio: new RadioFrequencyPuzzle(eventBus, gameState),
      safe: new SafePuzzle(eventBus, gameState),
    };

    /** @type {string | null} */
    this.activePuzzleId = null;
    /** @type {Record<string, number>} */
    this._hintTiers = { tv: 0, turkey: 0, security: 0, radio: 0, safe: 0 };

    this._bindEvents();
  }

  _bindEvents() {
    this._unsubs = [
      this.bus.on('puzzle:open', (payload) => {
        const puzzleId = typeof payload === 'string' ? payload : payload?.puzzleId;
        if (puzzleId) this.openPuzzle(puzzleId);
      }),
      this.bus.on('modal:close', () => {
        if (this.activePuzzleId) {
          const active = this.puzzles[this.activePuzzleId];
          if (active && typeof active.onClose === 'function') {
            active.onClose();
          }
          this.activePuzzleId = null;
        }
      }),
      this.bus.on('ui:hint', () => {
        const hint = this.getHint();
        if (hint) {
          this.bus.emit('ui:toast', {
            text: `HINT (${hint.tierLabel}): ${hint.text}`,
            type: 'clue',
            duration: 6500,
          });
        }
      }),
      this.bus.on('state:reset', () => {
        this.reset();
      }),
    ];
  }

  /**
   * Returns a puzzle controller instance by ID ('tv' | 'turkey' | 'security' | 'radio' | 'safe').
   */
  getPuzzle(puzzleId) {
    return this.puzzles[puzzleId] || null;
  }

  /**
   * Opens a puzzle modal if prerequisites are met.
   * @param {string} puzzleId
   * @returns {boolean}
   */
  openPuzzle(puzzleId) {
    const puzzle = this.puzzles[puzzleId];
    if (!puzzle) {
      console.warn(`[PuzzleManager] Unknown puzzleId: "${puzzleId}"`);
      return false;
    }

    if (typeof puzzle.canOpen === 'function') {
      const check = puzzle.canOpen();
      if (!check.allowed) {
        this.bus.emit('sfx:play', { name: puzzleId === 'tv' ? 'tv_static' : 'door_locked' });
        this.bus.emit('ui:toast', {
          text: check.message || 'You are missing something needed for this puzzle.',
          type: 'warning',
          duration: 4500,
        });
        return false;
      }
    }

    // Cleanly close any previously active puzzle first
    if (this.activePuzzleId && this.activePuzzleId !== puzzleId) {
      const prev = this.puzzles[this.activePuzzleId];
      if (prev && typeof prev.onClose === 'function') prev.onClose();
    }

    this.activePuzzleId = puzzleId;
    if (typeof puzzle.onOpen === 'function') {
      puzzle.onOpen();
    }

    this.bus.emit('modal:open', {
      modalId: `puzzle_${puzzleId}`,
      puzzleId,
      data: puzzle.getState(),
    });
    return true;
  }

  /**
   * Provides a 3-tier progressive hint for the current active or next unsolved puzzle.
   */
  getHint() {
    this.gameState.incrementHintsUsed();
    this.bus.emit('sfx:play', { name: 'hint' });

    // Prioritize the currently open unsolved puzzle, otherwise the next unsolved puzzle in chain order
    let targetId = null;
    if (this.activePuzzleId && !this.gameState.isPuzzleSolved(this.activePuzzleId)) {
      targetId = this.activePuzzleId;
    } else {
      targetId = PUZZLE_ORDER.find((id) => !this.gameState.isPuzzleSolved(id)) || null;
    }

    if (!targetId) {
      const damage = this.gameState.data.stats.safehouseDamage;
      const text = damage >= 30000
        ? 'You have the Master Exit Key! Use it on the Main Entrance door (or escape off the Balcony) for the Total Chaos ending!'
        : 'You have the Master Exit Key! Head to the Locked Main Entrance door on the east side to make your Clean Getaway!';
      return {
        puzzleId: 'exit',
        tier: 1,
        tierLabel: 'FINAL STEP',
        text,
        totalHints: this.gameState.data.stats.hintsUsed,
      };
    }

    const tier = this._hintTiers[targetId] || 0;
    const puzzle = this.puzzles[targetId];
    const text = puzzle.getHint(tier);
    this._hintTiers[targetId] = Math.min(2, tier + 1);

    return {
      puzzleId: targetId,
      tier: tier + 1,
      tierLabel: `TIER ${tier + 1}/3`,
      text,
      totalHints: this.gameState.data.stats.hintsUsed,
    };
  }

  /**
   * Returns a snapshot of overall puzzle progress and discovered safe digits.
   */
  getProgress() {
    const p = this.gameState.data.puzzles;
    return {
      solvedCount: this.gameState.getSolvedCount(),
      total: PUZZLE_ORDER.length,
      order: PUZZLE_ORDER,
      puzzles: {
        tv: p.tv.solved,
        turkey: p.turkey.solved,
        security: p.security.solved,
        radio: p.radio.solved,
        safe: p.safe.solved,
      },
      digits: [p.tv.digit, p.turkey.digit, p.security.digit, p.radio.digit],
    };
  }

  reset() {
    this.activePuzzleId = null;
    this._hintTiers = { tv: 0, turkey: 0, security: 0, radio: 0, safe: 0 };
    for (const puzzle of Object.values(this.puzzles)) {
      if (typeof puzzle.reset === 'function') puzzle.reset();
    }
  }

  destroy() {
    if (this._unsubs) {
      for (const unsub of this._unsubs) unsub();
      this._unsubs = [];
    }
    this.reset();
  }
}

export default PuzzleManager;
