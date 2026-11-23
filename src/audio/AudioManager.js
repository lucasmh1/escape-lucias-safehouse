/**
 * AudioManager — 100% procedural Web Audio API sound engine for ESCAPE LUCIA'S SAFEHOUSE.
 * Zero external audio assets. Safely handles suspended AudioContext before first user gesture.
 */

const ROOM_RAIN_PROFILE = {
  balcony: { gain: 1.0, cutoff: 5200, windGain: 0.24 },
  living_room: { gain: 0.52, cutoff: 1450, windGain: 0.06 },
  bedroom: { gain: 0.48, cutoff: 1350, windGain: 0.05 },
  kitchen: { gain: 0.36, cutoff: 1100, windGain: 0.03 },
  bathroom: { gain: 0.22, cutoff: 760, windGain: 0.015 },
  security_room: { gain: 0.2, cutoff: 720, windGain: 0.015 },
  entrance: { gain: 0.24, cutoff: 820, windGain: 0.02 },
};

// Dark Miami neo-noir synthwave progression: Dm9 -> Fmaj7 -> Bbmaj7 -> A7sus4
const NOIR_CHORDS = [
  { root: 73.42, notes: [146.83, 220.0, 261.63, 329.63] }, // Dm9 (D2 + D3, A3, C4, E4)
  { root: 87.31, notes: [174.61, 220.0, 261.63, 329.63] }, // Fmaj7 (F2 + F3, A3, C4, E4)
  { root: 58.27, notes: [116.54, 174.61, 220.0, 293.66] }, // Bbmaj7 (Bb1 + Bb2, F3, A3, D4)
  { root: 55.0, notes: [110.0, 164.81, 196.0, 293.66] },   // A7sus4 (A1 + A2, E3, G3, D4)
];

export class AudioManager {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(eventBus, gameState) {
    this.bus = eventBus;
    this.state = gameState;

    this.ctx = null;
    this.initialized = false;
    this.currentRoom = gameState?.data?.currentRoom || 'living_room';

    // Bus nodes
    this.compressor = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;

    // Noise buffers
    this.whiteBuffer = null;
    this.pinkBuffer = null;
    this.brownBuffer = null;

    // Continuous rain / wind nodes
    this.rainPatterGain = null;
    this.rainPatterFilter = null;
    this.rainWashGain = null;
    this.rainWashFilter = null;
    this.windGain = null;

    // Continuous radio static nodes
    this.radioActive = false;
    this.radioClarity = 0;
    this.radioStaticGain = null;
    this.radioCarrierOsc = null;
    this.radioCarrierGain = null;

    // Ambient synth pad scheduler
    this._padTimer = 0.5;
    this._chordIndex = 0;
    this._lastEndingSfxTime = 0;

    this._unsubs = [];
    this._bindEvents();
    this._bindUserGestureUnlock();
  }

  _bindEvents() {
    if (!this.bus) return;

    this._unsubs.push(
      this.bus.on('settings:changed', () => this._applyVolumes()),
      this.bus.on('player:roomChanged', ({ roomId } = {}) => {
        if (roomId) this.setRoomAtmosphere(roomId);
      }),
      this.bus.on('player:footstep', (payload) => {
        this._playFootstep(payload?.surface || 'marble', Boolean(payload?.sprint));
      }),
      this.bus.on('world:lightning', () => {
        this._playThunder();
      }),
      this.bus.on('sfx:play', (payload) => {
        if (!payload) return;
        if (typeof payload === 'string') {
          this.playSfx(payload);
        } else if (payload.name) {
          this.playSfx(payload.name, payload);
        }
      }),
      this.bus.on('audio:radioStatic', (payload) => {
        this.setRadioStatic(Boolean(payload?.active), payload?.clarity ?? 0);
      }),
      this.bus.on('modal:close', () => {
        if (this.radioActive) this.setRadioStatic(false, 0);
      }),
      this.bus.on('game:menu', () => {
        if (this.radioActive) this.setRadioStatic(false, 0);
      }),
      this.bus.on('state:reset', () => {
        if (this.radioActive) this.setRadioStatic(false, 0);
        this.setRoomAtmosphere('living_room');
      }),
      this.bus.on('game:ending', ({ endingId } = {}) => {
        if (this.radioActive) this.setRadioStatic(false, 0);
        if (endingId === 'CLEAN_GETAWAY') this.playSfx('ending_clean');
        else if (endingId === 'TOTAL_CHAOS') this.playSfx('ending_chaos');
        else if (endingId === 'INTERNET_VICTIM') this.playSfx('ending_internet');
      })
    );
  }

