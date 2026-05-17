/**
 * @hololand/ui - List Component
 * Scrollable list for displaying items
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface ListItem {
  id: string;
  text: string;
  subtext?: string;
  icon?: string;
  data?: unknown;
}

export interface ListConfig extends UIComponentConfig {
  items?: ListItem[];
  itemHeight?: number;
  backgroundColor?: string;
  itemBackgroundColor?: string;
  itemHoverColor?: string;
  selectedColor?: string;
  textColor?: string;
  subtextColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  subtextFontSize?: number;
  showScrollbar?: boolean;
  scrollbarWidth?: number;
  scrollbarColor?: string;
  selectable?: boolean;
  multiSelect?: boolean;
  dividerColor?: string;
  showDividers?: boolean;
  onItemClick?: (item: ListItem, index: number) => void;
  onSelectionChange?: (selectedItems: ListItem[]) => void;
}

/**
 * Scrollable list component
 */
export class List extends UIComponent {
  private _items: ListItem[];
  private _itemHeight: number;
  private _backgroundColor: string;
  private _itemBackgroundColor: string;
  private _itemHoverColor: string;
  private _selectedColor: string;
  private _textColor: string;
  private _subtextColor: string;
  private _borderColor: string;
  private _borderRadius: number;
  private _fontSize: number;
  private _subtextFontSize: number;
  private _showScrollbar: boolean;
  private _scrollbarWidth: number;
  private _scrollbarColor: string;
  private _selectable: boolean;
  private _multiSelect: boolean;
  private _dividerColor: string;
  private _showDividers: boolean;

  private _scrollOffset: number = 0;
  private _hoveredIndex: number = -1;
  private _selectedIndices: Set<number> = new Set();
  private _isDraggingScrollbar: boolean = false;
  private _scrollbarDragStart: number = 0;

  private _onItemClick?: (item: ListItem, index: number) => void;
  private _onSelectionChange?: (selectedItems: ListItem[]) => void;

