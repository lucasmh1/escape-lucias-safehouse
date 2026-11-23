/**
 * VisualPolish — Lightweight 2D cinematic post-FX overlay & graphics quality controller.
 * Renders subtle neo-noir vignette, balcony raindrop mist, lightning screen-flash,
 * scanline/RGB glitch pulses (CCTV/TV/Chaos), and turkey smoke haze.
 */

const QUALITY_CONFIG = {
  low: {
    maxPixelRatio: 1.0,
    shadows: false,
    overlayDpr: 0.75,
    raindropCount: 16,
    enableVignette: true,
    enableScanlines: false,
  },
  medium: {
    maxPixelRatio: 1.5,
    shadows: true,
    overlayDpr: 1.0,
    raindropCount: 34,
    enableVignette: true,
    enableScanlines: true,
  },
  high: {
    maxPixelRatio: 2.0,
    shadows: true,
    overlayDpr: 1.25,
    raindropCount: 56,
    enableVignette: true,
    enableScanlines: true,
  },
};

export class VisualPolish {
  /**
   * @param {HTMLElement | null} containerEl
   * @param {import('three').WebGLRenderer | null} renderer
   * @param {object | null} world
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(containerEl, renderer, world, eventBus, gameState) {
    this.container = containerEl || (typeof document !== 'undefined' ? document.body : null);
    this.renderer = renderer || null;
    this.world = world || null;
    this.bus = eventBus;
    this.state = gameState;

    this.quality = gameState?.data?.settings?.quality || 'high';
    this.config = QUALITY_CONFIG[this.quality] || QUALITY_CONFIG.high;

    // Effect states
    this.currentRoom = gameState?.data?.currentRoom || 'living_room';
    this.balconyWetness = this.currentRoom === 'balcony' ? 1 : 0;
    this.lightningAlpha = 0;
    this.lightningTimer = 0;
    this.glitchTimer = 0;
    this.glitchDuration = 0.35;
    this.smokeLevel = 0;
    this.monitorOverlayActive = false;

    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.raindrops = [];
    this._unsubs = [];

    this._initCanvas();
    this._seedRaindrops();
    this._bindEvents();
    this.applyQuality(this.quality);
  }

  _initCanvas() {
    if (typeof document === 'undefined' || !this.container) return;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'visual-polish-overlay';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '5',
      display: 'block',
    });

    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._onResize = () => this._resizeCanvas();
    window.addEventListener('resize', this._onResize, { passive: true });
    this._resizeCanvas();
  }

  _resizeCanvas() {
    if (!this.canvas || typeof window === 'undefined') return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.overlayDpr);
    this.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    this.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  _seedRaindrops() {
    const count = this.config.raindropCount;
    this.raindrops = [];
    for (let i = 0; i < count; i++) {
      this.raindrops.push(this._makeRaindrop(true));
    }
  }

  _makeRaindrop(randomY = false) {
    return {
      x: Math.random(),
      y: randomY ? Math.random() : -0.05 - Math.random() * 0.2,
      radius: 1.5 + Math.random() * 4.5,
      speed: 0.08 + Math.random() * 0.22,
      drift: (Math.random() - 0.5) * 0.015,
      alpha: 0.14 + Math.random() * 0.26,
      tint: Math.random() > 0.5 ? 'rgba(255, 110, 210,' : 'rgba(110, 240, 255,',
      streakLen: 8 + Math.random() * 24,
    };
  }

  _bindEvents() {
    if (!this.bus) return;

    this._unsubs.push(
      this.bus.on('settings:changed', (settings) => {
        if (settings?.quality && settings.quality !== this.quality) {
          this.applyQuality(settings.quality);
        }
      }),
      this.bus.on('player:roomChanged', ({ roomId } = {}) => {
        if (roomId) this.currentRoom = roomId;
      }),
      this.bus.on('world:lightning', () => {
        this.triggerLightningFlash();
      }),
      this.bus.on('world:tvUpdate', () => {
        this.triggerGlitch(0.18);
      }),
      this.bus.on('world:cctvUpdate', () => {
        this.triggerGlitch(0.24);
      }),
      this.bus.on('chaos:damage', () => {
        this.triggerGlitch(0.32);
      }),
      this.bus.on('world:turkeySmoke', ({ level } = {}) => {
        this.smokeLevel = Math.max(0, Math.min(1, Number(level) || 0));
      }),
      this.bus.on('puzzle:open', ({ puzzleId } = {}) => {
        if (puzzleId === 'security' || puzzleId === 'tv') {
          this.monitorOverlayActive = true;
          this.triggerGlitch(0.22);
        }
      }),
      this.bus.on('modal:close', () => {
        this.monitorOverlayActive = false;
      }),
      this.bus.on('game:ending', ({ endingId } = {}) => {
        this.monitorOverlayActive = false;
        if (endingId === 'TOTAL_CHAOS' || endingId === 'INTERNET_VICTIM') {
          this.triggerGlitch(0.75);
        }
      }),
      this.bus.on('state:reset', () => {
        this.currentRoom = 'living_room';
        this.balconyWetness = 0;
        this.smokeLevel = 0;
        this.glitchTimer = 0;
        this.lightningAlpha = 0;
        this.monitorOverlayActive = false;
      })
    );
  }

  /**
   * Apply graphics quality preset ('low' | 'medium' | 'high') to renderer, shadows, bloom, and FX.
   * @param {'low' | 'medium' | 'high'} quality
   */
  applyQuality(quality) {
    const q = QUALITY_CONFIG[quality] ? quality : 'high';
    this.quality = q;
    this.config = QUALITY_CONFIG[q];

    if (this.renderer && typeof window !== 'undefined') {
      const pr = Math.min(window.devicePixelRatio || 1, this.config.maxPixelRatio);
      if (typeof this.renderer.setPixelRatio === 'function') {
        this.renderer.setPixelRatio(pr);
      }
      if (this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = this.config.shadows;
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    if (this.world && typeof this.world.setQuality === 'function') {
      this.world.setQuality(q);
    }

    this._resizeCanvas();
    this._seedRaindrops();
  }

  /**
   * Trigger a brief horizontal RGB glitch / scanline distortion pulse.
   * @param {number} [duration]
   */
  triggerGlitch(duration = 0.35) {
    const d = Math.max(0.08, Number(duration) || 0.35);
    this.glitchDuration = Math.max(this.glitchDuration, d);
    this.glitchTimer = Math.max(this.glitchTimer, d);
  }

  /**
   * Trigger a cinematic lightning screen-flash pulse.
   */
  triggerLightningFlash() {
    const peak = this.currentRoom === 'balcony' ? 0.36 : 0.17;
    this.lightningAlpha = Math.max(this.lightningAlpha, peak);
    this.lightningTimer = 0.38;
  }

  /**
   * Per-frame animation and 2D FX rendering.
   * @param {number} dt
   * @param {number} elapsed
   */
  update(dt, elapsed = 0) {
    if (!this.ctx || !this.canvas) return;
    const step = Math.min(dt || 0.016, 0.1);

    // Smoothly transition balcony mist/raindrops
    const targetWet = this.currentRoom === 'balcony' ? 1 : 0;
    this.balconyWetness += (targetWet - this.balconyWetness) * Math.min(1, step * 2.8);
    if (Math.abs(targetWet - this.balconyWetness) < 0.004) {
      this.balconyWetness = targetWet;
    }

    // Decay lightning flash with a subtle secondary flicker
    if (this.lightningTimer > 0) {
      this.lightningTimer = Math.max(0, this.lightningTimer - step);
      const norm = this.lightningTimer / 0.38;
      const doublePulse = norm > 0.55 && norm < 0.72 ? 1.25 : 1.0;
      const basePeak = this.currentRoom === 'balcony' ? 0.34 : 0.16;
      this.lightningAlpha = Math.min(0.45, basePeak * norm * norm * doublePulse);
    } else {
      this.lightningAlpha = 0;
    }

    // Decay glitch timer
    if (this.glitchTimer > 0) {
      this.glitchTimer = Math.max(0, this.glitchTimer - step);
    }

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Subtle neo-noir vignette
    if (this.config.enableVignette) {
      this._drawVignette(ctx, w, h);
    }

    // 2. Turkey smoke edge haze
    if (this.smokeLevel > 0.02) {
      this._drawSmokeHaze(ctx, w, h, elapsed);
    }

    // 3. Balcony camera raindrop mist & neon streaks
    if (this.balconyWetness > 0.01) {
      this._drawBalconyRain(ctx, w, h, step);
    }

    // 4. Lightning screen-flash pulse
    if (this.lightningAlpha > 0.005) {
      ctx.fillStyle = `rgba(185, 235, 255, ${this.lightningAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 5. Scanlines / RGB glitch pulse
    if (this.glitchTimer > 0) {
      this._drawGlitch(ctx, w, h);
    } else if (this.monitorOverlayActive && this.config.enableScanlines) {
      this._drawSubtleScanlines(ctx, w, h, 0.045);
    }
  }

  _drawVignette(ctx, w, h) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const innerR = Math.min(w, h) * 0.38;
    const outerR = Math.hypot(cx, cy);

    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.75, 'rgba(10, 4, 22, 0.16)');
    grad.addColorStop(1, 'rgba(6, 2, 16, 0.48)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawSmokeHaze(ctx, w, h, elapsed) {
    const pulse = 0.85 + Math.sin(elapsed * 1.8) * 0.15;
    const alpha = this.smokeLevel * 0.28 * pulse;
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.55);
    grad.addColorStop(0, `rgba(60, 46, 38, ${(alpha * 0.25).toFixed(3)})`);
    grad.addColorStop(1, `rgba(48, 34, 28, ${alpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawBalconyRain(ctx, w, h, step) {
    const wet = this.balconyWetness;

    // Subtle cool mist along top/bottom edges
    const mistGrad = ctx.createLinearGradient(0, 0, 0, h);
    mistGrad.addColorStop(0, `rgba(110, 210, 255, ${(0.08 * wet).toFixed(3)})`);
    mistGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
    mistGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
    mistGrad.addColorStop(1, `rgba(255, 80, 190, ${(0.07 * wet).toFixed(3)})`);
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 0, w, h);

    // Animated lens raindrops & streaks
    for (let i = 0; i < this.raindrops.length; i++) {
      const d = this.raindrops[i];
      d.y += d.speed * step;
      d.x += d.drift * step;

      if (d.y > 1.08) {
        this.raindrops[i] = this._makeRaindrop(false);
        continue;
      }

      const px = d.x * w;
      const py = d.y * h;
      const a = d.alpha * wet;

      // Translucent streak tail
      ctx.strokeStyle = `${d.tint} ${(a * 0.55).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, d.radius * 0.45);
      ctx.beginPath();
      ctx.moveTo(px, py - d.streakLen);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Glowing droplet bead
      ctx.fillStyle = `${d.tint} ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, d.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawGlitch(ctx, w, h) {
    const intensity = Math.min(1, this.glitchTimer / Math.max(0.08, this.glitchDuration));
    const slices = this.quality === 'low' ? 4 : 9;

    for (let i = 0; i < slices; i++) {
      const y = Math.random() * h;
      const sliceH = 2 + Math.random() * (h * 0.035);
      const isCyan = i % 2 === 0;
      const alpha = (0.08 + Math.random() * 0.18) * intensity;

      ctx.fillStyle = isCyan
        ? `rgba(0, 240, 255, ${alpha.toFixed(3)})`
        : `rgba(255, 42, 133, ${alpha.toFixed(3)})`;
      const xOffset = (Math.random() - 0.5) * w * 0.06 * intensity;
      ctx.fillRect(xOffset, y, w, sliceH);
    }

    if (this.config.enableScanlines) {
      this._drawSubtleScanlines(ctx, w, h, 0.12 * intensity);
    }
  }

  _drawSubtleScanlines(ctx, w, h, alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    const spacing = 4;
    for (let y = 0; y < h; y += spacing) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  destroy() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    if (typeof window !== 'undefined' && this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

export default VisualPolish;
