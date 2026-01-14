/**
 * @hololand/ui - Toggle Component
 * On/off switch for boolean values
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface ToggleConfig extends UIComponentConfig {
  checked?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  trackColorOff?: string;
  trackColorOn?: string;
  thumbColor?: string;
  labelColor?: string;
  fontSize?: number;
  trackWidth?: number;
  trackHeight?: number;
  thumbSize?: number;
  animationDuration?: number;
  onChange?: (checked: boolean) => void;
}

/**
 * Toggle switch component for boolean values
 */
export class Toggle extends UIComponent {
  private _checked: boolean;
  private _label: string;
  private _labelPosition: 'left' | 'right';
  private _trackColorOff: string;
  private _trackColorOn: string;
  private _thumbColor: string;
  private _labelColor: string;
  private _fontSize: number;
  private _trackWidth: number;
  private _trackHeight: number;
  private _thumbSize: number;
  private _animationDuration: number;
  private _animationProgress: number = 1;
  private _animating: boolean = false;
  private _onChange?: (checked: boolean) => void;

  constructor(config: ToggleConfig) {
    super(config);

    this._checked = config.checked ?? false;
    this._label = config.label || '';
    this._labelPosition = config.labelPosition || 'right';
    this._trackColorOff = config.trackColorOff || '#e0e0e0';
    this._trackColorOn = config.trackColorOn || '#4caf50';
    this._thumbColor = config.thumbColor || '#ffffff';
    this._labelColor = config.labelColor || '#333333';
    this._fontSize = config.fontSize ?? 14;
    this._trackWidth = config.trackWidth ?? 44;
    this._trackHeight = config.trackHeight ?? 24;
    this._thumbSize = config.thumbSize ?? 20;
    this._animationDuration = config.animationDuration ?? 200;
    this._onChange = config.onChange;

    // Set default size if not provided
    if (!config.size) {
      const labelWidth = this._label ? this._label.length * 8 + 10 : 0;
      this._size = {
        width: this._trackWidth + labelWidth,
        height: Math.max(this._trackHeight, 24)
      };
    }
  }

  // Getters/setters
  get checked(): boolean { return this._checked; }
  set checked(value: boolean) {
    if (value !== this._checked) {
      this._checked = value;
      this.startAnimation();
      this._onChange?.(this._checked);
      this.emit('change', { position: { x: 0, y: 0 } });
    }
  }

  get label(): string { return this._label; }
  set label(value: string) {
    this._label = value;
    this.markDirty();
  }

  /**
   * Toggle the state
   */
  toggle(): void {
    this.checked = !this._checked;
  }

  /**
   * Start animation
   */
  private startAnimation(): void {
    this._animationProgress = 0;
    this._animating = true;
    this.markDirty();
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    super.update(deltaTime);

    if (this._animating) {
      this._animationProgress += deltaTime / this._animationDuration;
      if (this._animationProgress >= 1) {
        this._animationProgress = 1;
        this._animating = false;
      }
      this.markDirty();
    }
  }

  /**
   * Render toggle to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const centerY = y + height / 2;

    // Calculate track position based on label position
    let trackX: number;
    let labelX: number;

    if (this._label && this._labelPosition === 'left') {
      // Measure label width
      ctx.font = `${this._fontSize}px sans-serif`;
      const labelWidth = ctx.measureText(this._label).width;
      labelX = x;
      trackX = x + labelWidth + 10;
    } else {
      trackX = x;
      labelX = x + this._trackWidth + 10;
    }

    const trackY = centerY - this._trackHeight / 2;

    // Interpolate thumb position
    const thumbPadding = (this._trackHeight - this._thumbSize) / 2;
    const thumbStartX = trackX + thumbPadding + this._thumbSize / 2;
    const thumbEndX = trackX + this._trackWidth - thumbPadding - this._thumbSize / 2;

    // Ease function (ease-out)
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const progress = ease(this._animationProgress);

    const currentThumbX = this._checked
      ? thumbStartX + (thumbEndX - thumbStartX) * progress
      : thumbEndX - (thumbEndX - thumbStartX) * progress;

    // Interpolate track color
    const trackColor = this._checked
      ? this.interpolateColor(this._trackColorOff, this._trackColorOn, progress)
      : this.interpolateColor(this._trackColorOn, this._trackColorOff, progress);

    // Draw track
    ctx.fillStyle = this._enabled ? trackColor : '#bdc3c7';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, this._trackWidth, this._trackHeight, this._trackHeight / 2);
    ctx.fill();

    // Draw thumb shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Draw thumb
    ctx.fillStyle = this._enabled ? this._thumbColor : '#ecf0f1';
    ctx.beginPath();
    ctx.arc(currentThumbX, centerY, this._thumbSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw label
    if (this._label) {
      ctx.fillStyle = this._enabled ? this._labelColor : '#7f8c8d';
      ctx.font = `${this._fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._label, labelX, centerY);
    }

    // Render children
    this._children.forEach(child => child.render(ctx));

    this._dirty = false;
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // Override pointer handler for toggle
  handlePointerUp(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this.containsPoint(point)) {
      this.toggle();
      this.emit('pointerup', { position: point });
      this.emit('click', { position: point });
      return true;
    }

    return false;
  }
}