  constructor(config: ListConfig) {
    super(config);

    this._items = config.items || [];
    this._itemHeight = config.itemHeight ?? 48;
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._itemBackgroundColor = config.itemBackgroundColor || 'transparent';
    this._itemHoverColor = config.itemHoverColor || '#f5f5f5';
    this._selectedColor = config.selectedColor || '#e3f2fd';
    this._textColor = config.textColor || '#333333';
    this._subtextColor = config.subtextColor || '#999999';
    this._borderColor = config.borderColor || '#e0e0e0';
    this._borderRadius = config.borderRadius ?? 4;
    this._fontSize = config.fontSize ?? 14;
    this._subtextFontSize = config.subtextFontSize ?? 12;
    this._showScrollbar = config.showScrollbar ?? true;
    this._scrollbarWidth = config.scrollbarWidth ?? 8;
    this._scrollbarColor = config.scrollbarColor || '#bdc3c7';
    this._selectable = config.selectable ?? true;
    this._multiSelect = config.multiSelect ?? false;
    this._dividerColor = config.dividerColor || '#eeeeee';
    this._showDividers = config.showDividers ?? true;
    this._onItemClick = config.onItemClick;
    this._onSelectionChange = config.onSelectionChange;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 300, height: 400 };
    }
  }

  // Getters/setters
  get items(): ListItem[] {
    return [...this._items];
  }
  set items(value: ListItem[]) {
    this._items = value;
    this._scrollOffset = 0;
    this._selectedIndices.clear();
    this.markDirty();
  }

  get selectedItems(): ListItem[] {
    return Array.from(this._selectedIndices).map((i) => this._items[i]);
  }

  get selectedIndices(): number[] {
    return Array.from(this._selectedIndices);
  }

  /**
   * Get total content height
   */
  private get contentHeight(): number {
    return this._items.length * this._itemHeight;
  }

  /**
   * Get max scroll offset
   */
  private get maxScrollOffset(): number {
    return Math.max(0, this.contentHeight - this._size.height);
  }

  /**
   * Check if scrolling is needed
   */
  private get needsScroll(): boolean {
    return this.contentHeight > this._size.height;
  }

  /**
   * Add item to list
   */
  addItem(item: ListItem): void {
    this._items.push(item);
    this.markDirty();
  }

  /**
   * Remove item by id
   */
  removeItem(id: string): void {
    const index = this._items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this._items.splice(index, 1);
      this._selectedIndices.delete(index);
      // Adjust selected indices
      const newSelected = new Set<number>();
      this._selectedIndices.forEach((i) => {
        if (i > index) newSelected.add(i - 1);
        else if (i < index) newSelected.add(i);
      });
      this._selectedIndices = newSelected;
      this.markDirty();
    }
  }

  /**
   * Select item by index
   */
  selectIndex(index: number): void {
    if (!this._selectable || index < 0 || index >= this._items.length) return;

    if (!this._multiSelect) {
      this._selectedIndices.clear();
    }
    this._selectedIndices.add(index);
    this._onSelectionChange?.(this.selectedItems);
    this.markDirty();
  }

  /**
   * Deselect item by index
   */
  deselectIndex(index: number): void {
    this._selectedIndices.delete(index);
    this._onSelectionChange?.(this.selectedItems);
    this.markDirty();
  }

  /**
   * Toggle selection
   */
  toggleSelection(index: number): void {
    if (this._selectedIndices.has(index)) {
      this.deselectIndex(index);
    } else {
      this.selectIndex(index);
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this._selectedIndices.clear();
    this._onSelectionChange?.([]);
    this.markDirty();
  }

  /**
   * Scroll to item
   */
  scrollToItem(index: number): void {
    if (index < 0 || index >= this._items.length) return;

    const itemTop = index * this._itemHeight;
    const itemBottom = itemTop + this._itemHeight;

    if (itemTop < this._scrollOffset) {
      this._scrollOffset = itemTop;
    } else if (itemBottom > this._scrollOffset + this._size.height) {
      this._scrollOffset = itemBottom - this._size.height;
    }

    this._scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this._scrollOffset));
    this.markDirty();
  }

  /**
   * Render list to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const contentWidth =
      this.needsScroll && this._showScrollbar ? width - this._scrollbarWidth - 4 : width;

    // Draw background
    ctx.fillStyle = this._backgroundColor;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

    // Draw border
    ctx.strokeStyle = this._borderColor;
    ctx.lineWidth = 1;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }

    // Clip to list area
    ctx.save();
    this.drawRoundedRect(
      ctx,
      x + 1,
      y + 1,
      width - 2,
      height - 2,
      Math.max(0, this._borderRadius - 1)
    );
    ctx.clip();

    // Draw items
    const startIndex = Math.floor(this._scrollOffset / this._itemHeight);
    const endIndex = Math.min(
      this._items.length,
      Math.ceil((this._scrollOffset + height) / this._itemHeight)
    );

    for (let i = startIndex; i < endIndex; i++) {
      const item = this._items[i];
      const itemY = y + i * this._itemHeight - this._scrollOffset;

      // Item background
      if (this._selectedIndices.has(i)) {
        ctx.fillStyle = this._selectedColor;
        ctx.fillRect(x, itemY, contentWidth, this._itemHeight);
      } else if (i === this._hoveredIndex) {
        ctx.fillStyle = this._itemHoverColor;
        ctx.fillRect(x, itemY, contentWidth, this._itemHeight);
      } else if (this._itemBackgroundColor !== 'transparent') {
        ctx.fillStyle = this._itemBackgroundColor;
        ctx.fillRect(x, itemY, contentWidth, this._itemHeight);
      }

      // Item text
      const textX = x + 16;
      const hasSubtext = !!item.subtext;

      ctx.fillStyle = this._textColor;
      ctx.font = `${this._fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = hasSubtext ? 'bottom' : 'middle';

      const textY = hasSubtext ? itemY + this._itemHeight / 2 - 2 : itemY + this._itemHeight / 2;
      ctx.fillText(item.text, textX, textY, contentWidth - 32);

      // Subtext
      if (hasSubtext) {
        ctx.fillStyle = this._subtextColor;
        ctx.font = `${this._subtextFontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(item.subtext!, textX, itemY + this._itemHeight / 2 + 2, contentWidth - 32);
      }

      // Divider
      if (this._showDividers && i < this._items.length - 1) {
        ctx.strokeStyle = this._dividerColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 16, itemY + this._itemHeight - 0.5);
        ctx.lineTo(x + contentWidth - 16, itemY + this._itemHeight - 0.5);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Draw scrollbar
    if (this.needsScroll && this._showScrollbar) {
      const scrollbarX = x + width - this._scrollbarWidth - 2;
      const scrollbarHeight = height - 4;
      const thumbHeight = Math.max(30, (height / this.contentHeight) * scrollbarHeight);
      const thumbY =
        y + 2 + (this._scrollOffset / this.maxScrollOffset) * (scrollbarHeight - thumbHeight);

      // Scrollbar track
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.roundRect(
        scrollbarX,
        y + 2,
        this._scrollbarWidth,
        scrollbarHeight,
        this._scrollbarWidth / 2
      );
      ctx.fill();

      // Scrollbar thumb
      ctx.fillStyle = this._scrollbarColor;
      ctx.beginPath();
      ctx.roundRect(
        scrollbarX,
        thumbY,
        this._scrollbarWidth,
        thumbHeight,
        this._scrollbarWidth / 2
      );
      ctx.fill();
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
   * Get item index at point
   */
  private getItemIndexAtPoint(point: Vector2): number {
    const { x, y, width, height } = this.getBounds();

    if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) {
      return -1;
    }

    const relativeY = point.y - y + this._scrollOffset;
    const index = Math.floor(relativeY / this._itemHeight);

    if (index >= 0 && index < this._items.length) {
      return index;
    }

    return -1;
  }

  // Override pointer handlers
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (!this.containsPoint(point)) return false;

    const itemIndex = this.getItemIndexAtPoint(point);
    if (itemIndex >= 0) {
      if (this._selectable) {
        this.toggleSelection(itemIndex);
      }
      this._onItemClick?.(this._items[itemIndex], itemIndex);
      this.emit('itemclick', { position: point });
      return true;
    }

    return true;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    if (this.containsPoint(point)) {
      const newHoveredIndex = this.getItemIndexAtPoint(point);
      if (newHoveredIndex !== this._hoveredIndex) {
        this._hoveredIndex = newHoveredIndex;
        this.markDirty();
      }
      return true;
    } else {
      if (this._hoveredIndex !== -1) {
        this._hoveredIndex = -1;
        this.markDirty();
      }
    }

    return false;
  }

  /**
   * Handle scroll (called by UICanvas on wheel event)
   */
  scroll(deltaY: number): void {
    if (!this.needsScroll) return;

    this._scrollOffset += deltaY;
    this._scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this._scrollOffset));
    this.markDirty();
  }
}
