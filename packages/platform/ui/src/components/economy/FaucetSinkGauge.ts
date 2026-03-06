/**
 * @hololand/ui - FaucetSinkGauge Component
 * Visualizes the faucet/sink balance ratio for the economy's Layer 1 (Flow Control).
 *
 * Reference: W.031 "Faucet-Sink Ratio Is the Master Variable"
 *
 * The gauge displays:
 *   - A semicircular gauge showing F(t)/S(t) ratio
 *   - Target ratio indicator (typically 1.0)
 *   - Color-coded health zones (green/yellow/red)
 *   - Optional per-source breakdown bars
 *   - Numeric readouts for faucet rate, sink rate, and ratio
 *
 * WCAG 2.1 AA:
 *   - role="meter" with aria-valuenow, aria-valuemin, aria-valuemax
 *   - Color is never the sole indicator (text labels always present)
 *   - Keyboard focus ring when focused
 *   - Screen reader announcements on threshold crossings
 */

import { EconomyComponent } from './EconomyComponent';
import type {
  FaucetSinkGaugeConfig,
  FaucetSinkData,
} from './types';
import { ECONOMY_COLORS } from './types';

export class FaucetSinkGauge extends EconomyComponent {
  private _data: FaucetSinkData;
  private _targetRatio: number;
  private _variance: number;
  private _showBreakdown: boolean;

  // Animation state
  private _displayRatio: number = 1.0;
  private _previousRatio: number = 1.0;

  // Threshold tracking for a11y announcements
  private _lastHealthZone: 'healthy' | 'warning' | 'critical' = 'healthy';

  constructor(config: FaucetSinkGaugeConfig) {
    super({
      ...config,
      title: config.title ?? 'Faucet / Sink Balance',
    });

    this._data = config.data ?? { faucetRate: 0, sinkRate: 0, ratio: 1.0 };
    this._targetRatio = config.targetRatio ?? 1.0;
    this._variance = config.variance ?? 0.1;
    this._showBreakdown = config.showBreakdown ?? false;

    this._displayRatio = this._data.ratio;
    this._previousRatio = this._data.ratio;

    // Default size
    if (!config.size) {
      this._size = { width: 280, height: this._showBreakdown ? 300 : 200 };
    }

    this.updateA11yDescription();
  }

  // =========================================================================
  // Data Update
  // =========================================================================

  /** Update the gauge with new faucet/sink data */
  setData(data: FaucetSinkData): void {
    this._previousRatio = this._displayRatio;
    this._data = { ...data };
    this.startAnimation();
    this.checkThresholds();
    this.updateA11yDescription();
    this.markDirty();
  }

  get data(): FaucetSinkData {
    return { ...this._data };
  }

  // =========================================================================
  // Threshold checking
  // =========================================================================

  private getHealthZone(ratio: number): 'healthy' | 'warning' | 'critical' {
    const deviation = Math.abs(ratio - this._targetRatio);
    if (deviation > this._variance * 2) return 'critical';
    if (deviation > this._variance) return 'warning';
    return 'healthy';
  }

