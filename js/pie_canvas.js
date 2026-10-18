/**
 * GitPie — 1930s Cuphead-Style Cartoon Pie Canvas Engine
 * Hand-drawn rubber-hose pies, crimped crusts, cursor-tracking cartoon eyes, and springy physics.
 */

import { cartoonAudio } from './audio.js';

export class PieCanvasEngine {
  constructor(canvas, onSliceSelected) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSliceSelected = onSliceSelected;

    this.slices = [];
    this.hoveredSlice = null;
    this.selectedSlice = null;

    // Center & Radius
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 180;

    // Physics & Rubber-hose wobble
    this.rotation = 0;
    this.targetRotation = 0;
    this.angularVelocity = 0;
    this.isDragging = false;
    this.dragStartAngle = 0;
    this.lastDragAngle = 0;

    // Mouse coordinates
    this.mouseX = 0;
    this.mouseY = 0;

    // Cartoon Confetti & Smoke Puffs
    this.particles = [];

    // Animation frame timer
    this.wobbleTime = 0;

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
    this.radius = Math.min(this.width, this.height) * 0.32;
  }

  setSlices(slices) {
    this.slices = slices.map(s => ({
      ...s,
      currentOffset: 0,
      targetOffset: 0,
      wobble: 0
    }));
    this.hoveredSlice = null;
    this.selectedSlice = null;
    this.rotation = 0;
    this.angularVelocity = 0.08; // Fun spin when loaded!
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    // Touch support for mobile/trackpad
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

    // Check hit test for pie slices
    const dx = this.mouseX - this.centerX;
    const dy = this.mouseY - this.centerY;
    const dist = Math.hypot(dx, dy);

    let found = null;
    if (dist <= this.radius + 40 && dist >= 20) {
      let mouseAngle = Math.atan2(dy, dx) - this.rotation;
      // Normalize to [-PI/2, 3PI/2]
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
          // Wrapped around 0
          if (mouseAngle >= start || mouseAngle <= end) {
            found = slice;
            break;
          }
        }
      }
    }

    if (found !== this.hoveredSlice) {
      if (found) {
        cartoonAudio.playPop();
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'grab';
      }
      this.hoveredSlice = found;
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - this.centerX, y - this.centerY);

    // If clicking pie, allow spinning
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
    if (Math.abs(this.angularVelocity) > 0.04) return; // Ignore drag release clicks

    if (this.hoveredSlice) {
      this.selectedSlice = this.hoveredSlice;
      cartoonAudio.playBoing();

      // Spawn cartoon stars & crumbs
      this.spawnCrumbs(this.mouseX, this.mouseY, this.selectedSlice.lang.color);

      if (this.onSliceSelected) {
        this.onSliceSelected(this.selectedSlice);
      }
    }
  }

  spawnCrumbs(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 8,
        color: Math.random() > 0.3 ? color : '#f5b82e',
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        life: 1.0
      });
    }
  }

  update() {
    this.wobbleTime += 0.05;

    // Inertial angular deceleration
    if (!this.isDragging) {
      this.rotation += this.angularVelocity;
      this.angularVelocity *= 0.94; // friction
      if (Math.abs(this.angularVelocity) < 0.0005) {
        this.angularVelocity = 0;
      } else if (Math.random() > 0.8) {
        cartoonAudio.playTick();
      }
    }

    // Spring offset for slices
    this.slices.forEach(slice => {
      const isHovered = (slice === this.hoveredSlice);
      const isSelected = (slice === this.selectedSlice);
      slice.targetOffset = isSelected ? 32 : (isHovered ? 20 : 0);
      slice.currentOffset += (slice.targetOffset - slice.currentOffset) * 0.22;
      slice.wobble = Math.sin(this.wobbleTime * 3 + slice.startAngle) * (isHovered ? 2.5 : 0.8);
    });

    // Update cartoon particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // cartoon gravity
      p.rot += p.vRot;
      p.life -= 0.025;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    this.update();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    // 1. Draw 1930s Cartoon Ceramic Baker's Platter with Rim Details
    this.drawVintagePlate(ctx);

    // 2. Draw Pie Slices with Rubber-Hose Crust & Inked Lines
    ctx.save();
    ctx.rotate(this.rotation);

    this.slices.forEach(slice => {
      this.drawCartoonSlice(ctx, slice);
    });

    // 3. Central Pie Crust Button ("THE BAKER'S CORE")
    this.drawCenterCrust(ctx);

    ctx.restore(); // Undo rotation

    // 4. Render Cartoon Crumbs / Star Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x - this.centerX, p.y - this.centerY);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#1f1712';
      ctx.lineWidth = 2.5;

      // Draw little four-point cartoon star
      ctx.beginPath();
      const s = p.size * p.life;
      ctx.rect(-s / 2, -s / 2, s, s);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  drawVintagePlate(ctx) {
    const plateRadius = this.radius + 38;

    // Drop Shadow (solid comic style)
    ctx.beginPath();
    ctx.arc(8, 12, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(44, 33, 24, 0.22)';
    ctx.fill();

    // Vintage Pie Tin Rim
    ctx.beginPath();
    ctx.arc(0, 0, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f0dfc8';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#221914';
    ctx.stroke();

    // Inner rim line
    ctx.beginPath();
    ctx.arc(0, 0, plateRadius - 10, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#b89f82';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawCartoonSlice(ctx, slice) {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const offset = slice.currentOffset;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;

    ctx.save();
    ctx.translate(ox, oy);

    const r = this.radius + slice.wobble;

    // Slice Body Path
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, slice.startAngle, slice.endAngle);
    ctx.closePath();

    // Delicious Pie Filling Color
    ctx.fillStyle = slice.lang.color;
    ctx.fill();

    // Thick Hand-Inked Comic Outline
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 1930s Pie Crust Outer Scallops (Golden crimped crust)
    this.drawCrustScallops(ctx, slice.startAngle, slice.endAngle, r);

    // Cuphead-style Cartoon Eyes on large slices!
    if (slice.percentage > 0.12) {
      this.drawCartoonEyes(ctx, midAngle, r * 0.62);
    }

    // Pie slice label text
    this.drawSliceLabel(ctx, slice, midAngle, r * 0.78);

    ctx.restore();
  }

  drawCrustScallops(ctx, startAngle, endAngle, r) {
    const angleSpan = endAngle - startAngle;
    const steps = Math.max(3, Math.floor(angleSpan * 12));
    const stepAngle = angleSpan / steps;

    ctx.fillStyle = '#f39c12';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1f1712';

    for (let i = 0; i < steps; i++) {
      const a = startAngle + i * stepAngle + stepAngle / 2;
      const cx = Math.cos(a) * (r - 2);
      const cy = Math.sin(a) * (r - 2);

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawCartoonEyes(ctx, angle, dist) {
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle + Math.PI / 2);

    // Two big expressive cartoon eye whites
    [-8, 8].forEach(xOffset => {
      ctx.beginPath();
      ctx.ellipse(xOffset, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1f1712';
      ctx.stroke();

      // Classic 1930s "Pac-Man" cutout pupils tracking cursor
      const lookX = Math.max(-3, Math.min(3, (this.mouseX - this.centerX) * 0.015));
      const lookY = Math.max(-4, Math.min(4, (this.mouseY - this.centerY) * 0.015));

      ctx.beginPath();
      ctx.arc(xOffset + lookX, lookY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1f1712';
      ctx.fill();

      // Pacman shine notch
      ctx.beginPath();
      ctx.moveTo(xOffset + lookX, lookY);
      ctx.lineTo(xOffset + lookX + 3, lookY - 3);
      ctx.lineTo(xOffset + lookX, lookY - 4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    ctx.restore();
  }

  drawSliceLabel(ctx, slice, angle, dist) {
    const lx = Math.cos(angle) * dist;
    const ly = Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle + (angle > Math.PI / 2 || angle < -Math.PI / 2 ? Math.PI : 0));

    ctx.font = '900 13px "Bangers", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = `${slice.lang.name} ${(slice.percentage * 100).toFixed(0)}%`;

    // Comic text outline
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.strokeText(text, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  drawCenterCrust(ctx) {
    // Center cartoon pie crust button
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#e67e22';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1712';
    ctx.stroke();

    // Cross ventilation slit pattern (traditional pie vents)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1f1712';
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
    ctx.moveTo(0, -14); ctx.lineTo(0, 14);
    ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
    ctx.moveTo(-8, 8); ctx.lineTo(8, -8);
    ctx.stroke();
  }
}
