/**
 * Puzzle 5: The Wall Safe (`safe`)
 * - Combines the 4 digits in order from Puzzles 1–4: `7-4-9-2`.
 * - Solving opens the 3D wall safe (`world:safeOpened`), sets `flags.safeOpened = true`,
 *   and grants `master_exit_key` (used on `door_main_entrance` for CLEAN GETAWAY or TOTAL CHAOS).
 */

export const SAFE_CODE = '7492';

export const MASTER_EXIT_KEY_ITEM = Object.freeze({
  id: 'master_exit_key',
  name: 'Master Exit Key',
  icon: '🗝️',
  description: 'Lucia\'s reinforced penthouse master key from the wall safe, wrapped in a fresh stack of Vice City heist cash.',
  category: 'key',
});

export const SAFE_HINTS = [
  'The Security Room wall safe requires a 4-digit passcode formed by Puzzles 1–4 in order: TV → Turkey → CCTV → Radio.',
  'Open your Inventory & Clue Log (TAB) to review the safe digits you have uncovered so far.',
  'Enter 7-4-9-2 on the wall safe keypad to unlock the Master Exit Key.',
];

export class SafePuzzle {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.id = 'safe';
    this.bus = eventBus;
    this.gameState = gameState;
    this.targetCode = SAFE_CODE;
    this._lastFeedback = 'Enter the 4-digit passcode (TV → Turkey → CCTV → Radio).';
    this._status = 'idle'; // 'idle' | 'error' | 'solved'
  }

  get _slice() {
    return this.gameState.data.puzzles.safe;
  }

  getDiscoveredDigits() {
    const p = this.gameState.data.puzzles;
    return [
      { puzzleId: 'tv', label: '1. TV', digit: p.tv.digit },
      { puzzleId: 'turkey', label: '2. Turkey', digit: p.turkey.digit },
      { puzzleId: 'security', label: '3. CCTV', digit: p.security.digit },
      { puzzleId: 'radio', label: '4. Radio', digit: p.radio.digit },
    ];
  }

  getState() {
    return {
      id: this.id,
      solved: this._slice.solved,
      codeEntered: this._slice.solved ? SAFE_CODE : this._slice.codeEntered || '',
      maxLength: SAFE_CODE.length,
      attempts: this._slice.attempts,
      discoveredDigits: this.getDiscoveredDigits(),
      status: this._slice.solved ? 'solved' : this._status,
      feedback: this._slice.solved
        ? 'SAFE OPENED! Obtained Master Exit Key + Heist Cash. Head to the Main Entrance door to escape!'
        : this._lastFeedback,
    };
  }

  pressDigit(digit) {
    if (this._slice.solved) return this.getState();
    const d = String(digit).replace(/[^0-9]/g, '').slice(0, 1);
    if (!d) return this.getState();

    const current = this._slice.codeEntered || '';
    if (current.length >= SAFE_CODE.length) return this.getState();

    this._slice.codeEntered = current + d;
    this._status = 'idle';
    this.bus.emit('sfx:play', { name: 'safe_beep' });
    return this.getState();
  }

  backspace() {
    if (this._slice.solved) return this.getState();
    const current = this._slice.codeEntered || '';
    this._slice.codeEntered = current.slice(0, -1);
    this._status = 'idle';
    this.bus.emit('sfx:play', { name: 'ui_click' });
    return this.getState();
  }

  clear() {
    if (this._slice.solved) return this.getState();
    this._slice.codeEntered = '';
    this._status = 'idle';
    this.bus.emit('sfx:play', { name: 'ui_click' });
    return this.getState();
  }

  /**
   * Submits the entered (or override) 4-digit code.
   */
  submit(codeOverride = null) {
    if (this._slice.solved) {
      return { solved: true, alreadySolved: true, code: SAFE_CODE, state: this.getState() };
    }

    const code = codeOverride !== null ? String(codeOverride).trim() : (this._slice.codeEntered || '');

    if (code === SAFE_CODE) {
      this._status = 'solved';
      this.gameState.markPuzzleSolved('safe', { codeEntered: SAFE_CODE });
      this.gameState.setFlag('safeOpened', true);
      this.gameState.addItem({ ...MASTER_EXIT_KEY_ITEM });
      this.gameState.addClue({
        id: 'clue_safe_opened',
        title: 'Wall Safe Unlocked (7492)',
        text: 'Grabbed the Master Exit Key and Lucia\'s heist cash! Use the Master Exit Key on the Locked Main Entrance door to escape.',
        room: 'security_room',
        puzzleId: 'safe',
      });
      this.bus.emit('world:safeOpened', { code: SAFE_CODE });
      this.bus.emit('sfx:play', { name: 'safe_unlock' });
      this.bus.emit('ui:toast', {
        text: 'SAFE UNLOCKED! Obtained Master Exit Key — head to the Main Entrance!',
        type: 'success',
        duration: 5500,
      });
      return {
        solved: true,
        code: SAFE_CODE,
        item: MASTER_EXIT_KEY_ITEM,
        state: this.getState(),
      };
    }

    this._status = 'error';
    this.gameState.incrementFailedAttempt('safe');
    this._slice.codeEntered = '';
    this._lastFeedback = code.length < 4
      ? 'ACCESS DENIED — Enter all 4 digits first.'
      : `ACCESS DENIED (${code}) — Invalid passcode. Check the order: TV → Turkey → CCTV → Radio.`;

    this.bus.emit('sfx:play', { name: 'safe_error' });
    this.bus.emit('puzzle:failed', { puzzleId: 'safe', reason: this._lastFeedback });
    return {
      solved: false,
      code,
      feedback: this._lastFeedback,
      state: this.getState(),
    };
  }

  getHint(tier = 0) {
    return SAFE_HINTS[Math.min(Math.max(0, tier), SAFE_HINTS.length - 1)];
  }

  reset() {
    this._status = 'idle';
    this._lastFeedback = 'Enter the 4-digit passcode (TV → Turkey → CCTV → Radio).';
  }
}

export default SafePuzzle;
