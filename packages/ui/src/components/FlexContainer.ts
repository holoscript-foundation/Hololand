/**
 * @hololand/ui - FlexContainer Component
 * Flexbox-style layout container
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig } from '../types';

export interface FlexContainerConfig extends UIComponentConfig {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
  gap?: number;
  padding?: number;
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
}

interface LayoutItem {
  component: UIComponent;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Flexbox-style container for laying out child components
 */
export class FlexContainer extends UIComponent {
  private _direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  private _wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  private _justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  private _alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  private _alignContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
  private _gap: number;
  private _padding: number;
  private _backgroundColor: string;
  private _borderRadius: number;
  private _borderColor: string;
  private _borderWidth: number;
  private _layoutDirty: boolean = true;

  constructor(config: FlexContainerConfig) {
    super(config);

    this._direction = config.direction || 'row';
    this._wrap = config.wrap || 'nowrap';
    this._justifyContent = config.justifyContent || 'flex-start';
    this._alignItems = config.alignItems || 'stretch';
    this._alignContent = config.alignContent || 'stretch';
    this._gap = config.gap ?? 0;
    this._padding = config.padding ?? 0;
    this._backgroundColor = config.backgroundColor || 'transparent';
    this._borderRadius = config.borderRadius ?? 0;
    this._borderColor = config.borderColor || 'transparent';
    this._borderWidth = config.borderWidth ?? 0;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 300, height: 200 };
    }
  }

  // Getters/setters
  get direction() { return this._direction; }
  set direction(value: typeof this._direction) {
    this._direction = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get wrap() { return this._wrap; }
  set wrap(value: typeof this._wrap) {
    this._wrap = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get justifyContent() { return this._justifyContent; }
  set justifyContent(value: typeof this._justifyContent) {
    this._justifyContent = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get alignItems() { return this._alignItems; }
  set alignItems(value: typeof this._alignItems) {
    this._alignItems = value;
    this._layoutDirty = true;
    this.markDirty();
  }

  get gap() { return this._gap; }
  set gap(value: number) {
    this._gap = value;
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
   * Perform flex layout calculation
   */
  private performLayout(): void {
    if (!this._layoutDirty || this._children.length === 0) return;

    const isRow = this._direction === 'row' || this._direction === 'row-reverse';
    const isReversed = this._direction === 'row-reverse' || this._direction === 'column-reverse';

    const containerWidth = this._size.width - this._padding * 2;
    const containerHeight = this._size.height - this._padding * 2;

    // Get main and cross axis dimensions
    const mainSize = isRow ? containerWidth : containerHeight;
    const crossSize = isRow ? containerHeight : containerWidth;

    // Calculate total children main axis size
    let totalMainSize = 0;
    const childSizes: { main: number; cross: number }[] = [];

    for (const child of this._children) {
      const mainChildSize = isRow ? child.width : child.height;
      const crossChildSize = isRow ? child.height : child.width;
      childSizes.push({ main: mainChildSize, cross: crossChildSize });
      totalMainSize += mainChildSize;
    }

    // Add gaps
    const totalGap = this._gap * (this._children.length - 1);
    totalMainSize += totalGap;

    // Calculate spacing based on justify-content
    let mainOffset = 0;
    let mainSpacing = this._gap;

    switch (this._justifyContent) {
      case 'flex-end':
        mainOffset = mainSize - totalMainSize;
        break;
      case 'center':
        mainOffset = (mainSize - totalMainSize) / 2;
        break;
      case 'space-between':
        if (this._children.length > 1) {
          mainSpacing = (mainSize - (totalMainSize - totalGap)) / (this._children.length - 1);
        }
        break;
      case 'space-around':
        if (this._children.length > 0) {
          const space = (mainSize - (totalMainSize - totalGap)) / this._children.length;
          mainOffset = space / 2;
          mainSpacing = space;
        }
        break;
      case 'space-evenly':
        if (this._children.length > 0) {
          const space = (mainSize - (totalMainSize - totalGap)) / (this._children.length + 1);
          mainOffset = space;
          mainSpacing = space + this._gap;
        }
        break;
    }

    // Position children
    const items: LayoutItem[] = [];
    let currentMainPos = mainOffset;

    const orderedChildren = isReversed ? [...this._children].reverse() : this._children;

    for (let i = 0; i < orderedChildren.length; i++) {
      const child = orderedChildren[i];
      const { main: childMainSize, cross: childCrossSize } = childSizes[isReversed ? orderedChildren.length - 1 - i : i];

      // Calculate cross axis position
      let crossOffset = 0;
      let effectiveCrossSize = childCrossSize;

      switch (this._alignItems) {
        case 'flex-end':
          crossOffset = crossSize - childCrossSize;
          break;
        case 'center':
          crossOffset = (crossSize - childCrossSize) / 2;
          break;
        case 'stretch':
          effectiveCrossSize = crossSize;
          break;
      }

      // Set positions
      const mainPos = currentMainPos;
      const crossPos = crossOffset;

      if (isRow) {
        child.x = this._position.x + this._padding + mainPos;
        child.y = this._position.y + this._padding + crossPos;
        if (this._alignItems === 'stretch') {
          child.height = effectiveCrossSize;
        }
      } else {
        child.x = this._position.x + this._padding + crossPos;
        child.y = this._position.y + this._padding + mainPos;
        if (this._alignItems === 'stretch') {
          child.width = effectiveCrossSize;
        }
      }

      items.push({
        component: child,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      });

      currentMainPos += childMainSize + (i < orderedChildren.length - 1 ? mainSpacing : 0);
    }

    this._layoutDirty = false;
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
