/**
 * @hololand/ui - EconomyComponent Base Class
 * Shared base for all economy visualization components.
 *
 * Provides:
 *   - Dual rendering context support (Canvas2D + WebXR)
 *   - WCAG 2.1 AA accessibility (screen reader descriptions, keyboard nav)
 *   - Smooth value animation
 *   - Dark mode support
 *   - Common chart drawing utilities (axes, grids, labels)
 */

import { UIComponent } from '../UIComponent';
import type {
  EconomyComponentConfig,
  RenderingContext,
  WebXRGeometryData,
  A11yDescription,
  A11yAnnouncement,
} from './types';
import { ECONOMY_COLORS } from './types';

/**
 * Abstract base for economy dashboard components.
 * Extends UIComponent with economy-specific rendering and accessibility.
 */
export abstract class EconomyComponent extends UIComponent {
  protected _renderingContext: RenderingContext;
  protected _darkMode: boolean;
  protected _animationDuration: number;
  protected _updateInterval: number;
  protected _title: string;
  protected _highContrast: boolean;

  // Animation state
  protected _animationProgress: number = 1; // 0..1, 1 = complete
  protected _animationStartTime: number = 0;

  // WebXR geometry cache
  protected _webxrGeometry: WebXRGeometryData | null = null;

  // Accessibility
  protected _a11yDescription: A11yDescription = {
    label: 'Economy visualization',
    description: '',
    valueText: '',
    role: 'img',
  };
  protected _pendingAnnouncements: A11yAnnouncement[] = [];

  constructor(config: EconomyComponentConfig) {
    super(config);
    this._renderingContext = config.renderingContext ?? 'canvas2d';
    this._darkMode = config.darkMode ?? false;
    this._animationDuration = config.animationDuration ?? 300;
    this._updateInterval = config.updateInterval ?? 1000;
    this._title = config.title ?? '';
    this._highContrast = config.highContrast ?? false;

    // Default size for economy components
    if (!config.size) {
      this._size = { width: 320, height: 240 };
    }
  }

  // =========================================================================
  // Color helpers
  // =========================================================================

  /** Get background color based on dark mode */
  protected get bgColor(): string {
    return this._darkMode ? ECONOMY_COLORS.panelBgDark : ECONOMY_COLORS.panelBg;
  }

  /** Get primary text color */
  protected get textColor(): string {
    return this._darkMode ? '#E2E8F0' : ECONOMY_COLORS.textPrimary;
  }

  /** Get secondary text color */
  protected get textSecondaryColor(): string {
    return this._darkMode ? '#94A3B8' : ECONOMY_COLORS.textSecondary;
  }

  /** Get grid line color */
  protected get gridColor(): string {
    return this._darkMode ? ECONOMY_COLORS.gridLineDark : ECONOMY_COLORS.gridLine;
  }

  /**
   * Get health-status color for a ratio or coefficient.
   * @param value The metric value
   * @param warningThreshold Value above which to show warning
   * @param criticalThreshold Value above which to show critical
   */
  protected getHealthColor(
    value: number,
    warningThreshold: number,
    criticalThreshold: number
  ): string {
    if (value >= criticalThreshold) return ECONOMY_COLORS.critical;
    if (value >= warningThreshold) return ECONOMY_COLORS.warning;
    return ECONOMY_COLORS.healthy;
  }

  // =========================================================================
  // Animation
  // =========================================================================

  /** Start an animation transition */
  protected startAnimation(): void {
    if (this._animationDuration <= 0) {
      this._animationProgress = 1;
      return;
    }
    this._animationProgress = 0;
    this._animationStartTime = Date.now();
  }

  /** Update animation progress. Returns eased value 0..1 */
  protected updateAnimation(): number {
    if (this._animationProgress >= 1) return 1;

    const elapsed = Date.now() - this._animationStartTime;
    const raw = Math.min(1, elapsed / this._animationDuration);
    // Ease-out cubic
    this._animationProgress = 1 - Math.pow(1 - raw, 3);
    if (this._animationProgress >= 0.999) this._animationProgress = 1;

    this.markDirty();
    return this._animationProgress;
  }

