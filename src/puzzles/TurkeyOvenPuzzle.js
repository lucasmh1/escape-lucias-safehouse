/**
 * Puzzle 2: The Burnt Thanksgiving Turkey (`turkey`)
 * - Kitchen clues (recipe card, oven manual in kitchen drawer, fridge sticky note)
 *   specify exact settings: 375°F for 45 min.
 * - Clean solve: opens oven cleanly, reveals Safe Digit #2 (`4`) and grants `security_keycard`.
 * - Chaos burn: cranking to 550°F & 90 min triggers heavy smoke, alarms, and +$25,000 safehouseDamage,
 *   while still letting the player grab the scorched canister (Safe Digit #2 + `security_keycard`).
 */

export const OVEN_CONFIG = Object.freeze({
  minTemp: 250,
  maxTemp: 550,
  tempStep: 25,
  minTime: 15,
  maxTime: 90,
  timeStep: 5,
  targetTemp: 375,
  targetTime: 45,
  chaosTemp: 550,
  chaosTime: 90,
  chaosDamage: 25000,
  safeDigit: 4,
});

export const SECURITY_KEYCARD_ITEM = Object.freeze({
  id: 'security_keycard',
  name: 'Security Room Keycard',
  icon: '💳',
  description: 'Heat-resistant magnetic keycard hidden inside Lucia\'s decoy Thanksgiving turkey. Unlocks the Security Room door.',
  category: 'key',
});

export const TURKEY_HINTS = [
  'Search the kitchen for cooking instructions: Lucia\'s stained recipe card on the marble island, the fridge sticky note, and the oven manual inside the kitchen drawer.',
  'Lucia\'s recipe card calls for 375°F and the Black Friday oven manual specifies 45 minutes. (Or max both dials to 550°F / 90 min for a $25,000 Chaos shortcut!)',
  'Set the Kitchen Oven to 375°F and 45 min, then start the cycle to recover Safe Digit #2 (4) and the Security Room Keycard.',
];

