/**
 * Puzzle 4: The Radio Frequency (`radio`)
 * - Frequency clues are split between the Bedroom nightstand (`104._`) and Bathroom mirror (`_.7 MHz`).
 * - Player tunes the Security Room analog transceiver dial (88.0 - 108.0 MHz) to `104.7 MHz`.
 * - Emits live `audio:radioStatic` `{ active, clarity }` so static clears smoothly as the dial approaches 104.7 MHz.
 * - Locking onto 104.7 MHz decodes Lucia's pirate broadcast, revealing Safe Digit #4 (`2`)
 *   and confirming the final safe code order (TV -> Turkey -> CCTV -> Radio).
 */

export const RADIO_CONFIG = Object.freeze({
  minFreq: 88.0,
  maxFreq: 108.0,
  step: 0.1,
  targetFreq: 104.7,
  lockTolerance: 0.11,
  safeDigit: 2,
});

export const RADIO_STATIONS = Object.freeze([
  {
    freq: 93.3,
    name: 'VICE SYNTHWAVE 93.3',
    transcript: '♪ Lush neon basslines pulsing through static... "Late-night Vice City storm mix — keep your headlights on." ♪',
    isTarget: false,
  },
  {
    freq: 98.5,
    name: 'MIAMI PD SCANNER RELAY',
    transcript: '"All units: perimeter set around downtown bayfront. Suspects last seen heading toward a luxury penthouse with a suspiciously large turkey."',
    isTarget: false,
  },
  {
    freq: 101.9,
    name: 'MIDNIGHT CONSPIRACY FM',
    transcript: '"Caller from Starfish Island says 30fps is actually a government psy-op! Lines are open..."',
    isTarget: false,
  },
  {
    freq: 104.7,
    name: 'LUCIA\'S PIRATE CHANNEL (ENCRYPTED)',
    transcript: '"Jason, if you\'re hearing this — you found the frequency! Final safe digit is TWO [ 2 ]. Order is TV, Turkey, CCTV, Radio. Grab the Master Exit Key and meet me at the docks!"',
    isTarget: true,
  },
]);

export const RADIO_HINTS = [
  'Search the Bedroom nightstand drawer and the steamy Bathroom mirror for Lucia\'s split radio frequency clue.',
  'Combine the two halves: "104." from the Bedroom nightstand note and ".7 MHz" from the Bathroom mirror.',
  'Tune the Security Room radio transceiver to 104.7 MHz and click LOCK SIGNAL to reveal Safe Digit #4 (2).',
];