  private checkThresholds(): void {
    const zone = this.getHealthZone(this._data.ratio);
    if (zone !== this._lastHealthZone) {
      if (zone === 'critical') {
        this.announce(
          `Warning: Faucet-sink ratio is ${this._data.ratio.toFixed(2)}, which is critically imbalanced. ` +
          `Target is ${this._targetRatio.toFixed(2)}.`,
          'assertive'
        );
      } else if (zone === 'warning') {
        this.announce(
          `Faucet-sink ratio is ${this._data.ratio.toFixed(2)}, outside optimal range.`,
          'polite'
        );
      } else if (this._lastHealthZone !== 'healthy') {
        this.announce(
          `Faucet-sink ratio has returned to healthy range at ${this._data.ratio.toFixed(2)}.`,
          'polite'
        );
      }
      this._lastHealthZone = zone;
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  protected renderCanvas2D(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.getBounds();

    // Animate ratio display
    const t = this.updateAnimation();
    this._displayRatio = this.lerp(this._previousRatio, this._data.ratio, t);

    // Background
    this.drawBackground(ctx, x, y, width, height);

    // Title
    const titleOffset = this.drawTitle(ctx, x, y, width);
    const contentY = y + titleOffset;
    const contentHeight = height - titleOffset;

    // Gauge area
    const gaugeHeight = this._showBreakdown ? contentHeight * 0.55 : contentHeight * 0.7;
    this.drawGauge(ctx, x, contentY, width, gaugeHeight);

    // Metric labels below gauge
    const labelsY = contentY + gaugeHeight;
    this.drawLabels(ctx, x, labelsY, width);

    // Optional breakdown bars
    if (this._showBreakdown && this._data.faucetBreakdown && this._data.sinkBreakdown) {
      const breakdownY = labelsY + 24;
      const breakdownHeight = contentHeight - gaugeHeight - 24;
      this.drawBreakdown(ctx, x, breakdownY, width, breakdownHeight);
    }
  }

  private drawGauge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const centerX = x + width / 2;
    const centerY = y + height * 0.85;
    const radius = Math.min(width * 0.4, height * 0.7);

    // Gauge arc parameters
    const startAngle = Math.PI;      // 180 degrees (left)
    const endAngle = Math.PI * 2;    // 360 degrees (right)

    // Draw background arc
    ctx.save();
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';

    // Health zone coloring on the arc
    const segments = 60;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * (endAngle - startAngle);
      const nextAngle = startAngle + ((i + 1) / segments) * (endAngle - startAngle);

      // Map arc position to ratio value (0.5 on left, 1.0 center, 1.5 on right)
      const mappedRatio = 0.5 + t * 1.0;
      const zone = this.getHealthZone(mappedRatio);

      ctx.strokeStyle = zone === 'healthy'
        ? (this._darkMode ? '#22C55E40' : '#22C55E30')
        : zone === 'warning'
          ? (this._darkMode ? '#F59E0B40' : '#F59E0B30')
          : (this._darkMode ? '#EF444440' : '#EF444430');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, nextAngle + 0.02);
      ctx.stroke();
    }

    // Draw active indicator
    // Map ratio to angle: 0.5 -> startAngle, 1.5 -> endAngle
    const clampedRatio = Math.max(0.5, Math.min(1.5, this._displayRatio));
    const ratioNormalized = (clampedRatio - 0.5) / 1.0;
    const indicatorAngle = startAngle + ratioNormalized * (endAngle - startAngle);

    // Draw indicator needle
    const zone = this.getHealthZone(this._displayRatio);
    const needleColor = zone === 'healthy'
      ? ECONOMY_COLORS.healthy
      : zone === 'warning'
        ? ECONOMY_COLORS.warning
        : ECONOMY_COLORS.critical;

    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 3;
    const needleLength = radius - 14;
    const needleX = centerX + Math.cos(indicatorAngle) * needleLength;
    const needleY = centerY + Math.sin(indicatorAngle) * needleLength;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.stroke();

    // Center dot
    this.drawDot(ctx, centerX, centerY, 5, needleColor);

