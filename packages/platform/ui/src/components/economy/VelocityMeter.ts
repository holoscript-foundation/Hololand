/**
 * @hololand/ui - VelocityMeter Component
 * Displays currency velocity (transactions / supply per unit time).
 *
 * Reference: Layer 1 Flow Control, W.032 "Dual-Loop Feedback Control"
 *
 * Currency velocity indicates how actively the economy is being used.
 * Too low = stagnation (hoarding), too high = overheating (rapid inflation).
 *
 * The meter displays:
 *   - Vertical bar meter with optimal range band
 *   - Sparkline history trail
 *   - Numeric velocity readout with units
 *   - Status indicator (stagnant / low / optimal / high / dangerous)
 *
 * WCAG 2.1 AA:
 *   - role="meter" with aria-valuenow, valuemin, valuemax
 *   - Text labels accompany all color indicators
 *   - Announcements on zone transitions
 */

import { EconomyComponent } from './EconomyComponent';
import type { VelocityMeterConfig, TimeSeriesPoint } from './types';
import { ECONOMY_COLORS } from './types';

export class VelocityMeter extends EconomyComponent {
  private _velocity: number;
  private _history: TimeSeriesPoint[];
  private _minVelocity: number;
  private _maxVelocity: number;
  private _optimalRange: { min: number; max: number };

  // Animation
  private _displayVelocity: number = 0;
  private _previousVelocity: number = 0;

  // Threshold tracking
  private _lastZone: string = '';

  constructor(config: VelocityMeterConfig) {
    super({
      ...config,
      title: config.title ?? 'Currency Velocity',
    });

    this._velocity = config.velocity ?? 0;
    this._history = config.history ? [...config.history] : [];
    this._minVelocity = config.minVelocity ?? 0;
    this._maxVelocity = config.maxVelocity ?? 2;
    this._optimalRange = config.optimalRange ?? { min: 0.3, max: 0.8 };

    this._displayVelocity = this._velocity;
    this._previousVelocity = this._velocity;

    // Default size
    if (!config.size) {
      this._size = { width: 200, height: 240 };
    }

    this.updateA11yDescription();
  }

  // =========================================================================
  // Data Update
  // =========================================================================

  /** Update velocity value and optional history */
  setVelocity(value: number, history?: TimeSeriesPoint[]): void {
    this._previousVelocity = this._displayVelocity;
    this._velocity = value;
    if (history) this._history = [...history];

    this.startAnimation();
    this.checkThresholds();
    this.updateA11yDescription();
    this.markDirty();
  }

  get velocity(): number {
    return this._velocity;
  }

  // =========================================================================
  // Zone detection
  // =========================================================================

  private getZone(v: number): string {
    if (v <= this._minVelocity * 1.1) return 'Stagnant';
    if (v < this._optimalRange.min) return 'Low';
    if (v <= this._optimalRange.max) return 'Optimal';
    if (v < this._maxVelocity * 0.85) return 'High';
    return 'Dangerous';
  }

  private getZoneColor(v: number): string {
    const zone = this.getZone(v);
    switch (zone) {
      case 'Stagnant':
        return ECONOMY_COLORS.velocityLow;
      case 'Low':
        return ECONOMY_COLORS.velocityLow;
      case 'Optimal':
        return ECONOMY_COLORS.velocityNormal;
      case 'High':
        return ECONOMY_COLORS.velocityHigh;
      case 'Dangerous':
        return ECONOMY_COLORS.velocityDangerous;
      default:
        return ECONOMY_COLORS.velocityNormal;
    }
  }

