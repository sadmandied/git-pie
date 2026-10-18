/**
 * GitPie — Modern Precision Donut Chart Engine (v8.0)
 *
 * Characteristics:
 * - Minimal, elegant radial ring geometry with micro-gaps
 * - Dynamic central typography readout (Name, Percentage, LOC)
 * - Smooth physics-driven drag rotation & hover arc elevation
 * - Precision hit-testing with zero cartoon food or pastry artifacts
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
    this.outerRadius = 140;
    this.innerRadius = 90;

    // Physics & Rotation
    this.rotation = 0; // Starts clean at 12 o'clock aligned
    this.angularVelocity = 0;
    this.isDragging = false;
    this.lastDragAngle = 0;

    // Mouse coordinates
    this.mouseX = 0;
    this.mouseY = 0;

    this.initEvents();
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.canvas);
    }
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

    // Golden-ratio inspired modern precision donut proportions
    this.outerRadius = Math.min(this.width, this.height) * 0.40;
    this.innerRadius = this.outerRadius * 0.65;
  }

  setSlices(slices) {
    this.slices = slices.map(s => ({
      ...s,
      currentOffset: 0,
      targetOffset: 0,
      hoverProgress: 0,
      radiusBoost: 0
    }));
    this.hoveredSlice = null;
    this.selectedSlice = null;
    this.rotation = 0;
    this.angularVelocity = 0.02;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
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
    // Donut hit boundary
    if (dist <= this.outerRadius + 18 && dist >= this.innerRadius - 10) {
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
      this.canvas.style.cursor = found ? 'pointer' : (dist <= this.outerRadius + 30 ? 'grab' : 'default');
      if (found && this.onSliceHover) {
        this.onSliceHover(found);
      }
    }
  }

  onMouseLeave() {
    this.hoveredSlice = null;
    this.isDragging = false;
    this.canvas.style.cursor = 'default';
    if (this.selectedSlice && this.onSliceHover) {
      this.onSliceHover(this.selectedSlice);
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - this.centerX, y - this.centerY);

    if (dist <= this.outerRadius + 30 && dist >= this.innerRadius - 20) {
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
    if (Math.abs(this.angularVelocity) > 0.03) return;
    if (this.hoveredSlice) {
      this.selectSlice(this.hoveredSlice);
    }
  }

  selectSlice(slice) {
    this.selectedSlice = slice;
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
    // Easter-egg pulse highlight for the slice
    if (!slice) slice = this.selectedSlice || this.slices[0];
    if (!slice) return;

    slice.radiusBoost = 14;
    setTimeout(() => {
      slice.radiusBoost = 0;
    }, 300);
  }

  updatePhysics() {
    if (!this.isDragging) {
      this.rotation += this.angularVelocity;
      this.angularVelocity *= 0.95;

      if (Math.abs(this.angularVelocity) < 0.0003) {
        this.angularVelocity = 0;
      }
    }

    // Smooth hover & expansion interpolation
    this.slices.forEach(slice => {
      const isActive = (slice === this.hoveredSlice) || (slice === this.selectedSlice && !this.hoveredSlice);
      const targetProgress = isActive ? 1 : 0;
      slice.hoverProgress += (targetProgress - slice.hoverProgress) * 0.22;
      slice.currentOffset = slice.hoverProgress * 7;
      slice.radiusBoost += ((isActive ? 6 : 0) - slice.radiusBoost) * 0.2;
    });
  }

  render() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && (rect.width !== this.width || rect.height !== this.height || this.width <= 0)) {
      this.resize();
    }

    this.updatePhysics();

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.slices.length === 0) {
      this.drawEmptyState(ctx);
      return;
    }

    // 1. Subtle Precision Donut Track (Circular Guide)
    this.drawDonutTrack(ctx);

    // 2. Precision Donut Arcs
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation);

    // Pass 1: Render unselected slices
    this.slices.forEach(slice => {
      const isElevated = slice === this.hoveredSlice || slice === this.selectedSlice;
      if (!isElevated) {
        this.drawPrecisionArc(ctx, slice, false);
      }
    });

    // Pass 2: Render active/elevated slice on top with soft shadow
    this.slices.forEach(slice => {
      const isElevated = slice === this.hoveredSlice || slice === this.selectedSlice;
      if (isElevated) {
        this.drawPrecisionArc(ctx, slice, true);
      }
    });

    ctx.restore();

    // 3. Central Typography Readout
    this.drawCenterReadout(ctx);
  }

  drawDonutTrack(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.outerRadius + 1, 0, Math.PI * 2);
    ctx.arc(cx, cy, this.innerRadius - 1, 0, Math.PI * 2, true);
    ctx.closePath();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
    ctx.fill();

    // Fine inner/outer hairline guides
    ctx.strokeStyle = 'rgba(210, 200, 188, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawPrecisionArc(ctx, slice, isElevated) {
    const span = slice.endAngle - slice.startAngle;
    if (span <= 0.005) return;

    // Precision angular micro-gap (2px visual separation)
    const gapAngle = this.slices.length > 1 ? 0.025 : 0;
    const a1 = slice.startAngle + gapAngle / 2;
    const a2 = slice.endAngle - gapAngle / 2;
    if (a2 <= a1) return;

    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const offset = slice.currentOffset;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;

    const rOuter = this.outerRadius + slice.radiusBoost;
    const rInner = Math.max(20, this.innerRadius - slice.hoverProgress * 2);

    ctx.save();
    ctx.translate(ox, oy);

    // Soft modern elevation shadow on hover
    if (isElevated && offset > 1) {
      ctx.shadowColor = 'rgba(35, 25, 15, 0.16)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
    }

    // Arc path
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, a1, a2, false);
    ctx.arc(0, 0, rInner, a2, a1, true);
    ctx.closePath();

    // Color fill
    ctx.fillStyle = slice.lang.color;
    ctx.fill();

    // Reset shadow for crisp hairline stroke
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.stroke();

    ctx.restore();
  }

  drawCenterReadout(ctx) {
    const active = this.hoveredSlice || this.selectedSlice || this.slices[0];
    if (!active) return;

    const cx = this.centerX;
    const cy = this.centerY;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Language / Category Label
    const label = (active.lang.name || '').toUpperCase();
    ctx.font = '600 12px "Outfit", sans-serif';
    ctx.fillStyle = '#655d56';
    ctx.fillText(label, cx, cy - 22);

    // 2. Large Precision Percentage
    const pct = `${(active.percentage * 100).toFixed(1)}%`;
    ctx.font = '700 32px "Spectral", Georgia, serif';
    ctx.fillStyle = '#1a1614';
    ctx.fillText(pct, cx, cy + 6);

    // 3. Tabular LOC count with matching accent dot
    const locText = `${active.loc.toLocaleString()} LOC`;
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#854d0e';
    ctx.fillText(locText, cx, cy + 32);

    ctx.restore();
  }

  drawEmptyState(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 15px "Outfit", sans-serif';
    ctx.fillStyle = '#9c9288';
    ctx.fillText('Select a repository to visualize codebase', this.centerX, this.centerY);
    ctx.restore();
  }
}