    // Target marker
    const targetNorm = (this._targetRatio - 0.5) / 1.0;
    const targetAngle = startAngle + targetNorm * (endAngle - startAngle);
    const targetX = centerX + Math.cos(targetAngle) * (radius + 10);
    const targetY = centerY + Math.sin(targetAngle) * (radius + 10);
    ctx.strokeStyle = ECONOMY_COLORS.target;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(targetAngle) * (radius - 8),
      centerY + Math.sin(targetAngle) * (radius - 8)
    );
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Ratio value text
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillStyle = needleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this._displayRatio.toFixed(2), centerX, centerY - 10);

    // "F/S Ratio" subtitle
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText('F/S Ratio', centerX, centerY + 2);

    // Scale labels
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'center';
    const labels = [
      { value: '0.5', norm: 0 },
      { value: '0.75', norm: 0.25 },
      { value: '1.0', norm: 0.5 },
      { value: '1.25', norm: 0.75 },
      { value: '1.5', norm: 1.0 },
    ];
    for (const lbl of labels) {
      const a = startAngle + lbl.norm * (endAngle - startAngle);
      const lx = centerX + Math.cos(a) * (radius + 18);
      const ly = centerY + Math.sin(a) * (radius + 18);
      ctx.fillText(lbl.value, lx, ly);
    }

    ctx.restore();
  }

  private drawLabels(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    const labelY = y + 4;
    const colWidth = width / 3;

    // Faucet rate
    ctx.save();
    this.drawDot(ctx, x + 12, labelY + 6, 4, ECONOMY_COLORS.faucet);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Faucet', x + 20, labelY);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = this.textColor;
    ctx.fillText(this.formatNumber(this._data.faucetRate) + '/s', x + 20, labelY + 12);

    // Sink rate
    this.drawDot(ctx, x + colWidth + 12, labelY + 6, 4, ECONOMY_COLORS.sink);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText('Sink', x + colWidth + 20, labelY);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = this.textColor;
    ctx.fillText(this.formatNumber(this._data.sinkRate) + '/s', x + colWidth + 20, labelY + 12);

    // Target
    this.drawDot(ctx, x + colWidth * 2 + 12, labelY + 6, 4, ECONOMY_COLORS.target);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText('Target', x + colWidth * 2 + 20, labelY);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = this.textColor;
    ctx.fillText(this._targetRatio.toFixed(2), x + colWidth * 2 + 20, labelY + 12);

    ctx.restore();
  }

  private drawBreakdown(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!this._data.faucetBreakdown || !this._data.sinkBreakdown) return;

    const barHeight = 6;
    const barGap = 3;
    const labelWidth = 70;
    const barX = x + labelWidth + 8;
    const barWidth = width - labelWidth - 24;
    const maxRate = Math.max(
      ...this._data.faucetBreakdown.map(f => f.rate),
      ...this._data.sinkBreakdown.map(s => s.rate),
      1
    );

    ctx.save();

    // Faucets section
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillStyle = ECONOMY_COLORS.faucet;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FAUCETS', x + 8, y);

    let currentY = y + 14;
    for (const source of this._data.faucetBreakdown) {
      if (currentY + barHeight > y + height / 2) break;

      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = this.textSecondaryColor;
      ctx.fillText(source.label, x + 8, currentY);

      const bw = (source.rate / maxRate) * barWidth;
      ctx.fillStyle = ECONOMY_COLORS.faucet;
      ctx.beginPath();
      ctx.roundRect(barX, currentY + 1, bw, barHeight, 2);
      ctx.fill();

      currentY += barHeight + barGap + 8;
    }

    // Sinks section
    const sinksY = y + height / 2;
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillStyle = ECONOMY_COLORS.sink;
    ctx.fillText('SINKS', x + 8, sinksY);

    currentY = sinksY + 14;
    for (const source of this._data.sinkBreakdown) {
      if (currentY + barHeight > y + height) break;

      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = this.textSecondaryColor;
      ctx.fillText(source.label, x + 8, currentY);

      const bw = (source.rate / maxRate) * barWidth;
      ctx.fillStyle = ECONOMY_COLORS.sink;
      ctx.beginPath();
      ctx.roundRect(barX, currentY + 1, bw, barHeight, 2);
      ctx.fill();

      currentY += barHeight + barGap + 8;
    }

    ctx.restore();
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  protected updateA11yDescription(): void {
    const zone = this.getHealthZone(this._data.ratio);
    this._a11yDescription = {
      label: `Faucet-sink balance gauge`,
      description:
        `Economy faucet-sink ratio is ${this._data.ratio.toFixed(2)}. ` +
        `Target is ${this._targetRatio.toFixed(2)} with acceptable variance of ${this._variance.toFixed(2)}. ` +
        `Status: ${zone}. ` +
        `Faucet rate: ${this.formatNumber(this._data.faucetRate)} per second. ` +
        `Sink rate: ${this.formatNumber(this._data.sinkRate)} per second.`,
      valueText: `${this._data.ratio.toFixed(2)} (${zone})`,
      role: 'meter',
    };
  }
}
