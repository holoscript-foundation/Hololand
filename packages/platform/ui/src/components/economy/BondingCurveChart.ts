/**
 * @hololand/ui - BondingCurveChart Component
 * Interactive visualization of bonding curve price discovery (Layer 2).
 *
 * Reference: P.030.02 "Bonding Curves Provide Intrinsic Price Discovery"
 * Formula: P = R * S^(1/n) for exponential (default)
 * Spatial: P_spatial = P_bonding * (1 + d_factor * distance)
 *
 * The chart displays:
 *   - Bonding curve function plotted as price vs supply
 *   - Current supply/price position highlighted
 *   - Multiple curve type comparison (linear, exp, log, sigmoid)
 *   - Optional spatial decay overlay showing price at varying distances
 *   - Price history as scatter/trail overlay
 *   - Buy/sell zone shading for slippage awareness
 *
 * WCAG 2.1 AA:
 *   - role="img" with detailed aria-label
 *   - All data available as text description
 *   - Different line patterns (solid, dashed, dotted) supplement colors
 */

import { EconomyComponent } from './EconomyComponent';
import type { BondingCurveChartConfig, BondingCurveType, TimeSeriesPoint } from './types';
import { ECONOMY_COLORS } from './types';

/** Internal curve calculation (mirrors BondingCurveMath from @hololand/commerce) */
function calculatePrice(
  supply: number,
  type: BondingCurveType,
  reserveRatio: number,
  steepness: number
): number {
  const s = Math.max(1, supply);
  const r = reserveRatio;
  const n = Math.max(0.01, steepness);

  switch (type) {
    case 'linear':
      return (r * s) / n;
    case 'exponential':
      return r * Math.pow(s, 1 / n);
    case 'logarithmic':
      return (r * Math.log(s + 1)) / n;
    case 'sigmoid': {
      const midpoint = 1000;
      const maxPrice = r * 100;
      return maxPrice / (1 + Math.exp(-(s - midpoint) / (n * 100)));
    }
    default:
      return r * Math.pow(s, 1 / n);
  }
}

export class BondingCurveChart extends EconomyComponent {
  private _curveType: BondingCurveType;
  private _reserveRatio: number;
  private _curveSteepness: number;
  private _currentSupply: number;
  private _priceHistory: TimeSeriesPoint[];
  private _showSpatialDecay: boolean;
  private _spatialDecayFactor: number;
  private _maxSupply: number;
  private _showTradeZones: boolean;

  // Animation
  private _displaySupply: number = 0;
  private _previousSupply: number = 0;

  constructor(config: BondingCurveChartConfig) {
    super({
      ...config,
      title: config.title ?? 'Bonding Curve Price Discovery',
    });

    this._curveType = config.curveType ?? 'exponential';
    this._reserveRatio = config.reserveRatio ?? 0.01;
    this._curveSteepness = config.curveSteepness ?? 2;
    this._currentSupply = config.currentSupply ?? 100;
    this._priceHistory = config.priceHistory ? [...config.priceHistory] : [];
    this._showSpatialDecay = config.showSpatialDecay ?? false;
    this._spatialDecayFactor = config.spatialDecayFactor ?? 0.001;
    this._maxSupply = config.maxSupply ?? 2000;
    this._showTradeZones = config.showTradeZones ?? false;

    this._displaySupply = this._currentSupply;
    this._previousSupply = this._currentSupply;

    // Default size
    if (!config.size) {
      this._size = { width: 360, height: 260 };
    }

    this.updateA11yDescription();
  }

  // =========================================================================
  // Data Update
  // =========================================================================

  /** Update the current supply position on the curve */
  setCurrentSupply(supply: number): void {
    this._previousSupply = this._displaySupply;
    this._currentSupply = supply;
    this.startAnimation();
    this.updateA11yDescription();
    this.markDirty();
  }

  /** Update curve parameters */
  setCurveParams(type?: BondingCurveType, reserveRatio?: number, steepness?: number): void {
    if (type !== undefined) this._curveType = type;
    if (reserveRatio !== undefined) this._reserveRatio = reserveRatio;
    if (steepness !== undefined) this._curveSteepness = steepness;
    this.updateA11yDescription();
    this.markDirty();
  }

  /** Update price history overlay */
  setPriceHistory(history: TimeSeriesPoint[]): void {
    this._priceHistory = [...history];
    this.markDirty();
  }

  get currentSupply(): number {
    return this._currentSupply;
  }

