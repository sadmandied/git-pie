/**
 * GitPie! — Authentic 1930s Cuphead / Fleischer Cartoon Pie Engine
 * Features:
 * - Hand-crimped golden flaky pastry crust with fork indents
 * - Hand-drawn ink cross-hatching and shaded gouache watercolor depth
 * - Living rubber-hose mascot center ("Pearly Pie") with cartoon gloves & smiling pie vents
 * - Animated cartoon steam puffs floating from hot pie slices
 * - Stepped 24fps cartoon breathing & squashing physics
 * - Chromatic Technicolor ink fringe
 */

export class PieCanvasEngine {
  constructor(canvas, onSliceSelected, onSliceHover) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSliceSelected = onSliceSelected;
    this.onSliceHover = onSliceHover;

    this.slices = [];
    this.hoveredSlice = null;
    this.selectedSlice = null;

    // Dimensions
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 175;

    // Physics
    this.rotation = 0;
    this.angularVelocity = 0;
    this.isDragging = false;
    this.lastDragAngle = 0;

    // Mouse coordinates
    this.mouseX = 0;
    this.mouseY = 0;

    // Cartoon Particle Systems
    this.crumbs = [];
    this.steamPuffs = [];

    // 1930s 24fps Cartoon Step Timer
    this.time = 0;
    this.animFrame = 0;

