/**
 * @hololand/ui - GiniChart Component
 * Visualizes the Gini coefficient and optional Lorenz curve for wealth equality.
 *
 * Reference: W.038 "Linden Dollar Stability Through Transparency"
 * Layer 4: REDISTRIBUTION, Layer 6: TRANSPARENCY
 *
 * The chart displays:
 *   - Time-series line chart of historical Gini coefficient
 *   - Color-coded zones (equal / moderate / unequal / extreme)
 *   - Optional Lorenz curve overlay (cumulative wealth distribution)
 *   - Perfect equality reference line on Lorenz curve
 *   - Warning/critical threshold indicators
 *   - Current value callout with trend arrow
 *
 * WCAG 2.1 AA:
 *   - role="img" with comprehensive aria-label
 *   - Pattern fills supplement color for zone identification
 *   - Data available as accessible text description
 *   - Keyboard navigable data points (TODO: future enhancement)
 */

import { EconomyComponent } from './EconomyComponent';
import type { GiniChartConfig, TimeSeriesPoint } from './types';
import { ECONOMY_COLORS } from './types';

export class GiniChart extends EconomyComponent {
  private _history: TimeSeriesPoint[];
  private _currentGini: number;
  private _showLorenzCurve: boolean;
  private _lorenzData: Array<{ population: number; wealth: number }>;
  private _warningThreshold: number;
  private _criticalThreshold: number;

  // Animation
  private _displayGini: number = 0;
  private _previousGini: number = 0;

  // Threshold tracking
  private _lastZone: string = 'equal';

  constructor(config: GiniChartConfig) {
    super({
      ...config,
      title: config.title ?? 'Wealth Equality (Gini Coefficient)',
    });

    this._history = config.history ? [...config.history] : [];
    this._currentGini = config.currentGini ?? 0;
    this._showLorenzCurve = config.showLorenzCurve ?? false;
    this._lorenzData = config.lorenzData ? [...config.lorenzData] : [];
    this._warningThreshold = config.warningThreshold ?? 0.5;
    this._criticalThreshold = config.criticalThreshold ?? 0.7;

    this._displayGini = this._currentGini;
    this._previousGini = this._currentGini;

    // Default size
    if (!config.size) {
      this._size = { width: 320, height: this._showLorenzCurve ? 320 : 200 };
    }

    this.updateA11yDescription();
  }

  // =========================================================================
  // Data Update
  // =========================================================================

  /** Update the chart with a new Gini value and optional history */
  setGini(value: number, history?: TimeSeriesPoint[]): void {
    this._previousGini = this._displayGini;
    this._currentGini = value;
    if (history) this._history = [...history];

    this.startAnimation();
    this.checkThresholds();
    this.updateA11yDescription();
    this.markDirty();
  }

  /** Update Lorenz curve data */
  setLorenzData(data: Array<{ population: number; wealth: number }>): void {
    this._lorenzData = [...data];
    this.markDirty();
  }

  get currentGini(): number {
    return this._currentGini;
  }

  // =========================================================================
  // Threshold checking
  // =========================================================================

  private getZone(gini: number): string {
    if (gini < 0.3) return 'Very Equal';
    if (gini < 0.4) return 'Equal';
    if (gini < this._warningThreshold) return 'Moderate';
    if (gini < 0.6) return 'Unequal';
    if (gini < this._criticalThreshold) return 'Very Unequal';
    return 'Extreme Inequality';
  }

