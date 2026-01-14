/**
 * @hololand/ui - Text Component
 * Text label for 2D UI
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig } from '../types';

export interface TextConfig extends UIComponentConfig {
  content: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  maxWidth?: number;
  wordWrap?: boolean;
  ellipsis?: boolean;
}

/**
 * Text component for displaying labels and content
 */
export class Text extends UIComponent {
  private _content: string;
  private _color: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _fontWeight: string;
  private _fontStyle: string;
  private _textAlign: 'left' | 'center' | 'right';
  private _verticalAlign: 'top' | 'middle' | 'bottom';
  private _lineHeight: number;
  private _maxWidth: number;
  private _wordWrap: boolean;
  private _ellipsis: boolean;

  constructor(config: TextConfig) {
    super(config);

    this._content = config.content;
    this._color = config.color || '#2c3e50';
    this._fontSize = config.fontSize ?? 14;
    this._fontFamily = config.fontFamily || 'system-ui, -apple-system, sans-serif';
    this._fontWeight = config.fontWeight || 'normal';
    this._fontStyle = config.fontStyle || 'normal';
    this._textAlign = config.textAlign || 'left';
    this._verticalAlign = config.verticalAlign || 'top';
    this._lineHeight = config.lineHeight ?? 1.4;
    this._maxWidth = config.maxWidth ?? 0;
    this._wordWrap = config.wordWrap ?? false;
    this._ellipsis = config.ellipsis ?? false;

    // Auto-size based on content if no size provided
    if (!config.size) {
      this._size = { width: 200, height: this._fontSize * this._lineHeight };
    }
  }

  // Getters/setters
  get content(): string { return this._content; }
  set content(value: string) { this._content = value; this.markDirty(); }

  get color(): string { return this._color; }
  set color(value: string) { this._color = value; this.markDirty(); }

  get fontSize(): number { return this._fontSize; }
  set fontSize(value: number) { this._fontSize = value; this.markDirty(); }

  get fontWeight(): string { return this._fontWeight; }
  set fontWeight(value: string) { this._fontWeight = value; this.markDirty(); }

  /**
   * Get font string
   */
  private getFont(): string {
    return `${this._fontStyle} ${this._fontWeight} ${this._fontSize}px ${this._fontFamily}`;
  }

  /**
   * Wrap text into lines
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (!this._wordWrap || maxWidth <= 0) {
      return [text];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Truncate text with ellipsis
   */
  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (!this._ellipsis || maxWidth <= 0) {
      return text;
    }

    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    const ellipsis = '...';
    const ellipsisWidth = ctx.measureText(ellipsis).width;

    let truncated = text;
    while (truncated.length > 0) {
      truncated = truncated.slice(0, -1);
      const testWidth = ctx.measureText(truncated).width + ellipsisWidth;
      if (testWidth <= maxWidth) {
        return truncated + ellipsis;
      }
    }

    return ellipsis;
  }

  /**
   * Render text
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const maxWidth = this._maxWidth || width;

    ctx.save();
    ctx.font = this.getFont();
    ctx.fillStyle = this._enabled ? this._color : '#95a5a6';
    ctx.textBaseline = 'top';

    // Calculate text alignment x position
    let textX = x;
    switch (this._textAlign) {
      case 'center':
        ctx.textAlign = 'center';
        textX = x + width / 2;
        break;
      case 'right':
        ctx.textAlign = 'right';
        textX = x + width;
        break;
      default:
        ctx.textAlign = 'left';
    }

    // Handle word wrap
    const lines = this.wrapText(ctx, this._content, maxWidth);
    const lineHeightPx = this._fontSize * this._lineHeight;
    const totalHeight = lines.length * lineHeightPx;

    // Calculate vertical alignment y position
    let startY = y;
    switch (this._verticalAlign) {
      case 'middle':
        startY = y + (height - totalHeight) / 2;
        break;
      case 'bottom':
        startY = y + height - totalHeight;
        break;
    }

    // Render each line
    for (let i = 0; i < lines.length; i++) {
      let lineText = lines[i];

      // Apply ellipsis to last visible line if content overflows
      if (this._ellipsis && i === lines.length - 1) {
        lineText = this.truncateText(ctx, lineText, maxWidth);
      }

      ctx.fillText(lineText, textX, startY + i * lineHeightPx);
    }

    ctx.restore();

    // Render children
    this._children.forEach(child => child.render(ctx));

    this._dirty = false;
  }
}
