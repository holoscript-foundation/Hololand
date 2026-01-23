/**
 * @hololand/renderer - 2D Renderer
 *
 * Canvas 2D renderer for non-VR and fallback scenarios
 * Works with @hololand/world for consistent API
 */

import { HololandWorld, SpatialObject } from '@hololand/world';
import { logger } from './logger';

export interface Renderer2DConfig {
  backgroundColor?: string;
  showGrid?: boolean;
  gridSize?: number;
  gridColor?: string;
  enableZoom?: boolean;
  enablePan?: boolean;
  minZoom?: number;
  maxZoom?: number;
  viewMode?: '2d-top' | '2d-side' | '2d-front' | 'isometric';
}

interface Camera2D {
  x: number;
  y: number;
  zoom: number;
}

/**
 * 2D Canvas renderer for Hololand worlds
 * Provides top-down, side, front, and isometric views
 */
export class Hololand2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: HololandWorld;
  private config: Required<Renderer2DConfig>;
  private camera: Camera2D;
  private animationId: number | null = null;
  private isDragging: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, world: HololandWorld, config?: Renderer2DConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.world = world;

    this.config = {
      backgroundColor: config?.backgroundColor ?? '#1a1a2e',
      showGrid: config?.showGrid ?? true,
      gridSize: config?.gridSize ?? 50,
      gridColor: config?.gridColor ?? 'rgba(255, 255, 255, 0.1)',
      enableZoom: config?.enableZoom ?? true,
      enablePan: config?.enablePan ?? true,
      minZoom: config?.minZoom ?? 0.1,
      maxZoom: config?.maxZoom ?? 5,
      viewMode: config?.viewMode ?? '2d-top',
    };

    this.camera = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      zoom: 1,
    };

    this.setupEventListeners();

    logger.info('[Hololand2DRenderer] Initialized', { viewMode: this.config.viewMode });
  }

  /**
   * Setup mouse/touch event listeners
   */
  private setupEventListeners(): void {
    // Mouse wheel for zoom
    if (this.config.enableZoom) {
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(
          this.config.minZoom,
          Math.min(this.config.maxZoom, this.camera.zoom * zoomFactor)
        );
      });
    }

    // Mouse drag for pan
    if (this.config.enablePan) {
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
          const dx = e.clientX - this.lastMousePos.x;
          const dy = e.clientY - this.lastMousePos.y;
          this.camera.x += dx;
          this.camera.y += dy;
          this.lastMousePos = { x: e.clientX, y: e.clientY };
        }
      });

      this.canvas.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.isDragging = false;
      });
    }
  }

  /**
   * Set view mode
   */
  setViewMode(mode: Renderer2DConfig['viewMode']): void {
    this.config.viewMode = mode!;
    logger.info('[Hololand2DRenderer] View mode changed', { mode });
  }

  /**
   * Reset camera to center
   */
  resetCamera(): void {
    this.camera = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      zoom: 1,
    };
  }

  /**
   * Start render loop
   */
  start(): void {
    if (this.animationId !== null) return;

    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
    logger.info('[Hololand2DRenderer] Started render loop');
  }

  /**
   * Stop render loop
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      logger.info('[Hololand2DRenderer] Stopped render loop');
    }
  }

  /**
   * Render single frame
   */
  render(): void {
    const { width, height } = this.canvas;

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Save context state
    this.ctx.save();

    // Apply camera transform
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw grid
    if (this.config.showGrid) {
      this.drawGrid();
    }

    // Draw world objects
    const objects = this.world.getAllObjects();
    objects.forEach((obj) => this.drawObject(obj));

    // Restore context
    this.ctx.restore();

    // Draw UI overlay
    this.drawOverlay();
  }

  /**
   * Draw grid
   */
  private drawGrid(): void {
    const gridSize = this.config.gridSize;
    const viewWidth = this.canvas.width / this.camera.zoom;
    const viewHeight = this.canvas.height / this.camera.zoom;
    const startX = -this.camera.x / this.camera.zoom - viewWidth / 2;
    const startY = -this.camera.y / this.camera.zoom - viewHeight / 2;

    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1 / this.camera.zoom;

    // Vertical lines
    const firstVertical = Math.floor(startX / gridSize) * gridSize;
    for (let x = firstVertical; x < startX + viewWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, startY + viewHeight);
      this.ctx.stroke();
    }

    // Horizontal lines
    const firstHorizontal = Math.floor(startY / gridSize) * gridSize;
    for (let y = firstHorizontal; y < startY + viewHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(startX + viewWidth, y);
      this.ctx.stroke();
    }

    // Draw origin axes
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.lineWidth = 2 / this.camera.zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(-viewWidth, 0);
    this.ctx.lineTo(viewWidth, 0);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -viewHeight);
    this.ctx.lineTo(0, viewHeight);
    this.ctx.stroke();
  }

  /**
   * Draw a single object
   */
  private drawObject(obj: SpatialObject): void {
    if (!obj.isVisible()) return;

    const pos = obj.getPosition();
    const scale = obj.getScale();
    const metadata = obj.getMetadata();

    // Get 2D position based on view mode
    let x: number, y: number, width: number, height: number;

    switch (this.config.viewMode) {
      case '2d-top':
        x = pos.x;
        y = -pos.z; // Z becomes Y (inverted)
        width = scale.x;
        height = scale.z;
        break;
      case '2d-side':
        x = pos.x;
        y = -pos.y; // Y is inverted
        width = scale.x;
        height = scale.y;
        break;
      case '2d-front':
        x = pos.z;
        y = -pos.y;
        width = scale.z;
        height = scale.y;
        break;
      case 'isometric':
        // Simple isometric projection
        x = (pos.x - pos.z) * 0.866; // cos(30°)
        y = -(pos.y + (pos.x + pos.z) * 0.5);
        width = scale.x;
        height = scale.y;
        break;
      default:
        x = pos.x;
        y = -pos.z;
        width = scale.x;
        height = scale.z;
    }

    // Determine color
    const color = metadata.color || '#00ffff';

    // Draw shape based on type
    this.ctx.fillStyle = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2 / this.camera.zoom;

    switch (obj.type) {
      case 'sphere':
      case 'orb':
        this.ctx.beginPath();
        this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case 'cylinder':
        // Draw as ellipse in top view, rectangle in side view
        if (this.config.viewMode === '2d-top') {
          this.ctx.beginPath();
          this.ctx.ellipse(x, y, width / 2, width / 2, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        } else {
          this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
          this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
        }
        break;

      default:
        // Default to rectangle/box
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
        this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    }

    // Draw label if present
    if (metadata.label || metadata.name) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${12 / this.camera.zoom}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(metadata.label || metadata.name, x, y + height / 2 + 16 / this.camera.zoom);
    }

    // Draw glow effect
    if (metadata.glow) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.shadowColor = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
      this.ctx.shadowBlur = 20 / this.camera.zoom;

      if (obj.type === 'sphere' || obj.type === 'orb') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, width / 2 + 5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(x - width / 2 - 5, y - height / 2 - 5, width + 10, height + 10);
      }

      this.ctx.restore();
    }
  }

  /**
   * Draw UI overlay
   */
  private drawOverlay(): void {
    const padding = 10;

    // View mode indicator
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`View: ${this.config.viewMode}`, padding, 20);
    this.ctx.fillText(`Zoom: ${(this.camera.zoom * 100).toFixed(0)}%`, padding, 36);

    // Object count
    const objectCount = this.world.getAllObjects().length;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Objects: ${objectCount}`, this.canvas.width - padding, 20);

    // Controls hint
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillText('Scroll: Zoom | Drag: Pan', padding, this.canvas.height - 10);
  }

  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    // Re-center camera
    this.camera.x = width / 2;
    this.camera.y = height / 2;
  }

  /**
   * Get current camera state
   */
  getCamera(): Camera2D {
    return { ...this.camera };
  }

  /**
   * Set camera state
   */
  setCamera(camera: Partial<Camera2D>): void {
    if (camera.x !== undefined) this.camera.x = camera.x;
    if (camera.y !== undefined) this.camera.y = camera.y;
    if (camera.zoom !== undefined) {
      this.camera.zoom = Math.max(
        this.config.minZoom,
        Math.min(this.config.maxZoom, camera.zoom)
      );
    }
  }

  /**
   * Focus on a specific object
   */
  focusOnObject(objectId: string): void {
    const obj = this.world.getObject(objectId);
    if (!obj) return;

    const pos = obj.getPosition();

    // Center camera on object
    switch (this.config.viewMode) {
      case '2d-top':
        this.camera.x = this.canvas.width / 2 - pos.x * this.camera.zoom;
        this.camera.y = this.canvas.height / 2 + pos.z * this.camera.zoom;
        break;
      case '2d-side':
        this.camera.x = this.canvas.width / 2 - pos.x * this.camera.zoom;
        this.camera.y = this.canvas.height / 2 + pos.y * this.camera.zoom;
        break;
      case '2d-front':
        this.camera.x = this.canvas.width / 2 - pos.z * this.camera.zoom;
        this.camera.y = this.canvas.height / 2 + pos.y * this.camera.zoom;
        break;
    }
  }

  /**
   * Dispose renderer
   */
  dispose(): void {
    this.stop();
    logger.info('[Hololand2DRenderer] Disposed');
  }
}
