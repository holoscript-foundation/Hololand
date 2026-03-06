/**
 * @hololand/renderer VRSFoveationMap
 *
 * Variable Rate Shading foveation map generator.
 */

export type ShadingRate = '1x1' | '1x2' | '2x1' | '2x2' | '4x4';

export interface FoveationZone { centerX: number; centerY: number; radiusFraction: number; rate: ShadingRate; }

export class VRSFoveationMap {
  private width: number;
  private height: number;
  private zones: FoveationZone[] = [];

  constructor(width: number = 1832, height: number = 1920) {
    this.width = width;
    this.height = height;
  }

  updateGaze(gazeX: number, gazeY: number): void {
    this.zones = [
      { centerX: gazeX, centerY: gazeY, radiusFraction: 0.1, rate: '1x1' },
      { centerX: gazeX, centerY: gazeY, radiusFraction: 0.3, rate: '1x2' },
      { centerX: gazeX, centerY: gazeY, radiusFraction: 0.6, rate: '2x2' },
      { centerX: gazeX, centerY: gazeY, radiusFraction: 1.0, rate: '4x4' },
    ];
  }

  getShadingRate(pixelX: number, pixelY: number): ShadingRate {
    const normX = pixelX / this.width;
    const normY = pixelY / this.height;
    for (const zone of this.zones) {
      const dx = normX - zone.centerX;
      const dy = normY - zone.centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= zone.radiusFraction) return zone.rate;
    }
    return '4x4';
  }

  getZones(): FoveationZone[] { return [...this.zones]; }
  getResolution(): { width: number; height: number } { return { width: this.width, height: this.height }; }
}