  _bindUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    this._unlockHandler = unlock;
  }

  /**
   * Initialize and/or resume the Web Audio API context safely on user gesture.
   */
  resume() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (!this.initialized && this.ctx) {
        this._setupGraph();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          // Ignore autoplay restriction errors before gesture
        });
      }
    } catch {
      // Gracefully degrade if Web Audio cannot start
    }
  }

  _isReady() {
    return Boolean(this.ctx && this.initialized && this.ctx.state === 'running');
  }

  _setupGraph() {
    const ctx = this.ctx;
    if (!ctx) return;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.18;
    this.compressor.connect(ctx.destination);

    this.masterGain = ctx.createGain();
    this.ambientGain = ctx.createGain();
    this.sfxGain = ctx.createGain();

    this.ambientGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.compressor);

    this._createNoiseBuffers();
    this._setupRainBed();
    this._setupRadioStaticNodes();
    this._applyVolumes(true);

    this.initialized = true;
    this.setRoomAtmosphere(this.currentRoom, true);
  }

  _createNoiseBuffers() {
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;

    // White noise
    const white = ctx.createBuffer(1, length, sampleRate);
    const wData = white.getChannelData(0);
    for (let i = 0; i < length; i++) {
      wData[i] = Math.random() * 2 - 1;
    }
    this.whiteBuffer = white;

    // Pink noise (Paul Kellet filter)
    const pink = ctx.createBuffer(1, length, sampleRate);
    const pData = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const wn = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + wn * 0.0555179;
      b1 = 0.99332 * b1 + wn * 0.0750759;
      b2 = 0.969 * b2 + wn * 0.153852;
      b3 = 0.8665 * b3 + wn * 0.3104856;
      b4 = 0.55 * b4 + wn * 0.5329522;
      b5 = -0.7616 * b5 - wn * 0.016898;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * 0.5362) * 0.055;
      b6 = wn * 0.115926;
    }
    this.pinkBuffer = pink;

    // Brown noise
    const brown = ctx.createBuffer(1, length, sampleRate);
    const brData = brown.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const wn = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * wn) / 1.02;
      brData[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
    }
    this.brownBuffer = brown;
  }

  _setupRainBed() {
    const ctx = this.ctx;

    // Layer 1: Pink noise rain patter on panoramic glass / balcony
    const patterSrc = ctx.createBufferSource();
    patterSrc.buffer = this.pinkBuffer;
    patterSrc.loop = true;

    this.rainPatterFilter = ctx.createBiquadFilter();
    this.rainPatterFilter.type = 'lowpass';
    this.rainPatterFilter.frequency.value = 1400;
    this.rainPatterFilter.Q.value = 0.7;

    this.rainPatterGain = ctx.createGain();
    this.rainPatterGain.gain.value = 0.16;

    patterSrc.connect(this.rainPatterFilter);
    this.rainPatterFilter.connect(this.rainPatterGain);
    this.rainPatterGain.connect(this.ambientGain);
    patterSrc.start();

    // Layer 2: Brown noise deep rain wash
    const washSrc = ctx.createBufferSource();
    washSrc.buffer = this.brownBuffer;
    washSrc.loop = true;

    this.rainWashFilter = ctx.createBiquadFilter();
    this.rainWashFilter.type = 'lowpass';
    this.rainWashFilter.frequency.value = 420;

    this.rainWashGain = ctx.createGain();
    this.rainWashGain.gain.value = 0.22;

    washSrc.connect(this.rainWashFilter);
    this.rainWashFilter.connect(this.rainWashGain);
    this.rainWashGain.connect(this.ambientGain);
    washSrc.start();

    // Layer 3: Subtle high-altitude Miami penthouse wind
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.pinkBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 540;
    windFilter.Q.value = 2.4;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.03;

    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ambientGain);
    windSrc.start();
  }

  _setupRadioStaticNodes() {
    const ctx = this.ctx;

    const staticSrc = ctx.createBufferSource();
    staticSrc.buffer = this.whiteBuffer;
    staticSrc.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1850;
    bandpass.Q.value = 1.6;

    this.radioStaticGain = ctx.createGain();
    this.radioStaticGain.gain.value = 0.0001;

    staticSrc.connect(bandpass);
    bandpass.connect(this.radioStaticGain);
    this.radioStaticGain.connect(this.sfxGain);
    staticSrc.start();

    // Subtle FM carrier tone as clarity increases
    this.radioCarrierOsc = ctx.createOscillator();
    this.radioCarrierOsc.type = 'sine';
    this.radioCarrierOsc.frequency.value = 220;

    this.radioCarrierGain = ctx.createGain();
    this.radioCarrierGain.gain.value = 0.0001;

    this.radioCarrierOsc.connect(this.radioCarrierGain);
    this.radioCarrierGain.connect(this.sfxGain);
    this.radioCarrierOsc.start();
  }

  _applyVolumes(immediate = false) {
    if (!this.ctx || !this.masterGain) return;
    const s = this.state?.data?.settings || {};
    const master = Math.max(0, Math.min(1, s.masterVol ?? 0.75));
    const ambient = Math.max(0, Math.min(1, s.ambientVol ?? 0.65));
    const sfx = Math.max(0, Math.min(1, s.sfxVol ?? 0.85));

    const now = this.ctx.currentTime;
    if (immediate) {
      this.masterGain.gain.setValueAtTime(master, now);
      this.ambientGain.gain.setValueAtTime(ambient, now);
      this.sfxGain.gain.setValueAtTime(sfx, now);
    } else {
      this.masterGain.gain.setTargetAtTime(master, now, 0.06);
      this.ambientGain.gain.setTargetAtTime(ambient, now, 0.08);
      this.sfxGain.gain.setTargetAtTime(sfx, now, 0.05);
    }
  }

  /**
   * Adjust rain/wind muffling based on current room.
   * @param {string} roomId
   * @param {boolean} [immediate]
   */
  setRoomAtmosphere(roomId, immediate = false) {
    this.currentRoom = roomId || 'living_room';
    if (!this.ctx || !this.rainPatterGain) return;

    const profile = ROOM_RAIN_PROFILE[this.currentRoom] || ROOM_RAIN_PROFILE.living_room;
    const now = this.ctx.currentTime;
    const tau = immediate ? 0.02 : 0.45;

    this.rainPatterGain.gain.setTargetAtTime(profile.gain * 0.28, now, tau);
    this.rainPatterFilter.frequency.setTargetAtTime(profile.cutoff, now, tau);
    this.rainWashGain.gain.setTargetAtTime(profile.gain * 0.32, now, tau);
    this.rainWashFilter.frequency.setTargetAtTime(Math.min(720, profile.cutoff * 0.35), now, tau);
    this.windGain.gain.setTargetAtTime(profile.windGain * 0.25, now, tau);
  }

  /**
   * Adjust continuous radio static bed (clarity: 0 = full static, 1 = locked signal).
   * @param {boolean} active
   * @param {number} clarity
   */
  setRadioStatic(active, clarity = 0) {
    this.radioActive = Boolean(active);
    this.radioClarity = Math.max(0, Math.min(1, Number(clarity) || 0));

    if (!this.ctx || !this.radioStaticGain) return;
    const now = this.ctx.currentTime;

    if (!this.radioActive) {
      this.radioStaticGain.gain.setTargetAtTime(0.0001, now, 0.05);
      this.radioCarrierGain.gain.setTargetAtTime(0.0001, now, 0.05);
      return;
    }

    const staticLevel = Math.max(0.006, (1 - this.radioClarity) * 0.22);
    const carrierLevel = this.radioClarity > 0.35 ? (this.radioClarity - 0.35) * 0.075 : 0.0001;
    const carrierFreq = 180 + this.radioClarity * 260;

    this.radioStaticGain.gain.setTargetAtTime(staticLevel, now, 0.05);
    this.radioCarrierGain.gain.setTargetAtTime(carrierLevel, now, 0.06);
    this.radioCarrierOsc.frequency.setTargetAtTime(carrierFreq, now, 0.06);
  }

  /**
   * Per-frame update to drive the dark synthwave ambient pad loop.
   * @param {number} dt
   */
  update(dt) {
    if (!this._isReady()) return;

    this._padTimer -= Math.min(dt, 0.1);
    if (this._padTimer <= 0) {
      this._triggerNoirPadChord(NOIR_CHORDS[this._chordIndex]);
      this._chordIndex = (this._chordIndex + 1) % NOIR_CHORDS.length;
      this._padTimer = 7.6;
    }
  }

  _triggerNoirPadChord(chord) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 8.4;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.linearRampToValueAtTime(620, now + 3.0);
    filter.frequency.exponentialRampToValueAtTime(280, now + dur);
    filter.Q.value = 1.2;

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(0.09, now + 2.1);
    padGain.gain.setValueAtTime(0.085, now + 5.2);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    filter.connect(padGain);
    padGain.connect(this.ambientGain);

    // Warm slightly detuned synthwave voices
    chord.notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx - 1.5) * 4.5, now);

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 0.22 / chord.notes.length;

      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    // Deep sub-bass root pulse
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(chord.root, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.07, now + 1.6);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    subOsc.connect(subGain);
    subGain.connect(this.ambientGain);
    subOsc.start(now);
    subOsc.stop(now + dur + 0.05);
  }

  _playThunder() {
    if (!this._isReady()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const outdoorBoost = this.currentRoom === 'balcony' ? 1.35 : 0.85;

    // 1. Sharp lightning crack
    const crackSrc = ctx.createBufferSource();
    crackSrc.buffer = this.whiteBuffer;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1900, now);
    crackFilter.frequency.exponentialRampToValueAtTime(320, now + 0.35);
    crackFilter.Q.value = 0.9;

    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.linearRampToValueAtTime(0.28 * outdoorBoost, now + 0.015);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    crackSrc.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.ambientGain);
    crackSrc.start(now);
    crackSrc.stop(now + 0.45);

    // 2. Deep rolling thunder rumble (slightly delayed)
    const delay = 0.14 + Math.random() * 0.25;
    const t0 = now + delay;
    const rumbleDur = 3.8 + Math.random() * 1.4;

    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = this.brownBuffer;
    rumbleSrc.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(190, t0);
    rumbleFilter.frequency.exponentialRampToValueAtTime(52, t0 + rumbleDur);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.0001, t0);
    rumbleGain.gain.linearRampToValueAtTime(0.55 * outdoorBoost, t0 + 0.25);
    rumbleGain.gain.linearRampToValueAtTime(0.32 * outdoorBoost, t0 + 1.1);
    rumbleGain.gain.linearRampToValueAtTime(0.42 * outdoorBoost, t0 + 1.6);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + rumbleDur);

    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.ambientGain);
    rumbleSrc.start(t0);
    rumbleSrc.stop(t0 + rumbleDur + 0.05);
  }

  _playFootstep(surface, sprint) {
    if (!this._isReady()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = sprint ? 0.34 : 0.22;
    const jitter = 0.92 + Math.random() * 0.16;

    if (surface === 'marble') {
      // Crisp bright heel tap on glossy marble
      this._noiseBurst(now, 0.045, 'bandpass', 2400 * jitter, 2.2, vol * 0.55, this.whiteBuffer);
      this._tone(now, 0.035, 'triangle', 980 * jitter, 320 * jitter, vol * 0.25);
    } else if (surface === 'wood') {
      // Warm hollow dark-wood knock
      this._tone(now, 0.07, 'sine', 165 * jitter, 72 * jitter, vol * 0.65);
      this._noiseBurst(now, 0.055, 'bandpass', 720 * jitter, 1.5, vol * 0.38, this.pinkBuffer);
    } else if (surface === 'carpet') {
      // Soft muffled thud
      this._tone(now, 0.06, 'sine', 95 * jitter, 52 * jitter, vol * 0.45);
      this._noiseBurst(now, 0.07, 'lowpass', 340 * jitter, 0.7, vol * 0.4, this.brownBuffer);
    } else if (surface === 'balcony') {
      // Wet tile tap + rain splash sizzle
      this._noiseBurst(now, 0.085, 'highpass', 3200 * jitter, 0.8, vol * 0.48, this.whiteBuffer);
      this._tone(now, 0.045, 'triangle', 1450 * jitter, 420 * jitter, vol * 0.28);
    } else {
      this._noiseBurst(now, 0.05, 'bandpass', 1200 * jitter, 1.4, vol * 0.4, this.pinkBuffer);
    }
  }

  /**
   * Play a named procedural SFX.
   * @param {string} name
   * @param {{ volume?: number, pitch?: number }} [opts]
   */
  playSfx(name, opts = {}) {
    if (!this._isReady()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.max(0.05, Math.min(2.0, opts.volume ?? 1.0));
    const pitch = Math.max(0.5, Math.min(2.0, opts.pitch ?? 1.0));

    // Debounce ending stingers so emitting both game:ending and sfx:play never doubles
    if (name === 'ending_clean' || name === 'ending_chaos' || name === 'ending_internet') {
      if (now - this._lastEndingSfxTime < 1.5) return;
      this._lastEndingSfxTime = now;
    }

    switch (name) {
      case 'ui_click':
        this._tone(now, 0.05, 'triangle', 880 * pitch, 1180 * pitch, 0.16 * vol);
        this._tone(now + 0.012, 0.035, 'sine', 1320 * pitch, 1480 * pitch, 0.08 * vol);
        break;

      case 'interact':
        this._tone(now, 0.07, 'sine', 520 * pitch, 780 * pitch, 0.2 * vol);
        this._tone(now + 0.05, 0.09, 'triangle', 780 * pitch, 1040 * pitch, 0.14 * vol);
        break;

      case 'pickup': {
        const notes = [587.33, 698.46, 880.0, 1174.66]; // D5 F5 A5 D6
        notes.forEach((f, i) => {
          this._tone(now + i * 0.055, 0.22, 'triangle', f * pitch, f * pitch * 1.01, 0.18 * vol);
        });
        break;
      }

      case 'door_open':
        this._tone(now, 0.06, 'square', 220 * pitch, 140 * pitch, 0.12 * vol);
        this._noiseBurst(now + 0.04, 0.34, 'bandpass', 480 * pitch, 1.1, 0.24 * vol, this.pinkBuffer);
        this._tone(now + 0.05, 0.28, 'sine', 150 * pitch, 75 * pitch, 0.22 * vol);
        break;

      case 'door_locked':
        this._tone(now, 0.07, 'sawtooth', 140 * pitch, 95 * pitch, 0.22 * vol);
        this._noiseBurst(now, 0.05, 'bandpass', 900, 2.0, 0.2 * vol, this.whiteBuffer);
        this._tone(now + 0.11, 0.08, 'sawtooth', 125 * pitch, 80 * pitch, 0.24 * vol);
        this._noiseBurst(now + 0.11, 0.06, 'bandpass', 780, 2.0, 0.18 * vol, this.whiteBuffer);
        break;

      case 'drawer_slide':
        this._noiseBurst(now, 0.28, 'bandpass', 560 * pitch, 1.4, 0.26 * vol, this.pinkBuffer);
        this._tone(now + 0.24, 0.07, 'sine', 120 * pitch, 65 * pitch, 0.2 * vol);
        break;

      case 'tv_channel':
        this._noiseBurst(now, 0.07, 'highpass', 2400, 0.8, 0.22 * vol, this.whiteBuffer);
        this._tone(now, 0.04, 'square', 640 * pitch, 920 * pitch, 0.12 * vol);
        break;

      case 'tv_static':
        this._noiseBurst(now, 0.32, 'bandpass', 2200, 0.7, 0.24 * vol, this.whiteBuffer);
        break;

      case 'oven_click':
        this._noiseBurst(now, 0.025, 'bandpass', 3200 * pitch, 3.0, 0.22 * vol, this.whiteBuffer);
        this._tone(now, 0.025, 'square', 1100 * pitch, 600 * pitch, 0.12 * vol);
        break;

      case 'oven_ding':
        this._tone(now, 1.35, 'sine', 1960 * pitch, 1955 * pitch, 0.26 * vol);
        this._tone(now, 0.85, 'sine', 3940 * pitch, 3930 * pitch, 0.13 * vol);
        this._tone(now, 0.35, 'triangle', 5880 * pitch, 5860 * pitch, 0.06 * vol);
        break;

      case 'oven_alarm':
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.24;
          this._tone(t, 0.14, 'square', 2950 * pitch, 2950 * pitch, 0.18 * vol);
          this._tone(t, 0.14, 'sine', 3120 * pitch, 3120 * pitch, 0.15 * vol);
        }
        break;

      case 'radio_static':
        this._noiseBurst(now, 0.26, 'bandpass', 1800, 1.8, 0.22 * vol, this.whiteBuffer);
        break;

      case 'radio_lock':
        this._tone(now, 0.12, 'sine', 740 * pitch, 1110 * pitch, 0.2 * vol);
        this._tone(now + 0.11, 0.35, 'triangle', 1110 * pitch, 1480 * pitch, 0.22 * vol);
        this._tone(now + 0.11, 0.45, 'sine', 555 * pitch, 740 * pitch, 0.14 * vol);
        break;

      case 'safe_beep':
        this._tone(now, 0.075, 'sine', 1360 * pitch, 1360 * pitch, 0.2 * vol);
        this._tone(now, 0.075, 'triangle', 2040 * pitch, 2040 * pitch, 0.07 * vol);
        break;

      case 'safe_error':
        this._tone(now, 0.14, 'sawtooth', 190 * pitch, 145 * pitch, 0.22 * vol);
        this._tone(now + 0.16, 0.22, 'sawtooth', 145 * pitch, 105 * pitch, 0.24 * vol);
        break;

      case 'safe_unlock':
        // Tumbler clicks -> heavy bolt -> triumphant synth chord
        this._noiseBurst(now, 0.04, 'bandpass', 2600, 3.0, 0.22 * vol, this.whiteBuffer);
        this._noiseBurst(now + 0.09, 0.05, 'bandpass', 2200, 3.0, 0.24 * vol, this.whiteBuffer);
        this._tone(now + 0.18, 0.2, 'sine', 135, 55, 0.35 * vol);
        [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
          this._tone(now + 0.25 + i * 0.07, 0.55, 'triangle', f, f, 0.16 * vol);
        });
        break;

      case 'voicemail_beep':
        this._tone(now, 0.42, 'sine', 1000 * pitch, 1000 * pitch, 0.24 * vol);
        break;

      case 'crash':
        // Low impact + noise burst + staggered glass/ceramic shards
        this._tone(now, 0.16, 'sine', 130, 42, 0.42 * vol);
        this._noiseBurst(now, 0.26, 'bandpass', 1400, 0.8, 0.38 * vol, this.whiteBuffer);
        for (let i = 0; i < 6; i++) {
          const t = now + 0.02 + i * 0.035 + Math.random() * 0.025;
          const freq = (2400 + Math.random() * 3400) * pitch;
          this._tone(t, 0.12 + Math.random() * 0.14, 'sine', freq, freq * 0.94, 0.11 * vol);
        }
        break;

      case 'hint':
        this._tone(now, 0.32, 'sine', 659.25 * pitch, 987.77 * pitch, 0.16 * vol);
        this._tone(now + 0.1, 0.45, 'triangle', 987.77 * pitch, 1318.51 * pitch, 0.14 * vol);
        break;

      case 'ending_clean': {
        // Cool Vice City triumph progression
        const arp = [293.66, 349.23, 440.0, 523.25, 659.25, 880.0];
        arp.forEach((f, i) => {
          this._tone(now + i * 0.11, 0.95, 'triangle', f, f, 0.18 * vol);
        });
        [146.83, 220.0, 293.66, 349.23, 440.0].forEach((f) => {
          this._tone(now + 0.55, 2.6, 'sawtooth', f, f, 0.075 * vol, 950);
        });
        break;
      }

      case 'ending_chaos':
        // Dramatic alarm + bass drop + shatter + chaotic synth
        this._tone(now, 0.9, 'sawtooth', 180, 42, 0.36 * vol, 450);
        this.playSfx('crash', { volume: vol * 0.9 });
        for (let i = 0; i < 4; i++) {
          const t = now + 0.25 + i * 0.35;
          this._tone(t, 0.28, 'sawtooth', 620, 940, 0.14 * vol, 1800);
        }
        break;

      case 'ending_internet': {
        // Glitch notification cascade + tragicomic descending synth
        [1200, 960, 1440, 820].forEach((f, i) => {
          this._tone(now + i * 0.08, 0.07, 'square', f, f * 0.95, 0.12 * vol);
        });
        const sad = [392.0, 369.99, 349.23, 329.63];
        sad.forEach((f, i) => {
          const dur = i === 3 ? 1.1 : 0.32;
          this._tone(now + 0.42 + i * 0.34, dur, 'sawtooth', f, i === 3 ? f * 0.92 : f, 0.15 * vol, 720);
        });
        break;
      }

      default:
        this._tone(now, 0.06, 'sine', 660 * pitch, 820 * pitch, 0.14 * vol);
        break;
    }
  }

  _tone(startTime, duration, type, startFreq, endFreq, peakGain, lowpassFreq = 0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peakGain), startTime + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    if (lowpassFreq > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassFreq;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  _noiseBurst(startTime, duration, filterType, freq, q, peakGain, buffer) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer || this.whiteBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peakGain), startTime + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(startTime);
    src.stop(startTime + duration + 0.03);
  }

  destroy() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    if (typeof window !== 'undefined' && this._unlockHandler) {
      window.removeEventListener('pointerdown', this._unlockHandler);
      window.removeEventListener('keydown', this._unlockHandler);
      window.removeEventListener('touchstart', this._unlockHandler);
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export default AudioManager;
