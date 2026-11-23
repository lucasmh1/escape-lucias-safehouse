/**
 * Puzzle 3: The Security Footage (`security`)
 * - 4 CCTV camera feeds (Foyer, Living Room, Kitchen, Balcony).
 * - Feeds 0-2 have clean 2-minute intervals (02:10, 02:12, 02:14, 02:16, 02:18, 02:20).
 * - Feed 3 (Balcony Cam) has a corrupted spliced gap: 02:14 -> 02:19 (+5 min jump)
 *   where a shadowy figure leaves a note on the railing.
 * - Flagging Balcony Cam at the spliced timestamp decrypts Safe Digit #3 (`9`)
 *   and confirms where Jason hid the pirate radio frequency clues.
 */

export const CCTV_CAMERAS = Object.freeze([
  {
    index: 0,
    id: 'foyer',
    name: 'CAM 01 — FOYER',
    location: 'Main Entrance',
    corrupted: false,
    frames: [
      { time: '02:10', caption: 'Main entrance deadbolt engaged. Rain drumming outside frosted glass.' },
      { time: '02:12', caption: 'Hallway silent. Red lock LED steady above reinforced steel door.' },
      { time: '02:14', caption: 'Lightning flash illuminates foyer marble. No movement detected.' },
      { time: '02:16', caption: 'Elevator indicator stays on floor 1. Entrance remains sealed.' },
      { time: '02:18', caption: 'Routine camera sweep. Timestamp sync: OK (+02m).' },
      { time: '02:20', caption: 'Foyer clear. No tampering detected on main lock.' },
    ],
  },
  {
    index: 1,
    id: 'living_room',
    name: 'CAM 02 — LIVING ROOM',
    location: 'Entertainment Area',
    corrupted: false,
    frames: [
      { time: '02:10', caption: 'Lucia paces past the curved white sectional sofa on a burner phone.' },
      { time: '02:12', caption: 'Lucia drops the TV remote onto the round coffee table.' },
      { time: '02:14', caption: '4K Smart TV flashes channel static; neon skyline glows through rain.' },
      { time: '02:16', caption: 'Lucia grabs a duffel bag from the lounge nook and heads east.' },
      { time: '02:18', caption: 'Living room empty. Floor orb lamp casting warm amber glow.' },
      { time: '02:20', caption: 'Routine sweep. Timestamp sync: OK (+02m).' },
    ],
  },
  {
    index: 2,
    id: 'kitchen',
    name: 'CAM 03 — KITCHEN',
    location: 'Kitchen & Island',
    corrupted: false,
    frames: [
      { time: '02:10', caption: 'Marble island cluttered with stained recipe card and espresso mug.' },
      { time: '02:12', caption: 'Lucia opens the oven door and inspects the Thanksgiving decoy turkey.' },
      { time: '02:14', caption: 'Lucia seals a steel canister + keycard inside the bird.' },
      { time: '02:16', caption: 'Lucia sticks a warning note onto the stainless-steel fridge.' },
      { time: '02:18', caption: 'Kitchen lights dim to purple accent LEDs. Oven set to standby.' },
      { time: '02:20', caption: 'Routine sweep. Timestamp sync: OK (+02m).' },
    ],
  },
  {
    index: 3,
    id: 'balcony',
    name: 'CAM 04 — BALCONY',
    location: 'North Penthouse Terrace',
    corrupted: true,
    anomalyFrameIndices: [2, 3], // 02:14 -> 02:19 jump
    frames: [
      { time: '02:10', caption: 'Heavy Miami rain sweeping across glass railing. Neon palms below.' },
      { time: '02:12', caption: 'Balcony empty. Heavy neon-pink crowbar leaning near south rail.' },
      { time: '02:14', caption: 'STATIC BURST — Feed freezes at 02:14:00. Next frame jumps 5 minutes!', anomaly: true },
      { time: '02:19', caption: '[SPLICE ANOMALY: 02:14 → 02:19] Shadowy figure slips past glass rail, drops encrypted cipher!', anomaly: true },
      { time: '02:20', caption: 'Balcony empty again. Rain washes footprints off wet stone tiles.' },
      { time: '02:22', caption: 'Thunder shakes camera mount. Clock remains offset by +02m.' },
    ],
  },
]);

export const SAFE_DIGIT = 9;

export const SECURITY_HINTS = [
  'Inspect all 4 CCTV feeds in the Security Room terminal. Normal feeds advance steadily by 2 minutes between every frame.',
  'Compare the timestamps on CAM 04 (Balcony) against the other cameras — there is an impossible 5-minute splice gap.',
  'Select CAM 04 — BALCONY, scrub to the 02:14 → 02:19 anomaly frame, and press FLAG ANOMALY to decrypt Safe Digit #3 (9).',
];