  /** Linear interpolation */
  protected lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }

  // =========================================================================
  // Common drawing utilities
  // =========================================================================

  /**
   * Draw the component title at the top.
   * Returns the Y offset consumed by the title area.
   */
  protected drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    if (!this._title) return 0;

    ctx.save();
    ctx.font = `600 13px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this._title, x + 8, y + 8);
    ctx.restore();

    return 28; // Title height including padding
  }

  /**
   * Draw a rounded rectangle background with optional border.
   */
  protected drawBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number = 8
  ): void {
    ctx.save();
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw a horizontal grid line with a label.
   */
  protected drawHorizontalGridLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label?: string
  ): void {
    ctx.save();
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (label) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = this.textSecondaryColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x - 4, y);
    }
    ctx.restore();
  }

  /**
   * Draw a metric label with value.
   */
  protected drawMetricLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    value: string,
    color?: string
  ): number {
    ctx.save();
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = this.textSecondaryColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y);

    const labelWidth = ctx.measureText(label).width;

    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = color || this.textColor;
    ctx.fillText(value, x + labelWidth + 4, y - 1);
    ctx.restore();

    return 16; // Height consumed
  }

  /**
   * Draw a colored dot indicator.
   */
  protected drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Format a number for display (compact form).
   */
  protected formatNumber(value: number, decimals: number = 2): string {
    if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return value.toFixed(decimals);
  }

  /**
   * Format a percentage.
   */
  protected formatPercent(value: number, decimals: number = 1): string {
    return (value * 100).toFixed(decimals) + '%';
  }

  // =========================================================================
  // Accessibility
  // =========================================================================

  /** Get the current accessible description */
  getA11yDescription(): A11yDescription {
    return { ...this._a11yDescription };
  }

  /** Get and clear pending announcements for screen readers */
  getA11yAnnouncements(): A11yAnnouncement[] {
    const announcements = [...this._pendingAnnouncements];
    this._pendingAnnouncements = [];
    return announcements;
  }

  /** Queue an accessibility announcement */
  protected announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this._pendingAnnouncements.push({ message, priority });
  }

  /** Update the accessible description (subclasses must call this) */
  protected abstract updateA11yDescription(): void;

  // =========================================================================
  // WebXR support
  // =========================================================================

  /** Get WebXR geometry data for VR rendering */
  getWebXRGeometry(): WebXRGeometryData | null {
    return this._webxrGeometry;
  }

  /**
   * Generate WebXR geometry. Called instead of render() when in 'webxr' mode.
   * Subclasses override this to produce 3D geometry.
   * Default implementation creates a flat textured quad.
   */
  protected generateWebXRGeometry(): void {
    const { width, height } = this._size;
    // Flat quad in XR space (1 unit = 1 meter, scaled down)
    const scale = 0.001; // 1px = 1mm in VR
    const w = width * scale * 0.5;
    const h = height * scale * 0.5;

    this._webxrGeometry = {
      vertices: new Float32Array([
        -w, -h, 0,
         w, -h, 0,
         w,  h, 0,
        -w,  h, 0,
      ]),
      colors: new Float32Array([
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1,
      ]),
      indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
      componentId: this.id,
      dirty: true,
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  override update(deltaTime: number): void {
    this.updateAnimation();
    super.update(deltaTime);
  }

  override render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    if (this._renderingContext === 'webxr') {
      this.generateWebXRGeometry();
      return;
    }

    // Subclasses implement renderCanvas2D
    this.renderCanvas2D(ctx);
    this._dirty = false;
  }

  /** Canvas2D rendering implementation. Subclasses must implement this. */
  protected abstract renderCanvas2D(ctx: CanvasRenderingContext2D): void;
}
