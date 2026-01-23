/**
 * Image Preprocessor
 * 
 * Prepares person crops for embedding extraction.
 */

import type { BoundingBox } from './types';

export interface PreprocessConfig {
  /** Target width */
  targetWidth: number;
  /** Target height */
  targetHeight: number;
  /** Normalization mean (RGB, 0-1) */
  mean: [number, number, number];
  /** Normalization std (RGB, 0-1) */
  std: [number, number, number];
  /** Padding mode */
  padding: 'zero' | 'edge' | 'reflect';
  /** Maintain aspect ratio */
  maintainAspect: boolean;
}

const DEFAULT_PREPROCESS_CONFIG: PreprocessConfig = {
  targetWidth: 128,
  targetHeight: 256,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  padding: 'zero',
  maintainAspect: true,
};

/**
 * Image Preprocessor for ReID models
 */
export class ImagePreprocessor {
  private config: PreprocessConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config?: Partial<PreprocessConfig>) {
    this.config = { ...DEFAULT_PREPROCESS_CONFIG, ...config };
  }

  /**
   * Preprocess image crop for model input
   */
  preprocess(
    source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    boundingBox?: BoundingBox
  ): Float32Array {
    // Ensure canvas exists
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.targetWidth;
      this.canvas.height = this.config.targetHeight;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    }

    // Clear canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.config.targetWidth, this.config.targetHeight);

    // Get source dimensions
    const srcWidth = this.getWidth(source);
    const srcHeight = this.getHeight(source);

    // Calculate crop region
    const crop = boundingBox ?? {
      x: 0,
      y: 0,
      width: srcWidth,
      height: srcHeight,
    };

    // Calculate destination with aspect ratio maintenance
    let dstX = 0;
    let dstY = 0;
    let dstWidth = this.config.targetWidth;
    let dstHeight = this.config.targetHeight;

    if (this.config.maintainAspect) {
      const srcAspect = crop.width / crop.height;
      const dstAspect = this.config.targetWidth / this.config.targetHeight;

      if (srcAspect > dstAspect) {
        // Source is wider - letterbox top/bottom
        dstHeight = Math.round(this.config.targetWidth / srcAspect);
        dstY = Math.round((this.config.targetHeight - dstHeight) / 2);
      } else {
        // Source is taller - pillarbox left/right
        dstWidth = Math.round(this.config.targetHeight * srcAspect);
        dstX = Math.round((this.config.targetWidth - dstWidth) / 2);
      }
    }

    // Draw source to canvas
    if (source instanceof ImageData) {
      // Create temporary canvas for ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = srcWidth;
      tempCanvas.height = srcHeight;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(source, 0, 0);
      
      this.ctx.drawImage(
        tempCanvas,
        crop.x, crop.y, crop.width, crop.height,
        dstX, dstY, dstWidth, dstHeight
      );
    } else {
      this.ctx.drawImage(
        source,
        crop.x, crop.y, crop.width, crop.height,
        dstX, dstY, dstWidth, dstHeight
      );
    }

    // Get pixel data
    const imageData = this.ctx.getImageData(
      0, 0, 
      this.config.targetWidth, 
      this.config.targetHeight
    );

    // Convert to normalized float tensor (NCHW format)
    return this.normalizeToTensor(imageData);
  }

  /**
   * Normalize image data to tensor format
   */
  private normalizeToTensor(imageData: ImageData): Float32Array {
    const { width, height } = imageData;
    const pixels = imageData.data;
    
    // Output: CHW format (3 x H x W)
    const tensor = new Float32Array(3 * height * width);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        
        // Normalize RGB to [0, 1] then apply mean/std
        const r = (pixels[srcIdx] / 255 - this.config.mean[0]) / this.config.std[0];
        const g = (pixels[srcIdx + 1] / 255 - this.config.mean[1]) / this.config.std[1];
        const b = (pixels[srcIdx + 2] / 255 - this.config.mean[2]) / this.config.std[2];
        
        // CHW layout
        const pixelIdx = y * width + x;
        tensor[pixelIdx] = r;                           // R channel
        tensor[height * width + pixelIdx] = g;          // G channel
        tensor[2 * height * width + pixelIdx] = b;      // B channel
      }
    }
    
    return tensor;
  }

  /**
   * Calculate image quality score
   */
  calculateQuality(imageData: ImageData): number {
    const { width, height, data } = imageData;
    
    // Factors that affect quality:
    // 1. Resolution (larger is better, up to a point)
    // 2. Blur (edge strength)
    // 3. Brightness (not too dark or too bright)
    
    // Resolution score
    const area = width * height;
    const resScore = Math.min(1, area / (128 * 256));
    
    // Brightness score
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (width * height);
    const brightnessScore = 1 - Math.abs(avgBrightness - 128) / 128;
    
    // Simple blur detection (variance of Laplacian)
    const blurScore = this.calculateBlurScore(data, width, height);
    
    return (resScore * 0.3 + brightnessScore * 0.3 + blurScore * 0.4);
  }

  /**
   * Calculate blur score using variance of gradients
   */
  private calculateBlurScore(data: Uint8ClampedArray, width: number, height: number): number {
    let gradientSum = 0;
    let count = 0;
    
    // Sample every 4th pixel for efficiency
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4;
        const left = (y * width + x - 1) * 4;
        const right = (y * width + x + 1) * 4;
        const top = ((y - 1) * width + x) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        
        // Gradient magnitude (grayscale)
        const gx = (data[right] - data[left]) / 2;
        const gy = (data[bottom] - data[top]) / 2;
        gradientSum += Math.sqrt(gx * gx + gy * gy);
        count++;
      }
    }
    
    const avgGradient = gradientSum / count;
    // Normalize to [0, 1] - higher gradient = sharper
    return Math.min(1, avgGradient / 50);
  }

  /**
   * Estimate occlusion from bounding box and image
   */
  estimateOcclusion(
    imageData: ImageData,
    boundingBox: BoundingBox,
    sourceWidth: number,
    sourceHeight: number
  ): number {
    let occlusion = 0;
    
    // Check if box is truncated by image bounds
    if (boundingBox.x < 0) occlusion += 0.2;
    if (boundingBox.y < 0) occlusion += 0.2;
    if (boundingBox.x + boundingBox.width > sourceWidth) occlusion += 0.2;
    if (boundingBox.y + boundingBox.height > sourceHeight) occlusion += 0.2;
    
    // Check aspect ratio (very wide or narrow suggests occlusion)
    const aspect = boundingBox.width / boundingBox.height;
    const idealAspect = 0.5; // Typical person aspect ratio
    const aspectDeviation = Math.abs(aspect - idealAspect) / idealAspect;
    occlusion += Math.min(0.3, aspectDeviation * 0.15);
    
    return Math.min(1, occlusion);
  }

  /**
   * Get width from various source types
   */
  private getWidth(source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): number {
    if (source instanceof ImageData) return source.width;
    if (source instanceof HTMLVideoElement) return source.videoWidth;
    if (source instanceof HTMLImageElement) return source.naturalWidth;
    return source.width;
  }

  /**
   * Get height from various source types
   */
  private getHeight(source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): number {
    if (source instanceof ImageData) return source.height;
    if (source instanceof HTMLVideoElement) return source.videoHeight;
    if (source instanceof HTMLImageElement) return source.naturalHeight;
    return source.height;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PreprocessConfig>): void {
    this.config = { ...this.config, ...config };
    // Reset canvas to apply new size
    this.canvas = null;
    this.ctx = null;
  }
}