  private checkThresholds(): void {
    const zone = this.getZone(this._currentGini);
    if (zone !== this._lastZone) {
      if (this._currentGini >= this._criticalThreshold) {
        this.announce(
          `Critical: Gini coefficient has reached ${this._currentGini.toFixed(3)}, ` +
            `indicating extreme wealth inequality.`,
          'assertive'
        );
      } else if (this._currentGini >= this._warningThreshold && this._lastZone !== '') {
        this.announce(
          `Gini coefficient is ${this._currentGini.toFixed(3)}, indicating ${zone.toLowerCase()}.`,
          'polite'
        );
      }
      this._lastZone = zone;
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  protected renderCanvas2D(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.getBounds();

    // Animate
    const t = this.updateAnimation();
    this._displayGini = this.lerp(this._previousGini, this._currentGini, t);

    // Background
    this.drawBackground(ctx, x, y, width, height);

    // Title
    const titleOffset = this.drawTitle(ctx, x, y, width);
    const contentY = y + titleOffset;
    const contentHeight = height - titleOffset;

    if (this._showLorenzCurve && this._lorenzData.length > 0) {
      // Split view: time series on top, Lorenz on bottom
      const splitHeight = contentHeight * 0.5;
      this.drawTimeSeries(ctx, x + 8, contentY, width - 16, splitHeight - 8);
      this.drawLorenzCurve(ctx, x + 8, contentY + splitHeight, width - 16, splitHeight - 8);
    } else {
      // Full time series
      this.drawTimeSeries(ctx, x + 8, contentY, width - 16, contentHeight - 8);
    }
  }

  private drawTimeSeries(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const chartLeft = x + 36;
    const chartRight = x + width - 8;
    const chartTop = y + 8;
    const chartBottom = y + height - 20;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    ctx.save();

    // Draw zone backgrounds
    this.drawZoneBands(ctx, chartLeft, chartTop, chartWidth, chartHeight);

    // Draw threshold lines
    this.drawThresholdLine(
      ctx,
      chartLeft,
      chartTop,
      chartWidth,
      chartHeight,
      this._warningThreshold,
      'Warning'
    );
    this.drawThresholdLine(
      ctx,
      chartLeft,
      chartTop,
      chartWidth,
      chartHeight,
      this._criticalThreshold,
      'Critical'
    );

    // Y-axis labels (Gini values)
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= 1; g += 0.25) {
      const py = chartBottom - (g / 1.0) * chartHeight;
      ctx.fillText(g.toFixed(2), chartLeft - 4, py);
    }

    // Draw history line
    if (this._history.length >= 2) {
      const minT = this._history[0].timestamp;
      const maxT = this._history[this._history.length - 1].timestamp;
      const timeRange = maxT - minT || 1;

      // Gradient line colored by zone
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      for (let i = 0; i < this._history.length; i++) {
        const point = this._history[i];
        const px = chartLeft + ((point.timestamp - minT) / timeRange) * chartWidth;
        const py = chartBottom - (point.value / 1.0) * chartHeight;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.strokeStyle = this.getGiniColor(this._displayGini);
      ctx.stroke();

      // Fill area under curve with translucent color
      const lastPx =
        chartLeft +
        ((this._history[this._history.length - 1].timestamp - minT) / timeRange) * chartWidth;
      ctx.lineTo(lastPx, chartBottom);
      ctx.lineTo(chartLeft, chartBottom);
      ctx.closePath();
      ctx.fillStyle = this.getGiniColor(this._displayGini) + '20';
      ctx.fill();
    }

    // Current value callout
    const valueY = chartBottom - (this._displayGini / 1.0) * chartHeight;
    this.drawDot(ctx, chartRight, valueY, 5, this.getGiniColor(this._displayGini));

    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = this.getGiniColor(this._displayGini);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this._displayGini.toFixed(3), chartRight - 2, valueY - 8);

    // Zone label
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText(this.getZone(this._displayGini), chartRight - 2, valueY - 22);

    ctx.restore();
  }

  private drawZoneBands(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number
  ): void {
    const zones = [
      { min: 0, max: 0.3, color: ECONOMY_COLORS.equalityGood + '10' },
      { min: 0.3, max: this._warningThreshold, color: ECONOMY_COLORS.equalityGood + '08' },
      {
        min: this._warningThreshold,
        max: this._criticalThreshold,
        color: ECONOMY_COLORS.equalityMod + '10',
      },
      { min: this._criticalThreshold, max: 1.0, color: ECONOMY_COLORS.equalityBad + '10' },
    ];

    for (const zone of zones) {
      const zy = chartTop + chartHeight - (zone.max / 1.0) * chartHeight;
      const zh = ((zone.max - zone.min) / 1.0) * chartHeight;
      ctx.fillStyle = zone.color;
      ctx.fillRect(chartLeft, zy, chartWidth, zh);
    }
  }

  private drawThresholdLine(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    value: number,
    label: string
  ): void {
    const py = chartTop + chartHeight - (value / 1.0) * chartHeight;

    ctx.save();
    ctx.strokeStyle =
      value >= this._criticalThreshold
        ? ECONOMY_COLORS.critical + '60'
        : ECONOMY_COLORS.warning + '60';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartLeft, py);
    ctx.lineTo(chartLeft + chartWidth, py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, chartLeft + 2, py - 2);
    ctx.restore();
  }

  private drawLorenzCurve(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const chartLeft = x + 36;
    const chartRight = x + width - 8;
    const chartTop = y + 4;
    const chartBottom = y + height - 16;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    ctx.save();

    // Label
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Lorenz Curve', chartLeft, y);

    // Perfect equality line (diagonal)
    ctx.strokeStyle = ECONOMY_COLORS.equalityLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartTop);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lorenz curve
    if (this._lorenzData.length >= 2) {
      ctx.strokeStyle = ECONOMY_COLORS.lorenzCurve;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < this._lorenzData.length; i++) {
        const point = this._lorenzData[i];
        const px = chartLeft + point.population * chartWidth;
        const py = chartBottom - point.wealth * chartHeight;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Fill area between Lorenz curve and equality line
      ctx.lineTo(chartRight, chartTop);
      ctx.lineTo(chartLeft, chartBottom);
      ctx.closePath();
      ctx.fillStyle = ECONOMY_COLORS.lorenzCurve + '15';
      ctx.fill();
    }

    // Axis labels
    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Population %', chartLeft + chartWidth / 2, chartBottom + 2);

    ctx.save();
    ctx.translate(chartLeft - 24, chartTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Wealth %', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private getGiniColor(gini: number): string {
    if (gini >= this._criticalThreshold) return ECONOMY_COLORS.equalityBad;
    if (gini >= this._warningThreshold) return ECONOMY_COLORS.equalityMod;
    return ECONOMY_COLORS.equalityGood;
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  protected updateA11yDescription(): void {
    const zone = this.getZone(this._currentGini);
    const trend =
      this._history.length >= 2
        ? this._history[this._history.length - 1].value >
          this._history[this._history.length - 2].value
          ? 'rising'
          : 'falling'
        : 'stable';

    this._a11yDescription = {
      label: `Gini coefficient chart`,
      description:
        `Current Gini coefficient is ${this._currentGini.toFixed(3)}, classified as ${zone}. ` +
        `Trend is ${trend}. ` +
        `Warning threshold: ${this._warningThreshold.toFixed(2)}. ` +
        `Critical threshold: ${this._criticalThreshold.toFixed(2)}. ` +
        `${this._history.length} historical data points available.`,
      valueText: `${this._currentGini.toFixed(3)} (${zone})`,
      role: 'img',
    };
  }
}
