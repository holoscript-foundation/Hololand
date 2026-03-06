/**
 * @hololand/ui - PIDStatusDisplay Component
 * Displays the dual-loop PID controller status for Layer 1 Flow Control.
 *
 * Reference: P.030.01, W.032 "Dual-Loop Feedback Control Solves Long-Term Stability"
 *
 * Architecture:
 *   Inner loop: Per-source faucet adjustment (fast, seconds-minutes)
 *   Outer loop: Global money supply targeting (slow, hours-days)
 *
 * The display shows:
 *   - Dual-panel view of inner and outer loop status
 *   - P, I, D term breakdown with proportional bars
 *   - Output history sparklines for each loop
 *   - Current faucet multiplier (combined output)
 *   - Supply deviation indicator
 *   - Setpoint and error visualization
 *
 * WCAG 2.1 AA:
 *   - role="status" for live region updates
 *   - All metrics available as aria-described text
 *   - Color always paired with text/pattern indicators
 *   - Keyboard focus support for expanded details
 */

import { EconomyComponent } from './EconomyComponent';
import type {
  PIDStatusDisplayConfig,
  PIDLoopData,
  TimeSeriesPoint,
} from './types';
import { ECONOMY_COLORS } from './types';

/** Default PID loop data */
const DEFAULT_PID: PIDLoopData = {
  error: 0,
  integral: 0,
  derivative: 0,
  output: 0,
  setpoint: 0,
};

export class PIDStatusDisplay extends EconomyComponent {
  private _innerLoop: PIDLoopData;
  private _outerLoop: PIDLoopData;
  private _innerHistory: TimeSeriesPoint[];
  private _outerHistory: TimeSeriesPoint[];
  private _faucetMultiplier: number;
  private _supplyDeviation: number;
  private _showTermBreakdown: boolean;

  // Animation
  private _displayMultiplier: number = 1.0;
  private _previousMultiplier: number = 1.0;

  constructor(config: PIDStatusDisplayConfig) {
    super({
      ...config,
      title: config.title ?? 'PID Flow Controller',
    });

    this._innerLoop = config.innerLoop ? { ...config.innerLoop } : { ...DEFAULT_PID };
    this._outerLoop = config.outerLoop ? { ...config.outerLoop } : { ...DEFAULT_PID };
    this._innerHistory = config.innerHistory ? [...config.innerHistory] : [];
    this._outerHistory = config.outerHistory ? [...config.outerHistory] : [];
    this._faucetMultiplier = config.faucetMultiplier ?? 1.0;
    this._supplyDeviation = config.supplyDeviation ?? 0;
    this._showTermBreakdown = config.showTermBreakdown ?? false;

    this._displayMultiplier = this._faucetMultiplier;
    this._previousMultiplier = this._faucetMultiplier;

    // Default size
    if (!config.size) {
      this._size = { width: 360, height: this._showTermBreakdown ? 340 : 260 };
    }

    this.updateA11yDescription();
  }

  // =========================================================================
  // Data Update
  // =========================================================================

  /** Update all PID data at once */
  setData(data: {
    innerLoop?: PIDLoopData;
    outerLoop?: PIDLoopData;
    innerHistory?: TimeSeriesPoint[];
    outerHistory?: TimeSeriesPoint[];
    faucetMultiplier?: number;
    supplyDeviation?: number;
  }): void {
    if (data.innerLoop) this._innerLoop = { ...data.innerLoop };
    if (data.outerLoop) this._outerLoop = { ...data.outerLoop };
    if (data.innerHistory) this._innerHistory = [...data.innerHistory];
    if (data.outerHistory) this._outerHistory = [...data.outerHistory];
    if (data.supplyDeviation !== undefined) this._supplyDeviation = data.supplyDeviation;

    if (data.faucetMultiplier !== undefined) {
      this._previousMultiplier = this._displayMultiplier;
      this._faucetMultiplier = data.faucetMultiplier;
      this.startAnimation();
    }

    this.updateA11yDescription();
    this.markDirty();
  }

