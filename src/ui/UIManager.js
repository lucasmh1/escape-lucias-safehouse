import { ENDINGS, INSPECT_LINES, getCurrentObjective } from '../story/StoryData.js';
import { PuzzleModals } from './PuzzleModals.js';
import { EndingCinematics } from './EndingCinematics.js';

function formatTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatMoney(amount) {
  return `$${Math.round(amount || 0).toLocaleString()}`;
}

const PUZZLE_LABELS = [
  { id: 'tv', label: 'TV' },
  { id: 'turkey', label: 'OVEN' },
  { id: 'security', label: 'CCTV' },
  { id: 'radio', label: 'RADIO' },
  { id: 'safe', label: 'SAFE' },
];

export class UIManager {
  /**
   * @param {HTMLElement} rootEl
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../puzzles/PuzzleManager.js').PuzzleManager} puzzleManager
   */
  constructor(rootEl, eventBus, gameState, puzzleManager) {
    this.root = rootEl;
    this.bus = eventBus;
    this.gameState = gameState;
    this.puzzleManager = puzzleManager;

    this._unsubs = [];
    this._layers = {};
    this._subtitleTimer = null;
    this._subtitleRemaining = 0;
    this._hoveredInteractable = null;
    this._currentRoomName = 'Living Room';
    this._inventoryOpen = false;
    this._inventoryTab = 'items';
    this._activeOverlay = null; // 'pause' | 'settings' | 'leaderboard' | 'results' | null
    this._lastEndingId = null;
    this._keyHandler = null;

    this.puzzleModals = null;
    this.endingCinematics = null;
  }

  init() {
    this.root.innerHTML = `
      <div data-layer="menu"></div>
      <div data-layer="hud" class="hud-layer hidden"></div>
      <div data-layer="overlay"></div>
      <div data-layer="puzzle"></div>
      <div data-layer="ending"></div>
      <div data-layer="toasts" class="toast-stack"></div>
    `;

    this._layers = {
      menu: this.root.querySelector('[data-layer="menu"]'),
      hud: this.root.querySelector('[data-layer="hud"]'),
      overlay: this.root.querySelector('[data-layer="overlay"]'),
      puzzle: this.root.querySelector('[data-layer="puzzle"]'),
      ending: this.root.querySelector('[data-layer="ending"]'),
      toasts: this.root.querySelector('[data-layer="toasts"]'),
    };

    this.puzzleModals = new PuzzleModals(
      this._layers.puzzle,
      this.bus,
      this.gameState,
      this.puzzleManager
    );
    this.endingCinematics = new EndingCinematics(this._layers.ending, this.bus);

    this._buildHUDDom();
    this._bindEvents();
    this.showMainMenu();
  }