    this.initEvents();
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = rect.width;
    this.height = rect.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.width, this.height) * 0.31;
  }

  setSlices(slices) {
    this.slices = slices.map(s => ({
      ...s,
      currentOffset: 0,
      targetOffset: 0,
      wobble: 0,
      bites: 0
    }));
    this.hoveredSlice = null;
    this.selectedSlice = null;
    this.rotation = 0;
    this.angularVelocity = 0.08;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.onMouseMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY
        });
      }
    });
  }

  getAngleFromCenter(x, y) {
    return Math.atan2(y - this.centerY, x - this.centerX);
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (this.isDragging) {
      const currentAngle = this.getAngleFromCenter(this.mouseX, this.mouseY);
      const delta = currentAngle - this.lastDragAngle;
      this.rotation += delta;
      this.angularVelocity = delta;
      this.lastDragAngle = currentAngle;
      return;
    }

    const dx = this.mouseX - this.centerX;
    const dy = this.mouseY - this.centerY;
    const dist = Math.hypot(dx, dy);

    let found = null;
    if (dist <= this.radius + 40 && dist >= 20) {
      let mouseAngle = Math.atan2(dy, dx) - this.rotation;
      mouseAngle = (mouseAngle + Math.PI * 4) % (Math.PI * 2);
      if (mouseAngle > Math.PI * 1.5) mouseAngle -= Math.PI * 2;

      for (const slice of this.slices) {
        let start = (slice.startAngle + Math.PI * 4) % (Math.PI * 2);
        let end = (slice.endAngle + Math.PI * 4) % (Math.PI * 2);
        if (start > Math.PI * 1.5) start -= Math.PI * 2;
        if (end > Math.PI * 1.5) end -= Math.PI * 2;

        if (start < end) {
          if (mouseAngle >= start && mouseAngle <= end) {
            found = slice;
            break;
          }
        } else {
          if (mouseAngle >= start || mouseAngle <= end) {
            found = slice;
            break;
          }
        }
      }
    }

    if (found !== this.hoveredSlice) {
      if (found) {
        this.canvas.style.cursor = 'pointer';
        if (this.onSliceHover) this.onSliceHover(found);
      } else {
        this.canvas.style.cursor = 'grab';
        if (this.selectedSlice && this.onSliceHover) {
          this.onSliceHover(this.selectedSlice);
        }
      }
      this.hoveredSlice = found;
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - this.centerX, y - this.centerY);

    if (dist <= this.radius + 60) {
      this.isDragging = true;
      this.lastDragAngle = this.getAngleFromCenter(x, y);
      this.angularVelocity = 0;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = this.hoveredSlice ? 'pointer' : 'grab';
  }

  onClick(e) {
    if (Math.abs(this.angularVelocity) > 0.04) return;

    if (this.hoveredSlice) {
      this.selectedSlice = this.hoveredSlice;
      this.spawnCrumbs(this.mouseX, this.mouseY, this.selectedSlice.lang.color);

      if (this.onSliceSelected) {
        this.onSliceSelected(this.selectedSlice);
      }
    }
  }

  spawnCrumbs(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.5;
      this.crumbs.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 4 + Math.random() * 7,
        color: Math.random() > 0.35 ? color : '#f39c12',
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.25,
        life: 1.0
      });
    }
  }

  takeBite(slice) {
    const target = slice || this.selectedSlice || this.slices[0];
    if (!target) return;

    target.bites = (target.bites || 0) + 1;
    target.currentOffset = 38;

    const midAngle = (target.startAngle + target.endAngle) / 2 + this.rotation;
    const bx = this.centerX + Math.cos(midAngle) * this.radius;
    const by = this.centerY + Math.sin(midAngle) * this.radius;
    this.spawnCrumbs(bx, by, target.lang.color);
  }

  cycleSlice(direction = 1) {
    if (!this.slices || this.slices.length === 0) return;
    let idx = this.slices.indexOf(this.selectedSlice);
    if (idx === -1) idx = 0;
    else idx = (idx + direction + this.slices.length) % this.slices.length;
    this.selectedSlice = this.slices[idx];
    if (this.onSliceSelected) this.onSliceSelected(this.selectedSlice);
  }

  update() {
    this.time += 0.04;
    this.animFrame = Math.floor(this.time * 12); // Stepped 12fps cartoon feel!

    // Inertial spin
    if (!this.isDragging) {
      this.rotation += this.angularVelocity;
      this.angularVelocity *= 0.94;
      if (Math.abs(this.angularVelocity) < 0.0005) {
        this.angularVelocity = 0;
      }
    }

    // Rubber-hose spring offset on slices
    this.slices.forEach(slice => {
      const isHovered = (slice === this.hoveredSlice);
      const isSelected = (slice === this.selectedSlice);
      slice.targetOffset = isSelected ? 30 : (isHovered ? 18 : 0);
      slice.currentOffset += (slice.targetOffset - slice.currentOffset) * 0.24;
      slice.wobble = Math.sin(this.time * 2.5 + slice.startAngle) * (isHovered ? 2.5 : 0.6);
    });

    // Update Crumbs
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const p = this.crumbs[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.rot += p.vRot;
      p.life -= 0.025;
      if (p.life <= 0) this.crumbs.splice(i, 1);
    }

    // Spawn gentle cartoon steam puffs from center
    if (Math.random() < 0.08) {
      this.steamPuffs.push({
        x: this.centerX + (Math.random() - 0.5) * 20,
        y: this.centerY - 25,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.2 - Math.random() * 0.8,
        size: 10 + Math.random() * 8,
        life: 1.0,
        wobble: Math.random() * Math.PI * 2
      });
    }

    for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
      const s = this.steamPuffs[i];
      s.x += s.vx + Math.sin(this.time * 3 + s.wobble) * 0.5;
      s.y += s.vy;
      s.size += 0.15;
      s.life -= 0.018;
      if (s.life <= 0) this.steamPuffs.splice(i, 1);
    }
  }

  render() {
    this.update();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // 1930s Cartoon Breathing Squash & Stretch on whole platter
    const breath = Math.sin(this.time * 2) * 0.012;
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(1 + breath, 1 - breath);

    // 1. Hand-Painted Wooden Baker's Platter
    this.drawHandPaintedPlate(ctx);

    // 2. Rotatable Pie Platter
    ctx.save();
    ctx.rotate(this.rotation);

    // Draw Slices with Gourmet Cartoon Fillings & Crust
    this.slices.forEach(slice => {
      this.drawCupheadSlice(ctx, slice);
    });

    // Draw Center Cartoon Mascot ("Pearly Pie")
    this.drawCenterMascot(ctx);

    ctx.restore();

    // 3. Render Cartoon Steam Wisps
    this.drawSteam(ctx);

    // 4. Render Star Crumbs
    this.drawCrumbs(ctx);

    ctx.restore();
  }

  drawHandPaintedPlate(ctx) {
    const r = this.radius + 36;

    // Solid ink shadow (classic comic drop shadow)
    ctx.beginPath();
    ctx.arc(8, 12, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(36, 26, 20, 0.28)';
    ctx.fill();

    // Vintage Ceramic Pie Tin (Warm ivory glaze with rim ridges)
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f3e6d3';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#221914';
    ctx.stroke();

    // Inked Ceramic Fluting Ridge (hand-drawn scallop rim)
    const rimSteps = 48;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c4ab90';
    for (let i = 0; i < rimSteps; i++) {
      const a = (i / rimSteps) * Math.PI * 2;
      const x1 = Math.cos(a) * (r - 14);
      const y1 = Math.sin(a) * (r - 14);
      const x2 = Math.cos(a) * (r - 4);
      const y2 = Math.sin(a) * (r - 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  drawCupheadSlice(ctx, slice) {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const offset = slice.currentOffset;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;

    ctx.save();
    ctx.translate(ox, oy);

    const r = this.radius + slice.wobble;

    // 1. Slice Body Path
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, slice.startAngle, slice.endAngle);
    ctx.closePath();

    // Rich saturated gouache filling color
    ctx.fillStyle = slice.lang.color;
    ctx.fill();

    // 2. Hand-Drawn Inked Cross-Hatching (comic depth shading on the left edge)
    this.drawCrossHatching(ctx, slice.startAngle, r);

    // 3. Hand-Inked Comic Contour
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 4. Flaky Crimped Cartoon Pastry Crust (Wavy baked outer edge)
    this.drawFlakyPastryCrust(ctx, slice.startAngle, slice.endAngle, r);

    // 5. Cartoon Bite Mark
    if (slice.bites && slice.bites > 0) {
      this.drawBiteMarks(ctx, midAngle, r);
    }

    // 6. Expressive Pac-Man Cartoon Eyes (dominant slices >= 22%)
    if (slice.percentage >= 0.22) {
      this.drawPacmanEyes(ctx, midAngle, r * 0.42);
    }

    // 7. Crystal-Clear Horizontal Comic Label Badge
    this.drawUprightBadge(ctx, slice, midAngle, r * 0.74);

    ctx.restore();
  }

  drawCrossHatching(ctx, angle, r) {
    ctx.save();
    ctx.clip(); // clip within slice

    ctx.strokeStyle = 'rgba(31, 23, 18, 0.15)';
    ctx.lineWidth = 2;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let d = 20; d < r; d += 14) {
      const x = cosA * d;
      const y = sinA * d;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 8);
      ctx.lineTo(x + 8, y - 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawFlakyPastryCrust(ctx, startAngle, endAngle, r) {
    const angleSpan = endAngle - startAngle;
    const count = Math.max(2, Math.floor(angleSpan * 14));
    const step = angleSpan / count;

    ctx.fillStyle = '#f39c12';
    ctx.strokeStyle = '#1f1712';
    ctx.lineWidth = 3;

    for (let i = 0; i < count; i++) {
      const a = startAngle + i * step + step / 2;
      const cx = Math.cos(a) * (r - 3);
      const cy = Math.sin(a) * (r - 3);

      // Organic wavy scalloped pastry puff
      ctx.beginPath();
      ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Little fork crimp indent line on each scallop
      const fx1 = Math.cos(a) * (r - 7);
      const fy1 = Math.sin(a) * (r - 7);
      const fx2 = Math.cos(a) * (r + 1);
      const fy2 = Math.sin(a) * (r + 1);
      ctx.beginPath();
      ctx.moveTo(fx1, fy1);
      ctx.lineTo(fx2, fy2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8d4d0a';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1f1712';
    }
  }

  drawBiteMarks(ctx, angle, r) {
    ctx.save();
    const bx = Math.cos(angle) * (r - 2);
    const by = Math.sin(angle) * (r - 2);
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    ctx.fillStyle = '#f3e6d3';
    ctx.strokeStyle = '#1f1712';
    ctx.lineWidth = 3.5;

    [-12, 0, 12].forEach(offset => {
      ctx.beginPath();
      ctx.arc(offset, 0, 9.5, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  drawPacmanEyes(ctx, angle, dist) {
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle + Math.PI / 2);

    [-10, 10].forEach(xOffset => {
      ctx.beginPath();
      ctx.ellipse(xOffset, 0, 8.5, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#1f1712';
      ctx.stroke();

      // Pac-Man pupil tracking mouse
      const lookX = Math.max(-3.5, Math.min(3.5, (this.mouseX - this.centerX) * 0.015));
      const lookY = Math.max(-4.5, Math.min(4.5, (this.mouseY - this.centerY) * 0.015));

      ctx.beginPath();
      ctx.arc(xOffset + lookX, lookY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#1f1712';
      ctx.fill();

      // White shine notch
      ctx.beginPath();
      ctx.moveTo(xOffset + lookX, lookY);
      ctx.lineTo(xOffset + lookX + 3.5, lookY - 3.5);
      ctx.lineTo(xOffset + lookX, lookY - 5);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    ctx.restore();
  }

  drawUprightBadge(ctx, slice, angle, dist) {
    if (slice.percentage < 0.06) return;

    const lx = Math.cos(angle) * dist;
    const ly = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(lx, ly);

    // Keep badge 100% horizontal and upright
    ctx.rotate(-this.rotation);

    const pct = (slice.percentage * 100).toFixed(0);
    const text = `${slice.lang.name} ${pct}%`;

    ctx.font = '700 13px "Fredoka One", cursive, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 10;
    const padY = 4;
    const badgeW = textWidth + padX * 2;
    const badgeH = 24;

    // Solid comic pill badge
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1f1712';
    ctx.lineWidth = 2.6;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 12);
    } else {
      ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f1712';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  }

  drawCenterMascot(ctx) {
    // Center Pie Boss: "Pearly Pie" with cartoon toque, pie vents, and blinking eyes!
    const cr = 34;

    // Golden baked center crust button
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    ctx.fillStyle = '#e67e22';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // Smiling Pie Vents (crust steam slits formed like a smile!)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#8d4d0a';

    // Cross vents
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, 16);
    ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
    ctx.moveTo(-10, 10); ctx.lineTo(10, -10);
    ctx.stroke();

    // Cute smiling center button face
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // Center cute Pac-man pupil eyes
    [-4, 4].forEach(x => {
      ctx.beginPath();
      ctx.arc(x, -2, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#1f1712';
      ctx.fill();
    });

    // Cute little smile curve
    ctx.beginPath();
    ctx.arc(0, 3, 4, 0, Math.PI);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();
  }

  drawSteam(ctx) {
    this.steamPuffs.forEach(s => {
      ctx.save();
      ctx.translate(s.x - this.centerX, s.y - this.centerY);

      ctx.fillStyle = `rgba(255, 255, 255, ${s.life * 0.75})`;
      ctx.strokeStyle = `rgba(31, 23, 18, ${s.life * 0.4})`;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  drawCrumbs(ctx) {
    this.crumbs.forEach(p => {
      ctx.save();
      ctx.translate(p.x - this.centerX, p.y - this.centerY);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#1f1712';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      const s = p.size * p.life;
      ctx.rect(-s / 2, -s / 2, s, s);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
}
