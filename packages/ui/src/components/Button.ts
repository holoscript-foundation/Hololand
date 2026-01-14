/**
 * @hololand/ui - Button Component
 * Interactive button for 2D UI
 */

import { UIComponent, UIEventHandler } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface ButtonConfig extends UIComponentConfig {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  hoverColor?: string;
  pressedColor?: string;
  disabledColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  onClick?: UIEventHandler;
}

type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

/**
 * Button component for user interaction
 */
export class Button extends UIComponent {
  private _text: string;
  private _backgroundColor: string;
  private _textColor: string;
  private _hoverColor: string;
  private _pressedColor: string;
  private _disabledColor: string;
  private _borderRadius: number;
  private _borderWidth: number;
  private _borderColor: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _fontWeight: string;
  private _state: ButtonState = 'normal';

  constructor(config: ButtonConfig) {
    super(config);

    this._text = config.text;
    this._backgroundColor = config.backgroundColor || '#3498db';
    this._textColor = config.textColor || '#ffffff';
    this._hoverColor = config.hoverColor || '#2980b9';
    this._pressedColor = config.pressedColor || '#1f6391';
    this._disabledColor = config.disabledColor || '#95a5a6';
    this._borderRadius = config.borderRadius ?? 4;
    this._borderWidth = config.borderWidth ?? 0;
    this._borderColor = config.borderColor || '#2c3e50';
    this._fontSize = config.fontSize ?? 14;
    this._fontFamily = config.fontFamily || 'system-ui, -apple-system, sans-serif';
    this._fontWeight = config.fontWeight || '500';

    if (config.onClick) {
      this.on('click', config.onClick);
    }

    // Set initial size if not provided
    if (!config.size) {
      this._size = { width: 120, height: 40 };
    }
  }

  // Getters/setters
  get text(): string { return this._text; }
  set text(value: string) { this._text = value; this.markDirty(); }

  get backgroundColor(): string { return this._backgroundColor; }
  set backgroundColor(value: string) { this._backgroundColor = value; this.markDirty(); }

  get textColor(): string { return this._textColor; }
  set textColor(value: string) { this._textColor = value; this.markDirty(); }

  /**
   * Render button to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    // Determine current color based on state
    let bgColor: string;
    if (!this._enabled) {
      bgColor = this._disabledColor;
    } else {
      switch (this._state) {
        case 'hover':
          bgColor = this._hoverColor;
          break;
        case 'pressed':
          bgColor = this._pressedColor;
          break;
        default:
          bgColor = this._backgroundColor;
      }
    }

    // Draw background
    ctx.fillStyle = bgColor;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

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

    // Draw text
    ctx.fillStyle = this._enabled ? this._textColor : '#7f8c8d';
    ctx.font = `${this._fontWeight} ${this._fontSize}px ${this._fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._text, x + width / 2, y + height / 2);

    // Render children
    this._children.forEach(child => child.render(ctx));

    this._dirty = false;
  }

  /**
   * Draw rounded rectangle path
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

  // Override pointer handlers for button state
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this.containsPoint(point)) {
      this._state = 'pressed';
      this.markDirty();
      this.emit('pointerdown', { position: point });
      return true;
    }

    return false;
  }

  handlePointerUp(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    const wasPressed = this._state === 'pressed';

    if (this.containsPoint(point)) {
      this._state = 'hover';
      this.markDirty();
      this.emit('pointerup', { position: point });

      if (wasPressed) {
        this.emit('click', { position: point });
      }
      return true;
    } else {
      this._state = 'normal';
      this.markDirty();
    }

    return false;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    const isInside = this.containsPoint(point);
    const wasHover = this._state === 'hover';

    if (isInside && this._state !== 'pressed') {
      this._state = 'hover';
      if (!wasHover) {
        this.markDirty();
        this.emit('pointerenter', { position: point });
      }
      return true;
    } else if (!isInside && this._state === 'hover') {
      this._state = 'normal';
      this.markDirty();
      this.emit('pointerleave', { position: point });
    }

    return false;
  }
}