  _bindEvents() {
    const on = (evt, fn) => this._unsubs.push(this.bus.on(evt, fn));

    on('interaction:hover', ({ interactable } = {}) => {
      this._hoveredInteractable = interactable || null;
      this._updateCrosshairPrompt();
    });

    on('interaction:inspect', (payload = {}) => {
      const id = payload.id || payload.interactable?.id;
      const label = payload.label || payload.interactable?.label || 'INSPECT';
      const line = payload.text || INSPECT_LINES[id] || INSPECT_LINES.default;
      this.showSubtitle(label, line, 4500);
    });

    on('player:roomChanged', ({ roomName } = {}) => {
      if (roomName) {
        this._currentRoomName = roomName;
        const el = this._layers.hud.querySelector('[data-hud="room"]');
        if (el) el.textContent = roomName;
      }
    });

    on('ui:toast', ({ text, type = 'info', duration = 3800 } = {}) => {
      if (text) this.showToast(text, type, duration);
    });

    on('ui:subtitle', ({ speaker = 'LUCIA', text, duration = 4500 } = {}) => {
      if (text) this.showSubtitle(speaker, text, duration);
    });

    on('chaos:damage', ({ amount, total, reason } = {}) => {
      this.showToast(`+${formatMoney(amount)} DAMAGE — ${reason || 'Property destroyed'} (Total: ${formatMoney(total)})`, 'danger', 4200);
      this._refreshHUD();
    });

    on('modal:open', (payload = {}) => {
      this.hideSubtitle();
      const modalId = payload.modalId || '';
      if (modalId === 'voicemail' || payload.clueId === 'voicemail_dock') {
        this._closeOverlays();
        this.puzzleModals.open('voicemail', payload.data || payload);
        return;
      }
      if (modalId === 'clue' || payload.clueId) {
        this._closeOverlays();
        this.puzzleModals.open('clue', {
          ...(payload.data || {}),
          clueId: payload.clueId || payload.data?.clueId,
        });
        return;
      }
      if (payload.puzzleId || modalId.startsWith('puzzle_')) {
        const pid = payload.puzzleId || modalId.replace('puzzle_', '');
        this.openPuzzleModal(pid, payload.data);
      }
    });

    on('modal:close', () => {
      if (this.puzzleModals?.isOpen()) {
        this.puzzleModals.close(false);
      }
      this._refreshHUD();
    });

    on('ui:inventory:toggle', () => {
      if (this.gameState.phase === 'menu' || this.gameState.phase === 'ending' || this.gameState.phase === 'results') {
        return;
      }
      if (this.puzzleModals?.isOpen()) {
        this.puzzleModals.close(true);
      }
      if (this._inventoryOpen) {
        this._closeOverlays();
        this.bus.emit('modal:close', { modalId: 'inventory' });
      } else {
        this._openInventoryModal();
      }
    });

    on('game:pause', () => {
      if (this.gameState.phase === 'menu' || this.gameState.phase === 'ending' || this.gameState.phase === 'results') {
        return;
      }
      if (this.puzzleModals?.isOpen()) {
        this.puzzleModals.close(true);
        return;
      }
      if (this._inventoryOpen) {
        this._closeOverlays();
        this.bus.emit('modal:close', { modalId: 'inventory' });
        return;
      }
      this._openPauseModal();
    });

    on('game:resume', () => {
      this._closeOverlays();
      this.showHUD();
    });

    on('game:ending', ({ endingId, reason } = {}) => {
      this.showEnding(endingId || 'CLEAN_GETAWAY', reason);
    });

    on('state:changed', () => this._refreshHUD());
    on('puzzle:solved', () => this._refreshHUD());
    on('state:loaded', () => this._refreshHUD());
    on('state:reset', () => {
      this.hideSubtitle();
      this._hoveredInteractable = null;
      this._currentRoomName = 'Living Room';
      this._refreshHUD();
    });

    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this.puzzleModals?.isOpen()) {
          e.preventDefault();
          this.puzzleModals.close(true);
        } else if (this._inventoryOpen) {
          e.preventDefault();
          this._closeOverlays();
          this.bus.emit('modal:close', { modalId: 'inventory' });
        } else if (this._activeOverlay === 'settings' || this._activeOverlay === 'leaderboard') {
          e.preventDefault();
          if (this.gameState.phase === 'menu') this._closeOverlays();
          else this._openPauseModal();
        } else if (this._activeOverlay === 'pause') {
          e.preventDefault();
          this.bus.emit('game:resume');
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  /* ======================== MAIN MENU ======================== */
  showMainMenu() {
    this._closeOverlays();
    this.puzzleModals?.close(false);
    this.endingCinematics?.stop();
    this._layers.hud.classList.add('hidden');

    const hasSave = this.gameState.hasSave();
    this._layers.menu.innerHTML = `
      <div class="main-menu-overlay ui-interactive">
        <div class="menu-left">
          <div class="menu-kicker">VICE CITY • 03:17 AM • RAINSTORM LOCKDOWN</div>
          <h1 class="menu-title">ESCAPE LUCIA'S SAFEHOUSE</h1>
          <p class="menu-subtitle">
            The overnight heist went sideways, Lucia triggered the penthouse lockdown, and the Master Exit Key is split across four systems. Escape cleanly, burn the place down, or lose your mind in the comment section.
          </p>
          <div class="menu-actions">
            <button class="btn btn-primary" data-menu="new">▶ New Game</button>
            <button class="btn btn-cyan" data-menu="continue" ${hasSave ? '' : 'disabled'}>↻ Continue Saved Run</button>
            <button class="btn" data-menu="leaderboard">🏆 Leaderboard</button>
            <button class="btn" data-menu="settings">⚙ Settings</button>
          </div>
          <div class="menu-meta-bar">
            <span>5 INTERCONNECTED PUZZLES</span>
            <span>•</span>
            <span>3 ALTERNATE ENDINGS</span>
            <span>•</span>
            <span>REAL-TIME 3D PENTHOUSE</span>
          </div>
        </div>

        <div class="glass-panel menu-right-card">
          <h3>FIELD CONTROLS</h3>
          <div class="controls-grid">
            <span class="keycap">WASD</span><span>Move through penthouse</span>
            <span class="keycap">SHIFT</span><span>Sprint</span>
            <span class="keycap">MOUSE</span><span>Look around (click to lock)</span>
            <span class="keycap">E</span><span>Interact / Pick up / Open</span>
            <span class="keycap">F</span><span>Kick / Smash luxury props</span>
            <span class="keycap">TAB</span><span>Inventory & Clue Log</span>
            <span class="keycap">H</span><span>Progressive Hint</span>
            <span class="keycap">ESC</span><span>Pause / Close Modal</span>
          </div>
        </div>
      </div>
    `;

    this._layers.menu.querySelector('[data-menu="new"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this.bus.emit('game:new');
    });
    this._layers.menu.querySelector('[data-menu="continue"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this.bus.emit('game:continue');
    });
    this._layers.menu.querySelector('[data-menu="leaderboard"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._openLeaderboardModal();
    });
    this._layers.menu.querySelector('[data-menu="settings"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._openSettingsModal();
    });
  }

  /* ======================== IN-GAME HUD ======================== */
  _buildHUDDom() {
    this._layers.hud.innerHTML = `
      <div class="hud-top-left">
        <div class="hud-objective-card">
          <div class="hud-objective-label">CURRENT OBJECTIVE</div>
          <div class="hud-objective-text" data-hud="objective"></div>
        </div>
        <div class="hud-puzzles-row" data-hud="puzzles"></div>
      </div>

      <div class="hud-top-right">
        <div class="hud-status-bar">
          <span class="hud-room-tag" data-hud="room">Living Room</span>
          <span style="opacity:0.3;">|</span>
          <span class="hud-timer" data-hud="timer">00:00</span>
        </div>
        <div class="hud-shortcuts">
          <button class="hud-chip-btn" data-hud-btn="hint">[H] Hint</button>
          <button class="hud-chip-btn" data-hud-btn="inv">[TAB] Bag (<span data-hud="inv-count">0</span>)</button>
          <button class="hud-chip-btn" data-hud-btn="pause">[ESC] Menu</button>
        </div>
        <div class="hud-damage-badge hidden" data-hud="damage">DAMAGE: $0</div>
      </div>

      <div class="hud-crosshair" data-hud="crosshair"></div>
      <div class="hud-interact-prompt hidden" data-hud="prompt"></div>
      <div class="hud-subtitle-box hidden" data-hud="subtitle">
        <div class="hud-subtitle-speaker" data-hud="sub-speaker"></div>
        <div class="hud-subtitle-text" data-hud="sub-text"></div>
      </div>
    `;

    this._layers.hud.querySelector('[data-hud-btn="hint"]')?.addEventListener('click', () => {
      this.bus.emit('ui:hint');
    });
    this._layers.hud.querySelector('[data-hud-btn="inv"]')?.addEventListener('click', () => {
      this.bus.emit('ui:inventory:toggle');
    });
    this._layers.hud.querySelector('[data-hud-btn="pause"]')?.addEventListener('click', () => {
      this.bus.emit('game:pause');
    });
  }

  showHUD() {
    this._closeOverlays();
    this.puzzleModals?.close(false);
    this._layers.menu.innerHTML = '';
    this.endingCinematics?.stop();
    this._layers.hud.classList.remove('hidden');
    this._refreshHUD();
  }

  _refreshHUD() {
    if (!this._layers.hud) return;
    const data = this.gameState.data;

    const objEl = this._layers.hud.querySelector('[data-hud="objective"]');
    if (objEl) objEl.textContent = getCurrentObjective(data);

    const pillsEl = this._layers.hud.querySelector('[data-hud="puzzles"]');
    if (pillsEl) {
      pillsEl.innerHTML = PUZZLE_LABELS.map(({ id, label }) => {
        const p = data.puzzles[id];
        const solved = Boolean(p?.solved);
        const badge = solved && p.digit !== null && p.digit !== undefined ? `:${p.digit}` : solved ? ' ✓' : '';
        return `<span class="puzzle-pill ${solved ? 'solved' : ''}">${label}${badge}</span>`;
      }).join('');
    }

    const invCountEl = this._layers.hud.querySelector('[data-hud="inv-count"]');
    if (invCountEl) invCountEl.textContent = String(data.inventory.length);

    const dmgEl = this._layers.hud.querySelector('[data-hud="damage"]');
    if (dmgEl) {
      if (data.stats.safehouseDamage > 0) {
        dmgEl.classList.remove('hidden');
        dmgEl.textContent = `DAMAGE: ${formatMoney(data.stats.safehouseDamage)}`;
      } else {
        dmgEl.classList.add('hidden');
      }
    }
  }

  _updateCrosshairPrompt() {
    const ch = this._layers.hud.querySelector('[data-hud="crosshair"]');
    const prompt = this._layers.hud.querySelector('[data-hud="prompt"]');
    if (!ch || !prompt) return;

    const target = this._hoveredInteractable;
    if (!target || this.gameState.phase !== 'playing') {
      ch.classList.remove('active');
      prompt.classList.add('hidden');
      prompt.innerHTML = '';
      return;
    }

    ch.classList.add('active');
    prompt.classList.remove('hidden');
    const verb = target.actionLabel || 'Interact';
    let html = `<div class="prompt-pill"><span class="keycap">E</span> ${verb} ${target.label}</div>`;
    if (target.canSmash) {
      const dmg = target.damageValue ? ` (+${formatMoney(target.damageValue)})` : '';
      html += `<div class="prompt-pill smash"><span class="keycap" style="color:var(--neon-danger);">F</span> Smash ${target.label}${dmg}</div>`;
    }
    prompt.innerHTML = html;
  }

  update(dt = 0) {
    const timerEl = this._layers.hud?.querySelector('[data-hud="timer"]');
    if (timerEl && !this._layers.hud.classList.contains('hidden')) {
      timerEl.textContent = formatTime(this.gameState.data.elapsedTime);
    }
    if (this._subtitleRemaining > 0 && dt > 0) {
      this._subtitleRemaining -= dt;
      if (this._subtitleRemaining <= 0) {
        this.hideSubtitle();
      }
    }
  }

  /* ======================== PUZZLE MODALS ======================== */
  openPuzzleModal(puzzleId, extraData = {}) {
    this._closeOverlays();
    this.puzzleModals.open(puzzleId, extraData);
  }

  /* ======================== OVERLAYS (PAUSE / INV / SETTINGS / LEADERBOARD) ======================== */
  _closeOverlays() {
    this._layers.overlay.innerHTML = '';
    this._inventoryOpen = false;
    this._activeOverlay = null;
  }

  _openPauseModal() {
    this._closeOverlays();
    this._activeOverlay = 'pause';

    this._layers.overlay.innerHTML = `
      <div class="modal-backdrop ui-interactive">
        <div class="glass-panel modal-card compact">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">PAUSED</h2>
              <div class="modal-subtitle">ELAPSED TIME: ${formatTime(this.gameState.data.elapsedTime)}</div>
            </div>
            <button class="modal-close-btn" data-pause="resume">✕</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-primary" data-pause="resume">▶ Resume Game</button>
            <button class="btn btn-cyan" data-pause="save">💾 Save Progress</button>
            <button class="btn" data-pause="settings">⚙ Settings</button>
            <button class="btn" data-pause="restart">↻ Restart Run</button>
            <button class="btn btn-danger" data-pause="menu">⌂ Main Menu</button>
          </div>
        </div>
      </div>
    `;

    this._layers.overlay.querySelectorAll('[data-pause="resume"]').forEach((b) =>
      b.addEventListener('click', () => {
        this.bus.emit('sfx:play', { name: 'ui_click' });
        this.bus.emit('game:resume');
      })
    );
    this._layers.overlay.querySelector('[data-pause="save"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      const ok = this.gameState.save();
      this.showToast(ok ? 'Game saved to local storage.' : 'Unable to save progress.', ok ? 'success' : 'warning');
    });
    this._layers.overlay.querySelector('[data-pause="settings"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._openSettingsModal();
    });
    this._layers.overlay.querySelector('[data-pause="restart"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._closeOverlays();
      this.bus.emit('game:restart');
    });
    this._layers.overlay.querySelector('[data-pause="menu"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._closeOverlays();
      this.bus.emit('game:menu');
    });
  }

  _openInventoryModal() {
    this._closeOverlays();
    this._inventoryOpen = true;
    this._activeOverlay = 'inventory';
    this.bus.emit('sfx:play', { name: 'ui_click' });

    const render = () => {
      const { inventory, clues, puzzles } = this.gameState.data;
      const digitsHtml = [
        { label: '1. TV', val: puzzles.tv.digit },
        { label: '2. OVEN', val: puzzles.turkey.digit },
        { label: '3. CCTV', val: puzzles.security.digit },
        { label: '4. RADIO', val: puzzles.radio.digit },
      ].map((d) => `<span class="puzzle-pill ${d.val !== null ? 'solved' : ''}">${d.label}: ${d.val !== null ? d.val : '?'}</span>`).join('');

      const bodyHtml = this._inventoryTab === 'items'
        ? (inventory.length
            ? `<div class="inv-grid">${inventory.map((i) => `
                <div class="inv-item-card">
                  <div class="inv-item-icon">${i.icon || '🔑'}</div>
                  <div class="inv-item-name">${i.name}</div>
                  <div class="inv-item-desc">${i.description}</div>
                </div>
              `).join('')}</div>`
            : `<p style="color:var(--text-muted);font-size:0.9rem;">No items collected yet. Search the penthouse for Lucia's TV remote, keycard, and tools.</p>`)
        : (clues.length
            ? `<div class="clue-list">${clues.map((c) => `
                <div class="clue-entry">
                  <h4>${c.title}</h4>
                  <p>${c.text}</p>
                </div>
              `).join('')}</div>`
            : `<p style="color:var(--text-muted);font-size:0.9rem;">No clues logged yet. Check the voicemail dock, kitchen recipe card, and notes around the safehouse.</p>`);

      this._layers.overlay.innerHTML = `
        <div class="modal-backdrop ui-interactive">
          <div class="glass-panel modal-card">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">INVENTORY & CLUE LOG</h2>
                <div class="modal-subtitle">SAFE CODE PROGRESS: ${digitsHtml}</div>
              </div>
              <button class="modal-close-btn" data-inv="close">✕</button>
            </div>
            <div class="inv-tabs">
              <button class="btn btn-sm ${this._inventoryTab === 'items' ? 'btn-cyan' : ''}" data-tab="items">Items (${inventory.length})</button>
              <button class="btn btn-sm ${this._inventoryTab === 'clues' ? 'btn-cyan' : ''}" data-tab="clues">Clue Log (${clues.length})</button>
            </div>
            ${bodyHtml}
          </div>
        </div>
      `;

      this._layers.overlay.querySelector('[data-inv="close"]')?.addEventListener('click', () => {
        this._closeOverlays();
        this.bus.emit('modal:close', { modalId: 'inventory' });
      });
      this._layers.overlay.querySelectorAll('[data-tab]').forEach((b) => {
        b.addEventListener('click', () => {
          this._inventoryTab = b.dataset.tab;
          render();
        });
      });
    };

    render();
  }

  _openSettingsModal() {
    this._closeOverlays();
    this._activeOverlay = 'settings';
    const s = this.gameState.data.settings;

    this._layers.overlay.innerHTML = `
      <div class="modal-backdrop ui-interactive">
        <div class="glass-panel modal-card compact">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">SETTINGS</h2>
              <div class="modal-subtitle">AUDIO, CONTROLS & GRAPHICS</div>
            </div>
            <button class="modal-close-btn" data-set="back">✕</button>
          </div>
          <div class="setting-row">
            <label>Master Volume</label>
            <input type="range" min="0" max="1" step="0.05" value="${s.masterVol}" data-setting="masterVol" />
          </div>
          <div class="setting-row">
            <label>Ambient Rain & Synth</label>
            <input type="range" min="0" max="1" step="0.05" value="${s.ambientVol}" data-setting="ambientVol" />
          </div>
          <div class="setting-row">
            <label>SFX Volume</label>
            <input type="range" min="0" max="1" step="0.05" value="${s.sfxVol}" data-setting="sfxVol" />
          </div>
          <div class="setting-row">
            <label>Mouse Sensitivity</label>
            <input type="range" min="0.4" max="2.2" step="0.1" value="${s.sensitivity}" data-setting="sensitivity" />
          </div>
          <div class="setting-row">
            <label>Graphics Quality</label>
            <div class="quality-pills">
              ${['low', 'medium', 'high'].map((q) => `
                <button class="btn btn-sm ${s.quality === q ? 'btn-cyan' : ''}" data-quality="${q}">${q}</button>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-primary" data-set="back">Done</button>
          </div>
        </div>
      </div>
    `;

    this._layers.overlay.querySelectorAll('[data-setting]').forEach((inp) => {
      inp.addEventListener('input', () => {
        this.gameState.updateSettings({ [inp.dataset.setting]: Number(inp.value) });
      });
    });

    this._layers.overlay.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.gameState.updateSettings({ quality: btn.dataset.quality });
        this._openSettingsModal();
      });
    });

    this._layers.overlay.querySelectorAll('[data-set="back"]').forEach((b) =>
      b.addEventListener('click', () => {
        this.bus.emit('sfx:play', { name: 'ui_click' });
        if (this.gameState.phase === 'menu') this._closeOverlays();
        else this._openPauseModal();
      })
    );
  }

  _openLeaderboardModal() {
    this._closeOverlays();
    this._activeOverlay = 'leaderboard';
    const entries = this.gameState.getLeaderboard();

    this._layers.overlay.innerHTML = `
      <div class="modal-backdrop ui-interactive">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">LOCAL LEADERBOARD</h2>
              <div class="modal-subtitle">FASTEST PENTHOUSE ESCAPES</div>
            </div>
            <button class="modal-close-btn" data-lb="close">✕</button>
          </div>
          ${entries.length ? `
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ending</th>
                  <th>Time</th>
                  <th>Puzzles</th>
                  <th>Damage</th>
                  <th>Args</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((e, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td style="color:var(--neon-cyan);font-weight:600;">${(ENDINGS[e.ending]?.title) || e.ending}</td>
                    <td style="font-family:var(--font-mono);">${formatTime(e.elapsedTime)}</td>
                    <td>${e.puzzlesSolved}/5</td>
                    <td>${formatMoney(e.safehouseDamage)}</td>
                    <td>${e.internetArguments}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<p style="color:var(--text-muted);font-size:0.9rem;">No completed escapes yet. Unlock any of the 3 endings to claim the top spot!</p>`}
        </div>
      </div>
    `;

    this._layers.overlay.querySelector('[data-lb="close"]')?.addEventListener('click', () => {
      this._closeOverlays();
    });
  }

  /* ======================== ENDINGS & SHAREABLE RESULTS ======================== */
  showEnding(endingId, _reason = '') {
    this._closeOverlays();
    this.puzzleModals?.close(false);
    this._layers.hud.classList.add('hidden');
    this._layers.menu.innerHTML = '';
    this._lastEndingId = endingId;

    this.gameState.setPhase('ending');
    const entry = this.gameState.recordLeaderboardEntry(endingId);

    this.endingCinematics.play(endingId, () => {
      this.gameState.setPhase('results');
      this._showResultsScreen(endingId, entry);
    });
  }

  _showResultsScreen(endingId, entry) {
    this._closeOverlays();
    this._activeOverlay = 'results';
    const data = ENDINGS[endingId] || ENDINGS.CLEAN_GETAWAY;
    const stats = this.gameState.data.stats;
    const elapsed = entry?.elapsedTime ?? Math.round(this.gameState.data.elapsedTime);
    const solved = this.gameState.getSolvedCount();
    const leaderboard = this.gameState.getLeaderboard().slice(0, 5);

    const shareText = [
      `🌴 ESCAPE LUCIA'S SAFEHOUSE — ${data.title}`,
      `⏱ Time: ${formatTime(elapsed)} | 🧩 Puzzles: ${solved}/5`,
      `💥 Safehouse Damage: ${formatMoney(stats.safehouseDamage)} | 🔥 Hot Takes: ${stats.internetArguments} | ❌ Fails: ${stats.failedAttempts}`,
      `"${data.shareTagline}"`,
    ].join('\n');

    this._layers.overlay.innerHTML = `
      <div class="modal-backdrop ui-interactive" style="background:rgba(4,5,14,0.88);">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <div>
              <div style="font-family:var(--font-mono);font-size:0.74rem;color:${data.accent};letter-spacing:0.16em;">${data.badge}</div>
              <h2 class="modal-title" style="color:${data.accent};font-size:2.6rem;">${data.title}</h2>
              <div class="modal-subtitle">${data.shareTagline}</div>
            </div>
          </div>

          <div class="results-grid">
            <div class="stat-tile">
              <div class="stat-tile-label">Escape Time</div>
              <div class="stat-tile-value">${formatTime(elapsed)}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-label">Puzzles Solved</div>
              <div class="stat-tile-value">${solved} / 5</div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-label">Safehouse Damage</div>
              <div class="stat-tile-value" style="color:${stats.safehouseDamage >= 30000 ? 'var(--neon-danger)' : 'var(--neon-success)'};">${formatMoney(stats.safehouseDamage)}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-label">Failed Attempts</div>
              <div class="stat-tile-value">${stats.failedAttempts}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-label">Internet Arguments</div>
              <div class="stat-tile-value" style="color:var(--neon-violet);">${stats.internetArguments}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-label">Hints Used</div>
              <div class="stat-tile-value">${stats.hintsUsed}</div>
            </div>
          </div>

          ${leaderboard.length ? `
            <div>
              <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;">TOP LOCAL RUNS</div>
              <table class="leaderboard-table">
                <thead>
                  <tr><th>#</th><th>Ending</th><th>Time</th><th>Puzzles</th><th>Damage</th></tr>
                </thead>
                <tbody>
                  ${leaderboard.map((row, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td style="color:var(--neon-cyan);">${ENDINGS[row.ending]?.title || row.ending}</td>
                      <td style="font-family:var(--font-mono);">${formatTime(row.elapsedTime)}</td>
                      <td>${row.puzzlesSolved}/5</td>
                      <td>${formatMoney(row.safehouseDamage)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:4px;">
            <button class="btn btn-cyan" data-res="share">📋 Copy Share Card</button>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-primary" data-res="replay">▶ Play Again</button>
              <button class="btn" data-res="menu">⌂ Main Menu</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this._layers.overlay.querySelector('[data-res="share"]')?.addEventListener('click', async () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      try {
        await navigator.clipboard.writeText(shareText);
        this.showToast('Escape Share Card copied to clipboard!', 'success');
      } catch {
        this.showToast('Share card ready! (Clipboard blocked in this browser context)', 'info');
      }
    });

    this._layers.overlay.querySelector('[data-res="replay"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._closeOverlays();
      this.bus.emit('game:restart');
    });

    this._layers.overlay.querySelector('[data-res="menu"]')?.addEventListener('click', () => {
      this.bus.emit('sfx:play', { name: 'ui_click' });
      this._closeOverlays();
      this.bus.emit('game:menu');
    });
  }

  /* ======================== SUBTITLES & TOASTS ======================== */
  showSubtitle(speaker, text, duration = 4500) {
    const box = this._layers.hud?.querySelector('[data-hud="subtitle"]');
    const spEl = this._layers.hud?.querySelector('[data-hud="sub-speaker"]');
    const txtEl = this._layers.hud?.querySelector('[data-hud="sub-text"]');
    if (!box || !spEl || !txtEl) return;

    const clampedMs = Math.min(Math.max(Number(duration) || 4500, 1500), 5000);
    spEl.textContent = speaker;
    txtEl.textContent = text;
    box.classList.remove('hidden');

    this._subtitleRemaining = clampedMs / 1000;
    clearTimeout(this._subtitleTimer);
    this._subtitleTimer = setTimeout(() => {
      this.hideSubtitle();
    }, clampedMs);
  }

  hideSubtitle() {
    this._subtitleRemaining = 0;
    clearTimeout(this._subtitleTimer);
    this._subtitleTimer = null;
    const box = this._layers.hud?.querySelector('[data-hud="subtitle"]');
    if (box) box.classList.add('hidden');
  }

  showToast(text, type = 'info', duration = 3800) {
    if (!this._layers.toasts) return;
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.textContent = text;
    this._layers.toasts.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  destroy() {
    clearTimeout(this._subtitleTimer);
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._unsubs.forEach((fn) => fn());
    this._unsubs = [];
    this.puzzleModals?.close(false);
    this.endingCinematics?.stop();
    this.root.innerHTML = '';
  }
}

export default UIManager;
