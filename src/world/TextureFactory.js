import * as THREE from 'three';

/**
 * Procedural HTML5 Canvas texture generator for ESCAPE LUCIA'S SAFEHOUSE.
 * Zero external image dependencies — all materials, neon signage, veined marble,
 * dark wood planks, shag rugs, rain glass, stained glass, notes, and live TV/CCTV
 * screens are generated procedurally.
 */
export class TextureFactory {
  constructor() {
    this.cache = new Map();
  }

  _cached(key, creator) {
    if (this.cache.has(key)) return this.cache.get(key);
    const tex = creator();
    this.cache.set(key, tex);
    return tex;
  }

  _makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  _toTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Ref #5: Glossy veined lavender-white marble floor tiles.
   */
  getLavenderMarble(repeatX = 3, repeatY = 3) {
    return this._cached(`lavender_marble_${repeatX}_${repeatY}`, () => {
      const { canvas, ctx } = this._makeCanvas(512, 512);
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#e8dff5');
      grad.addColorStop(0.5, '#d9c8ee');
      grad.addColorStop(1, '#e4d5f2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Soft swirling marble clouds
      for (let i = 0; i < 36; i++) {
        const x = (i * 97) % 512;
        const y = (i * 131) % 512;
        const r = 45 + (i % 5) * 28;
        const rg = ctx.createRadialGradient(x, y, 4, x, y, r);
        rg.addColorStop(0, i % 2 === 0 ? 'rgba(130, 95, 175, 0.22)' : 'rgba(255, 240, 255, 0.35)');
        rg.addColorStop(1, 'rgba(130, 95, 175, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dramatic diagonal veins
      for (let v = 0; v < 22; v++) {
        ctx.beginPath();
        let vx = (v * 53) % 512;
        let vy = (v * 29) % 512;
        ctx.moveTo(vx, vy);
        for (let step = 0; step < 12; step++) {
          vx += 24 + Math.sin(v * 1.7 + step * 0.9) * 18;
          vy += 16 + Math.cos(v * 2.1 + step * 0.7) * 22;
          ctx.lineTo(vx, vy);
        }
        ctx.strokeStyle = v % 3 === 0 ? 'rgba(92, 62, 138, 0.38)' : 'rgba(165, 125, 198, 0.26)';
        ctx.lineWidth = v % 4 === 0 ? 3.2 : 1.4;
        ctx.stroke();
      }

      // Subtle 2x2 luxury tile seams
      ctx.strokeStyle = 'rgba(110, 82, 145, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 254, 254);
      ctx.strokeRect(256, 1, 255, 254);
      ctx.strokeRect(1, 256, 254, 255);
      ctx.strokeRect(256, 256, 255, 255);

      return this._toTexture(canvas, { repeatX, repeatY });
    });
  }

  /**
   * Ref #1: Rich dark espresso wood planks for Living Room & Security Room.
   */
  getDarkWood(repeatX = 4, repeatY = 4) {
    return this._cached(`dark_wood_${repeatX}_${repeatY}`, () => {
      const { canvas, ctx } = this._makeCanvas(512, 512);
      ctx.fillStyle = '#231922';
      ctx.fillRect(0, 0, 512, 512);

      const plankH = 64;
      for (let row = 0; row < 8; row++) {
        const y = row * plankH;
        const shade = 28 + ((row * 17) % 14);
        ctx.fillStyle = `rgb(${shade + 12}, ${shade + 2}, ${shade + 10})`;
        ctx.fillRect(0, y, 512, plankH - 2);

        // Wood grain lines
        for (let g = 0; g < 18; g++) {
          const gy = y + 3 + (g * 3.3);
          ctx.strokeStyle = g % 3 === 0 ? 'rgba(12, 6, 14, 0.32)' : 'rgba(95, 62, 82, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          for (let x = 0; x <= 512; x += 64) {
            ctx.lineTo(x, gy + Math.sin(x * 0.02 + row + g) * 1.6);
          }
          ctx.stroke();
        }

        // Plank horizontal & staggered vertical seams
        ctx.fillStyle = '#110a12';
        ctx.fillRect(0, y + plankH - 2, 512, 2);
        const splitX = ((row * 173 + 90) % 420) + 45;
        ctx.fillRect(splitX, y, 2, plankH);
      }

      return this._toTexture(canvas, { repeatX, repeatY });
    });
  }

  /**
   * Ref #2 & #6: Plush shag rug / velvet carpet texture.
   */
  getShagRug(baseColor = '#d6c7e8', accentColor = '#a88bc9', repeatX = 2, repeatY = 2) {
    return this._cached(`shag_${baseColor}_${accentColor}_${repeatX}_${repeatY}`, () => {
      const { canvas, ctx } = this._makeCanvas(256, 256);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 4200; i++) {
        const x = (i * 73) % 256;
        const y = ((i * 151) + Math.floor(i / 256) * 19) % 256;
        const len = 3 + (i % 5);
        const ang = ((i * 37) % 360) * (Math.PI / 180);
        ctx.strokeStyle = i % 3 === 0 ? accentColor : 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
      return this._toTexture(canvas, { repeatX, repeatY });
    });
  }

  /**
   * Ref #1 & #4: Rain-streaked glass overlay texture (alpha/specular map).
   */
  getRainGlass() {
    return this._cached('rain_glass', () => {
      const { canvas, ctx } = this._makeCanvas(256, 512);
      ctx.clearRect(0, 0, 256, 512);

      // Subtle atmospheric mist at bottom & top
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, 'rgba(140, 185, 255, 0.14)');
      grad.addColorStop(0.5, 'rgba(180, 140, 255, 0.05)');
      grad.addColorStop(1, 'rgba(255, 110, 210, 0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);

      // Vertical rain streaks
      for (let i = 0; i < 90; i++) {
        const x = (i * 29) % 256;
        const y = (i * 67) % 480;
        const len = 24 + (i % 5) * 18;
        const sg = ctx.createLinearGradient(x, y, x, y + len);
        sg.addColorStop(0, 'rgba(200, 230, 255, 0)');
        sg.addColorStop(0.85, 'rgba(210, 235, 255, 0.35)');
        sg.addColorStop(1, 'rgba(255, 255, 255, 0.72)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y + len);
        ctx.stroke();

        // Droplet bead at bottom of streak
        ctx.fillStyle = 'rgba(235, 248, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(x + 2, y + len, 1.5 + (i % 2) * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = this._toTexture(canvas, { repeatX: 2, repeatY: 1 });
      return tex;
    });
  }

  /**
   * Ref #1 & #3: High-resolution neon skyscraper lit window strips texture.
   */
  getSkyscraperFacade(variant = 'magenta') {
    return this._cached(`skyscraper_${variant}`, () => {
      const { canvas, ctx } = this._makeCanvas(512, 1024);
      ctx.fillStyle = '#070712';
      ctx.fillRect(0, 0, 512, 1024);

      const palette =
        variant === 'cyan'
          ? ['#00f0ff', '#6ae6ff', '#d6faff', '#ffe7a8', '#1f4466']
          : variant === 'mixed'
            ? ['#ff3399', '#00f0ff', '#ffbe6b', '#c985ff', '#252145']
            : ['#ff2d95', '#ff75bc', '#ffae70', '#d07aff', '#3a1a42'];

      const cols = 28;
      const rows = 88;
      const cellW = 512 / cols;
      const cellH = 1024 / rows;

      // Subtle vertical structural glass mullions
      ctx.fillStyle = '#0d0e1f';
      for (let c = 0; c < cols; c += 4) {
        ctx.fillRect(c * cellW, 0, 3, 1024);
      }

      for (let r = 2; r < rows - 1; r++) {
        const isMechanicalFloor = r % 16 === 0;
        if (isMechanicalFloor) {
          ctx.fillStyle = '#0c0d1c';
          ctx.fillRect(0, r * cellH, 512, cellH);
          continue;
        }
        const floorDensity = ((r * 19 + variant.length * 7) % 100);
        for (let c = 1; c < cols - 1; c++) {
          const hash = (r * 41 + c * 97 + variant.length * 23) % 100;
          const litChance = floorDensity < 35 ? 62 : 28;
          if (hash < litChance) {
            const color = palette[hash % palette.length];
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.42 + (hash % 5) * 0.13;
            ctx.fillRect(c * cellW + 2, r * cellH + 3, cellW - 4, cellH - 5);
          } else {
            ctx.fillStyle = '#121326';
            ctx.globalAlpha = 0.55;
            ctx.fillRect(c * cellW + 2, r * cellH + 3, cellW - 4, cellH - 5);
          }
        }
      }
      ctx.globalAlpha = 1;

      // Crisp glowing rooftop neon trim band
      ctx.fillStyle = variant === 'cyan' ? '#00f5ff' : '#ff2a85';
      ctx.fillRect(0, 0, 512, 10);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.65;
      ctx.fillRect(0, 2, 512, 4);
      ctx.globalAlpha = 1;

      return this._toTexture(canvas, { repeatX: 1, repeatY: 1 });
    });
  }

  /**
   * Ref #1: Glowing cyberpunk / Vice City skyscraper billboard.
   */
  getNeonBillboard(title = 'VICE NIGHTS', subtitle = 'OCEAN VIEW • 24H', primary = '#ff2d95', secondary = '#00f0ff') {
    return this._cached(`billboard_${title}_${primary}`, () => {
      const { canvas, ctx } = this._makeCanvas(512, 256);
      const bg = ctx.createLinearGradient(0, 0, 512, 256);
      bg.addColorStop(0, '#120724');
      bg.addColorStop(0.5, '#240b3b');
      bg.addColorStop(1, '#091a33');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 256);

      // Retro synthwave sun / grid lines
      ctx.strokeStyle = secondary;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2;
      for (let y = 160; y < 256; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Neon border
      ctx.strokeStyle = primary;
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 492, 236);

      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 472, 216);

      // Glow text
      ctx.textAlign = 'center';
      ctx.shadowColor = primary;
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px sans-serif';
      ctx.fillText(title, 256, 125);

      ctx.shadowColor = secondary;
      ctx.shadowBlur = 14;
      ctx.fillStyle = secondary;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(subtitle, 256, 185);

      return this._toTexture(canvas);
    });
  }

  /**
   * Ref #4: Glowing stained-glass neon wall art panel.
   */
  getStainedGlass() {
    return this._cached('stained_glass', () => {
      const { canvas, ctx } = this._makeCanvas(256, 384);
      ctx.fillStyle = '#120a18';
      ctx.fillRect(0, 0, 256, 384);

      const colors = ['#ff2d95', '#ffaa2b', '#00e5ff', '#9c42ff', '#ff5c5c', '#29ffb8'];
      const cell = 32;
      for (let y = 16; y < 368; y += cell) {
        for (let x = 16; x < 240; x += cell) {
          const idx = (Math.floor(x / cell) * 5 + Math.floor(y / cell) * 3) % colors.length;
          ctx.fillStyle = colors[idx];
          ctx.globalAlpha = 0.82;
          ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        }
      }
      ctx.globalAlpha = 1;
      // Glowing floral/diamond overlay
      ctx.strokeStyle = '#150b1c';
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(128, 64 + i * 54, 42, 0, Math.PI * 2);
        ctx.stroke();
      }
      return this._toTexture(canvas);
    });
  }

  /**
   * Ref #3: Rain-slicked Miami neon boulevard road surface.
   */
  getWetBoulevard() {
    return this._cached('wet_boulevard', () => {
      const { canvas, ctx } = this._makeCanvas(512, 512);
      const grad = ctx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0, '#1e081a');
      grad.addColorStop(0.45, '#130c18');
      grad.addColorStop(0.55, '#0b1420');
      grad.addColorStop(1, '#061c26');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Reflective neon puddle streaks
      for (let i = 0; i < 60; i++) {
        const x = (i * 43) % 512;
        const y = (i * 89) % 512;
        const isLeft = x < 256;
        ctx.fillStyle = isLeft ? 'rgba(255, 45, 149, 0.28)' : 'rgba(0, 240, 255, 0.28)';
        ctx.fillRect(x, y, 8 + (i % 10), 40 + (i % 60));
      }

      // Double yellow center line
      ctx.fillStyle = '#f5b83d';
      ctx.fillRect(249, 0, 4, 512);
      ctx.fillRect(259, 0, 4, 512);

      // Dashed white lane markers
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let y = 0; y < 512; y += 64) {
        ctx.fillRect(128, y, 4, 28);
        ctx.fillRect(384, y, 4, 28);
      }

      return this._toTexture(canvas, { repeatX: 1, repeatY: 6 });
    });
  }

  /**
   * Ref #5: Reflective lavender soffit ceiling texture.
   */
  getSoffitCeiling() {
    return this._cached('soffit_ceiling', () => {
      const { canvas, ctx } = this._makeCanvas(256, 256);
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#d8b4e2');
      grad.addColorStop(0.5, '#f0c4dc');
      grad.addColorStop(1, '#b695d6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc((i * 53) % 256, (i * 71) % 256, 18 + (i % 24), 0, Math.PI * 1.4);
        ctx.stroke();
      }
      return this._toTexture(canvas, { repeatX: 2, repeatY: 2 });
    });
  }

  /**
   * Cash stack texture for Vice City heist money props.
   */
  getCashTexture() {
    return this._cached('cash_stack', () => {
      const { canvas, ctx } = this._makeCanvas(256, 128);
      ctx.fillStyle = '#387046';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#9be0a8';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 236, 108);
      ctx.fillStyle = '#c8f5cf';
      ctx.font = 'bold 42px serif';
      ctx.textAlign = 'center';
      ctx.fillText('$100', 128, 78);
      // Hot pink bank strap
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(106, 0, 44, 128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('10K', 128, 70);
      return this._toTexture(canvas);
    });
  }

  /**
   * Paper note / recipe / heist board texture.
   */
  getNoteTexture(title, lines = [], bgColor = '#fff4d6', accent = '#ff2d95') {
    const key = `note_${title}_${bgColor}`;
    return this._cached(key, () => {
      const { canvas, ctx } = this._makeCanvas(256, 320);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 256, 320);

      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 256, 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 128, 29);

      ctx.fillStyle = '#23182b';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'left';
      lines.forEach((line, idx) => {
        ctx.fillText(line, 16, 78 + idx * 28);
      });
      return this._toTexture(canvas);
    });
  }

  /**
   * Steamed bathroom mirror with subtle lipstick/finger message "104.7".
   */
  getBathroomMirrorTexture() {
    return this._cached('bathroom_mirror', () => {
      const { canvas, ctx } = this._makeCanvas(512, 320);
      const grad = ctx.createLinearGradient(0, 0, 512, 320);
      grad.addColorStop(0, '#9eb5cf');
      grad.addColorStop(0.5, '#c8d6eb');
      grad.addColorStop(1, '#9888b8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 320);

      // Steam clouds
      for (let i = 0; i < 32; i++) {
        const x = (i * 83) % 512;
        const y = (i * 47) % 320;
        const rg = ctx.createRadialGradient(x, y, 5, x, y, 75);
        rg.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, 75, 0, Math.PI * 2);
        ctx.fill();
      }

      // Handwritten steam clue
      ctx.save();
      ctx.translate(256, 175);
      ctx.rotate(-0.06);
      ctx.textAlign = 'center';
      ctx.font = 'italic bold 48px cursive';
      ctx.fillStyle = 'rgba(255, 45, 149, 0.72)';
      ctx.fillText('FM 104.7', 0, 0);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = 'rgba(65, 30, 85, 0.75)';
      ctx.fillText('~ Lucia was here ~', 0, 34);
      ctx.restore();

      return this._toTexture(canvas);
    });
  }

  /**
   * Heist corkboard with red yarn & pinned photos.
   */
  getHeistBoardTexture() {
    return this._cached('heist_board', () => {
      const { canvas, ctx } = this._makeCanvas(512, 320);
      ctx.fillStyle = '#5c3b28';
      ctx.fillRect(0, 0, 512, 320);

      // Cork grain
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 210, 160, 0.08)' : 'rgba(20, 10, 5, 0.14)';
        ctx.fillRect((i * 37) % 512, (i * 73) % 320, 4, 4);
      }

      // Pinned cards
      const cards = [
        { x: 32, y: 36, w: 120, h: 90, title: 'SAFE CODE', sub: '4 DIGITS' },
        { x: 196, y: 28, w: 130, h: 95, title: 'TV CHANNELS', sub: '4 -> 2 -> 6' },
        { x: 356, y: 42, w: 120, h: 86, title: 'BALCONY CAM', sub: '02:14 ???' },
        { x: 74, y: 174, w: 140, h: 100, title: 'TURKEY OVEN', sub: 'KEYCARD' },
        { x: 286, y: 180, w: 150, h: 96, title: 'VICE RADIO', sub: '104.7 MHz' },
      ];

      // Red yarn connections
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(92, 80);
      ctx.lineTo(260, 72);
      ctx.lineTo(415, 84);
      ctx.lineTo(360, 224);
      ctx.lineTo(144, 224);
      ctx.closePath();
      ctx.stroke();

      cards.forEach((c) => {
        ctx.fillStyle = '#f8f0dc';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#ff2d95';
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b1024';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.title, c.x + c.w / 2, c.y + 42);
        ctx.fillStyle = '#b0185c';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(c.sub, c.x + c.w / 2, c.y + 68);
      });

      return this._toTexture(canvas);
    });
  }

  /**
   * Dynamic canvas texture for the Living Room 4K Smart TV.
   */
  createDynamicTV() {
    const { canvas, ctx } = this._makeCanvas(512, 288);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const drawDefault = (info = {}) => {
      const ch = info.channel ?? 1;
      const title = info.title ?? 'VICE NEWS 24/7 — LIVE DEBATE';
      const ticker = info.ticker ?? 'BREAKING: FLORIDA MAN CLAIMS PENTHOUSE TURKEY IS "ART" • CHECK CHANNELS 4, 2, 6';

      const bg = ctx.createLinearGradient(0, 0, 512, 288);
      bg.addColorStop(0, '#14082b');
      bg.addColorStop(1, '#09223a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 288);

      // Scanlines
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = 0; y < 288; y += 4) ctx.fillRect(0, y, 512, 1);

      // Top bar
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(0, 0, 512, 38);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`CH 0${ch}  •  ${title}`, 14, 25);

      // Center graphic
      ctx.textAlign = 'center';
      ctx.fillStyle = info.solved ? '#38ff9c' : '#00f0ff';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(info.solved ? 'SIGNAL DECODED: DIGIT 7' : 'VICE CITY TONIGHT', 256, 138);
      ctx.fillStyle = '#f5d0ff';
      ctx.font = '18px monospace';
      ctx.fillText(info.solved ? 'SAFE DIGIT #1 CONFIRMED' : 'USE REMOTE [E] TO SWITCH CHANNELS', 256, 178);

      // Bottom ticker
      ctx.fillStyle = '#0c0818';
      ctx.fillRect(0, 240, 512, 48);
      ctx.fillStyle = '#ffdf5c';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ticker.slice(0, 58), 14, 269);

      texture.needsUpdate = true;
    };

    drawDefault();
    return {
      canvas,
      ctx,
      texture,
      drawDefault,
      update(fn) {
        if (typeof fn === 'function') {
          fn(ctx, canvas);
          texture.needsUpdate = true;
        }
      },
    };
  }

  /**
   * Dynamic canvas texture for the Security Room CCTV multi-monitor wall.
   */
  createDynamicCCTV() {
    const { canvas, ctx } = this._makeCanvas(512, 288);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const drawDefault = (info = {}) => {
      ctx.fillStyle = '#061116';
      ctx.fillRect(0, 0, 512, 288);

      const cams = [
        { label: 'CAM 01: LIVING ROOM', time: '02:14:08', alert: false },
        { label: 'CAM 02: KITCHEN', time: '02:14:08', alert: false },
        { label: 'CAM 03: BALCONY', time: info.anomalyFlagged ? 'ANOMALY FLAGGED' : '02:19:?? [ERR]', alert: true },
        { label: 'CAM 04: FOYER', time: '02:14:08', alert: false },
      ];

      cams.forEach((cam, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = col * 256;
        const y = row * 144;

        ctx.fillStyle = cam.alert ? '#180c24' : '#0a1c24';
        ctx.fillRect(x + 4, y + 4, 248, 136);

        ctx.strokeStyle = cam.alert ? '#ff2d95' : '#00e5ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, 248, 136);

        // Scanline noise bars
        ctx.fillStyle = cam.alert ? 'rgba(255,45,149,0.12)' : 'rgba(0,240,255,0.08)';
        for (let sy = y + 12; sy < y + 132; sy += 10) {
          ctx.fillRect(x + 8, sy, 240, 2);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(cam.label, x + 14, y + 26);

        ctx.fillStyle = cam.alert ? '#ff4d9e' : '#4dffb8';
        ctx.fillText(cam.time, x + 14, y + 124);

        // REC dot
        ctx.fillStyle = '#ff2b55';
        ctx.beginPath();
        ctx.arc(x + 232, y + 20, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      texture.needsUpdate = true;
    };

    drawDefault();
    return {
      canvas,
      ctx,
      texture,
      drawDefault,
      update(fn) {
        if (typeof fn === 'function') {
          fn(ctx, canvas);
          texture.needsUpdate = true;
        }
      },
    };
  }
}