export class RadioFrequencyPuzzle {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.id = 'radio';
    this.bus = eventBus;
    this.gameState = gameState;
    this.config = RADIO_CONFIG;
    this.stations = RADIO_STATIONS;
    this.targetDigit = RADIO_CONFIG.safeDigit;
    this._isOpen = false;
    this._lastFeedback = 'Tune the analog dial between 88.0 and 108.0 MHz to locate Lucia\'s pirate broadcast.';
  }

  get _slice() {
    return this.gameState.data.puzzles.radio;
  }

  /**
   * Computes signal clarity (0..1) and nearest station info for a given frequency.
   */
  evaluateFrequency(freq = this._slice.frequency) {
    const f = Math.round(Number(freq) * 10) / 10;
    let nearest = null;
    let minDist = Infinity;

    for (const station of this.stations) {
      const dist = Math.abs(f - station.freq);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }

    // Target station has a clean narrow peak; decoy stations have softer partial clarity
    const targetDist = Math.abs(f - this.config.targetFreq);
    const targetClarity = Math.max(0, 1 - targetDist / 1.8);

    let clarity = targetClarity;
    let activeStation = null;

    if (nearest && minDist <= 0.45) {
      activeStation = nearest;
      const stationClarity = Math.max(0, 1 - minDist / 0.55);
      clarity = Math.max(clarity, nearest.isTarget ? stationClarity : stationClarity * 0.72);
    }

    const onTarget = targetDist <= this.config.lockTolerance;
    if (onTarget) {
      clarity = 1.0;
    }

    return {
      frequency: f,
      clarity: Math.round(clarity * 100) / 100,
      onTarget,
      station: activeStation,
    };
  }

  getState() {
    const evalInfo = this.evaluateFrequency(this._slice.frequency);
    const targetStation = this.stations.find((s) => s.isTarget);
    return {
      id: this.id,
      solved: this._slice.solved,
      digit: this._slice.digit,
      frequency: evalInfo.frequency,
      clarity: this._slice.solved ? 1.0 : evalInfo.clarity,
      onTarget: evalInfo.onTarget,
      station: this._slice.solved ? targetStation : evalInfo.station,
      config: this.config,
      transcript: this._slice.solved
        ? targetStation.transcript
        : evalInfo.station && evalInfo.clarity >= 0.45
          ? evalInfo.station.transcript
          : '— STATIC — (No coherent carrier signal locked)',
      feedback: this._slice.solved
        ? 'PIRATE BROADCAST DECODED (104.7 MHz)! Safe Digit #4 is [ 2 ]. Code order: TV → Turkey → CCTV → Radio.'
        : this._lastFeedback,
    };
  }

  onOpen() {
    this._isOpen = true;
    if (!this._slice.solved) {
      const evalInfo = this.evaluateFrequency(this._slice.frequency);
      this.bus.emit('audio:radioStatic', { active: true, clarity: evalInfo.clarity });
    }
  }

  onClose() {
    this._isOpen = false;
    this.bus.emit('audio:radioStatic', { active: false, clarity: 1 });
  }

  setFrequency(freq) {
    const clamped = Math.min(this.config.maxFreq, Math.max(this.config.minFreq, Number(freq)));
    const rounded = Math.round(clamped * 10) / 10;
    this._slice.frequency = rounded;

    const evalInfo = this.evaluateFrequency(rounded);
    if (this._isOpen && !this._slice.solved) {
      this.bus.emit('audio:radioStatic', { active: true, clarity: evalInfo.clarity });
    }

    return this.getState();
  }

  nudgeFrequency(delta) {
    return this.setFrequency(this._slice.frequency + Number(delta));
  }

  /**
   * Attempts to lock onto the current frequency and decode Lucia's broadcast.
   */
  lockSignal(freqOverride = null) {
    if (freqOverride !== null) this.setFrequency(freqOverride);

    if (this._slice.solved) {
      return { solved: true, alreadySolved: true, digit: this.targetDigit, state: this.getState() };
    }

    const evalInfo = this.evaluateFrequency(this._slice.frequency);

    if (evalInfo.onTarget) {
      this._slice.frequency = this.config.targetFreq;
      this.gameState.markPuzzleSolved('radio', {
        digit: this.targetDigit,
        frequency: this.config.targetFreq,
      });
      this.gameState.addClue({
        id: 'clue_radio_digit',
        title: 'Pirate Broadcast (104.7 MHz) — Safe Digit #4',
        text: 'Lucia\'s broadcast on 104.7 MHz confirmed Safe Digit #4 is 2. Enter digits in order: TV → Turkey → CCTV → Radio.',
        room: 'security_room',
        puzzleId: 'radio',
      });
      this.bus.emit('audio:radioStatic', { active: false, clarity: 1 });
      this.bus.emit('sfx:play', { name: 'radio_lock' });
      this.bus.emit('ui:toast', {
        text: 'BROADCAST DECODED (104.7 MHz)! Safe Digit #4: 2!',
        type: 'success',
        duration: 5000,
      });
      return {
        solved: true,
        digit: this.targetDigit,
        frequency: this.config.targetFreq,
        state: this.getState(),
      };
    }

    this.gameState.incrementFailedAttempt('radio');
    if (evalInfo.station && !evalInfo.station.isTarget) {
      this._lastFeedback = `That's ${evalInfo.station.name} (${evalInfo.station.freq} MHz), not Lucia's encrypted pirate channel!`;
    } else if (Math.abs(evalInfo.frequency - this.config.targetFreq) <= 1.2) {
      this._lastFeedback = `Strong carrier nearby (${evalInfo.frequency.toFixed(1)} MHz) — fine-tune the dial slightly!`;
    } else {
      this._lastFeedback = `Only static at ${evalInfo.frequency.toFixed(1)} MHz. Check the Bedroom nightstand and Bathroom mirror for the exact frequency.`;
    }

    this.bus.emit('sfx:play', { name: 'safe_error' });
    this.bus.emit('puzzle:failed', { puzzleId: 'radio', reason: this._lastFeedback });
    return { solved: false, feedback: this._lastFeedback, state: this.getState() };
  }

  getHint(tier = 0) {
    return RADIO_HINTS[Math.min(Math.max(0, tier), RADIO_HINTS.length - 1)];
  }

  reset() {
    this._isOpen = false;
    this._lastFeedback = 'Tune the analog dial between 88.0 and 108.0 MHz to locate Lucia\'s pirate broadcast.';
    this.bus.emit('audio:radioStatic', { active: false, clarity: 1 });
  }
}

export default RadioFrequencyPuzzle;
