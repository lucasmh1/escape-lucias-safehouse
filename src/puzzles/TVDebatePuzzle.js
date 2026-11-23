/**
 * Puzzle 1: The TV Debate (`tv`)
 * - Requires `tv_remote` in inventory to channel-surf.
 * - 6 satirical channels with clues pointing to the secret sequence: Ch 4 -> Ch 2 -> Ch 6.
 * - Unlocking the sequence reveals Lucia's Emergency Broadcast with Safe Digit #1 (`7`)
 *   and directs the player to the kitchen Thanksgiving turkey.
 * - Includes the "POST HOT TAKE" trap: 5+ internet arguments triggers the `INTERNET_VICTIM` ending.
 */

export const TV_CHANNELS = Object.freeze([
  {
    number: 1,
    callsign: 'GAMEWAVE 24/7',
    show: 'FRAME RATE WAR ROOM: 30 FPS vs 60 FPS',
    accent: '#ff2e97',
    headline: '"30 FPS IS MORE CINEMATIC" SPARKS 14-HOUR LIVESTREAM MELTDOWN',
    body: 'Panelist #1 screams about "filmic motion blur" while Panelist #2 holds up a $4,200 GPU and weeps. Live chat is moving at 900 insults per second.',
    ticker: 'BREAKING: GAMER COUNCIL DEADLOCKED ON FRAME PACING • RUMOR: LUCIA\'S EMERGENCY SIGNAL HIDDEN IN A 3-CHANNEL ORDER • CHECK CRYPTO, NEWS & MIDNIGHT SHOPPING',
    chatSnippet: '@FrameGoblin99: "If you can\'t see 240Hz you shouldn\'t legally own eyes"',
  },
  {
    number: 2,
    callsign: 'VICE NEWS 9',
    show: 'BLACK FRIDAY TURKEY TRAMPLING SPECIAL',
    accent: '#00e5ff',
    headline: 'CHAOS AT MEGA-MART AS SHOPPERS BATTLE OVER LAST FROZEN TURKEY',
    body: 'Live chopper footage shows three uncles and a mall cop sliding across a puddle of cranberry sauce. Lucia\'s penthouse skyline is visible in the rainy background.',
    ticker: 'CHANNEL 02 IS STEP TWO OF THE SIGNAL • WITNESS: "ALWAYS TUNE TO TURKEY NEWS SECOND!" • CATEGORY 4 NEON HURRICANE APPROACHING VICE BAY',
    chatSnippet: '@MiamiMallCop: "They took my Segway AND the gravy boats."',
  },
  {
    number: 3,
    callsign: 'ALGO-BRO PODCAST',
    show: 'IS THE ALGORITHM GASLIGHTING YOU? (EP. 409)',
    accent: '#b84dff',
    headline: 'THREE GUYS WITH $800 MICS ARGUE ABOUT AI STEALING THEIR VIBES',
    body: '"Bro, the engagement algorithm literally made me buy four smart toasters and argue with a bot until 4 AM." Sponsored by Hyper-Caffeinated Tap Water.',
    ticker: 'ENGAGEMENT UP 400% WHEN VIEWERS POST HOT TAKES • DO NOT FALL DOWN THE RABBIT HOLE • OR DO, WE NEED THE AD REVENUE',
    chatSnippet: '@CryptoChad_AI: "Actually, rage-baiting is a form of Stoic philosophy."',
  },
  {
    number: 4,
    callsign: 'CRYPTO-HEIST LIVE',
    show: 'HOW WE LOST $40M IN 6 MINUTES',
    accent: '#ff9e2c',
    headline: 'NFT HEIST BROS ACCIDENTALLY STREAM THEIR OWN SEED PHRASE',
    body: 'Host insists "it\'s not a rug-pull, it\'s a decentralized surprise getaway." A neon-pink sticky note is taped to the corner of the studio monitor.',
    ticker: 'START THE SECRET BROADCAST HERE: CHANNEL 04 FIRST • FOLLOW WITH VICE NEWS 9 NEXT • FINISH ON LATE-NIGHT INFOMERCIAL',
    chatSnippet: '@DiamondHands04: "Start on 4, bro. Trust the blockchain."',
  },
  {
    number: 5,
    callsign: 'STORM WATCH MIAMI',
    show: 'HURRICANE NEON — LIVE DOPPLER RADAR',
    accent: '#29b6f6',
    headline: 'TORRENTIAL RAIN & LIGHTNING POUNDING DOWNTOWN PENTHOUSES',
    body: 'Meteorologist warns residents to stay indoors and avoid balconies. "Seriously, who keeps a neon-pink crowbar on a 40th-floor balcony during a storm?"',
    ticker: 'WIND GUSTS 115 MPH • POWER FLUCTUATIONS REPORTED • BALCONY SAFETY GLASS NOT RATED FOR CROWBARS OR DRAMATIC ESCAPES',
    chatSnippet: '@RainCheckMIA: "Perfect weather to stay inside and solve a heist."',
  },
  {
    number: 6,
    callsign: 'MIDNIGHT SHOPPING',
    show: 'TURBO-ROAST 5000 INFOMERCIAL',
    accent: '#ff4f79',
    headline: 'COOK A THANKSGIVING DECOY TURKEY WITHOUT TORCHING YOUR PENTHOUSE!',
    body: 'Smiling host waves a smoking spatula: "Just set the exact temp and timer — never crank it to 550°F unless you want a $25,000 smoke-damage bill!"',
    ticker: 'FINAL STEP OF THE 3-CHANNEL SIGNAL: CHANNEL 06! • SEQUENCE COMPLETE WHEN TUNED AFTER CH 04 & CH 02 • CALL 1-800-BURNT-BIRD',
    chatSnippet: '@ChefLucia: "Check the kitchen turkey once the broadcast unlocks."',
  },
]);

