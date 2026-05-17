/**
 * @hololand/ui - Image Component
 * Display images and sprites in 2D UI
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig } from '../types';

export interface ImageConfig extends UIComponentConfig {
  src?: string | HTMLImageElement;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
  opacity?: number;
  borderRadius?: number;
  backgroundColor?: string;
  placeholderColor?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

type ImageState = 'loading' | 'loaded' | 'error';

/**
 * Image component for displaying images and sprites
 */
export class Image extends UIComponent {
  private _image: HTMLImageElement | null = null;
  private _fit: 'contain' | 'cover' | 'fill' | 'none';
  private _opacity: number;
  private _borderRadius: number;
  private _backgroundColor: string;
  private _placeholderColor: string;
  private _state: ImageState = 'loading';
  private _onLoad?: () => void;
  private _onError?: (error: Error) => void;

  constructor(config: ImageConfig) {
    super(config);

    this._fit = config.fit || 'contain';
    this._opacity = config.opacity ?? 1;
    this._borderRadius = config.borderRadius ?? 0;
    this._backgroundColor = config.backgroundColor || 'transparent';
    this._placeholderColor = config.placeholderColor || '#e0e0e0';
    this._onLoad = config.onLoad;
    this._onError = config.onError;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 100, height: 100 };
    }

    if (config.src) {
      this.setSrc(config.src);
    }
  }

  // Getters/setters
  get src(): string | null {
    return this._image?.src || null;
  }

  get fit(): string {
    return this._fit;
  }
  set fit(value: 'contain' | 'cover' | 'fill' | 'none') {
    this._fit = value;
    this.markDirty();
  }

  get opacity(): number {
    return this._opacity;
  }
  set opacity(value: number) {
    this._opacity = Math.max(0, Math.min(1, value));
    this.markDirty();
  }

  get isLoaded(): boolean {
    return this._state === 'loaded';
  }
  get isLoading(): boolean {
    return this._state === 'loading';
  }
  get hasError(): boolean {
    return this._state === 'error';
  }

  /**
   * Set image source
   */
  setSrc(src: string | HTMLImageElement): void {
    if (src instanceof HTMLImageElement) {
      this._image = src;
      if (src.complete) {
        this._state = 'loaded';
        this._onLoad?.();
      } else {
        this._state = 'loading';
        src.onload = () => {
          this._state = 'loaded';
          this.markDirty();
          this._onLoad?.();
        };
        src.onerror = () => {
          this._state = 'error';
          this.markDirty();
          this._onError?.(new Error('Failed to load image'));
        };
      }
    } else {
      // Load from URL
      this._state = 'loading';
      this._image = document.createElement('img');
      this._image!.onload = () => {
        this._state = 'loaded';
        this.markDirty();
        this._onLoad?.();
      };
      this._image!.onerror = () => {
        this._state = 'error';
        this.markDirty();
        this._onError?.(new Error(`Failed to load image: ${src}`));
      };
      this._image!.src = src;
    }
    this.markDirty();
  }

  /**
   * Render image to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();

    ctx.save();
    ctx.globalAlpha = this._opacity;

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

    // Clip for border radius
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.clip();
    }

    if (this._state === 'loaded' && this._image) {
      // Calculate image dimensions based on fit mode
      const imgWidth = this._image.naturalWidth || this._image.width;
      const imgHeight = this._image.naturalHeight || this._image.height;

      let drawX = x;
      let drawY = y;
      let drawWidth = width;
      let drawHeight = height;

      switch (this._fit) {
        case 'contain': {
          const scale = Math.min(width / imgWidth, height / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = x + (width - drawWidth) / 2;
          drawY = y + (height - drawHeight) / 2;
          break;
        }
        case 'cover': {
          const scale = Math.max(width / imgWidth, height / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = x + (width - drawWidth) / 2;
          drawY = y + (height - drawHeight) / 2;
          break;
        }
        case 'none':
          drawWidth = imgWidth;
          drawHeight = imgHeight;
          drawX = x + (width - imgWidth) / 2;
          drawY = y + (height - imgHeight) / 2;
          break;
        // 'fill' uses default dimensions (stretch to fill)
      }

      ctx.drawImage(this._image, drawX, drawY, drawWidth, drawHeight);
    } else if (this._state === 'loading') {
      // Draw placeholder
      ctx.fillStyle = this._placeholderColor;
      ctx.fillRect(x, y, width, height);

      // Loading indicator
      ctx.fillStyle = '#999999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', x + width / 2, y + height / 2);
    } else if (this._state === 'error') {
      // Draw error state
      ctx.fillStyle = '#ffebee';
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = '#c62828';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Error', x + width / 2, y + height / 2);
    }

    ctx.restore();

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
   * Dispose and cleanup
   */
  dispose(): void {
    if (this._image) {
      this._image.onload = null;
      this._image.onerror = null;
      this._image = null;
    }
    super.dispose();
  }
}
