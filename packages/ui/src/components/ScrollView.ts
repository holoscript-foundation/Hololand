/**
 * @hololand/ui - ScrollView Component
 * Scrollable content container
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface ScrollViewConfig extends UIComponentConfig {
  contentWidth?: number;
  contentHeight?: number;
  scrollX?: boolean;
  scrollY?: boolean;
  showScrollbarX?: boolean;
  showScrollbarY?: boolean;
  scrollbarWidth?: number;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  scrollSpeed?: number;
  onScroll?: (scrollX: number, scrollY: number) => void;
}

/**
 * Scrollable container for content that exceeds visible area
 */
export class ScrollView extends UIComponent {
  private _contentWidth: number;
  private _contentHeight: number;
  private _scrollX: boolean;
  private _scrollY: boolean;
  private _showScrollbarX: boolean;
  private _showScrollbarY: boolean;
  private _scrollbarWidth: number;
  private _scrollbarColor: string;
  private _scrollbarTrackColor: string;
  private _backgroundColor: string;
  private _borderRadius: number;
  private _borderColor: string;
  private _borderWidth: number;
  private _scrollSpeed: number;

  private _scrollOffsetX: number = 0;
  private _scrollOffsetY: number = 0;
  private _isDraggingScrollbarX: boolean = false;
  private _isDraggingScrollbarY: boolean = false;
  private _dragStart: Vector2 = { x: 0, y: 0 };
  private _scrollStart: Vector2 = { x: 0, y: 0 };

  private _onScroll?: (scrollX: number, scrollY: number) => void;

