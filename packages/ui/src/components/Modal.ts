/**
 * @hololand/ui - Modal Component
 * Popup dialog for overlays and alerts
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface ModalConfig extends UIComponentConfig {
  title?: string;
  content?: string;
  showOverlay?: boolean;
  overlayColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  headerColor?: string;
  titleColor?: string;
  contentColor?: string;
  closeButton?: boolean;
  closeOnOverlayClick?: boolean;
  padding?: number;
  headerHeight?: number;
  fontSize?: number;
  titleFontSize?: number;
  onClose?: () => void;
}

/**
 * Modal dialog component
 */
export class Modal extends UIComponent {
  private _title: string;
  private _content: string;
  private _showOverlay: boolean;
  private _overlayColor: string;
  private _backgroundColor: string;
  private _borderRadius: number;
  private _headerColor: string;
  private _titleColor: string;
  private _contentColor: string;
  private _closeButton: boolean;
  private _closeOnOverlayClick: boolean;
  private _padding: number;
  private _headerHeight: number;
  private _fontSize: number;
  private _titleFontSize: number;
  private _canvasWidth: number = 800;
  private _canvasHeight: number = 600;
  private _onClose?: () => void;

  constructor(config: ModalConfig) {
    super(config);

    this._title = config.title || '';
    this._content = config.content || '';
    this._showOverlay = config.showOverlay ?? true;
    this._overlayColor = config.overlayColor || 'rgba(0, 0, 0, 0.5)';
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._borderRadius = config.borderRadius ?? 8;
    this._headerColor = config.headerColor || '#f5f5f5';
    this._titleColor = config.titleColor || '#333333';
    this._contentColor = config.contentColor || '#666666';
    this._closeButton = config.closeButton ?? true;
    this._closeOnOverlayClick = config.closeOnOverlayClick ?? true;
    this._padding = config.padding ?? 20;
    this._headerHeight = config.headerHeight ?? 50;
    this._fontSize = config.fontSize ?? 14;
    this._titleFontSize = config.titleFontSize ?? 18;
    this._onClose = config.onClose;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 400, height: 300 };
    }

    // Default to not visible (opened programmatically)
    this._visible = config.visible ?? false;
  }

  // Getters/setters
  get title(): string { return this._title; }
  set title(value: string) { this._title = value; this.markDirty(); }

  get content(): string { return this._content; }
  set content(value: string) { this._content = value; this.markDirty(); }

  /**
   * Set canvas dimensions for overlay
   */
  setCanvasSize(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
    // Center modal
    this._position = {
      x: (width - this._size.width) / 2,
      y: (height - this._size.height) / 2
    };
    this.markDirty();
  }

  /**
   * Open modal
   */
  open(): void {
    this._visible = true;
    this.markDirty();
    this.emit('open', { position: { x: 0, y: 0 } });
  }

  /**
   * Close modal
   */
  close(): void {
    this._visible = false;
    this.markDirty();
    this._onClose?.();
    this.emit('close', { position: { x: 0, y: 0 } });
  }

  /**
   * Render modal to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    // Draw overlay
    if (this._showOverlay) {
      ctx.fillStyle = this._overlayColor;
      ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);
    }

    // Modal shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    // Modal background
    ctx.fillStyle = this._backgroundColor;
    this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw header
    if (this._title) {
      ctx.save();

      // Header background
      ctx.fillStyle = this._headerColor;
      ctx.beginPath();
      ctx.moveTo(x + this._borderRadius, y);
      ctx.lineTo(x + width - this._borderRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + this._borderRadius);
      ctx.lineTo(x + width, y + this._headerHeight);
      ctx.lineTo(x, y + this._headerHeight);
      ctx.lineTo(x, y + this._borderRadius);
      ctx.quadraticCurveTo(x, y, x + this._borderRadius, y);
      ctx.closePath();
      ctx.fill();

      // Header border
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + this._headerHeight);
      ctx.lineTo(x + width, y + this._headerHeight);
      ctx.stroke();

      // Title text
      ctx.fillStyle = this._titleColor;
      ctx.font = `600 ${this._titleFontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._title, x + this._padding, y + this._headerHeight / 2, width - this._padding * 2 - (this._closeButton ? 40 : 0));

      ctx.restore();
    }

    // Draw close button
    if (this._closeButton) {
      const closeX = x + width - 35;
      const closeY = this._title ? y + this._headerHeight / 2 : y + 20;

      // Hover effect background
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(closeX, closeY, 14, 0, Math.PI * 2);
      ctx.fill();

      // X icon
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(closeX - 5, closeY - 5);
      ctx.lineTo(closeX + 5, closeY + 5);
      ctx.moveTo(closeX + 5, closeY - 5);
      ctx.lineTo(closeX - 5, closeY + 5);
      ctx.stroke();
    }

    // Draw content
    if (this._content) {
      const contentY = this._title ? y + this._headerHeight + this._padding : y + this._padding;
      const contentHeight = height - (this._title ? this._headerHeight : 0) - this._padding * 2;

      ctx.fillStyle = this._contentColor;
      ctx.font = `${this._fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Simple word wrapping
      this.wrapText(
        ctx,
        this._content,
        x + this._padding,
        contentY,
        width - this._padding * 2,
        this._fontSize * 1.5
      );
    }

    // Render children (for custom content)
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

  /**
   * Wrap text to fit width
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    ctx.fillText(line.trim(), x, currentY);
  }

  /**
   * Check if point is in close button
   */
  private isInCloseButton(point: Vector2): boolean {
    if (!this._closeButton) return false;

    const { x, width } = this.getBounds();
    const closeX = x + width - 35;
    const closeY = this._title ? this._position.y + this._headerHeight / 2 : this._position.y + 20;

    const dx = point.x - closeX;
    const dy = point.y - closeY;
    return Math.sqrt(dx * dx + dy * dy) <= 14;
  }

  /**
   * Check if point is in overlay
   */
  private isInOverlay(point: Vector2): boolean {
    return !this.containsPoint(point);
  }

  // Override pointer handlers
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible) return false;

    // Check close button
    if (this.isInCloseButton(point)) {
      this.close();
      return true;
    }

    // Check overlay click
    if (this._closeOnOverlayClick && this.isInOverlay(point)) {
      this.close();
      return true;
    }

    // Check children
    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerDown(point)) {
        return true;
      }
    }

    // Consume click if inside modal
    return this.containsPoint(point);
  }

  handlePointerUp(point: Vector2): boolean {
    if (!this._visible) return false;

    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerUp(point)) {
        return true;
      }
    }

    return this.containsPoint(point);
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible) return false;

    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].handlePointerMove(point);
    }

    return true; // Always consume to prevent interaction with elements behind
  }
}