  private checkThresholds(): void {
    const zone = this.getZone(this._velocity);
    if (zone !== this._lastZone && this._lastZone !== '') {
      if (zone === 'Dangerous') {
        this.announce(
          `Warning: Currency velocity is dangerously high at ${this._velocity.toFixed(3)}. ` +
            `Economy may be overheating.`,
          'assertive'
        );
      } else if (zone === 'Stagnant') {
        this.announce(
          `Warning: Currency velocity is very low at ${this._velocity.toFixed(3)}. ` +
            `Economy may be stagnating.`,
          'assertive'
        );
      } else if (
        zone === 'Optimal' &&
        (this._lastZone === 'Dangerous' || this._lastZone === 'Stagnant')
      ) {
        this.announce(
          `Currency velocity has returned to optimal range at ${this._velocity.toFixed(3)}.`,
          'polite'
        );
      }
    }
    this._lastZone = zone;
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  protected renderCanvas2D(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.getBounds();

    // Animate
    const t = this.updateAnimation();
    this._displayVelocity = this.lerp(this._previousVelocity, this._velocity, t);

    // Background
    this.drawBackground(ctx, x, y, width, height);

    // Title
    const titleOffset = this.drawTitle(ctx, x, y, width);
    const contentY = y + titleOffset;
    const contentHeight = height - titleOffset;

    // Layout: meter bar on left, sparkline on right
    const meterWidth = 48;
    const sparklineX = x + meterWidth + 24;
    const sparklineWidth = width - meterWidth - 40;

    this.drawMeterBar(ctx, x + 16, contentY + 8, meterWidth, contentHeight - 48);
    this.drawSparkline(ctx, sparklineX, contentY + 8, sparklineWidth, contentHeight - 48);

    // Value and status at bottom
    this.drawValueDisplay(ctx, x, y + height - 36, width);
  }

  private drawMeterBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const range = this._maxVelocity - this._minVelocity;
    if (range <= 0) return;

    ctx.save();

    // Draw track background
    ctx.fillStyle = this.gridColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();

    // Draw zone bands (bottom to top: stagnant, low, optimal, high, dangerous)
    const zones = [
      {
        min: this._minVelocity,
        max: this._optimalRange.min,
        color: ECONOMY_COLORS.velocityLow + '40',
      },
      {
        min: this._optimalRange.min,
        max: this._optimalRange.max,
        color: ECONOMY_COLORS.velocityNormal + '40',
      },
      {
        min: this._optimalRange.max,
        max: this._maxVelocity,
        color: ECONOMY_COLORS.velocityHigh + '40',
      },
    ];

    // Clip to rounded rect
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.clip();

    for (const zone of zones) {
      const normMin = (zone.min - this._minVelocity) / range;
      const normMax = (zone.max - this._minVelocity) / range;
      const zy = y + height - normMax * height;
      const zh = (normMax - normMin) * height;
      ctx.fillStyle = zone.color;
      ctx.fillRect(x, zy, width, zh);
    }

    // Optimal range highlight
    const optNormMin = (this._optimalRange.min - this._minVelocity) / range;
    const optNormMax = (this._optimalRange.max - this._minVelocity) / range;
    const optY = y + height - optNormMax * height;
    const optH = (optNormMax - optNormMin) * height;
    ctx.strokeStyle = ECONOMY_COLORS.velocityNormal;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x, optY, width, optH);
    ctx.setLineDash([]);

    // Fill level
    const normalized = Math.max(
      0,
      Math.min(1, (this._displayVelocity - this._minVelocity) / range)
    );
    const fillHeight = normalized * height;
    const fillColor = this.getZoneColor(this._displayVelocity);

    ctx.fillStyle = fillColor + '90';
    ctx.fillRect(x, y + height - fillHeight, width, fillHeight);

    // Level indicator line
    const levelY = y + height - fillHeight;
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 2, levelY);
    ctx.lineTo(x + width + 2, levelY);
    ctx.stroke();

    ctx.restore();

    // Scale labels
    ctx.save();
    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = this._minVelocity + (range * i) / steps;
      const ly = y + height - (i / steps) * height;
      ctx.fillText(v.toFixed(1), x - 4, ly);
    }
    ctx.restore();
  }

  private drawSparkline(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (this._history.length < 2) {
      // No data message
      ctx.save();
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = this.textSecondaryColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Awaiting data...', x + width / 2, y + height / 2);
      ctx.restore();
      return;
    }

    const range = this._maxVelocity - this._minVelocity;
    if (range <= 0) return;

    const minT = this._history[0].timestamp;
    const maxT = this._history[this._history.length - 1].timestamp;
    const timeRange = maxT - minT || 1;

    ctx.save();

    // Draw sparkline
    ctx.strokeStyle = this.getZoneColor(this._displayVelocity);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < this._history.length; i++) {
      const point = this._history[i];
      const px = x + ((point.timestamp - minT) / timeRange) * width;
      const normalized = (point.value - this._minVelocity) / range;
      const py = y + height - Math.max(0, Math.min(1, normalized)) * height;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Fill under sparkline
    const lastPx = x + width;
    ctx.lineTo(lastPx, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fillStyle = this.getZoneColor(this._displayVelocity) + '15';
    ctx.fill();

    // Optimal range band on sparkline
    const optNormMin = (this._optimalRange.min - this._minVelocity) / range;
    const optNormMax = (this._optimalRange.max - this._minVelocity) / range;
    const bandY = y + height - optNormMax * height;
    const bandH = (optNormMax - optNormMin) * height;
    ctx.fillStyle = ECONOMY_COLORS.velocityNormal + '10';
    ctx.fillRect(x, bandY, width, bandH);

    ctx.restore();
  }

  private drawValueDisplay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    ctx.save();

    const zone = this.getZone(this._displayVelocity);
    const color = this.getZoneColor(this._displayVelocity);

    // Value
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this._displayVelocity.toFixed(3), x + width / 2, y);

    // Zone label
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText(`txn/supply/hr  |  ${zone}`, x + width / 2, y + 18);

    ctx.restore();
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  protected updateA11yDescription(): void {
    const zone = this.getZone(this._velocity);
    this._a11yDescription = {
      label: `Currency velocity meter`,
      description:
        `Currency velocity is ${this._velocity.toFixed(3)} transactions per unit of supply per hour. ` +
        `Status: ${zone}. ` +
        `Optimal range: ${this._optimalRange.min.toFixed(2)} to ${this._optimalRange.max.toFixed(2)}. ` +
        `Scale: ${this._minVelocity.toFixed(2)} to ${this._maxVelocity.toFixed(2)}.`,
      valueText: `${this._velocity.toFixed(3)} (${zone})`,
      role: 'meter',
    };
  }
}
