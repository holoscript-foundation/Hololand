/**
 * @hololand/ui - Base UI Component
 * Foundation for all 2D UI components
 */

import type { UIComponentConfig, Vector2, Size, Rect } from '../types';

export type UIEventHandler = (event: UIEvent) => void;

export interface UIEvent {
  type: string;
  target: UIComponent;
  position?: Vector2;
  timestamp: number;
}

/**
 * Base class for all UI components
 */
export abstract class UIComponent {
  readonly id: string;
  protected _position: Vector2;
  protected _size: Size;
  protected _visible: boolean;
  protected _enabled: boolean;
  protected _zIndex: number;
  protected _parent: UIComponent | null = null;
  protected _children: UIComponent[] = [];
  protected _dirty: boolean = true;

  // Event handlers
  protected _eventHandlers: Map<string, UIEventHandler[]> = new Map();

  // Accessibility
  protected _accessible: boolean;
  protected _ariaLabel: string;
  protected _tabIndex: number;

  constructor(config: UIComponentConfig) {
    this.id = this.generateId();
    this._position = config.position;
    this._size = config.size || { width: 100, height: 40 };
    this._visible = config.visible ?? true;
    this._enabled = config.enabled ?? true;
    this._zIndex = config.zIndex ?? 0;
    this._accessible = config.accessible ?? true;
    this._ariaLabel = config.ariaLabel || '';
    this._tabIndex = config.tabIndex ?? 0;
  }

  private generateId(): string {
    return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Position getters/setters
  get x(): number {
    return this._position.x;
  }
  set x(value: number) {
    this._position.x = value;
    this.markDirty();
  }

  get y(): number {
    return this._position.y;
  }
  set y(value: number) {
    this._position.y = value;
    this.markDirty();
  }

  get position(): Vector2 {
    return { ...this._position };
  }
  set position(value: Vector2) {
    this._position = { ...value };
    this.markDirty();
  }

  // Size getters/setters
  get width(): number {
    return this._size.width;
  }
  set width(value: number) {
    this._size.width = value;
    this.markDirty();
  }

  get height(): number {
    return this._size.height;
  }
  set height(value: number) {
    this._size.height = value;
    this.markDirty();
  }

  get size(): Size {
    return { ...this._size };
  }
  set size(value: Size) {
    this._size = { ...value };
    this.markDirty();
  }

  // Visibility
  get visible(): boolean {
    return this._visible;
  }
  set visible(value: boolean) {
    this._visible = value;
    this.markDirty();
  }

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(value: boolean) {
    this._enabled = value;
    this.markDirty();
  }

  get zIndex(): number {
    return this._zIndex;
  }
  set zIndex(value: number) {
    this._zIndex = value;
    this.markDirty();
  }

  // Hierarchy
  get parent(): UIComponent | null {
    return this._parent;
  }
  get children(): readonly UIComponent[] {
    return this._children;
  }

  /**
   * Get bounding rectangle
   */
  getBounds(): Rect {
    return {
      x: this._position.x,
      y: this._position.y,
      width: this._size.width,
      height: this._size.height,
    };
  }

  /**
   * Check if point is inside component
   */
  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this._position.x &&
      point.x <= this._position.x + this._size.width &&
      point.y >= this._position.y &&
      point.y <= this._position.y + this._size.height
    );
  }

  /**
   * Add child component
   */
  addChild(child: UIComponent): void {
    if (child._parent) {
      child._parent.removeChild(child);
    }
    child._parent = this;
    this._children.push(child);
    this.markDirty();
  }

  /**
   * Remove child component
   */
  removeChild(child: UIComponent): void {
    const index = this._children.indexOf(child);
    if (index >= 0) {
      this._children.splice(index, 1);
      child._parent = null;
      this.markDirty();
    }
  }

  /**
   * Add event listener
   */
  on(event: string, handler: UIEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, []);
    }
    this._eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: UIEventHandler): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  protected emit(type: string, data?: Partial<UIEvent>): void {
    const handlers = this._eventHandlers.get(type);
    if (handlers) {
      const event: UIEvent = {
        type,
        target: this,
        timestamp: Date.now(),
        ...data,
      };
      handlers.forEach((handler) => handler(event));
    }
  }

  /**
   * Mark component as needing redraw
   */
  markDirty(): void {
    this._dirty = true;
    if (this._parent) {
      this._parent.markDirty();
    }
  }

  /**
   * Check if component needs redraw
   */
  isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Abstract render method - must be implemented by subclasses
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Update component (for animations, etc.)
   */
  update(deltaTime: number): void {
    // Override in subclasses
    this._children.forEach((child) => child.update(deltaTime));
  }

  /**
   * Handle mouse/touch events
   */
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    // Check children first (reverse order for z-index)
    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerDown(point)) {
        return true;
      }
    }

    if (this.containsPoint(point)) {
      this.emit('pointerdown', { position: point });
      return true;
    }

    return false;
  }

  handlePointerUp(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerUp(point)) {
        return true;
      }
    }

    if (this.containsPoint(point)) {
      this.emit('pointerup', { position: point });
      this.emit('click', { position: point });
      return true;
    }

    return false;
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerMove(point)) {
        return true;
      }
    }

    if (this.containsPoint(point)) {
      this.emit('pointermove', { position: point });
      return true;
    }

    return false;
  }

  /**
   * Dispose component and cleanup
   */
  dispose(): void {
    this._children.forEach((child) => child.dispose());
    this._children = [];
    this._eventHandlers.clear();
    if (this._parent) {
      this._parent.removeChild(this);
    }
  }
}
