/**
 * @hololand/renderer CompressedGaussianAvatar
 *
 * SqueezeMe compressed Gaussian avatar with gaze-driven LOD.
 */

export interface AvatarConfig { avatarId: string; baseSplatCount: number; compressionRatio: number; lodLevels: number; }

export interface LODState { level: number; activeSplatCount: number; compressionApplied: number; }

export class CompressedGaussianAvatar {
  readonly avatarId: string;
  private baseSplatCount: number;
  private compressionRatio: number;
  private lodLevels: number;
  private currentLOD: number = 0;

  constructor(config: AvatarConfig) {
    this.avatarId = config.avatarId;
    this.baseSplatCount = config.baseSplatCount;
    this.compressionRatio = config.compressionRatio;
    this.lodLevels = config.lodLevels;
  }

  setLOD(level: number): LODState {
    this.currentLOD = Math.max(0, Math.min(this.lodLevels - 1, level));
    const reductionFactor = 1 / (2 ** this.currentLOD);
    const activeSplats = Math.ceil(this.baseSplatCount * reductionFactor * this.compressionRatio);
    return { level: this.currentLOD, activeSplatCount: activeSplats, compressionApplied: this.compressionRatio };
  }

  getCurrentLOD(): number { return this.currentLOD; }
  getActiveSplatCount(): number { return Math.ceil(this.baseSplatCount * (1 / (2 ** this.currentLOD)) * this.compressionRatio); }
  getMemoryBytes(): number { return this.getActiveSplatCount() * 64; }
}
