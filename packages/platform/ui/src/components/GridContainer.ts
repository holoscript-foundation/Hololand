/**
 * @hololand/ui - GridContainer Component
 * Grid layout container
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig } from '../types';

export interface GridContainerConfig extends UIComponentConfig {
  columns?: number;
  rows?: number;
  columnGap?: number;
  rowGap?: number;
  gap?: number;
  padding?: number;
  autoFit?: boolean;
  minCellWidth?: number;
  minCellHeight?: number;
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
}

/**
 * Grid layout container for arranging children in rows and columns
 */
export class GridContainer extends UIComponent {
  private _columns: number;
  private _rows: number;
  private _columnGap: number;
  private _rowGap: number;
  private _padding: number;
  private _autoFit: boolean;
  private _minCellWidth: number;
  private _minCellHeight: number;
  private _backgroundColor: string;
  private _borderRadius: number;
  private _borderColor: string;
  private _borderWidth: number;
  private _layoutDirty: boolean = true;

  constructor(config: GridContainerConfig) {
    super(config);

    this._columns = config.columns ?? 3;
    this._rows = config.rows ?? 0; // 0 = auto-calculate
    this._columnGap = config.columnGap ?? config.gap ?? 10;
    this._rowGap = config.rowGap ?? config.gap ?? 10;
    this._padding = config.padding ?? 0;
    this._autoFit = config.autoFit ?? false;
    this._minCellWidth = config.minCellWidth ?? 100;
    this._minCellHeight = config.minCellHeight ?? 100;
    this._backgroundColor = config.backgroundColor || 'transparent';
    this._borderRadius = config.borderRadius ?? 0;
    this._borderColor = config.borderColor || 'transparent';
    this._borderWidth = config.borderWidth ?? 0;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 400, height: 300 };
    }
  }

  // Getters/setters
  get columns() { return this._columns; }
  set columns(value: number) {
    this._columns = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get rows() { return this._rows; }
  set rows(value: number) {
    this._rows = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get columnGap() { return this._columnGap; }
  set columnGap(value: number) {
    this._columnGap = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get rowGap() { return this._rowGap; }
  set rowGap(value: number) {
    this._rowGap = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get gap() { return this._columnGap; }
  set gap(value: number) {
    this._columnGap = value;
    this._rowGap = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get padding() { return this._padding; }
  set padding(value: number) {
    this._padding = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  /**
   * Override addChild to trigger layout
   */
  addChild(child: UIComponent): void {
    super.addChild(child);
    this._layoutDirty = true;
  }

  /**
   * Override removeChild to trigger layout
   */
  removeChild(child: UIComponent): void {
    super.removeChild(child);
    this._layoutDirty = true;
  }

  /**
   * Calculate effective column count
   */
  private getEffectiveColumns(): number {
    if (this._autoFit) {
      const availableWidth = this._size.width - this._padding * 2;
      const cols = Math.floor((availableWidth + this._columnGap) / (this._minCellWidth + this._columnGap));
      return Math.max(1, cols);
    }
    return this._columns;
  }

  /**
   * Calculate effective row count
   */
  private getEffectiveRows(): number {
    const cols = this.getEffectiveColumns();
    if (this._rows > 0) {
      return this._rows;
    }
    return Math.ceil(this._children.length / cols);
  }

  /**
   * Perform grid layout calculation
   */
  private performLayout(): void {
    if (!this._layoutDirty || this._children.length === 0) return;

    const cols = this.getEffectiveColumns();
    const rows = this.getEffectiveRows();

    const availableWidth = this._size.width - this._padding * 2;
    const availableHeight = this._size.height - this._padding * 2;

    // Calculate cell size
    const cellWidth = (availableWidth - this._columnGap * (cols - 1)) / cols;
    const cellHeight = (availableHeight - this._rowGap * (rows - 1)) / rows;

    // Position children
    for (let i = 0; i < this._children.length; i++) {
      const child = this._children[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cellX = this._position.x + this._padding + col * (cellWidth + this._columnGap);
      const cellY = this._position.y + this._padding + row * (cellHeight + this._rowGap);

      // Center child in cell
      child.x = cellX + (cellWidth - child.width) / 2;
      child.y = cellY + (cellHeight - child.height) / 2;
    }

    this._layoutDirty = false;
  }

  /**
   * Get cell dimensions
   */
  getCellSize(): { width: number; height: number } {
    const cols = this.getEffectiveColumns();
    const rows = this.getEffectiveRows();

    const availableWidth = this._size.width - this._padding * 2;
    const availableHeight = this._size.height - this._padding * 2;

    return {
      width: (availableWidth - this._columnGap * (cols - 1)) / cols,
      height: (availableHeight - this._rowGap * (rows - 1)) / rows
    };
  }

  /**
   * Get grid position for index
   */
  getGridPosition(index: number): { column: number; row: number } {
    const cols = this.getEffectiveColumns();
    return {
      column: index % cols,
      row: Math.floor(index / cols)
    };
  }

  /**
   * Render container to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    this.performLayout();

    const { x, y, width, height } = this.getBounds();

    // Draw background
    if (this._backgroundColor !== 'transparent') {
      ctx.fillStyle = this._backgroundColor;
      if (this._borderRadius > 0) {
        this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, width, height);
      }
    }

    // Draw border
    if (this._borderWidth > 0 && this._borderColor !== 'transparent') {
      ctx.strokeStyle = this._borderColor;
      ctx.lineWidth = this._borderWidth;
      if (this._borderRadius > 0) {
        this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    }

    // Render children
    this._children.forEach(child => {
      if (child.visible) {
        child.render(ctx);
      }
    });

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
   * Override markDirty to also mark layout dirty
   */
  markDirty(): void {
    this._layoutDirty = true;
    super.markDirty();
  }
}
