/**
 * @hololand/ui - UICanvas
 * Main canvas manager for 2D UI rendering
 */

import { UIComponent } from './components/UIComponent';
import type { UICanvasConfig, Vector2 } from './types';

/**
 * UICanvas - manages 2D UI rendering and input
 */
export class UICanvas {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _root: UIComponent[] = [];
  private _width: number;
  private _height: number;
  private _pixelRatio: number;
  private _transparent: boolean;
  private _backgroundColor: string = '#f5f5f5';
  private _running: boolean = false;
  private _lastTime: number = 0;
  private _focusedComponent: UIComponent | null = null;
  private _dirty: boolean = true;

  // Responsive breakpoints
  private _breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  private _currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  constructor(canvas: HTMLCanvasElement, config?: UICanvasConfig) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this._ctx = ctx;

    this._width = config?.width || canvas.width || 800;
    this._height = config?.height || canvas.height || 600;
    this._pixelRatio = config?.pixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    this._transparent = config?.transparent ?? false;
    this._breakpoints = config?.breakpoints || {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
    };

    this.resize(this._width, this._height);
    this.setupEventListeners();
    this.updateBreakpoint();
  }

  // Getters
  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get breakpoint(): string { return this._currentBreakpoint; }

  get backgroundColor(): string { return this._backgroundColor; }
  set backgroundColor(color: string) { this._backgroundColor = color; this.markDirty(); }

  /**
   * Set canvas size
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    // Set display size
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;

    // Set actual size with pixel ratio for HiDPI
    this._canvas.width = width * this._pixelRatio;
    this._canvas.height = height * this._pixelRatio;

    // Scale context for pixel ratio
    this._ctx.scale(this._pixelRatio, this._pixelRatio);

    this.updateBreakpoint();
    this.markDirty();
  }

  /**
   * Update current breakpoint
   */
  private updateBreakpoint(): void {
    if (this._width < this._breakpoints.mobile) {
      this._currentBreakpoint = 'mobile';
    } else if (this._width < this._breakpoints.tablet) {
      this._currentBreakpoint = 'tablet';
    } else {
      this._currentBreakpoint = 'desktop';
    }
  }

  /**
   * Setup input event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this._canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    this._canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
    this._canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));

    // Touch events
    this._canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this._canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this._canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));

    // Keyboard events (for focused components)
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    // Resize handling
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        // Optionally auto-resize to parent
        // this.resize(this._canvas.parentElement?.clientWidth || this._width, ...);
      });
    }
  }

  /**
   * Get mouse position relative to canvas
   */
  private getCanvasPosition(e: MouseEvent): Vector2 {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /**
   * Get touch position relative to canvas
   */
  private getTouchPosition(touch: Touch): Vector2 {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  private handlePointerDown(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);
    for (let i = this._root.length - 1; i >= 0; i--) {
      if (this._root[i].handlePointerDown(pos)) {
        break;
      }
    }
  }

  private handlePointerUp(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);
    for (let i = this._root.length - 1; i >= 0; i--) {
      if (this._root[i].handlePointerUp(pos)) {
        break;
      }
    }
  }

  private handlePointerMove(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);
    for (let i = this._root.length - 1; i >= 0; i--) {
      this._root[i].handlePointerMove(pos);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getTouchPosition(e.touches[0]);
      for (let i = this._root.length - 1; i >= 0; i--) {
        if (this._root[i].handlePointerDown(pos)) {
          break;
        }
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length > 0) {
      const pos = this.getTouchPosition(e.changedTouches[0]);
      for (let i = this._root.length - 1; i >= 0; i--) {
        if (this._root[i].handlePointerUp(pos)) {
          break;
        }
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getTouchPosition(e.touches[0]);
      for (let i = this._root.length - 1; i >= 0; i--) {
        this._root[i].handlePointerMove(pos);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Forward to focused text input if any
    // This is a simplified version - real implementation would track focus
    if (this._focusedComponent && 'handleKeyInput' in this._focusedComponent) {
      (this._focusedComponent as any).handleKeyInput(e.key, e.ctrlKey);
      e.preventDefault();
    }
  }

  /**
   * Add component to root
   */
  add(component: UIComponent): void {
    this._root.push(component);
    this.sortByZIndex();
    this.markDirty();
  }

  /**
   * Remove component from root
   */
  remove(component: UIComponent): void {
    const index = this._root.indexOf(component);
    if (index >= 0) {
      this._root.splice(index, 1);
      this.markDirty();
    }
  }

  /**
   * Sort components by z-index
   */
  private sortByZIndex(): void {
    this._root.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Mark canvas as needing redraw
   */
  markDirty(): void {
    this._dirty = true;
  }

  /**
   * Set focused component (for keyboard input)
   */
  setFocus(component: UIComponent | null): void {
    this._focusedComponent = component;
  }

  /**
   * Start render loop
   */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this.loop();
  }

  /**
   * Stop render loop
   */
  stop(): void {
    this._running = false;
  }

  /**
   * Main render loop
   */
  private loop = (): void => {
    if (!this._running) return;

    const now = performance.now();
    const deltaTime = now - this._lastTime;
    this._lastTime = now;

    // Update components
    this._root.forEach(component => component.update(deltaTime));

    // Check if any component is dirty
    const needsRedraw = this._dirty || this._root.some(c => c.isDirty());

    if (needsRedraw) {
      this.render();
      this._dirty = false;
    }

    requestAnimationFrame(this.loop);
  };

  /**
   * Render all components
   */
  render(): void {
    // Reset transform for clearing
    this._ctx.setTransform(this._pixelRatio, 0, 0, this._pixelRatio, 0, 0);

    // Clear canvas
    if (this._transparent) {
      this._ctx.clearRect(0, 0, this._width, this._height);
    } else {
      this._ctx.fillStyle = this._backgroundColor;
      this._ctx.fillRect(0, 0, this._width, this._height);
    }

    // Render all root components
    this._root.forEach(component => {
      if (component.visible) {
        component.render(this._ctx);
      }
    });
  }

  /**
   * Render single frame (for static UIs)
   */
  renderOnce(): void {
    this.render();
  }

  /**
   * Get all components
   */
  getComponents(): readonly UIComponent[] {
    return this._root;
  }

  /**
   * Find component by ID
   */
  findById(id: string): UIComponent | null {
    const search = (components: UIComponent[]): UIComponent | null => {
      for (const component of components) {
        if (component.id === id) return component;
        const found = search([...component.children]);
        if (found) return found;
      }
      return null;
    };
    return search(this._root);
  }

  /**
   * Dispose canvas and cleanup
   */
  dispose(): void {
    this.stop();
    this._root.forEach(component => component.dispose());
    this._root = [];
  }
}
