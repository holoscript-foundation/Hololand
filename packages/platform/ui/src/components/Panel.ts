/**
 * @hololand/ui - Panel Component
 * Container panel for organizing UI components
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig } from '../types';

export interface PanelConfig extends UIComponentConfig {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffset?: { x: number; y: number };
  padding?: number;
}

/**
 * Panel component - container for other UI elements
 */
export class Panel extends UIComponent {
  private _backgroundColor: string;
  private _borderRadius: number;
  private _borderWidth: number;
  private _borderColor: string;
  private _shadow: boolean;
  private _shadowColor: string;
  private _shadowBlur: number;
  private _shadowOffset: { x: number; y: number };
  private _padding: number;

  constructor(config: PanelConfig) {
    super(config);

    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._borderRadius = config.borderRadius ?? 8;
    this._borderWidth = config.borderWidth ?? 0;
    this._borderColor = config.borderColor || '#e0e0e0';
    this._shadow = config.shadow ?? false;
    this._shadowColor = config.shadowColor || 'rgba(0, 0, 0, 0.15)';
    this._shadowBlur = config.shadowBlur ?? 10;
    this._shadowOffset = config.shadowOffset || { x: 0, y: 4 };
    this._padding = config.padding ?? 16;

    // Set default size
    if (!config.size) {
      this._size = { width: 300, height: 200 };
    }
  }

  // Getters/setters
  get backgroundColor(): string {
    return this._backgroundColor;
  }
  set backgroundColor(value: string) {
    this._backgroundColor = value;
    this.markDirty();
  }

  get borderRadius(): number {
    return this._borderRadius;
  }
  set borderRadius(value: number) {
    this._borderRadius = value;
    this.markDirty();
  }

  get padding(): number {
    return this._padding;
  }
  set padding(value: number) {
    this._padding = value;
    this.markDirty();
  }

  get shadow(): boolean {
    return this._shadow;
  }
  set shadow(value: boolean) {
    this._shadow = value;
    this.markDirty();
  }

  /**
   * Get content bounds (with padding)
   */
  getContentBounds() {
    return {
      x: this._position.x + this._padding,
      y: this._position.y + this._padding,
      width: this._size.width - this._padding * 2,
      height: this._size.height - this._padding * 2,
    };
  }

  /**
   * Render panel
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    ctx.save();

    // Apply shadow
    if (this._shadow) {
      ctx.shadowColor = this._shadowColor;
      ctx.shadowBlur = this._shadowBlur;
      ctx.shadowOffsetX = this._shadowOffset.x;
      ctx.shadowOffsetY = this._shadowOffset.y;
    }

    // Draw background
    ctx.fillStyle = this._backgroundColor;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw border
    if (this._borderWidth > 0) {
      ctx.strokeStyle = this._borderColor;
      ctx.lineWidth = this._borderWidth;
      if (this._borderRadius > 0) {
        this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    }

    ctx.restore();

    // Render children
    this._children.forEach((child) => child.render(ctx));

    this._dirty = false;
  }

  /**
   * Draw rounded rectangle
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