  constructor(config: ScrollViewConfig) {
    super(config);

    this._contentWidth = config.contentWidth ?? config.size?.width ?? 300;
    this._contentHeight = config.contentHeight ?? config.size?.height ?? 300;
    this._scrollX = config.scrollX ?? false;
    this._scrollY = config.scrollY ?? true;
    this._showScrollbarX = config.showScrollbarX ?? this._scrollX;
    this._showScrollbarY = config.showScrollbarY ?? this._scrollY;
    this._scrollbarWidth = config.scrollbarWidth ?? 8;
    this._scrollbarColor = config.scrollbarColor || '#bdc3c7';
    this._scrollbarTrackColor = config.scrollbarTrackColor || '#ecf0f1';
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._borderRadius = config.borderRadius ?? 0;
    this._borderColor = config.borderColor || '#e0e0e0';
    this._borderWidth = config.borderWidth ?? 1;
    this._scrollSpeed = config.scrollSpeed ?? 40;
    this._onScroll = config.onScroll;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 300, height: 200 };
    }
  }

  // Getters/setters
  get scrollOffsetX(): number { return this._scrollOffsetX; }
  set scrollOffsetX(value: number) {
    const max = this.maxScrollX;
    this._scrollOffsetX = Math.max(0, Math.min(max, value));
    this.markDirty();
    this._onScroll?.(this._scrollOffsetX, this._scrollOffsetY);
  }

  get scrollOffsetY(): number { return this._scrollOffsetY; }
  set scrollOffsetY(value: number) {
    const max = this.maxScrollY;
    this._scrollOffsetY = Math.max(0, Math.min(max, value));
    this.markDirty();
    this._onScroll?.(this._scrollOffsetX, this._scrollOffsetY);
  }

  get contentWidth(): number { return this._contentWidth; }
  set contentWidth(value: number) {
    this._contentWidth = value;
    this.markDirty();
  }

  get contentHeight(): number { return this._contentHeight; }
  set contentHeight(value: number) {
    this._contentHeight = value;
    this.markDirty();
  }

  get maxScrollX(): number {
    return Math.max(0, this._contentWidth - this._size.width + (this._showScrollbarY ? this._scrollbarWidth : 0));
  }

  get maxScrollY(): number {
    return Math.max(0, this._contentHeight - this._size.height + (this._showScrollbarX ? this._scrollbarWidth : 0));
  }

  get needsScrollX(): boolean {
    return this._scrollX && this._contentWidth > this._size.width;
  }

  get needsScrollY(): boolean {
    return this._scrollY && this._contentHeight > this._size.height;
  }

  /**
   * Scroll by delta
   */
  scrollBy(deltaX: number, deltaY: number): void {
    if (this._scrollX) {
      this.scrollOffsetX += deltaX;
    }
    if (this._scrollY) {
      this.scrollOffsetY += deltaY;
    }
  }

  /**
   * Scroll to position
   */
  scrollTo(x: number, y: number): void {
    this.scrollOffsetX = x;
    this.scrollOffsetY = y;
  }

  /**
   * Get visible area
   */
  private getViewportSize(): { width: number; height: number } {
    return {
      width: this._size.width - (this.needsScrollY && this._showScrollbarY ? this._scrollbarWidth : 0),
      height: this._size.height - (this.needsScrollX && this._showScrollbarX ? this._scrollbarWidth : 0)
    };
  }

  /**
   * Override addChild to update content size
   */
  addChild(child: UIComponent): void {
    super.addChild(child);
    this.updateContentSize();
  }

  /**
   * Update content size based on children
   */
  updateContentSize(): void {
    let maxX = 0;
    let maxY = 0;

    for (const child of this._children) {
      const childRight = child.x + child.width - this._position.x;
      const childBottom = child.y + child.height - this._position.y;
      maxX = Math.max(maxX, childRight);
      maxY = Math.max(maxY, childBottom);
    }

    this._contentWidth = Math.max(this._size.width, maxX);
    this._contentHeight = Math.max(this._size.height, maxY);
    this.markDirty();
  }

  /**
   * Render scroll view to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const viewport = this.getViewportSize();

    // Draw background
    ctx.fillStyle = this._backgroundColor;
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

    // Clip to viewport
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, viewport.width, viewport.height);
    ctx.clip();

    // Render children with scroll offset
    for (const child of this._children) {
      if (!child.visible) continue;

      // Temporarily offset child position
      const originalX = child.x;
      const originalY = child.y;
      child.x = originalX - this._scrollOffsetX;
      child.y = originalY - this._scrollOffsetY;

      // Only render if visible in viewport
      if (
        child.x + child.width > x &&
        child.x < x + viewport.width &&
        child.y + child.height > y &&
        child.y < y + viewport.height
      ) {
        child.render(ctx);
      }

      // Restore position
      child.x = originalX;
      child.y = originalY;
    }

    ctx.restore();

    // Draw vertical scrollbar
    if (this.needsScrollY && this._showScrollbarY) {
      const scrollbarX = x + width - this._scrollbarWidth;
      const trackHeight = viewport.height;
      const thumbHeight = Math.max(30, (viewport.height / this._contentHeight) * trackHeight);
      const thumbY = y + (this._scrollOffsetY / this.maxScrollY) * (trackHeight - thumbHeight);

      // Track
      ctx.fillStyle = this._scrollbarTrackColor;
      ctx.fillRect(scrollbarX, y, this._scrollbarWidth, trackHeight);

      // Thumb
      ctx.fillStyle = this._scrollbarColor;
      ctx.beginPath();
      ctx.roundRect(scrollbarX, thumbY, this._scrollbarWidth, thumbHeight, this._scrollbarWidth / 2);
      ctx.fill();
    }

    // Draw horizontal scrollbar
    if (this.needsScrollX && this._showScrollbarX) {
      const scrollbarY = y + height - this._scrollbarWidth;
      const trackWidth = viewport.width;
      const thumbWidth = Math.max(30, (viewport.width / this._contentWidth) * trackWidth);
      const thumbX = x + (this._scrollOffsetX / this.maxScrollX) * (trackWidth - thumbWidth);

      // Track
      ctx.fillStyle = this._scrollbarTrackColor;
      ctx.fillRect(x, scrollbarY, trackWidth, this._scrollbarWidth);

      // Thumb
      ctx.fillStyle = this._scrollbarColor;
      ctx.beginPath();
      ctx.roundRect(thumbX, scrollbarY, thumbWidth, this._scrollbarWidth, this._scrollbarWidth / 2);
      ctx.fill();
    }

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

  // Override pointer handlers for scroll interaction
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (!this.containsPoint(point)) return false;

    // Check scrollbar clicks
    const { x, y, width, height } = this.getBounds();
    const viewport = this.getViewportSize();

    // Vertical scrollbar
    if (this.needsScrollY && this._showScrollbarY) {
      const scrollbarX = x + width - this._scrollbarWidth;
      if (point.x >= scrollbarX) {
        this._isDraggingScrollbarY = true;
        this._dragStart = { ...point };
        this._scrollStart = { x: this._scrollOffsetX, y: this._scrollOffsetY };
        return true;
      }
    }

    // Horizontal scrollbar
    if (this.needsScrollX && this._showScrollbarX) {
      const scrollbarY = y + height - this._scrollbarWidth;
      if (point.y >= scrollbarY) {
        this._isDraggingScrollbarX = true;
        this._dragStart = { ...point };
        this._scrollStart = { x: this._scrollOffsetX, y: this._scrollOffsetY };
        return true;
      }
    }

    // Pass to children
    for (let i = this._children.length - 1; i >= 0; i--) {
      const child = this._children[i];
      const adjustedPoint = {
        x: point.x + this._scrollOffsetX,
        y: point.y + this._scrollOffsetY
      };
      if (child.handlePointerDown(adjustedPoint)) {
        return true;
      }
    }

    return true;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this._isDraggingScrollbarY) {
      const deltaY = point.y - this._dragStart.y;
      const viewport = this.getViewportSize();
      const scrollRatio = this._contentHeight / viewport.height;
      this.scrollOffsetY = this._scrollStart.y + deltaY * scrollRatio;
      return true;
    }

    if (this._isDraggingScrollbarX) {
      const deltaX = point.x - this._dragStart.x;
      const viewport = this.getViewportSize();
      const scrollRatio = this._contentWidth / viewport.width;
      this.scrollOffsetX = this._scrollStart.x + deltaX * scrollRatio;
      return true;
    }

    // Pass to children
    for (const child of this._children) {
      const adjustedPoint = {
        x: point.x + this._scrollOffsetX,
        y: point.y + this._scrollOffsetY
      };
      child.handlePointerMove(adjustedPoint);
    }

    return this.containsPoint(point);
  }

  handlePointerUp(point: Vector2): boolean {
    const wasDragging = this._isDraggingScrollbarX || this._isDraggingScrollbarY;
    this._isDraggingScrollbarX = false;
    this._isDraggingScrollbarY = false;

    if (wasDragging) return true;

    // Pass to children
    for (let i = this._children.length - 1; i >= 0; i--) {
      const child = this._children[i];
      const adjustedPoint = {
        x: point.x + this._scrollOffsetX,
        y: point.y + this._scrollOffsetY
      };
      if (child.handlePointerUp(adjustedPoint)) {
        return true;
      }
    }

    return this.containsPoint(point);
  }

  /**
   * Handle wheel scroll
   */
  handleWheel(deltaY: number): void {
    this.scrollBy(0, deltaY * this._scrollSpeed);
  }
}
