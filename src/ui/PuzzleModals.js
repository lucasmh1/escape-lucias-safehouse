import { VOICEMAIL, CLUES } from '../story/StoryData.js';

/**
 * Interactive tactile modal overlays for all 5 puzzles plus Voicemail & Clue notes.
 */
export class PuzzleModals {
  /**
   * @param {HTMLElement} containerEl
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../puzzles/PuzzleManager.js').PuzzleManager} puzzleManager
   */
  constructor(containerEl, eventBus, gameState, puzzleManager) {
    this.container = containerEl;
    this.bus = eventBus;
    this.gameState = gameState;
    this.puzzleManager = puzzleManager;

    this._backdropEl = null;
    this._activeId = null;
    this._rafId = null;
    this._keyHandler = null;
    this._cleanupFn = null;
  }

  isOpen() {
    return Boolean(this._activeId);
  }

  getActiveId() {
    return this._activeId;
  }

  /**
   * Opens a puzzle, voicemail, or clue modal.
   * @param {string} modalId 'tv' | 'turkey' | 'security' | 'radio' | 'safe' | 'voicemail' | 'clue'
   * @param {object} [data]
   */
  open(modalId, data = {}) {
    this.close(false);
    this._activeId = modalId;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close(true);
    });

    const card = document.createElement('div');
    card.className = 'glass-panel modal-card';
    if (modalId === 'safe' || modalId === 'clue') {
      card.classList.add('compact');
    }
    backdrop.appendChild(card);
    this.container.appendChild(backdrop);
    this._backdropEl = backdrop;

    switch (modalId) {
      case 'tv':
        this._renderTV(card);
        break;
      case 'turkey':
        this._renderOven(card);
        break;
      case 'security':
        this._renderCCTV(card);
        break;
      case 'radio':
        this._renderRadio(card);
        break;
      case 'safe':
        this._renderSafe(card);
        break;
      case 'voicemail':
        this._renderVoicemail(card);
        break;
      case 'clue':
        this._renderClue(card, data);
        break;
      default:
        this._renderClue(card, { title: data.title || 'Inspect', text: data.text || '' });
        break;
    }
  }

  close(emitEvent = true) {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (typeof this._cleanupFn === 'function') {
      this._cleanupFn();
      this._cleanupFn = null;
    }
    if (this._backdropEl && this._backdropEl.parentNode) {
      this._backdropEl.parentNode.removeChild(this._backdropEl);
    }
    const prevId = this._activeId;
    this._backdropEl = null;
    this._activeId = null;

    if (emitEvent && prevId) {
      this.bus.emit('modal:close', { modalId: prevId });
    }
  }

  _headerHtml(title, subtitle) {
    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${title}</h2>
          ${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}
        </div>
        <button class="modal-close-btn" data-action="close" aria-label="Close">✕</button>
      </div>
    `;
  }

  _bindClose(card) {
    const btn = card.querySelector('[data-action="close"]');
    if (btn) {
      btn.addEventListener('click', () => {
        this.bus.emit('sfx:play', { name: 'ui_click' });
        this.close(true);
      });
    }
  }

  /* ======================== 1. TV DEBATE MODAL ======================== */
  _renderTV(card) {
    const puzzle = this.puzzleManager?.getPuzzle('tv');
    if (!puzzle) return;

    const chatHistory = [];
    const render = () => {
      const st = puzzle.getState();
      const ch = st.channel;
      const dots = Array.from({ length: st.sequenceLength }, (_, i) => {
        const active = i < st.sequenceProgress;
        return `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${active ? 'var(--neon-success)' : 'rgba(255,255,255,0.16)'};box-shadow:${active ? '0 0 10px var(--neon-success)' : 'none'};"></span>`;
      }).join('');

      const screenHtml = st.solved && st.emergencyBroadcast
        ? `
          <div class="tv-screen" style="border-color:var(--neon-success); box-shadow:0 0 24px rgba(0,245,155,0.22);">
            <div class="tv-top-bar">
              <span class="tv-badge" style="background:var(--neon-success);color:#04110b;">OVERRIDE LOCKED</span>
              <span style="color:var(--neon-success);">CH 0${st.channelNumber} • SIGNAL DECRYPTED</span>
            </div>
            <div class="tv-headline" style="color:var(--neon-success);">${st.emergencyBroadcast.title}</div>
            <div class="tv-body" style="color:var(--text-primary);font-size:0.95rem;">${st.emergencyBroadcast.message}</div>
            <div class="tv-ticker" style="color:var(--neon-success);">SAFE DIGIT #1: [ ${st.emergencyBroadcast.digit} ] • NEXT: KITCHEN THANKSGIVING TURKEY OVEN</div>
          </div>
        `
        : `
          <div class="tv-screen" style="border-color:${ch.accent}88;">
            <div class="tv-top-bar">
              <span class="tv-badge" style="background:${ch.accent};">CH 0${ch.number} • ${ch.callsign}</span>
              <span style="color:var(--text-secondary);">${ch.show}</span>
            </div>
            <div class="tv-headline">${ch.headline}</div>
            <div class="tv-body">${ch.body}</div>
            <div class="tv-ticker">${ch.ticker}</div>
          </div>
        `;

      card.innerHTML = `
        ${this._headerHtml('4K SMART TV & REMOTE', 'LIVING ROOM ENTERTAINMENT WALL')}
        ${screenHtml}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:0.76rem;color:var(--text-secondary);">
            OVERRIDE SIGNAL: ${dots}
          </div>
          <div style="font-family:var(--font-mono);font-size:0.74rem;color:var(--text-muted);">
            Select channels 1–6 to scan broadcasts
          </div>
        </div>
        <div class="tv-controls-grid">
          ${st.channels.map((c) => `
            <button class="btn btn-sm ${c.number === st.channelNumber ? 'btn-cyan' : ''}" data-ch="${c.number}">
              CH 0${c.number}
            </button>
          `).join('')}
        </div>
        <div class="tv-chat-box">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--neon-violet);">
              LIVE COMMENT SECTION (${st.internetArguments}/${st.argumentThreshold} HOT TAKES)
            </span>
            <button class="btn btn-sm btn-danger" data-action="hot-take">
              🔥 Post Hot Take in Chat
            </button>
          </div>
          <div class="tv-chat-log">
            <div style="color:var(--text-secondary);">${ch.chatSnippet}</div>
            ${chatHistory.map((item) => `
              <div style="color:var(--neon-cyan);"><strong>YOU:</strong> ${item.take}</div>
              <div style="color:#ffb3d1;">${item.reply}</div>
            `).join('')}
          </div>
        </div>
      `;

      this._bindClose(card);
      card.querySelectorAll('[data-ch]').forEach((btn) => {
        btn.addEventListener('click', () => {
          puzzle.selectChannel(Number(btn.dataset.ch));
          render();
        });
      });

      const hotTakeBtn = card.querySelector('[data-action="hot-take"]');
      if (hotTakeBtn) {
        hotTakeBtn.addEventListener('click', () => {
          const res = puzzle.postHotTake();
          chatHistory.push({ take: res.take, reply: res.reply });
          if (!res.triggeredEnding) {
            render();
          }
        });
      }
    };

    render();
  }

  /* ======================== 2. TURKEY OVEN MODAL ======================== */
  _renderOven(card) {
    const puzzle = this.puzzleManager?.getPuzzle('turkey');
    if (!puzzle) return;

    const render = () => {
      const st = puzzle.getState();
      const cfg = st.config;
      const isHotDanger = st.temp >= cfg.chaosTemp && st.time >= cfg.chaosTime;

      card.innerHTML = `
        ${this._headerHtml('VICE-CHEF 9000 SMART OVEN', 'KITCHEN — DECOY THANKSGIVING TURKEY')}
        <div class="oven-readout">
          <div class="led-box" style="${st.temp >= 500 ? 'border-color:var(--neon-danger);' : ''}">
            <div class="led-label">TEMPERATURE (°F)</div>
            <div class="led-value" style="${st.temp >= 500 ? 'color:var(--neon-danger);' : ''}">${st.temp}°F</div>
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;justify-content:center;">
              <button class="btn btn-sm" data-temp-delta="-${cfg.tempStep}" ${st.solved ? 'disabled' : ''}>-25</button>
              <input type="range" min="${cfg.minTemp}" max="${cfg.maxTemp}" step="${cfg.tempStep}" value="${st.temp}" data-role="temp-slider" ${st.solved ? 'disabled' : ''} style="width:120px;accent-color:var(--neon-amber);" />
              <button class="btn btn-sm" data-temp-delta="${cfg.tempStep}" ${st.solved ? 'disabled' : ''}>+25</button>
            </div>
          </div>
          <div class="led-box">
            <div class="led-label">ROAST TIMER (MIN)</div>
            <div class="led-value">${st.time} MIN</div>
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;justify-content:center;">
              <button class="btn btn-sm" data-time-delta="-${cfg.timeStep}" ${st.solved ? 'disabled' : ''}>-5</button>
              <input type="range" min="${cfg.minTime}" max="${cfg.maxTime}" step="${cfg.timeStep}" value="${st.time}" data-role="time-slider" ${st.solved ? 'disabled' : ''} style="width:120px;accent-color:var(--neon-amber);" />
              <button class="btn btn-sm" data-time-delta="${cfg.timeStep}" ${st.solved ? 'disabled' : ''}>+5</button>
            </div>
          </div>
        </div>
        <div class="clue-entry" style="border-color:${st.solved ? 'var(--neon-success)' : st.status === 'failed' ? 'var(--neon-danger)' : 'rgba(255,176,32,0.4)'};">
          <h4 style="color:${st.solved ? 'var(--neon-success)' : st.status === 'failed' ? 'var(--neon-danger)' : 'var(--neon-amber)'};">
            ${st.solved ? (st.burned ? 'THERMAL RUNAWAY — CANISTER RECOVERED' : 'THAW COMPLETE — CANISTER OPENED') : 'OVEN STATUS'}
          </h4>
          <p>${st.feedback}</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="font-family:var(--font-mono);font-size:0.74rem;color:${isHotDanger ? 'var(--neon-danger)' : 'var(--text-muted)'};">
            ${isHotDanger ? '⚠️ WARNING: 550°F / 90 MIN WILL IGNITE THE PENTHOUSE (+$25,000 DAMAGE)' : 'Tip: Check the marble island recipe card, fridge note & kitchen drawer manual.'}
          </span>
          <button class="btn ${isHotDanger ? 'btn-danger' : 'btn-primary'}" data-action="bake" ${st.solved ? 'disabled' : ''}>
            ${st.solved ? '✓ Cycle Complete' : isHotDanger ? '🔥 IGNITE MAX HEAT' : '▶ Start Bake / Thaw'}
          </button>
        </div>
      `;

      this._bindClose(card);

      const tempSlider = card.querySelector('[data-role="temp-slider"]');
      const timeSlider = card.querySelector('[data-role="time-slider"]');
      tempSlider?.addEventListener('input', () => {
        puzzle.setTemperature(Number(tempSlider.value));
        render();
      });
      timeSlider?.addEventListener('input', () => {
        puzzle.setTime(Number(timeSlider.value));
        render();
      });

      card.querySelectorAll('[data-temp-delta]').forEach((b) => {
        b.addEventListener('click', () => {
          puzzle.setTemperature(st.temp + Number(b.dataset.tempDelta));
          render();
        });
      });
      card.querySelectorAll('[data-time-delta]').forEach((b) => {
        b.addEventListener('click', () => {
          puzzle.setTime(st.time + Number(b.dataset.timeDelta));
          render();
        });
      });

      card.querySelector('[data-action="bake"]')?.addEventListener('click', () => {
        puzzle.bake();
        render();
      });
    };

    render();
  }

  /* ======================== 3. CCTV SECURITY MODAL ======================== */
  _renderCCTV(card) {
    const puzzle = this.puzzleManager?.getPuzzle('security');
    if (!puzzle) return;

    const render = () => {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }

      const st = puzzle.getState();
      const cam = st.camera;
      const frame = st.frame;

      card.innerHTML = `
        ${this._headerHtml('CCTV SECURITY TERMINAL', 'PENTHOUSE SURVEILLANCE ARCHIVE — 02:10 TO 02:22 AM')}
        <div class="cctv-cam-buttons">
          ${st.cameras.map((c) => `
            <button class="btn btn-sm ${c.index === st.selectedCam ? 'btn-cyan' : ''}" data-cam="${c.index}">
              ${c.name}
            </button>
          `).join('')}
        </div>
        <div class="cctv-canvas-wrap">
          <canvas class="cctv-canvas" data-role="cctv-canvas" width="680" height="220"></canvas>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.76rem;color:var(--neon-success);">
            <span>TIMESTAMP SCRUBBER: ${frame.time} AM</span>
            <span>FRAME ${st.selectedFrame + 1} / ${cam.frames.length}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(${cam.frames.length}, 1fr);gap:6px;">
            ${cam.frames.map((f, idx) => `
              <button class="btn btn-sm ${idx === st.selectedFrame ? 'btn-primary' : ''}" data-frame="${idx}" style="font-family:var(--font-mono);padding:7px 4px;">
                ${f.time}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="clue-entry" style="border-color:${st.solved ? 'var(--neon-success)' : frame.anomaly ? 'var(--neon-danger)' : 'rgba(0,245,155,0.35)'};">
          <h4 style="color:${st.solved ? 'var(--neon-success)' : 'var(--neon-cyan)'};">FEED LOG — ${cam.name} (${frame.time} AM)</h4>
          <p>${frame.caption}</p>
          <p style="margin-top:6px;color:var(--text-muted);">${st.feedback}</p>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button class="btn btn-danger" data-action="flag" ${st.solved ? 'disabled' : ''}>
            ${st.solved ? '✓ Anomaly Verified (Digit #3: 9)' : '🚩 Flag Timestamp Anomaly'}
          </button>
        </div>
      `;

      this._bindClose(card);
      card.querySelectorAll('[data-cam]').forEach((b) => {
        b.addEventListener('click', () => {
          puzzle.selectCamera(Number(b.dataset.cam));
          render();
        });
      });
      card.querySelectorAll('[data-frame]').forEach((b) => {
        b.addEventListener('click', () => {
          puzzle.selectTimestamp(Number(b.dataset.frame));
          render();
        });
      });
      card.querySelector('[data-action="flag"]')?.addEventListener('click', () => {
        puzzle.flagAnomaly();
        render();
      });

      const canvas = card.querySelector('[data-role="cctv-canvas"]');
      if (canvas) {
        this._animateCCTVCanvas(canvas, cam, frame, st.solved);
      }
    };

    render();
  }

  _animateCCTVCanvas(canvas, cam, frame, solved) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let tick = 0;

    const draw = () => {
      if (this._activeId !== 'security') return;
      tick += 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#04110c';
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural perspective grid
      ctx.strokeStyle = 'rgba(0, 245, 155, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 26, w - 60, h - 52);
      ctx.beginPath();
      ctx.moveTo(30, h - 26);
      ctx.lineTo(140, h - 80);
      ctx.lineTo(w - 140, h - 80);
      ctx.lineTo(w - 30, h - 26);
      ctx.stroke();

      // If corrupted anomaly frame, render shadowy figure & glitch bars
      if (frame.anomaly) {
        for (let i = 0; i < 6; i++) {
          const gy = (Math.sin(tick * 0.18 + i * 2) * 0.5 + 0.5) * h;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 42, 133, 0.22)' : 'rgba(0, 240, 255, 0.18)';
          ctx.fillRect(0, gy, w, 4 + (i % 3) * 3);
        }
        // Shadowy silhouette
        ctx.fillStyle = 'rgba(0, 245, 155, 0.35)';
        ctx.beginPath();
        ctx.arc(w * 0.62, h * 0.44, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(w * 0.62 - 20, h * 0.44 + 18, 40, 68);
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // HUD overlay text
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillStyle = frame.anomaly ? '#ff3b5c' : '#00f59b';
      ctx.fillText(`● REC  ${cam.name} (${cam.location})`, 20, 26);
      ctx.fillText(`TIME: ${frame.time}:00 AM`, w - 185, 26);

      if (solved) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('DECRYPTED CIPHER: SAFE DIGIT #3 = [ 9 ]', 20, h - 18);
      } else if (frame.anomaly) {
        ctx.fillStyle = '#ff3b5c';
        ctx.fillText('!! TIMECODE SPLICE DETECTED !!', 20, h - 18);
      }

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }

  /* ======================== 4. ANALOG RADIO MODAL ======================== */
  _renderRadio(card) {
    const puzzle = this.puzzleManager?.getPuzzle('radio');
    if (!puzzle) return;

    puzzle.onOpen?.();
    this._cleanupFn = () => puzzle.onClose?.();

    const render = () => {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }

      const st = puzzle.getState();
      const cfg = st.config;
      const pct = Math.round(st.clarity * 100);

      card.innerHTML = `
        ${this._headerHtml('ANALOG PIRATE RADIO TRANSCEIVER', 'SECURITY ROOM — 88.0 TO 108.0 MHz')}
        <div class="radio-freq-display">
          <div>
            <div class="led-label">TUNED FREQUENCY</div>
            <div class="radio-freq-num">${st.frequency.toFixed(1)} <span style="font-size:1rem;">MHz</span></div>
          </div>
          <div style="text-align:right;">
            <div class="led-label">SIGNAL CLARITY</div>
            <div style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:${pct >= 90 ? 'var(--neon-success)' : 'var(--neon-pink)'};">${pct}%</div>
          </div>
        </div>
        <div class="signal-bar-track">
          <div class="signal-bar-fill" style="width:${pct}%;"></div>
        </div>
        <canvas class="radio-waveform" data-role="radio-wave" width="680" height="110"></canvas>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-sm" data-nudge="-0.5" ${st.solved ? 'disabled' : ''}>-0.5</button>
          <button class="btn btn-sm" data-nudge="-0.1" ${st.solved ? 'disabled' : ''}>-0.1</button>
          <input type="range" min="${cfg.minFreq}" max="${cfg.maxFreq}" step="${cfg.step}" value="${st.frequency}" data-role="freq-slider" ${st.solved ? 'disabled' : ''} style="flex:1;accent-color:var(--neon-cyan);" />
          <button class="btn btn-sm" data-nudge="0.1" ${st.solved ? 'disabled' : ''}>+0.1</button>
          <button class="btn btn-sm" data-nudge="0.5" ${st.solved ? 'disabled' : ''}>+0.5</button>
        </div>
        <div class="clue-entry" style="border-color:${st.solved ? 'var(--neon-success)' : 'rgba(0,240,255,0.35)'};">
          <h4 style="color:${st.solved ? 'var(--neon-success)' : 'var(--neon-cyan)'};">
            ${st.station ? st.station.name : 'OPEN BAND STATIC'}
          </h4>
          <p>${st.transcript}</p>
          <p style="margin-top:6px;color:var(--text-muted);">${st.feedback}</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--text-muted);">
            Tip: Use ← / → arrow keys for 0.1 MHz precision tuning
          </span>
          <button class="btn btn-primary" data-action="lock" ${st.solved ? 'disabled' : ''}>
            ${st.solved ? '✓ Signal Locked (Digit #4: 2)' : '📡 Lock Signal'}
          </button>
        </div>
      `;

      this._bindClose(card);

      const slider = card.querySelector('[data-role="freq-slider"]');
      slider?.addEventListener('input', () => {
        puzzle.setFrequency(Number(slider.value));
        render();
      });

      card.querySelectorAll('[data-nudge]').forEach((b) => {
        b.addEventListener('click', () => {
          puzzle.nudgeFrequency(Number(b.dataset.nudge));
          render();
        });
      });

      card.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
        puzzle.lockSignal();
        render();
      });

      const waveCanvas = card.querySelector('[data-role="radio-wave"]');
      if (waveCanvas) {
        this._animateRadioWave(waveCanvas, st.clarity, st.solved);
      }
    };

    this._keyHandler = (e) => {
      if (this._activeId !== 'radio') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        puzzle.nudgeFrequency(-0.1);
        render();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        puzzle.nudgeFrequency(0.1);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        puzzle.lockSignal();
        render();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    render();
  }

  _animateRadioWave(canvas, clarity, solved) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let phase = 0;

    const draw = () => {
      if (this._activeId !== 'radio') return;
      phase += 0.12;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Waveform
      ctx.strokeStyle = solved || clarity > 0.9 ? '#00f59b' : clarity > 0.5 ? '#00f0ff' : '#ff2a85';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const noiseAmp = (1 - clarity) * 28;
      const signalAmp = 10 + clarity * 26;
      for (let x = 0; x < w; x += 4) {
        const sine = Math.sin(x * 0.045 + phase) * signalAmp;
        const noise = (Math.random() - 0.5) * 2 * noiseAmp;
        const y = h / 2 + sine + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }

  /* ======================== 5. WALL SAFE KEYPAD MODAL ======================== */
  _renderSafe(card) {
    const puzzle = this.puzzleManager?.getPuzzle('safe');
    if (!puzzle) return;

    const render = () => {
      const st = puzzle.getState();
      const padded = (st.codeEntered || '').padEnd(st.maxLength, '•');

      card.innerHTML = `
        ${this._headerHtml('SECURITY WALL SAFE', '4-DIGIT MASTER VAULT')}
        <div class="safe-display" style="${st.solved ? 'color:var(--neon-success);border-color:var(--neon-success);' : st.status === 'error' ? 'color:var(--neon-danger);border-color:var(--neon-danger);' : ''}">
          ${padded}
        </div>
        <div class="safe-digits-strip">
          ${st.discoveredDigits.map((d) => `
            <span class="puzzle-pill ${d.digit !== null ? 'solved' : ''}">
              ${d.label}: ${d.digit !== null ? d.digit : '?'}
            </span>
          `).join('')}
        </div>
        <div class="safe-keypad">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'].map((k) => `
            <button class="btn safe-key ${k === 'ENT' ? 'btn-primary' : k === 'CLR' ? 'btn-danger' : ''}" data-key="${k}" ${st.solved ? 'disabled' : ''}>
              ${k}
            </button>
          `).join('')}
        </div>
        <div class="clue-entry" style="border-color:${st.solved ? 'var(--neon-success)' : st.status === 'error' ? 'var(--neon-danger)' : 'var(--border-subtle)'};">
          <p>${st.feedback}</p>
        </div>
      `;

      this._bindClose(card);
      card.querySelectorAll('[data-key]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.key;
          if (k === 'CLR') puzzle.clear();
          else if (k === 'ENT') puzzle.submit();
          else puzzle.pressDigit(k);
          render();
        });
      });
    };

    this._keyHandler = (e) => {
      if (this._activeId !== 'safe') return;
      if (e.key >= '0' && e.key <= '9') {
        puzzle.pressDigit(e.key);
        render();
      } else if (e.key === 'Backspace') {
        puzzle.backspace();
        render();
      } else if (e.key === 'Enter') {
        puzzle.submit();
        render();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    render();
  }

  /* ======================== 6. VOICEMAIL MODAL ======================== */
  _renderVoicemail(card) {
    this.gameState.setFlag('voicemailHeard', true);
    this.gameState.addClue({
      id: CLUES.voicemail_dock.id,
      title: CLUES.voicemail_dock.title,
      text: CLUES.voicemail_dock.highlight,
      room: 'bedroom',
      puzzleId: 'security',
    });
    this.bus.emit('sfx:play', { name: 'voicemail_beep' });

    card.innerHTML = `
      ${this._headerHtml(`VOICEMAIL — ${VOICEMAIL.speaker}`, `${VOICEMAIL.timestamp} • LENGTH ${VOICEMAIL.duration}`)}
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${VOICEMAIL.lines.map((line) => `
          <div class="clue-entry" style="border-color:rgba(255,42,133,0.35);">
            <p style="color:var(--text-primary);font-size:0.9rem;">"${line}"</p>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button class="btn btn-cyan" data-action="close">Got It — Start Escaping</button>
      </div>
    `;
    this._bindClose(card);
  }

  /* ======================== 7. READABLE CLUE MODAL ======================== */
  _renderClue(card, data) {
    const clueObj = (data.clueId && CLUES[data.clueId]) || data;
    const title = clueObj.title || 'Clue Note';
    const subtitle = clueObj.subtitle || '';
    const text = clueObj.text || '';
    const highlight = clueObj.highlight || '';

    if (clueObj.id) {
      this.gameState.addClue({
        id: clueObj.id,
        title,
        text: highlight || text,
        room: clueObj.room || this.gameState.data.currentRoom,
        puzzleId: clueObj.puzzleId || null,
      });
    }

    card.innerHTML = `
      ${this._headerHtml(title, subtitle)}
      ${highlight ? `
        <div class="clue-entry" style="border-color:var(--neon-pink);background:rgba(255,42,133,0.1);">
          <h4 style="color:var(--neon-pink);">KEY TAKEAWAY</h4>
          <p style="color:var(--text-primary);">${highlight}</p>
        </div>
      ` : ''}
      <div class="clue-entry">
        <p style="color:var(--text-primary);font-size:0.9rem;">${text}</p>
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button class="btn btn-cyan" data-action="close">Close Note</button>
      </div>
    `;
    this._bindClose(card);
  }
}

export default PuzzleModals;