export class TurkeyOvenPuzzle {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.id = 'turkey';
    this.bus = eventBus;
    this.gameState = gameState;
    this.config = OVEN_CONFIG;
    this._lastFeedback = 'Set temperature and timer to thaw Lucia\'s decoy Thanksgiving turkey.';
    this._status = 'idle'; // 'idle' | 'failed' | 'solved' | 'chaos_solved'
  }

  get _slice() {
    return this.gameState.data.puzzles.turkey;
  }

  getState() {
    const solved = this._slice.solved;
    const burned = this._slice.burned;
    return {
      id: this.id,
      solved,
      burned,
      digit: this._slice.digit,
      temp: this._slice.temp,
      time: this._slice.time,
      attempts: this._slice.attempts,
      config: this.config,
      status: solved ? (burned ? 'chaos_solved' : 'solved') : this._status,
      feedback: solved
        ? burned
          ? 'OVEN INCINERATED (+$25,000 damage)! Through the smoke you pried open the scorched canister: Safe Digit #2 is [ 4 ] + Security Room Keycard acquired!'
          : 'GOLDEN DECOY PERFECTION! The heat-resistant canister popped open: Safe Digit #2 is [ 4 ] + Security Room Keycard acquired!'
        : this._lastFeedback,
    };
  }

  setTemperature(temp) {
    const clamped = Math.min(this.config.maxTemp, Math.max(this.config.minTemp, Math.round(Number(temp))));
    this._slice.temp = clamped;
    this.bus.emit('sfx:play', { name: 'oven_click' });
    return this.getState();
  }

  setTime(minutes) {
    const clamped = Math.min(this.config.maxTime, Math.max(this.config.minTime, Math.round(Number(minutes))));
    this._slice.time = clamped;
    this.bus.emit('sfx:play', { name: 'oven_click' });
    return this.getState();
  }

  /**
   * Runs the oven with the current (or optionally provided) temp & time.
   */
  bake(tempOverride = null, timeOverride = null) {
    if (tempOverride !== null) this.setTemperature(tempOverride);
    if (timeOverride !== null) this.setTime(timeOverride);

    if (this._slice.solved) {
      return { status: this._slice.burned ? 'chaos_solved' : 'solved', alreadySolved: true, state: this.getState() };
    }

    const { temp, time } = this._slice;

    // 1. Clean exact solution: 375°F & 45 min
    if (temp === this.config.targetTemp && time === this.config.targetTime) {
      this._status = 'solved';
      this._grantRewards(false);
      this.bus.emit('world:turkeySmoke', { level: 0.15 });
      this.bus.emit('sfx:play', { name: 'oven_ding' });
      this.bus.emit('ui:toast', {
        text: 'Perfect roast! Safe Digit #2: 4 + Security Room Keycard obtained!',
        type: 'success',
        duration: 5000,
      });
      return {
        status: 'solved',
        digit: this.config.safeDigit,
        burned: false,
        item: SECURITY_KEYCARD_ITEM,
        state: this.getState(),
      };
    }

    // 2. Chaos thermal runaway: 550°F & 90 min
    if (temp >= this.config.chaosTemp && time >= this.config.chaosTime) {
      this._status = 'chaos_solved';
      this.gameState.setFlag('ovenExploded', true);
      this.gameState.addSafehouseDamage(
        this.config.chaosDamage,
        'Incinerated Lucia\'s Thanksgiving Turkey & Luxury Oven',
        true
      );
      this._grantRewards(true);
      this.bus.emit('world:turkeySmoke', { level: 1.0 });
      this.bus.emit('sfx:play', { name: 'oven_alarm' });
      this.bus.emit('ui:toast', {
        text: 'OVEN FIRE! +$25,000 damage! You grabbed the scorched canister anyway: Safe Digit #2 (4) + Security Keycard!',
        type: 'danger',
        duration: 6000,
      });
      return {
        status: 'chaos_solved',
        digit: this.config.safeDigit,
        burned: true,
        damageAdded: this.config.chaosDamage,
        item: SECURITY_KEYCARD_ITEM,
        state: this.getState(),
      };
    }

    // 3. Incorrect settings — give helpful directional feedback
    this._status = 'failed';
    this.gameState.incrementFailedAttempt('turkey');

    const hints = [];
    if (temp < this.config.targetTemp) hints.push('too cold to thaw the canister seal');
    else if (temp > this.config.targetTemp) hints.push('too hot — the decoy skin is starting to smoke');

    if (time < this.config.targetTime) hints.push('timer is too short');
    else if (time > this.config.targetTime) hints.push('timer is too long');

    this._lastFeedback = `No luck (${temp}°F / ${time} min): ${hints.join(', and ')}. Check the kitchen recipe card & oven manual!`;

    if (temp >= 475) {
      this.bus.emit('world:turkeySmoke', { level: 0.45 });
      this.bus.emit('sfx:play', { name: 'oven_alarm' });
    } else {
      this.bus.emit('sfx:play', { name: 'safe_error' });
    }

    this.bus.emit('puzzle:failed', { puzzleId: 'turkey', reason: this._lastFeedback });

    return {
      status: 'failed',
      feedback: this._lastFeedback,
      state: this.getState(),
    };
  }

  _grantRewards(burned) {
    this.gameState.markPuzzleSolved('turkey', {
      digit: this.config.safeDigit,
      burned,
    });
    this.gameState.addItem({ ...SECURITY_KEYCARD_ITEM });
    this.gameState.addClue({
      id: 'clue_turkey_digit',
      title: 'Turkey Canister — Safe Digit #2',
      text: burned
        ? 'Pulled from the flaming turkey wreckage: Safe Digit #2 is 4, plus the Security Room Keycard (unlocks the Security Room door).'
        : 'Cleanly thawed at 375°F for 45 min: Safe Digit #2 is 4, plus the Security Room Keycard (unlocks the Security Room door).',
      room: 'kitchen',
      puzzleId: 'turkey',
    });
  }

  getHint(tier = 0) {
    return TURKEY_HINTS[Math.min(Math.max(0, tier), TURKEY_HINTS.length - 1)];
  }

  reset() {
    this._lastFeedback = 'Set temperature and timer to thaw Lucia\'s decoy Thanksgiving turkey.';
    this._status = 'idle';
  }
}

export default TurkeyOvenPuzzle;