  get faucetMultiplier(): number {
    return this._faucetMultiplier;
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  protected renderCanvas2D(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.getBounds();

    // Animate
    const t = this.updateAnimation();
    this._displayMultiplier = this.lerp(this._previousMultiplier, this._faucetMultiplier, t);

    // Background
    this.drawBackground(ctx, x, y, width, height);

    // Title
    const titleOffset = this.drawTitle(ctx, x, y, width);
    const contentY = y + titleOffset;
    const contentHeight = height - titleOffset;

    // Top section: faucet multiplier and supply deviation
    this.drawTopMetrics(ctx, x + 8, contentY, width - 16);

    // Dual-panel layout for inner/outer loops
    const panelY = contentY + 48;
    const panelHeight = this._showTermBreakdown
      ? contentHeight - 56
      : contentHeight - 56;
    const halfWidth = (width - 24) / 2;

    this.drawLoopPanel(
      ctx,
      x + 8,
      panelY,
      halfWidth,
      panelHeight,
      'Inner Loop',
      '(Fast: Faucet Adjust)',
      this._innerLoop,
      this._innerHistory,
      ECONOMY_COLORS.faucet
    );

    this.drawLoopPanel(
      ctx,
      x + halfWidth + 16,
      panelY,
      halfWidth,
      panelHeight,
      'Outer Loop',
      '(Slow: Supply Target)',
      this._outerLoop,
      this._outerHistory,
      ECONOMY_COLORS.balance
    );
  }

  private drawTopMetrics(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    ctx.save();

    // Faucet multiplier
    const multColor = this._displayMultiplier > 1.5 || this._displayMultiplier < 0.5
      ? ECONOMY_COLORS.critical
      : this._displayMultiplier > 1.2 || this._displayMultiplier < 0.8
        ? ECONOMY_COLORS.warning
        : ECONOMY_COLORS.healthy;

    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = multColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${this._displayMultiplier.toFixed(2)}x`, x, y);

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText('Faucet Multiplier', x, y + 22);

    // Multiplier bar
    const barX = x + 120;
    const barWidth = 100;
    const barY = y + 4;
    const barHeight = 12;

    // Background
    ctx.fillStyle = this.gridColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Fill (0.0 = empty, 1.0 = middle, 2.0 = full)
    const fillNorm = Math.max(0, Math.min(1, this._displayMultiplier / 2.0));
    const fillWidth = fillNorm * barWidth;
    ctx.fillStyle = multColor + '80';
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
    ctx.fill();

    // Center mark (1.0x)
    const centerX = barX + barWidth / 2;
    ctx.strokeStyle = this.textSecondaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, barY - 2);
    ctx.lineTo(centerX, barY + barHeight + 2);
    ctx.stroke();

    // Supply deviation
    const devColor = Math.abs(this._supplyDeviation) > 20
      ? ECONOMY_COLORS.critical
      : Math.abs(this._supplyDeviation) > 10
        ? ECONOMY_COLORS.warning
        : ECONOMY_COLORS.healthy;

    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = devColor;
    ctx.textAlign = 'right';
    ctx.fillText(
      `${this._supplyDeviation > 0 ? '+' : ''}${this._supplyDeviation.toFixed(1)}%`,
      x + width,
      y + 2
    );

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText('Supply Deviation', x + width, y + 22);

    ctx.restore();
  }

  private drawLoopPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle: string,
    loop: PIDLoopData,
    history: TimeSeriesPoint[],
    accentColor: string
  ): void {
    ctx.save();

    // Panel background
    ctx.fillStyle = this._darkMode ? '#1A2332' : '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Title
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 8, y + 6);

    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText(subtitle, x + 8, y + 20);

    // Metrics
    let metricsY = y + 36;

    // Error
    this.drawPIDMetric(ctx, x + 8, metricsY, width - 16, 'Error', loop.error, ECONOMY_COLORS.critical);
    metricsY += 18;

    // Output
    this.drawPIDMetric(ctx, x + 8, metricsY, width - 16, 'Output', loop.output, ECONOMY_COLORS.output);
    metricsY += 18;

    // Setpoint
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'left';
    ctx.fillText(`Setpoint: ${this.formatNumber(loop.setpoint)}`, x + 8, metricsY);
    metricsY += 16;

    // PID term breakdown
    if (this._showTermBreakdown) {
      metricsY += 4;
      this.drawTermBar(ctx, x + 8, metricsY, width - 16, 'P', loop.error, ECONOMY_COLORS.proportional);
      metricsY += 14;
      this.drawTermBar(ctx, x + 8, metricsY, width - 16, 'I', loop.integral, ECONOMY_COLORS.integral);
      metricsY += 14;
      this.drawTermBar(ctx, x + 8, metricsY, width - 16, 'D', loop.derivative, ECONOMY_COLORS.derivative);
      metricsY += 18;
    }

    // History sparkline
    const sparkY = metricsY + 2;
    const sparkHeight = y + height - sparkY - 8;
    if (sparkHeight > 20 && history.length >= 2) {
      this.drawLoopSparkline(ctx, x + 8, sparkY, width - 16, sparkHeight, history, accentColor);
    }

    ctx.restore();
  }

  private drawPIDMetric(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    value: number,
    color: string
  ): void {
    ctx.save();

    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y);

    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(this.formatNumber(value, 4), x + width, y);

    ctx.restore();
  }

  private drawTermBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    value: number,
    color: string
  ): void {
    ctx.save();

    // Label
    ctx.font = '600 8px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y);

    // Bar
    const barX = x + 14;
    const barWidth = width - 50;
    const barHeight = 6;

    // Background
    ctx.fillStyle = this.gridColor;
    ctx.beginPath();
    ctx.roundRect(barX, y + 2, barWidth, barHeight, 2);
    ctx.fill();

    // Center line
    const centerX = barX + barWidth / 2;
    ctx.strokeStyle = this.textSecondaryColor + '60';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX, y + barHeight + 4);
    ctx.stroke();

    // Value bar (from center)
    // Normalize: assume max magnitude is the setpoint or 1000
    const maxMag = Math.max(Math.abs(value), 100);
    const norm = value / maxMag;
    const fillWidth = Math.abs(norm) * (barWidth / 2);

    ctx.fillStyle = color + '80';
    if (norm >= 0) {
      ctx.fillRect(centerX, y + 2, fillWidth, barHeight);
    } else {
      ctx.fillRect(centerX - fillWidth, y + 2, fillWidth, barHeight);
    }

    // Value text
    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'right';
    ctx.fillText(this.formatNumber(value, 2), x + width, y + 1);

    ctx.restore();
  }

  private drawLoopSparkline(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    history: TimeSeriesPoint[],
    color: string
  ): void {
    if (history.length < 2) return;

    const minT = history[0].timestamp;
    const maxT = history[history.length - 1].timestamp;
    const timeRange = maxT - minT || 1;

    // Find value range
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of history) {
      minV = Math.min(minV, p.value);
      maxV = Math.max(maxV, p.value);
    }
    const valueRange = maxV - minV || 1;

    ctx.save();

    // Zero line
    if (minV < 0 && maxV > 0) {
      const zeroY = y + height - ((0 - minV) / valueRange) * height;
      ctx.strokeStyle = this.textSecondaryColor + '40';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, zeroY);
      ctx.lineTo(x + width, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Sparkline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const point = history[i];
      const px = x + ((point.timestamp - minT) / timeRange) * width;
      const py = y + height - ((point.value - minV) / valueRange) * height;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // End dot
    const lastPoint = history[history.length - 1];
    const lastPx = x + width;
    const lastPy = y + height - ((lastPoint.value - minV) / valueRange) * height;
    this.drawDot(ctx, lastPx, lastPy, 3, color);

    ctx.restore();
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  protected updateA11yDescription(): void {
    const multStatus = this._faucetMultiplier > 1.5 || this._faucetMultiplier < 0.5
      ? 'critical'
      : this._faucetMultiplier > 1.2 || this._faucetMultiplier < 0.8
        ? 'elevated'
        : 'normal';

    this._a11yDescription = {
      label: `PID flow controller status`,
      description:
        `Dual-loop PID controller managing economy flow control. ` +
        `Faucet multiplier: ${this._faucetMultiplier.toFixed(2)}x (${multStatus}). ` +
        `Supply deviation: ${this._supplyDeviation > 0 ? '+' : ''}${this._supplyDeviation.toFixed(1)}%. ` +
        `Inner loop error: ${this.formatNumber(this._innerLoop.error)}, output: ${this.formatNumber(this._innerLoop.output)}. ` +
        `Outer loop error: ${this.formatNumber(this._outerLoop.error)}, output: ${this.formatNumber(this._outerLoop.output)}.`,
      valueText: `${this._faucetMultiplier.toFixed(2)}x multiplier, ${this._supplyDeviation.toFixed(1)}% deviation`,
      role: 'status',
    };
  }
}
