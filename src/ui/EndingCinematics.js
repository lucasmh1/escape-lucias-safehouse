import { ENDINGS } from '../story/StoryData.js';

/**
 * Plays dramatic multi-beat animated cinematic sequences for all 3 endings
 * (`CLEAN_GETAWAY`, `TOTAL_CHAOS`, `INTERNET_VICTIM`), then transitions cleanly
 * to the Shareable Results screen.
 */
export class EndingCinematics {
  /**
   * @param {HTMLElement} containerEl
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(containerEl, eventBus) {
    this.container = containerEl;
    this.bus = eventBus;
    this._stageEl = null;
    this._rafId = null;
    this._beatTimer = null;
    this._active = false;
    this._onComplete = null;
  }

  /**
   * Launch an ending cinematic sequence.
   * @param {'CLEAN_GETAWAY'|'TOTAL_CHAOS'|'INTERNET_VICTIM'} endingId
   * @param {() => void} onComplete
   */
  play(endingId, onComplete) {
    this.stop();
    const data = ENDINGS[endingId] || ENDINGS.CLEAN_GETAWAY;
    this._active = true;
    this._onComplete = onComplete;

    this.bus.emit('sfx:play', { name: data.sfx, volume: 0.9 });

    const stage = document.createElement('div');
    stage.className = 'ending-stage ui-interactive';
    stage.innerHTML = `
      <canvas class="ending-canvas"></canvas>
      <div class="ending-vignette"></div>
      <div class="ending-content">
        <div class="ending-badge" style="color:${data.accent}; border-color:${data.accent}66;">${data.badge}</div>
        <h1 class="ending-title" style="color:${data.accent}; text-shadow: 0 0 36px ${data.accent}66;">${data.title}</h1>
        <div style="font-family:var(--font-mono); font-size:0.86rem; letter-spacing:0.18em; color:var(--text-secondary);">${data.subtitle}</div>
        <div class="ending-beat-card" data-role="beat-card">
          <div class="ending-beat-heading" data-role="beat-heading" style="color:${data.secondary};"></div>
          <div class="ending-beat-text" data-role="beat-text"></div>
        </div>
        <div class="ending-actions">
          <button class="btn btn-cyan" data-action="next-beat">Next Beat →</button>
          <button class="btn" data-action="skip">Skip to Results</button>
        </div>
      </div>
    `;

    this.container.appendChild(stage);
    this._stageEl = stage;

    const canvas = stage.querySelector('.ending-canvas');
    this._startCanvasScene(canvas, data);

    const beats = [
      ...data.beats,
      { heading: 'EPILOGUE', text: data.punchline },
    ];
    let beatIdx = 0;

    const headingEl = stage.querySelector('[data-role="beat-heading"]');
    const textEl = stage.querySelector('[data-role="beat-text"]');
    const nextBtn = stage.querySelector('[data-action="next-beat"]');
    const skipBtn = stage.querySelector('[data-action="skip"]');

    const renderBeat = (idx) => {
      clearTimeout(this._beatTimer);
      if (idx >= beats.length) {
        this._finish();
        return;
      }
      const beat = beats[idx];
      headingEl.textContent = beat.heading;
      textEl.textContent = beat.text;
      nextBtn.textContent = idx === beats.length - 1 ? 'View Escape Report →' : 'Next Beat →';
      this._beatTimer = setTimeout(() => {
        if (this._active) {
          beatIdx += 1;
          renderBeat(beatIdx);
        }
      }, 5200);
    };

    nextBtn.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      beatIdx += 1;
      renderBeat(beatIdx);
    });

    skipBtn.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._finish();
    });

    renderBeat(0);
  }

  _finish() {
    const cb = this._onComplete;
    this.stop();
    if (typeof cb === 'function') cb();
  }

  stop() {
    this._active = false;
    clearTimeout(this._beatTimer);
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._stageEl && this._stageEl.parentNode) {
      this._stageEl.parentNode.removeChild(this._stageEl);
    }
    this._stageEl = null;
    this._onComplete = null;
  }

  _startCanvasScene(canvas, data) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const drops = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 3 + Math.random() * 7,
      len: 12 + Math.random() * 24,
    }));

    const startTime = performance.now();

    const draw = (now) => {
      if (!this._active) return;
      const t = (now - startTime) * 0.001;
      const w = canvas.width;
      const h = canvas.height;

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (data.id === 'CLEAN_GETAWAY') {
        grad.addColorStop(0, '#070b24');
        grad.addColorStop(0.5, '#190c36');
        grad.addColorStop(1, '#051c2c');
      } else if (data.id === 'TOTAL_CHAOS') {
        grad.addColorStop(0, '#1e0614');
        grad.addColorStop(0.5, '#350a18');
        grad.addColorStop(1, '#12081e');
      } else {
        grad.addColorStop(0, '#0c0720');
        grad.addColorStop(0.5, '#240b3c');
        grad.addColorStop(1, '#09091c');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Neon horizon sun / moon glow
      const horizonY = h * 0.56;
      const sunGrad = ctx.createRadialGradient(w * 0.5, horizonY - 40, 10, w * 0.5, horizonY - 40, 220);
      sunGrad.addColorStop(0, `${data.accent}99`);
      sunGrad.addColorStop(0.45, `${data.secondary}44`);
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // Perspective synthwave grid / wet boulevard
      ctx.strokeStyle = `${data.accent}44`;
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * 36, horizonY);
        ctx.lineTo(w * 0.5 + i * 240, h);
        ctx.stroke();
      }
      for (let r = 0; r < 10; r++) {
        const p = ((r / 10) + (t * 0.25) % 0.1);
        const y = horizonY + Math.pow(p, 1.8) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // City skyline silhouettes
      ctx.fillStyle = '#070815';
      const buildingCount = 18;
      for (let i = 0; i < buildingCount; i++) {
        const bw = w / buildingCount;
        const bh = 60 + ((i * 53) % 130);
        const bx = i * bw;
        ctx.fillRect(bx + 2, horizonY - bh, bw - 4, bh);
        // Neon roof trim
        ctx.fillStyle = i % 2 === 0 ? `${data.accent}aa` : `${data.secondary}aa`;
        ctx.fillRect(bx + 4, horizonY - bh, bw - 8, 2);
        ctx.fillStyle = '#070815';
      }

      // Ending-specific foreground accents
      if (data.id === 'TOTAL_CHAOS') {
        // Flashing police siren glow left/right
        const pulse = Math.sin(t * 9) > 0;
        ctx.fillStyle = pulse ? 'rgba(255, 42, 85, 0.14)' : 'rgba(0, 180, 255, 0.14)';
        ctx.fillRect(0, 0, w, h);
      } else if (data.id === 'INTERNET_VICTIM') {
        // Floating comment notification bubbles
        ctx.font = '600 13px "JetBrains Mono", monospace';
        const tags = ['+1 REPLY', 'RATIO\'D', '30 FPS?!', '412 TYPING...', 'QUOTE-POSTED'];
        for (let i = 0; i < 8; i++) {
          const x = ((i * 197 + t * 28) % (w + 180)) - 90;
          const y = 70 + ((i * 83) % Math.max(120, horizonY - 80));
          ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
          ctx.fillRect(x, y, 130, 28);
          ctx.strokeStyle = 'rgba(255, 42, 133, 0.55)';
          ctx.strokeRect(x, y, 130, 28);
          ctx.fillStyle = '#f6f7ff';
          ctx.fillText(tags[i % tags.length], x + 12, y + 18);
        }
      }

      // Neon rain streaks
      ctx.strokeStyle = `${data.accent}55`;
      ctx.lineWidth = 1.2;
      for (const d of drops) {
        d.y += d.speed;
        d.x -= 0.8;
        if (d.y > h) {
          d.y = -d.len;
          d.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
      }

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }
}

export default EndingCinematics;