  get currentPrice(): number {
    return calculatePrice(
      this._currentSupply,
      this._curveType,
      this._reserveRatio,
      this._curveSteepness
    );
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  protected renderCanvas2D(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.getBounds();

    // Animate
    const t = this.updateAnimation();
    this._displaySupply = this.lerp(this._previousSupply, this._currentSupply, t);

    // Background
    this.drawBackground(ctx, x, y, width, height);

    // Title
    const titleOffset = this.drawTitle(ctx, x, y, width);
    const contentY = y + titleOffset;
    const contentHeight = height - titleOffset;

    // Chart area with margins for labels
    const chartLeft = x + 52;
    const chartRight = x + width - 16;
    const chartTop = contentY + 8;
    const chartBottom = contentY + contentHeight - 32;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    // Calculate max price for Y-axis
    const maxPrice = this.getMaxPrice();

    // Draw grid
    this.drawGrid(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);

    // Draw spatial decay overlay if enabled
    if (this._showSpatialDecay) {
      this.drawSpatialDecay(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);
    }

    // Draw trade zones if enabled
    if (this._showTradeZones) {
      this.drawTradeZones(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);
    }

    // Draw the bonding curve
    this.drawCurve(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);

    // Draw price history scatter
    if (this._priceHistory.length > 0) {
      this.drawPriceHistory(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);
    }

    // Draw current position marker
    this.drawCurrentPosition(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxPrice);

    // Draw axes labels
    this.drawAxes(
      ctx,
      chartLeft,
      chartTop,
      chartRight,
      chartBottom,
      chartWidth,
      chartHeight,
      maxPrice
    );

    // Draw legend
    this.drawLegend(ctx, x + 8, contentY + contentHeight - 18, width - 16);
  }

  private getMaxPrice(): number {
    const priceAtMax = calculatePrice(
      this._maxSupply,
      this._curveType,
      this._reserveRatio,
      this._curveSteepness
    );
    // Add 20% headroom
    return priceAtMax * 1.2;
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxPrice: number
  ): void {
    ctx.save();

    // Horizontal grid lines (price)
    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const priceValue = (maxPrice * i) / priceSteps;
      const py = chartTop + chartHeight - (i / priceSteps) * chartHeight;
      this.drawHorizontalGridLine(ctx, chartLeft, py, chartWidth, this.formatNumber(priceValue));
    }

    // Vertical grid lines (supply)
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    const supplySteps = 5;
    for (let i = 1; i <= supplySteps; i++) {
      const supplyValue = (this._maxSupply * i) / supplySteps;
      const px = chartLeft + (i / supplySteps) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(px, chartTop);
      ctx.lineTo(px, chartTop + chartHeight);
      ctx.stroke();

      // Label
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = this.textSecondaryColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(this.formatNumber(supplyValue, 0), px, chartTop + chartHeight + 3);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawCurve(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxPrice: number
  ): void {
    ctx.save();

    const curveColor = this.getCurveTypeColor(this._curveType);
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const supply = (this._maxSupply * i) / steps;
      const price = calculatePrice(
        supply,
        this._curveType,
        this._reserveRatio,
        this._curveSteepness
      );
      const px = chartLeft + (supply / this._maxSupply) * chartWidth;
      const py = chartTop + chartHeight - Math.min(1, price / maxPrice) * chartHeight;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Fill under curve
    const lastPx = chartLeft + chartWidth;
    ctx.lineTo(lastPx, chartTop + chartHeight);
    ctx.lineTo(chartLeft, chartTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = curveColor + '10';
    ctx.fill();

    ctx.restore();
  }

  private drawSpatialDecay(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxPrice: number
  ): void {
    // Draw curves at 3 different distances
    const distances = [100, 500, 1000];
    ctx.save();
    for (let d = 0; d < distances.length; d++) {
      const distance = distances[d];
      const spatialMod = 1 + this._spatialDecayFactor * distance;

      ctx.strokeStyle = ECONOMY_COLORS.spatialOverlay.replace(
        '0.3',
        d === 0 ? '0.4' : d === 1 ? '0.25' : '0.15'
      );
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();

      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const supply = (this._maxSupply * i) / steps;
        const basePrice = calculatePrice(
          supply,
          this._curveType,
          this._reserveRatio,
          this._curveSteepness
        );
        const spatialPrice = basePrice * spatialMod;
        const px = chartLeft + (supply / this._maxSupply) * chartWidth;
        const py = chartTop + chartHeight - Math.min(1, spatialPrice / maxPrice) * chartHeight;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawTradeZones(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    _maxPrice: number
  ): void {
    const supplyNorm = this._displaySupply / this._maxSupply;
    const supplyX = chartLeft + supplyNorm * chartWidth;

    ctx.save();

    // Buy zone (right of current supply -- price goes up)
    ctx.fillStyle = ECONOMY_COLORS.faucet + '08';
    ctx.fillRect(supplyX, chartTop, chartLeft + chartWidth - supplyX, chartHeight);

    // Sell zone (left of current supply -- price goes down)
    ctx.fillStyle = ECONOMY_COLORS.sink + '08';
    ctx.fillRect(chartLeft, chartTop, supplyX - chartLeft, chartHeight);

    // Labels
    ctx.font = '8px system-ui, sans-serif';
    ctx.textBaseline = 'top';

    if (supplyX - chartLeft > 30) {
      ctx.fillStyle = ECONOMY_COLORS.sink + '80';
      ctx.textAlign = 'center';
      ctx.fillText('SELL', (chartLeft + supplyX) / 2, chartTop + 4);
    }

    if (chartLeft + chartWidth - supplyX > 30) {
      ctx.fillStyle = ECONOMY_COLORS.faucet + '80';
      ctx.textAlign = 'center';
      ctx.fillText('BUY', (supplyX + chartLeft + chartWidth) / 2, chartTop + 4);
    }

    ctx.restore();
  }

  private drawPriceHistory(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxPrice: number
  ): void {
    ctx.save();

    // Plot price history as fading dots
    const count = this._priceHistory.length;
    for (let i = 0; i < count; i++) {
      const point = this._priceHistory[i];
      // Price history: value = price, but we need supply context.
      // For now, plot as time-indexed points spread across the x-axis
      const px = chartLeft + (i / Math.max(1, count - 1)) * chartWidth;
      const py = chartTop + chartHeight - Math.min(1, point.value / maxPrice) * chartHeight;
      const alpha = 0.2 + (i / count) * 0.6; // Fade in newer points

      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCurrentPosition(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartWidth: number,
    chartHeight: number,
    maxPrice: number
  ): void {
    const price = calculatePrice(
      this._displaySupply,
      this._curveType,
      this._reserveRatio,
      this._curveSteepness
    );
    const px = chartLeft + (this._displaySupply / this._maxSupply) * chartWidth;
    const py = chartTop + chartHeight - Math.min(1, price / maxPrice) * chartHeight;

    ctx.save();

    // Crosshair lines
    ctx.strokeStyle = ECONOMY_COLORS.currentPrice + '40';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical
    ctx.beginPath();
    ctx.moveTo(px, chartTop);
    ctx.lineTo(px, chartTop + chartHeight);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(chartLeft, py);
    ctx.lineTo(chartLeft + chartWidth, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Position dot
    ctx.fillStyle = ECONOMY_COLORS.currentPrice;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // White inner dot
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // Price label
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = ECONOMY_COLORS.currentPrice;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`P: ${this.formatNumber(price)}`, px + 10, py - 4);
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.fillText(`S: ${this.formatNumber(this._displaySupply, 0)}`, px + 10, py + 10);

    ctx.restore();
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    chartLeft: number,
    chartTop: number,
    chartRight: number,
    chartBottom: number,
    chartWidth: number,
    chartHeight: number,
    _maxPrice: number
  ): void {
    ctx.save();

    // X-axis label
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Supply', chartLeft + chartWidth / 2, chartBottom + 14);

    // Y-axis label
    ctx.save();
    ctx.translate(chartLeft - 40, chartTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Price', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number): void {
    ctx.save();
    ctx.font = '9px system-ui, sans-serif';

    const items: Array<{ label: string; color: string; dash?: number[] }> = [
      { label: this._curveType, color: this.getCurveTypeColor(this._curveType) },
    ];

    if (this._showSpatialDecay) {
      items.push({
        label: 'Spatial +100u',
        color: ECONOMY_COLORS.spatialOverlay.replace('0.3', '0.6'),
        dash: [4, 3],
      });
    }

    if (this._showTradeZones) {
      items.push({ label: 'Current', color: ECONOMY_COLORS.currentPrice });
    }

    let legendX = x;
    for (const item of items) {
      // Line sample
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      if (item.dash) ctx.setLineDash(item.dash);
      ctx.beginPath();
      ctx.moveTo(legendX, y + 4);
      ctx.lineTo(legendX + 12, y + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = this.textSecondaryColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, legendX + 16, y + 4);

      legendX += ctx.measureText(item.label).width + 28;
    }

    ctx.restore();
  }

  private getCurveTypeColor(type: BondingCurveType): string {
    switch (type) {
      case 'linear':
        return ECONOMY_COLORS.curveLinear;
      case 'exponential':
        return ECONOMY_COLORS.curveExponential;
      case 'logarithmic':
        return ECONOMY_COLORS.curveLogarithmic;
      case 'sigmoid':
        return ECONOMY_COLORS.curveSigmoid;
      default:
        return ECONOMY_COLORS.curveExponential;
    }
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  protected updateA11yDescription(): void {
    const price = this.currentPrice;
    this._a11yDescription = {
      label: `Bonding curve chart`,
      description:
        `${this._curveType} bonding curve with reserve ratio ${this._reserveRatio} and steepness ${this._curveSteepness}. ` +
        `Current supply: ${this.formatNumber(this._currentSupply, 0)}. ` +
        `Current price: ${this.formatNumber(price)}. ` +
        `Maximum supply on chart: ${this.formatNumber(this._maxSupply, 0)}. ` +
        `${this._showSpatialDecay ? 'Spatial decay overlay visible. ' : ''}` +
        `${this._showTradeZones ? 'Buy and sell zones visible. ' : ''}` +
        `${this._priceHistory.length} historical price points plotted.`,
      valueText: `Price ${this.formatNumber(price)} at supply ${this.formatNumber(this._currentSupply, 0)}`,
      role: 'img',
    };
  }
}
