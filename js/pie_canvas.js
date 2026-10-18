/**
 * GitPie! — Authentic 1930s Cuphead / Fleischer Cartoon Pie Engine (v5.1)
 *
 * Visual improvements:
 * - Continuous, seamless wavy scalloped pastry crust (no beaded circles!)
 * - Classic 1930s vintage diner porcelain plate with cobalt concentric rims (no clock ticks!)
 * - Golden butter-crust center medallion with crisp cartoon steam vents & curling steam puffs
 * - Smooth squash & stretch slice pop-out
 * - Clean, 100% horizontal comic placards on major slices
 * - Flapper ticker needle
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
    this.width = 0;
    this.height = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 150;

    // Physics & Rotation
    this.rotation = 0;
    this.angularVelocity = 0;
    this.isDragging = false;
    this.lastDragAngle = 0;

    // Mouse coordinates
    this.mouseX = 0;
    this.mouseY = 0;

    // Ticker state
    this.tickerAngle = 0;
    this.lastCrossedSlice = null;

    // Particles
    this.crumbs = [];
    this.steamPuffs = [];

    this.time = 0;

    this.initEvents();
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.width = rect.width;
    this.height = rect.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    // Spaced for plate rim and popout offsets
    this.radius = Math.min(this.width, this.height) * 0.32;
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
    this.angularVelocity = 0.06;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('click', () => this.onClick());

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.onMouseMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY
        });
      }
    }, { passive: true });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.onMouseDown({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY
        });
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => this.onMouseUp());
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
    if (dist <= this.radius + 35 && dist >= 15) {
      let mouseAngle = Math.atan2(dy, dx) - this.rotation;
      mouseAngle = (mouseAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

      for (const slice of this.slices) {
        let s = (slice.startAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let e = (slice.endAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        if (s < e) {
          if (mouseAngle >= s && mouseAngle <= e) {
            found = slice;
            break;
          }
        } else {
          if (mouseAngle >= s || mouseAngle <= e) {
            found = slice;
            break;
          }
        }
      }
    }

    if (found !== this.hoveredSlice) {
      this.hoveredSlice = found;
      this.canvas.style.cursor = found ? 'pointer' : (dist <= this.radius + 50 ? 'grab' : 'default');
      if (found && this.onSliceHover) {
        this.onSliceHover(found);
      }
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - this.centerX, y - this.centerY);

    if (dist <= this.radius + 50) {
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

  onClick() {
    if (Math.abs(this.angularVelocity) > 0.04) return;
    if (this.hoveredSlice) {
      this.selectSlice(this.hoveredSlice);
    }
  }

  selectSlice(slice) {
    this.selectedSlice = slice;
    this.slices.forEach(s => {
      s.targetOffset = (s === slice) ? 24 : 0;
      if (s === slice) s.wobble = 10;
    });

    if (this.onSliceSelected) {
      this.onSliceSelected(slice);
    }
  }

  cycleSlice(direction = 1) {
    if (this.slices.length === 0) return;
    let idx = this.slices.indexOf(this.selectedSlice);
    if (idx === -1) idx = 0;
    else idx = (idx + direction + this.slices.length) % this.slices.length;
    this.selectSlice(this.slices[idx]);
  }

  takeBite(slice) {
    if (!slice) slice = this.selectedSlice || this.slices[0];
    if (!slice) return;

    slice.bites = (slice.bites || 0) + 1;
    slice.wobble = 12;

    const midAngle = (slice.startAngle + slice.endAngle) / 2 + this.rotation;
    const r = this.radius * 0.75;
    const bx = this.centerX + Math.cos(midAngle) * r;
    const by = this.centerY + Math.sin(midAngle) * r;

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.crumbs.push({
        x: bx,
        y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.35,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? slice.lang.color : '#f39c12',
        life: 1.0,
        decay: 0.02 + Math.random() * 0.025
      });
    }
  }

  updatePhysics() {
    this.time += 0.02;

    if (!this.isDragging) {
      this.rotation += this.angularVelocity;
      this.angularVelocity *= 0.965;

      if (Math.abs(this.angularVelocity) < 0.0005) {
        this.angularVelocity = 0;
      }
    }

    // Ticker needle angle
    if (Math.abs(this.angularVelocity) > 0.01) {
      let currentTopAngle = (-Math.PI / 2 - this.rotation) % (Math.PI * 2);
      if (currentTopAngle < 0) currentTopAngle += Math.PI * 2;

      for (const slice of this.slices) {
        if (currentTopAngle >= slice.startAngle && currentTopAngle <= slice.endAngle) {
          if (this.lastCrossedSlice !== slice) {
            this.lastCrossedSlice = slice;
            this.tickerAngle = (this.angularVelocity > 0 ? 0.35 : -0.35);
          }
          break;
        }
      }
    }
    this.tickerAngle *= 0.82;

    // Slices offset
    this.slices.forEach(slice => {
      const target = (slice === this.hoveredSlice && !this.selectedSlice) ? 14 :
                     (slice === this.selectedSlice) ? 24 : 0;
      slice.targetOffset = target;
      slice.currentOffset += (slice.targetOffset - slice.currentOffset) * 0.22;

      if (slice.wobble > 0) {
        slice.wobble *= 0.85;
        if (slice.wobble < 0.1) slice.wobble = 0;
      }
    });

    // Steam puffs
    if (Math.random() < 0.05 && this.steamPuffs.length < 8) {
      this.steamPuffs.push({
        x: this.centerX + (Math.random() - 0.5) * 16,
        y: this.centerY - 8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.85 - Math.random() * 0.8,
        radius: 5,
        alpha: 0.55,
        life: 1.0
      });
    }

    this.steamPuffs.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.22;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life * 0.5);
    });
    this.steamPuffs = this.steamPuffs.filter(p => p.life > 0);

    // Crumbs
    this.crumbs.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.2;
      c.rot += c.vrot;
      c.life -= c.decay;
    });
    this.crumbs = this.crumbs.filter(c => c.life > 0);
  }

  render() {
    this.updatePhysics();

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.slices.length === 0) {
      this.drawEmptyState(ctx);
      return;
    }

    // 1. Vintage Diner Porcelain Pie Plate
    this.drawPorcelainPlate(ctx);

    // 2. Pie Slices with Continuous Scalloped Crust
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation);

    // Shadows of popped slices
    this.slices.forEach(slice => {
      if (slice.currentOffset > 2) {
        this.drawSliceShadow(ctx, slice);
      }
    });

    // Draw Slices
    this.slices.forEach(slice => {
      this.drawPieSlice(ctx, slice);
    });

    // 3. Central Golden Crust Medallion
    this.drawCenterMedallion(ctx);

    ctx.restore();

    // 4. Steam Puffs
    this.drawSteamPuffs(ctx);

    // 5. Flapper Ticker Needle
    this.drawFlapperTicker(ctx);

    // 6. Flying Crumbs
    this.drawCrumbs(ctx);
  }

  drawPorcelainPlate(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius + 30;

    // Solid comic drop shadow
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 10, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(31, 23, 18, 0.2)';
    ctx.fill();

    // Warm ivory porcelain plate body
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fdfbf7';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // Classic 1930s diner cobalt/teal pinstripe rims
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0984e3';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#74b9ff';
    ctx.stroke();

    // Inner plate well
    ctx.beginPath();
    ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f1e3';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e0d5be';
    ctx.stroke();
  }

  drawSliceShadow(ctx, slice) {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const offset = slice.currentOffset;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;

    ctx.save();
    ctx.translate(ox + 5, oy + 7);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.radius, slice.startAngle, slice.endAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(31, 23, 18, 0.25)';
    ctx.fill();
    ctx.restore();
  }

  drawPieSlice(ctx, slice) {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const offset = slice.currentOffset;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;

    ctx.save();
    ctx.translate(ox, oy);

    const r = this.radius + slice.wobble;

    // 1. Slice Filling Path
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, slice.startAngle, slice.endAngle);
    ctx.closePath();

    // Juicy fruit filling gradient
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
    grad.addColorStop(0, slice.lang.color);
    grad.addColorStop(0.85, slice.lang.color);
    grad.addColorStop(1, slice.lang.darkColor || '#1f1712');
    ctx.fillStyle = grad;
    ctx.fill();

    // Inked contour
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. Glossy Reflection Arc
    this.drawGlossHighlight(ctx, slice.startAngle, slice.endAngle, r);

    // 3. CONTINUOUS Scalloped Wavy Flaky Pastry Crust
    this.drawContinuousScallopCrust(ctx, slice.startAngle, slice.endAngle, r);

    // 4. Bite Marks
    if (slice.bites > 0) {
      this.drawBite(ctx, midAngle, r);
    }

    // 5. Upright Comic Pill Badge (Major slices >= 12%)
    if (slice.percentage >= 0.12) {
      this.drawUprightBadge(ctx, slice, midAngle, r * 0.65);
    }

    ctx.restore();
  }

  drawGlossHighlight(ctx, startAngle, endAngle, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, startAngle, endAngle);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draws a smooth, continuous undulating scalloped wave for the pastry crust rim.
   * Eliminates the "ring of beads" look completely!
   */
  drawContinuousScallopCrust(ctx, startAngle, endAngle, r) {
    const span = endAngle - startAngle;
    const scallops = Math.max(1, Math.round(span * 8.5));
    const step = span / scallops;

    ctx.save();

    // 1. Draw outer scalloped rim path
    ctx.beginPath();
    const innerR = r - 10;
    const outerR = r + 6;

    // Start at inner start point
    ctx.moveTo(Math.cos(startAngle) * innerR, Math.sin(startAngle) * innerR);
    ctx.lineTo(Math.cos(startAngle) * outerR, Math.sin(startAngle) * outerR);

    // Loop through scallops using smooth bezier arcs
    for (let i = 0; i < scallops; i++) {
      const aStart = startAngle + i * step;
      const aMid = aStart + step / 2;
      const aEnd = aStart + step;

      // Peak of the scallop
      const peakR = outerR + 4;
      const px = Math.cos(aMid) * peakR;
      const py = Math.sin(aMid) * peakR;

      const endX = Math.cos(aEnd) * outerR;
      const endY = Math.sin(aEnd) * outerR;

      ctx.quadraticCurveTo(px, py, endX, endY);
    }

    // Connect back inward
    ctx.lineTo(Math.cos(endAngle) * innerR, Math.sin(endAngle) * innerR);

    // Arc back along inner radius
    ctx.arc(0, 0, innerR, endAngle, startAngle, true);
    ctx.closePath();

    // Golden baked pastry gradient
    const crustGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR + 4);
    crustGrad.addColorStop(0, '#f39c12');
    crustGrad.addColorStop(0.5, '#f5cd79');
    crustGrad.addColorStop(1, '#d35400');
    ctx.fillStyle = crustGrad;
    ctx.fill();

    // Solid ink border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1f1712';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. Fork Crimp Lines along each scallop crest
    for (let i = 0; i < scallops; i++) {
      const aMid = startAngle + i * step + step / 2;
      const fx1 = Math.cos(aMid) * (innerR + 2);
      const fy1 = Math.sin(aMid) * (innerR + 2);
      const fx2 = Math.cos(aMid) * (outerR + 2);
      const fy2 = Math.sin(aMid) * (outerR + 2);

      ctx.beginPath();
      ctx.moveTo(fx1, fy1);
      ctx.lineTo(fx2, fy2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8d4d0a';
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBite(ctx, angle, r) {
    ctx.save();
    const bx = Math.cos(angle) * (r - 4);
    const by = Math.sin(angle) * (r - 4);
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    ctx.fillStyle = '#f7f1e3';
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

  drawUprightBadge(ctx, slice, angle, dist) {
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
    const badgeW = Math.max(76, textWidth + 18);
    const badgeH = 24;

    // Solid comic pill shadow
    ctx.fillStyle = 'rgba(31, 23, 18, 0.35)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-badgeW / 2 + 2, -badgeH / 2 + 3, badgeW, badgeH, 12);
    else ctx.rect(-badgeW / 2 + 2, -badgeH / 2 + 3, badgeW, badgeH);
    ctx.fill();

    // Solid white comic pill badge
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1f1712';
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 12);
    else ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    // High contrast black text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f1712';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  }

  drawCenterMedallion(ctx) {
    const cr = 30;

    // Golden baked crust button
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    const btnGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, cr);
    btnGrad.addColorStop(0, '#f9ca24');
    btnGrad.addColorStop(0.7, '#e67e22');
    btnGrad.addColorStop(1, '#b06713');
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // 4 Classic decorative curved cartoon steam vents
    ctx.fillStyle = '#783804';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -15, 2.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Center butter star
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fceecb';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();
  }

  drawSteamPuffs(ctx) {
    this.steamPuffs.forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(31, 23, 18, ${p.alpha * 0.4})`;
      ctx.stroke();
      ctx.restore();
    });
  }

  drawFlapperTicker(ctx) {
    const cx = this.centerX;
    const cy = this.centerY - this.radius - 16;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.tickerAngle);

    // Drop shadow
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(31, 23, 18, 0.28)';
    ctx.fill();

    // Flapper needle arrow
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-7, -7);
    ctx.lineTo(7, -7);
    ctx.closePath();
    ctx.fillStyle = '#d63031';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // Brass pin
    ctx.beginPath();
    ctx.arc(0, -7, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    ctx.restore();
  }

  drawCrumbs(ctx) {
    this.crumbs.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.max(0, c.life);

      const s = c.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.35, -s * 0.35);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.35, -s * 0.35);
      ctx.closePath();

      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1f1712';
      ctx.stroke();

      ctx.restore();
    });
  }

  drawEmptyState(ctx) {
    ctx.save();
    ctx.font = '700 22px "Bangers", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#795548';
    ctx.fillText('SELECT OR ORDER A REPO TO BAKE!', this.centerX, this.centerY);
    ctx.restore();
  }
}
