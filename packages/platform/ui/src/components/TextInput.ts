/**
 * @hololand/ui - TextInput Component
 * Text input field for 2D UI
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface TextInputConfig extends UIComponentConfig {
  value?: string;
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  focusColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  focusBorderColor?: string;
  fontSize?: number;
  fontFamily?: string;
  padding?: number;
  maxLength?: number;
  password?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

/**
 * Text input component for user text entry
 */
export class TextInput extends UIComponent {
  private _value: string;
  private _placeholder: string;
  private _backgroundColor: string;
  private _textColor: string;
  private _placeholderColor: string;
  private _focusColor: string;
  private _borderRadius: number;
  private _borderWidth: number;
  private _borderColor: string;
  private _focusBorderColor: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _padding: number;
  private _maxLength: number;
  private _password: boolean;
  private _focused: boolean = false;
  private _cursorPosition: number = 0;
  private _cursorVisible: boolean = true;
  private _cursorBlinkTime: number = 0;

  private _onChange?: (value: string) => void;
  private _onSubmit?: (value: string) => void;

  constructor(config: TextInputConfig) {
    super(config);

    this._value = config.value || '';
    this._placeholder = config.placeholder || '';
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._textColor = config.textColor || '#2c3e50';
    this._placeholderColor = config.placeholderColor || '#95a5a6';
    this._focusColor = config.focusColor || '#f5f5f5';
    this._borderRadius = config.borderRadius ?? 4;
    this._borderWidth = config.borderWidth ?? 1;
    this._borderColor = config.borderColor || '#bdc3c7';
    this._focusBorderColor = config.focusBorderColor || '#3498db';
    this._fontSize = config.fontSize ?? 14;
    this._fontFamily = config.fontFamily || 'system-ui, -apple-system, sans-serif';
    this._padding = config.padding ?? 8;
    this._maxLength = config.maxLength ?? 999;
    this._password = config.password ?? false;
    this._onChange = config.onChange;
    this._onSubmit = config.onSubmit;

    this._cursorPosition = this._value.length;

    // Set default size
    if (!config.size) {
      this._size = { width: 200, height: 36 };
    }
  }

  // Getters/setters
  get value(): string {
    return this._value;
  }
  set value(val: string) {
    this._value = val.slice(0, this._maxLength);
    this._cursorPosition = Math.min(this._cursorPosition, this._value.length);
    this.markDirty();
  }

  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(val: string) {
    this._placeholder = val;
    this.markDirty();
  }

  get focused(): boolean {
    return this._focused;
  }

  /**
   * Focus the input
   */
  focus(): void {
    this._focused = true;
    this._cursorVisible = true;
    this._cursorBlinkTime = 0;
    this.markDirty();
    this.emit('focus');
  }

  /**
   * Blur the input
   */
  blur(): void {
    this._focused = false;
    this.markDirty();
    this.emit('blur');
  }

  /**
   * Handle keyboard input
   */
  handleKeyInput(key: string, _ctrl: boolean = false): void {
    if (!this._focused || !this._enabled) return;

    switch (key) {
      case 'Backspace':
        if (this._cursorPosition > 0) {
          this._value =
            this._value.slice(0, this._cursorPosition - 1) +
            this._value.slice(this._cursorPosition);
          this._cursorPosition--;
          this._onChange?.(this._value);
          this.emit('change');
        }
        break;

      case 'Delete':
        if (this._cursorPosition < this._value.length) {
          this._value =
            this._value.slice(0, this._cursorPosition) +
            this._value.slice(this._cursorPosition + 1);
          this._onChange?.(this._value);
          this.emit('change');
        }
        break;

      case 'ArrowLeft':
        if (this._cursorPosition > 0) {
          this._cursorPosition--;
        }
        break;

      case 'ArrowRight':
        if (this._cursorPosition < this._value.length) {
          this._cursorPosition++;
        }
        break;

      case 'Home':
        this._cursorPosition = 0;
        break;

      case 'End':
        this._cursorPosition = this._value.length;
        break;

      case 'Enter':
        this._onSubmit?.(this._value);
        this.emit('submit');
        break;

      default:
        // Regular character input
        if (key.length === 1 && this._value.length < this._maxLength) {
          this._value =
            this._value.slice(0, this._cursorPosition) +
            key +
            this._value.slice(this._cursorPosition);
          this._cursorPosition++;
          this._onChange?.(this._value);
          this.emit('change');
        }
    }

    this._cursorVisible = true;
    this._cursorBlinkTime = 0;
    this.markDirty();
  }

  /**
   * Update cursor blink
   */
  update(deltaTime: number): void {
    super.update(deltaTime);

    if (this._focused) {
      this._cursorBlinkTime += deltaTime;
      if (this._cursorBlinkTime >= 500) {
        this._cursorVisible = !this._cursorVisible;
        this._cursorBlinkTime = 0;
        this.markDirty();
      }
    }
  }

  /**
   * Render text input
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    // Draw background
    ctx.fillStyle = this._focused ? this._focusColor : this._backgroundColor;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

    // Draw border
    ctx.strokeStyle = this._focused ? this._focusBorderColor : this._borderColor;
    ctx.lineWidth = this._borderWidth;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }

    // Set up text clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + this._padding, y, width - this._padding * 2, height);
    ctx.clip();

    // Draw text or placeholder
    const displayText = this._password ? '*'.repeat(this._value.length) : this._value;
    const hasText = displayText.length > 0;

    ctx.font = `${this._fontSize}px ${this._fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const textX = x + this._padding;
    const textY = y + height / 2;

    if (hasText) {
      ctx.fillStyle = this._enabled ? this._textColor : this._placeholderColor;
      ctx.fillText(displayText, textX, textY);
    } else if (this._placeholder) {
      ctx.fillStyle = this._placeholderColor;
      ctx.fillText(this._placeholder, textX, textY);
    }

    // Draw cursor
    if (this._focused && this._cursorVisible) {
      const textBeforeCursor = this._password
        ? '*'.repeat(this._cursorPosition)
        : this._value.slice(0, this._cursorPosition);
      const cursorX = textX + ctx.measureText(textBeforeCursor).width;

      ctx.strokeStyle = this._textColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorX, y + 6);
      ctx.lineTo(cursorX, y + height - 6);
      ctx.stroke();
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

  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this.containsPoint(point)) {
      this.focus();
      // Set cursor position based on click location
      // (simplified - full implementation would measure text)
      this._cursorPosition = this._value.length;
      this.emit('pointerdown', { position: point });
      return true;
    } else if (this._focused) {
      this.blur();
    }

    return false;
  }
}
