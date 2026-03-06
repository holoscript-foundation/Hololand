/**
 * @hololand/renderer GazeDrivenLOD
 *
 * Selects avatar LOD level based on viewer gaze direction and distance.
 */

export interface GazeLODConfig { fovealAngle: number; maxDistance: number; lodLevels: number; }
const DEFAULT_CONFIG: GazeLODConfig = { fovealAngle: 15, maxDistance: 50, lodLevels: 4 };

export class GazeDrivenLOD {
  private config: GazeLODConfig;

  constructor(config?: Partial<GazeLODConfig>) { this.config = { ...DEFAULT_CONFIG, ...config }; }

  computeLOD(gazeAngleDeg: number, distanceM: number): number {
    const angleFactor = Math.min(1, gazeAngleDeg / (this.config.fovealAngle * 3));
    const distanceFactor = Math.min(1, distanceM / this.config.maxDistance);
    const combined = angleFactor * 0.5 + distanceFactor * 0.5;
    return Math.min(this.config.lodLevels - 1, Math.floor(combined * this.config.lodLevels));
  }
}