export const SECRET_SEQUENCE = Object.freeze([4, 2, 6]);
export const SAFE_DIGIT = 7;
export const INTERNET_VICTIM_THRESHOLD = 5;

const HOT_TAKES = [
  {
    take: '"Actually, 30 FPS with motion blur looks MORE cinematic than 60 FPS."',
    reply: '@UltraSweat60: "EXCUSE ME?! I am writing a 12-paragraph thread about you right now."',
  },
  {
    take: '"Black Friday turkey deals are overrated, just order neon-district takeout."',
    reply: '@GravyTrain99: "Ratio + you clearly never fought a grandma in aisle 7."',
  },
  {
    take: '"No, YOU don\'t understand frame pacing—let me link a 45-minute YouTube essay."',
    reply: '@FrameGoblin99: "Watch me debunk your entire bloodline in this quote-tweet."',
  },
  {
    take: '"Wait, hold on, someone in chat just called me a casual—I HAVE to reply."',
    reply: '@ModsAreAsleep: "You\'ve been typing for 20 minutes. Isn\'t there a heist you should be escaping?"',
  },
  {
    take: '"I\'M NOT MAD, YOU\'RE MAD! Let me pull up my spreadsheet of benchmark graphs!"',
    reply: 'SYSTEM: 6 hours later, you won the argument—and the SWAT team walked right through the front door.',
  },
];

export const TV_HINTS = [
  'Grab Lucia\'s TV Remote from the living room coffee table, then inspect the scrolling tickers across all 6 channels.',
  'Three channel tickers spell out a 3-step broadcast sequence: Crypto-Heist Live (Ch 4), Vice News 9 (Ch 2), and Midnight Shopping (Ch 6).',
  'Switch the TV channels in exact order: Ch 4 → Ch 2 → Ch 6 to decode Lucia\'s Emergency Broadcast and get Safe Digit #1 (7).',
];

