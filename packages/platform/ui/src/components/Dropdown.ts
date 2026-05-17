/**
 * @hololand/ui - Dropdown Component
 * Selection dropdown for choosing from options
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownConfig extends UIComponentConfig {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  itemHeight?: number;
  maxVisibleItems?: number;
  dropdownBackgroundColor?: string;
  hoverColor?: string;
  selectedColor?: string;
  onChange?: (value: string, option: DropdownOption) => void;
}

/**
 * Dropdown selection component
 */
export class Dropdown extends UIComponent {
  private _options: DropdownOption[];
  private _value: string | null;
  private _placeholder: string;
  private _backgroundColor: string;
  private _textColor: string;
  private _borderColor: string;
  private _borderRadius: number;
  private _fontSize: number;
  private _itemHeight: number;
  private _maxVisibleItems: number;
  private _dropdownBackgroundColor: string;
  private _hoverColor: string;
  private _selectedColor: string;
  private _isOpen: boolean = false;
  private _hoveredIndex: number = -1;
  private _scrollOffset: number = 0;
  private _onChange?: (value: string, option: DropdownOption) => void;

  constructor(config: DropdownConfig) {
    super(config);

    this._options = config.options || [];
    this._value = config.value || null;
    this._placeholder = config.placeholder || 'Select...';
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._textColor = config.textColor || '#333333';
    this._borderColor = config.borderColor || '#e0e0e0';
    this._borderRadius = config.borderRadius ?? 4;
    this._fontSize = config.fontSize ?? 14;
    this._itemHeight = config.itemHeight ?? 36;
    this._maxVisibleItems = config.maxVisibleItems ?? 5;
    this._dropdownBackgroundColor = config.dropdownBackgroundColor || '#ffffff';
    this._hoverColor = config.hoverColor || '#f5f5f5';
    this._selectedColor = config.selectedColor || '#e3f2fd';
    this._onChange = config.onChange;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 200, height: 36 };
    }
  }

  // Getters/setters
  get value(): string | null {
    return this._value;
  }
  set value(v: string | null) {
    if (v !== this._value) {
      this._value = v;
      this.markDirty();
      const option = this._options.find((o) => o.value === v);
      if (option) {
        this._onChange?.(v!, option);
        this.emit('change', { position: { x: 0, y: 0 } });
      }
    }
  }

  get options(): DropdownOption[] {
    return [...this._options];
  }
  set options(opts: DropdownOption[]) {
    this._options = opts;
    this.markDirty();
  }

  get selectedOption(): DropdownOption | null {
    return this._options.find((o) => o.value === this._value) || null;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Open dropdown
   */
  open(): void {
    if (!this._enabled) return;
    this._isOpen = true;
    this._hoveredIndex = this._options.findIndex((o) => o.value === this._value);
    this.markDirty();
    this.emit('open', { position: { x: 0, y: 0 } });
  }

  /**
   * Close dropdown
   */
  close(): void {
    this._isOpen = false;
    this._hoveredIndex = -1;
    this.markDirty();
    this.emit('close', { position: { x: 0, y: 0 } });
  }

  /**
   * Toggle dropdown
   */
  toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Get dropdown height
   */
  private getDropdownHeight(): number {
    const visibleItems = Math.min(this._options.length, this._maxVisibleItems);
    return visibleItems * this._itemHeight;
  }

  /**
   * Render dropdown to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    // Draw main button
    ctx.fillStyle = this._enabled ? this._backgroundColor : '#f5f5f5';
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

    // Draw border
    ctx.strokeStyle = this._isOpen ? '#3498db' : this._borderColor;
    ctx.lineWidth = 1;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }

    // Draw selected text or placeholder
    ctx.fillStyle = this._enabled ? this._textColor : '#7f8c8d';
    ctx.font = `${this._fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const selectedOption = this.selectedOption;
    const displayText = selectedOption ? selectedOption.label : this._placeholder;
    const textColor = selectedOption ? this._textColor : '#999999';
    ctx.fillStyle = this._enabled ? textColor : '#7f8c8d';
    ctx.fillText(displayText, x + 12, y + height / 2, width - 36);

    // Draw dropdown arrow
    ctx.fillStyle = this._enabled ? '#666666' : '#bdc3c7';
    const arrowX = x + width - 20;
    const arrowY = y + height / 2;
    ctx.beginPath();
    if (this._isOpen) {
      ctx.moveTo(arrowX - 5, arrowY + 2);
      ctx.lineTo(arrowX, arrowY - 4);
      ctx.lineTo(arrowX + 5, arrowY + 2);
    } else {
      ctx.moveTo(arrowX - 5, arrowY - 2);
      ctx.lineTo(arrowX, arrowY + 4);
      ctx.lineTo(arrowX + 5, arrowY - 2);
    }
    ctx.closePath();
    ctx.fill();

    // Draw dropdown list if open
    if (this._isOpen) {
      const dropdownHeight = this.getDropdownHeight();
      const dropdownY = y + height + 2;

      // Dropdown background with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = this._dropdownBackgroundColor;
      this.drawRoundedRect(ctx, x, dropdownY, width, dropdownHeight, this._borderRadius);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw border
      ctx.strokeStyle = this._borderColor;
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, x, dropdownY, width, dropdownHeight, this._borderRadius);
      ctx.stroke();

      // Clip to dropdown area
      ctx.save();
      this.drawRoundedRect(ctx, x, dropdownY, width, dropdownHeight, this._borderRadius);
      ctx.clip();

      // Draw options
      const visibleItems = Math.min(this._options.length, this._maxVisibleItems);
      for (let i = 0; i < visibleItems; i++) {
        const optionIndex = i + Math.floor(this._scrollOffset);
        if (optionIndex >= this._options.length) break;

        const option = this._options[optionIndex];
        const optionY = dropdownY + i * this._itemHeight;

        // Background
        if (option.value === this._value) {
          ctx.fillStyle = this._selectedColor;
          ctx.fillRect(x, optionY, width, this._itemHeight);
        } else if (optionIndex === this._hoveredIndex) {
          ctx.fillStyle = this._hoverColor;
          ctx.fillRect(x, optionY, width, this._itemHeight);
        }

        // Text
        ctx.fillStyle = option.disabled ? '#bdc3c7' : this._textColor;
        ctx.font = `${this._fontSize}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(option.label, x + 12, optionY + this._itemHeight / 2, width - 24);
      }

      ctx.restore();
    }

    // Render children
    this._children.forEach((child) => child.render(ctx));

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

  /**
   * Get option index at point
   */
  private getOptionIndexAtPoint(point: Vector2): number {
    const { x, y, width, height } = this.getBounds();
    const dropdownY = y + height + 2;

    if (point.x < x || point.x > x + width) return -1;
    if (point.y < dropdownY) return -1;

    const relativeY = point.y - dropdownY;
    const index = Math.floor(relativeY / this._itemHeight) + Math.floor(this._scrollOffset);

    if (index >= 0 && index < this._options.length) {
      return index;
    }

    return -1;
  }

  // Override pointer handlers
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    const { x, y, width, height } = this.getBounds();
    const mainButtonRect = { x, y, width, height };

    // Check if clicking main button
    if (
      point.x >= mainButtonRect.x &&
      point.x <= mainButtonRect.x + mainButtonRect.width &&
      point.y >= mainButtonRect.y &&
      point.y <= mainButtonRect.y + mainButtonRect.height
    ) {
      this.toggle();
      return true;
    }

    // Check if clicking dropdown
    if (this._isOpen) {
      const optionIndex = this.getOptionIndexAtPoint(point);
      if (optionIndex >= 0) {
        const option = this._options[optionIndex];
        if (!option.disabled) {
          this.value = option.value;
          this.close();
        }
        return true;
      }

      // Clicked outside, close dropdown
      this.close();
    }

    return false;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this._isOpen) {
      const newHoveredIndex = this.getOptionIndexAtPoint(point);
      if (newHoveredIndex !== this._hoveredIndex) {
        this._hoveredIndex = newHoveredIndex;
        this.markDirty();
      }
      return this.containsPoint(point) || newHoveredIndex >= 0;
    }

    return this.containsPoint(point);
  }
}
