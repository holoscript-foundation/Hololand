/**
 * @hololand/ui - Slider Component
 * Value slider for numeric input
 */

import { UIComponent, UIEventHandler } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface SliderConfig extends UIComponentConfig {
  min?: number;
  max?: number;
  value?: number;
  step?: number;
  trackColor?: string;
  activeTrackColor?: string;
  thumbColor?: string;
  thumbSize?: number;
  trackHeight?: number;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  onChange?: (value: number) => void;
}

/**
 * Slider component for numeric value selection
 */
export class Slider extends UIComponent {
  private _min: number;
  private _max: number;
  private _value: number;
  private _step: number;
  private _trackColor: string;
  private _activeTrackColor: string;
  private _thumbColor: string;
  private _thumbSize: number;
  private _trackHeight: number;
  private _showValue: boolean;
  private _valueFormat: (value: number) => string;
  private _isDragging: boolean = false;
  private _onChange?: (value: number) => void;

  constructor(config: SliderConfig) {
    super(config);

    this._min = config.min ?? 0;
    this._max = config.max ?? 100;
    this._value = config.value ?? this._min;
    this._step = config.step ?? 1;
    this._trackColor = config.trackColor || '#e0e0e0';
    this._activeTrackColor = config.activeTrackColor || '#3498db';
    this._thumbColor = config.thumbColor || '#ffffff';
    this._thumbSize = config.thumbSize ?? 16;
    this._trackHeight = config.trackHeight ?? 4;
    this._showValue = config.showValue ?? false;
    this._valueFormat = config.valueFormat || ((v) => v.toString());
    this._onChange = config.onChange;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 200, height: 30 };
    }
  }

  // Getters/setters
  get value(): number { return this._value; }
  set value(v: number) {
    const newValue = this.clampAndStep(v);
    if (newValue !== this._value) {
      this._value = newValue;
      this.markDirty();
      this._onChange?.(this._value);
      this.emit('change', { position: { x: 0, y: 0 } });
    }
  }

  get min(): number { return this._min; }
  set min(v: number) {
    this._min = v;
    this._value = this.clampAndStep(this._value);
    this.markDirty();
  }

  get max(): number { return this._max; }
  set max(v: number) {
    this._max = v;
    this._value = this.clampAndStep(this._value);
    this.markDirty();
  }

  get step(): number { return this._step; }
  set step(v: number) {
    this._step = v;
    this._value = this.clampAndStep(this._value);
    this.markDirty();
  }

  get percentage(): number {
    return (this._value - this._min) / (this._max - this._min);
  }

  /**
   * Clamp and step value
   */
  private clampAndStep(v: number): number {
    // Clamp to range
    v = Math.max(this._min, Math.min(this._max, v));
    // Apply step
    if (this._step > 0) {
      v = Math.round((v - this._min) / this._step) * this._step + this._min;
    }
    return v;
  }

  /**
   * Get thumb position
   */
  private getThumbX(): number {
    const { x, width } = this.getBounds();
    const padding = this._thumbSize / 2;
    const trackWidth = width - this._thumbSize;
    return x + padding + trackWidth * this.percentage;
  }

  /**
   * Get value from x position
   */
  private getValueFromX(posX: number): number {
    const { x, width } = this.getBounds();
    const padding = this._thumbSize / 2;
    const trackWidth = width - this._thumbSize;
    const relativeX = posX - x - padding;
    const percentage = Math.max(0, Math.min(1, relativeX / trackWidth));
    return this._min + percentage * (this._max - this._min);
  }

  /**
   * Render slider to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const centerY = y + height / 2;
    const padding = this._thumbSize / 2;
    const trackWidth = width - this._thumbSize;

    // Draw track background
    ctx.fillStyle = this._trackColor;
    const trackY = centerY - this._trackHeight / 2;
    ctx.beginPath();
    ctx.roundRect(x + padding, trackY, trackWidth, this._trackHeight, this._trackHeight / 2);
    ctx.fill();

    // Draw active track
    const activeWidth = trackWidth * this.percentage;
    if (activeWidth > 0) {
      ctx.fillStyle = this._enabled ? this._activeTrackColor : '#95a5a6';
      ctx.beginPath();
      ctx.roundRect(x + padding, trackY, activeWidth, this._trackHeight, this._trackHeight / 2);
      ctx.fill();
    }

    // Draw thumb
    const thumbX = this.getThumbX();
    ctx.fillStyle = this._enabled ? this._thumbColor : '#bdc3c7';
    ctx.strokeStyle = this._enabled ? this._activeTrackColor : '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(thumbX, centerY, this._thumbSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw value if enabled
    if (this._showValue) {
      ctx.fillStyle = this._enabled ? '#333333' : '#7f8c8d';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this._valueFormat(this._value), thumbX, y + 2);
    }

    // Render children
    this._children.forEach(child => child.render(ctx));

    this._dirty = false;
  }

  // Override pointer handlers for slider interaction
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this.containsPoint(point)) {
      this._isDragging = true;
      this.value = this.getValueFromX(point.x);
      this.emit('pointerdown', { position: point });
      return true;
    }

    return false;
  }

  handlePointerUp(point: Vector2): boolean {
    if (this._isDragging) {
      this._isDragging = false;
      this.emit('pointerup', { position: point });
      return true;
    }
    return false;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this._isDragging) {
      this.value = this.getValueFromX(point.x);
      this.emit('pointermove', { position: point });
      return true;
    }

    return this.containsPoint(point);
  }
}