export class SecurityFootagePuzzle {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.id = 'security';
    this.bus = eventBus;
    this.gameState = gameState;
    this.cameras = CCTV_CAMERAS;
    this.targetDigit = SAFE_DIGIT;
    this._selectedFrame = 0;
    this._lastFeedback = 'Review all 4 camera feeds and flag the corrupted timestamp splice.';
  }

  get _slice() {
    return this.gameState.data.puzzles.security;
  }

  getActiveCamera() {
    return this.cameras[this._slice.selectedCam] || this.cameras[0];
  }

  getState() {
    const cam = this.getActiveCamera();
    const frameIndex = Math.min(Math.max(0, this._selectedFrame), cam.frames.length - 1);
    const frame = cam.frames[frameIndex];
    return {
      id: this.id,
      solved: this._slice.solved,
      digit: this._slice.digit,
      selectedCam: cam.index,
      selectedFrame: frameIndex,
      camera: cam,
      frame,
      cameras: this.cameras,
      feedback: this._slice.solved
        ? 'LOG DECRYPTED! Balcony splice (02:14 → 02:19) exposed Safe Digit #3: [ 9 ]. Note: "Radio frequency split between Bedroom nightstand & Bathroom mirror."'
        : this._lastFeedback,
    };
  }

  selectCamera(camIndex) {
    const idx = Math.min(Math.max(0, Number(camIndex)), this.cameras.length - 1);
    this._slice.selectedCam = idx;
    this._selectedFrame = 0;
    this.bus.emit('sfx:play', { name: 'ui_click' });
    this.bus.emit('world:cctvUpdate', {
      activeCam: idx,
      anomalyFlagged: this._slice.solved,
    });
    return this.getState();
  }

  selectTimestamp(frameIndex) {
    const cam = this.getActiveCamera();
    this._selectedFrame = Math.min(Math.max(0, Number(frameIndex)), cam.frames.length - 1);
    this.bus.emit('sfx:play', { name: 'ui_click' });
    return this.getState();
  }

  /**
   * Verifies whether the selected camera + timestamp frame is the corrupted anomaly.
   */
  flagAnomaly(camIndex = null, frameIndex = null) {
    if (camIndex !== null) this._slice.selectedCam = Math.min(Math.max(0, Number(camIndex)), this.cameras.length - 1);
    if (frameIndex !== null) this._selectedFrame = Number(frameIndex);

    if (this._slice.solved) {
      return { solved: true, alreadySolved: true, digit: SAFE_DIGIT, state: this.getState() };
    }

    const cam = this.getActiveCamera();
    const fIdx = this._selectedFrame;

    if (cam.corrupted && cam.anomalyFrameIndices.includes(fIdx)) {
      this.gameState.markPuzzleSolved('security', {
        digit: SAFE_DIGIT,
        selectedCam: cam.index,
      });
      this.gameState.addClue({
        id: 'clue_security_digit',
        title: 'Decrypted CCTV Log — Safe Digit #3',
        text: 'Balcony Cam spliced at 02:14 → 02:19. Decrypted Safe Digit #3 is 9. Jason\'s radio frequency clue is split between the Bedroom nightstand and Bathroom mirror.',
        room: 'security_room',
        puzzleId: 'security',
      });
      this.bus.emit('world:cctvUpdate', {
        activeCam: cam.index,
        anomalyFlagged: true,
      });
      this.bus.emit('sfx:play', { name: 'radio_lock' });
      this.bus.emit('ui:toast', {
        text: 'ANOMALY VERIFIED! Safe Digit #3: 9 — Check Bedroom & Bathroom for the radio frequency!',
        type: 'success',
        duration: 5000,
      });
      return { solved: true, digit: SAFE_DIGIT, state: this.getState() };
    }

    this.gameState.incrementFailedAttempt('security');
    if (cam.corrupted) {
      this._lastFeedback = 'Right camera! Scrub to the exact spliced timestamp jump (02:14 → 02:19) and flag it.';
    } else {
      this._lastFeedback = `${cam.name} shows clean 2-minute intervals (no splice). Compare all 4 cameras for a missing time gap!`;
    }

    this.bus.emit('sfx:play', { name: 'safe_error' });
    this.bus.emit('puzzle:failed', { puzzleId: 'security', reason: this._lastFeedback });
    return { solved: false, feedback: this._lastFeedback, state: this.getState() };
  }

  getHint(tier = 0) {
    return SECURITY_HINTS[Math.min(Math.max(0, tier), SECURITY_HINTS.length - 1)];
  }

  reset() {
    this._selectedFrame = 0;
    this._lastFeedback = 'Review all 4 camera feeds and flag the corrupted timestamp splice.';
  }
}

export default SecurityFootagePuzzle;