export class TVDebatePuzzle {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.id = 'tv';
    this.bus = eventBus;
    this.gameState = gameState;
    this.channels = TV_CHANNELS;
    this.secretSequence = SECRET_SEQUENCE;
    this.targetDigit = SAFE_DIGIT;
    this.argumentThreshold = INTERNET_VICTIM_THRESHOLD;
    this._lastHotTake = null;
  }

  get _slice() {
    return this.gameState.data.puzzles.tv;
  }

  canOpen() {
    if (!this.gameState.hasItem('tv_remote')) {
      return {
        allowed: false,
        reason: 'missing_remote',
        message: 'The 4K TV is locked on static. Find Lucia\'s TV Remote on the living room coffee table first.',
      };
    }
    return { allowed: true };
  }

  getChannelData(channelNum = this._slice.channel) {
    return this.channels.find((c) => c.number === channelNum) || this.channels[0];
  }

  /**
   * Returns how many consecutive steps of [4, 2, 6] are currently matched (0..3).
   */
  getSequenceProgress() {
    if (this._slice.solved) return this.secretSequence.length;
    const seq = this._slice.sequence || [];
    if (seq.length === 0) return 0;

    // Check longest suffix of seq that matches prefix of SECRET_SEQUENCE
    for (let len = Math.min(seq.length, this.secretSequence.length); len >= 1; len--) {
      let match = true;
      for (let i = 0; i < len; i++) {
        if (seq[seq.length - len + i] !== this.secretSequence[i]) {
          match = false;
          break;
        }
      }
      if (match) return len;
    }
    return 0;
  }

  getState() {
    const channel = this.getChannelData(this._slice.channel);
    return {
      id: this.id,
      solved: this._slice.solved,
      digit: this._slice.digit,
      channelNumber: channel.number,
      channel,
      channels: this.channels,
      sequenceProgress: this.getSequenceProgress(),
      sequenceLength: this.secretSequence.length,
      internetArguments: this.gameState.data.stats.internetArguments,
      argumentThreshold: this.argumentThreshold,
      lastHotTake: this._lastHotTake,
      emergencyBroadcast: this._slice.solved
        ? {
            title: 'LUCIA\'S ENCRYPTED EMERGENCY BROADCAST',
            digit: SAFE_DIGIT,
            message: 'SAFE DIGIT #1 IS [ 7 ]. Next stop: the kitchen oven. Check my stained recipe card on the marble island and don\'t char the decoy Thanksgiving turkey!',
          }
        : null,
    };
  }

  selectChannel(channelNum) {
    const num = Number(channelNum);
    const channel = this.channels.find((c) => c.number === num);
    if (!channel) return this.getState();

    this._slice.channel = num;
    this.bus.emit('sfx:play', { name: 'tv_channel' });

    let justSolved = false;
    if (!this._slice.solved) {
      const seq = Array.isArray(this._slice.sequence) ? this._slice.sequence : [];
      seq.push(num);
      // Keep last 6 presses to avoid unbounded growth
      if (seq.length > 6) seq.shift();
      this._slice.sequence = seq;

      if (this.getSequenceProgress() === this.secretSequence.length) {
        justSolved = true;
        this.gameState.markPuzzleSolved('tv', { digit: SAFE_DIGIT });
        this.gameState.addClue({
          id: 'clue_tv_digit',
          title: 'Emergency Broadcast — Safe Digit #1',
          text: 'Decoded Ch 4 → Ch 2 → Ch 6. Safe Digit #1 is 7. Lucia\'s broadcast points to the Thanksgiving decoy turkey in the kitchen oven.',
          room: 'living_room',
          puzzleId: 'tv',
        });
        this.bus.emit('sfx:play', { name: 'radio_lock' });
        this.bus.emit('ui:toast', {
          text: 'EMERGENCY BROADCAST UNLOCKED! Safe Digit #1: 7 — Check the kitchen turkey!',
          type: 'success',
          duration: 5000,
        });
      }
    }

    this.bus.emit('world:tvUpdate', {
      channel: num,
      title: this._slice.solved ? 'EMERGENCY BROADCAST: DIGIT #1 = 7' : `${channel.callsign} — ${channel.show}`,
      ticker: this._slice.solved
        ? 'LUCIA: SAFE DIGIT #1 IS 7 • CHECK THE THANKSGIVING TURKEY IN THE KITCHEN'
        : channel.ticker,
      solved: this._slice.solved,
    });

    return { ...this.getState(), justSolved };
  }

  /**
   * Player clicks "POST HOT TAKE / ARGUE IN CHAT".
   * At 5+ hot takes, triggers the `INTERNET_VICTIM` ending.
   */
  postHotTake() {
    const count = this.gameState.incrementInternetArguments(1);
    const entry = HOT_TAKES[Math.min(count - 1, HOT_TAKES.length - 1)];
    this._lastHotTake = {
      count,
      take: entry.take,
      reply: entry.reply,
    };

    this.bus.emit('sfx:play', { name: 'ui_click' });

    if (count === 3) {
      this.bus.emit('ui:toast', {
        text: 'Careful! You\'re getting sucked into the 30fps vs 60fps comment war...',
        type: 'warning',
        duration: 3500,
      });
    } else if (count === 4) {
      this.bus.emit('ui:toast', {
        text: 'WARNING: One more hot take and you\'ll forget to escape the safehouse!',
        type: 'danger',
        duration: 4000,
      });
    }

    let triggeredEnding = false;
    if (count >= this.argumentThreshold && !this.gameState.data.flags.endingTriggered) {
      triggeredEnding = true;
      this.fallDownRabbitHole();
    }

    return {
      count,
      threshold: this.argumentThreshold,
      take: entry.take,
      reply: entry.reply,
      triggeredEnding,
      state: this.getState(),
    };
  }

  fallDownRabbitHole() {
    if (this.gameState.data.flags.endingTriggered) return;
    this.gameState.setFlag('endingTriggered', 'INTERNET_VICTIM');
    this.bus.emit('modal:close', { modalId: 'puzzle' });
    this.bus.emit('game:ending', {
      endingId: 'INTERNET_VICTIM',
      reason: 'Spent 6 hours arguing about 30fps vs 60fps in live chat while Vice PD surrounded the building.',
    });
  }

  getHint(tier = 0) {
    return TV_HINTS[Math.min(Math.max(0, tier), TV_HINTS.length - 1)];
  }

  reset() {
    this._lastHotTake = null;
  }
}

export default TVDebatePuzzle;
