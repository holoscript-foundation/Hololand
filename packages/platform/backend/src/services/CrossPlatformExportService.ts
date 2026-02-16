/**
 * @hololand/backend — CrossPlatformExportService
 *
 * Exports HoloScript scenes to multiple target platforms with
 * asset conversion, build pipelines, and artifact management.
 *
 * Features:
 *   - Export job management — queue, execute, track, cancel
 *   - 9 target platforms — Web, VR, AR, iOS, Android, Desktop, Unity, VRChat, Unreal
 *   - Build pipeline — stages (validate, convert, optimize, package), progress
 *   - Asset conversion — models, textures, audio, scripts
 *   - Artifact management — versioned build outputs
 *   - Platform configs — per-platform settings, capabilities, limits
 *   - Format validation — check source before export
 *   - Stats & analytics — export metrics, success rates
 */

// ============================================================================
// Types
// ============================================================================

export type TargetPlatform =
  | 'web'
  | 'vr'
  | 'ar'
  | 'ios'
  | 'android'
  | 'desktop'
  | 'unity'
  | 'vrchat'
  | 'unreal';

export type ExportStatus =
  | 'queued'
  | 'validating'
  | 'converting'
  | 'optimizing'
  | 'packaging'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BuildStage =
  | 'validate'
  | 'convert_assets'
  | 'convert_scripts'
  | 'optimize'
  | 'package'
  | 'finalize';

export type AssetType =
  | 'model'
  | 'texture'
  | 'audio'
  | 'script'
  | 'shader'
  | 'animation'
  | 'material'
  | 'scene';

export type ArtifactFormat =
  | 'zip'
  | 'tar.gz'
  | 'unitypackage'
  | 'apk'
  | 'ipa'
  | 'exe'
  | 'wasm'
  | 'vrca';

export interface PlatformCapabilities {
  maxPolygons: number;
  maxTextureSize: number;     // pixels (e.g. 4096)
  maxFileSize: number;        // bytes
  supportsPhysics: boolean;
  supportsNetworking: boolean;
  supportsVR: boolean;
  supportsAR: boolean;
  maxLights: number;
  shaderModel: string;
}

export interface PlatformConfig {
  id: TargetPlatform;
  name: string;
  description: string;
  outputFormat: ArtifactFormat;
  capabilities: PlatformCapabilities;
  requiredAssetFormats: Record<AssetType, string[]>; // e.g. model → ['glb','gltf']
  enabled: boolean;
}

export interface SourceAsset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  sizeBytes: number;
  format: string;           // e.g. 'glb', 'png', 'mp3'
  metadata: Record<string, unknown>;
}

export interface ConvertedAsset {
  sourceId: string;
  targetFormat: string;
  outputPath: string;
  sizeBytes: number;
  conversionTimeMs: number;
  warnings: string[];
}

export interface BuildStageResult {
  stage: BuildStage;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export interface ExportJob {
  id: string;
  sceneId: string;
  sceneName: string;
  platform: TargetPlatform;
  status: ExportStatus;
  progress: number;          // 0-1
  stages: BuildStageResult[];
  assets: SourceAsset[];
  convertedAssets: ConvertedAsset[];
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  config: ExportJobConfig;
}

export interface ExportJobConfig {
  optimize: boolean;
  compression: 'none' | 'low' | 'medium' | 'high';
  includeDebugInfo: boolean;
  targetVersion: string;     // engine version
  customSettings: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  jobId: string;
  sceneId: string;
  platform: TargetPlatform;
  format: ArtifactFormat;
  version: number;
  sizeBytes: number;
  checksum: string;
  outputPath: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  assetCount: number;
  estimatedSize: number;
  compatibility: Record<TargetPlatform, boolean>;
}

export interface ExportStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalArtifacts: number;
  totalAssetsConverted: number;
  averageExportTimeMs: number;
  exportsByPlatform: Record<string, number>;
  successRate: number;       // 0-1
}

export type ExportEventType =
  | 'job_created'
  | 'job_started'
  | 'stage_started'
  | 'stage_completed'
  | 'stage_failed'
  | 'asset_converted'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'artifact_created'
  | 'validation_completed';

export interface ExportEvent {
  type: ExportEventType;
  jobId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CrossPlatformExportConfig {
  /** Max concurrent export jobs. Default: 3. */
  maxConcurrentJobs?: number;
  /** Max assets per job. Default: 500. */
  maxAssetsPerJob?: number;
  /** Max artifact versions to keep. Default: 10. */
  maxArtifactVersions?: number;
  /** Max total artifacts. Default: 100. */
  maxArtifacts?: number;
  /** Enable optimization stage. Default: true. */
  enableOptimization?: boolean;
}

const DEFAULT_CONFIG: Required<CrossPlatformExportConfig> = {
  maxConcurrentJobs: 3,
  maxAssetsPerJob: 500,
  maxArtifactVersions: 10,
  maxArtifacts: 100,
  enableOptimization: true,
};

// ============================================================================
// Default Platform Configurations
// ============================================================================

function defaultPlatformConfigs(): Map<TargetPlatform, PlatformConfig> {
  const configs: PlatformConfig[] = [
    {
      id: 'web',
      name: 'Web (Three.js)',
      description: 'Browser-based WebGL/WebXR export',
      outputFormat: 'zip',
      capabilities: { maxPolygons: 500000, maxTextureSize: 4096, maxFileSize: 50_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: true, maxLights: 16, shaderModel: 'webgl2' },
      requiredAssetFormats: { model: ['glb', 'gltf'], texture: ['webp', 'png', 'jpg'], audio: ['mp3', 'ogg'], script: ['js'], shader: ['glsl'], animation: ['glb'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'vr',
      name: 'VR (WebXR)',
      description: 'WebXR VR headset export',
      outputFormat: 'zip',
      capabilities: { maxPolygons: 300000, maxTextureSize: 2048, maxFileSize: 100_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: false, maxLights: 8, shaderModel: 'webgl2' },
      requiredAssetFormats: { model: ['glb'], texture: ['webp', 'png'], audio: ['mp3', 'ogg'], script: ['js'], shader: ['glsl'], animation: ['glb'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'ar',
      name: 'AR (WebXR)',
      description: 'WebXR AR overlay export',
      outputFormat: 'zip',
      capabilities: { maxPolygons: 200000, maxTextureSize: 2048, maxFileSize: 30_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: false, supportsAR: true, maxLights: 4, shaderModel: 'webgl2' },
      requiredAssetFormats: { model: ['glb'], texture: ['webp', 'png'], audio: ['mp3'], script: ['js'], shader: ['glsl'], animation: ['glb'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'ios',
      name: 'iOS',
      description: 'iOS native app export',
      outputFormat: 'ipa',
      capabilities: { maxPolygons: 400000, maxTextureSize: 4096, maxFileSize: 200_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: false, supportsAR: true, maxLights: 8, shaderModel: 'metal' },
      requiredAssetFormats: { model: ['usdz', 'glb'], texture: ['png', 'jpg'], audio: ['aac', 'mp3'], script: ['swift'], shader: ['metal'], animation: ['usdz'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'android',
      name: 'Android',
      description: 'Android native app export',
      outputFormat: 'apk',
      capabilities: { maxPolygons: 300000, maxTextureSize: 2048, maxFileSize: 150_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: true, maxLights: 8, shaderModel: 'gles3' },
      requiredAssetFormats: { model: ['glb'], texture: ['webp', 'png'], audio: ['ogg', 'mp3'], script: ['kt'], shader: ['glsl'], animation: ['glb'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'desktop',
      name: 'Desktop (Electron)',
      description: 'Desktop application export',
      outputFormat: 'exe',
      capabilities: { maxPolygons: 1000000, maxTextureSize: 8192, maxFileSize: 500_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: false, maxLights: 32, shaderModel: 'webgl2' },
      requiredAssetFormats: { model: ['glb', 'gltf'], texture: ['png', 'jpg', 'webp'], audio: ['mp3', 'ogg', 'wav'], script: ['js'], shader: ['glsl'], animation: ['glb'], material: ['json'], scene: ['json'] },
      enabled: true,
    },
    {
      id: 'unity',
      name: 'Unity',
      description: 'Unity game engine export',
      outputFormat: 'unitypackage',
      capabilities: { maxPolygons: 2000000, maxTextureSize: 8192, maxFileSize: 1_000_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: true, maxLights: 64, shaderModel: 'sm5' },
      requiredAssetFormats: { model: ['fbx', 'glb'], texture: ['png', 'tga'], audio: ['wav', 'ogg'], script: ['cs'], shader: ['hlsl'], animation: ['fbx'], material: ['mat'], scene: ['unity'] },
      enabled: true,
    },
    {
      id: 'vrchat',
      name: 'VRChat',
      description: 'VRChat world/avatar export',
      outputFormat: 'vrca',
      capabilities: { maxPolygons: 70000, maxTextureSize: 2048, maxFileSize: 100_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: false, maxLights: 4, shaderModel: 'sm4' },
      requiredAssetFormats: { model: ['fbx'], texture: ['png', 'jpg'], audio: ['ogg', 'wav'], script: ['cs'], shader: ['hlsl'], animation: ['fbx'], material: ['mat'], scene: ['unity'] },
      enabled: true,
    },
    {
      id: 'unreal',
      name: 'Unreal Engine',
      description: 'Unreal Engine export',
      outputFormat: 'zip',
      capabilities: { maxPolygons: 5000000, maxTextureSize: 8192, maxFileSize: 2_000_000_000, supportsPhysics: true, supportsNetworking: true, supportsVR: true, supportsAR: true, maxLights: 128, shaderModel: 'sm6' },
      requiredAssetFormats: { model: ['fbx', 'usd'], texture: ['png', 'exr', 'tga'], audio: ['wav'], script: ['cpp'], shader: ['hlsl'], animation: ['fbx'], material: ['uasset'], scene: ['umap'] },
      enabled: true,
    },
  ];

  const map = new Map<TargetPlatform, PlatformConfig>();
  for (const c of configs) map.set(c.id, c);
  return map;
}

// ============================================================================
// CrossPlatformExportService
// ============================================================================

export class CrossPlatformExportService {
  private config: Required<CrossPlatformExportConfig>;
  private running = false;
  private listeners: Set<(event: ExportEvent) => void> = new Set();

  private platforms: Map<TargetPlatform, PlatformConfig>;
  private jobs: Map<string, ExportJob> = new Map();
  private artifacts: Map<string, Artifact> = new Map();
  private nextId = 1;

  constructor(config: CrossPlatformExportConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.platforms = defaultPlatformConfigs();
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: ExportEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: ExportEvent): void {
    for (const cb of this.listeners) cb(event);
  }

  private genId(prefix: string): string {
    return `${prefix}_${this.nextId++}`;
  }

  // --------------------------------------------------------------------------
  // Platform Configs
  // --------------------------------------------------------------------------

  getPlatforms(): PlatformConfig[] {
    return Array.from(this.platforms.values()).map(p => ({ ...p }));
  }

  getPlatform(id: TargetPlatform): PlatformConfig | undefined {
    const p = this.platforms.get(id);
    return p ? { ...p } : undefined;
  }

  getEnabledPlatforms(): PlatformConfig[] {
    return this.getPlatforms().filter(p => p.enabled);
  }

  setPlatformEnabled(id: TargetPlatform, enabled: boolean): void {
    const p = this.platforms.get(id);
    if (!p) throw new Error(`Platform '${id}' not found`);
    p.enabled = enabled;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateScene(sceneId: string, sceneName: string, assets: SourceAsset[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sceneId.trim()) errors.push('Scene ID required');
    if (!sceneName.trim()) errors.push('Scene name required');
    if (assets.length === 0) errors.push('No assets provided');
    if (assets.length > this.config.maxAssetsPerJob) {
      errors.push(`Too many assets (${assets.length} > ${this.config.maxAssetsPerJob})`);
    }

    // Check for duplicate asset IDs
    const ids = new Set<string>();
    for (const a of assets) {
      if (ids.has(a.id)) warnings.push(`Duplicate asset ID: ${a.id}`);
      ids.add(a.id);
    }

    // Check platform compatibility
    const compatibility: Record<TargetPlatform, boolean> = {} as any;
    const totalSize = assets.reduce((s, a) => s + a.sizeBytes, 0);

    for (const [id, platform] of this.platforms) {
      if (!platform.enabled) {
        compatibility[id] = false;
        continue;
      }

      let compatible = true;

      // Check size
      if (totalSize > platform.capabilities.maxFileSize) {
        compatible = false;
      }

      // Check asset format support
      for (const asset of assets) {
        const supported = platform.requiredAssetFormats[asset.type];
        if (supported && !supported.includes(asset.format)) {
          warnings.push(`Asset '${asset.name}' format '${asset.format}' may need conversion for ${id}`);
        }
      }

      compatibility[id] = compatible;
    }

    this.emit({
      type: 'validation_completed',
      jobId: '',
      timestamp: Date.now(),
      data: { sceneId, valid: errors.length === 0, errorCount: errors.length, warningCount: warnings.length },
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      assetCount: assets.length,
      estimatedSize: totalSize,
      compatibility,
    };
  }

  // --------------------------------------------------------------------------
  // Export Jobs
  // --------------------------------------------------------------------------

  createExportJob(
    sceneId: string,
    sceneName: string,
    platform: TargetPlatform,
    assets: SourceAsset[],
    jobConfig?: Partial<ExportJobConfig>,
  ): ExportJob {
    if (!sceneId.trim()) throw new Error('Scene ID required');
    if (!sceneName.trim()) throw new Error('Scene name required');

    const platformCfg = this.platforms.get(platform);
    if (!platformCfg) throw new Error(`Platform '${platform}' not found`);
    if (!platformCfg.enabled) throw new Error(`Platform '${platform}' is disabled`);

    if (assets.length === 0) throw new Error('No assets provided');
    if (assets.length > this.config.maxAssetsPerJob) {
      throw new Error(`Too many assets (max ${this.config.maxAssetsPerJob})`);
    }

    const stages: BuildStageResult[] = [
      { stage: 'validate', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
      { stage: 'convert_assets', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
      { stage: 'convert_scripts', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
      { stage: 'optimize', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
      { stage: 'package', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
      { stage: 'finalize', status: 'pending', startedAt: null, completedAt: null, durationMs: 0, errors: [], warnings: [], details: {} },
    ];

    const config: ExportJobConfig = {
      optimize: jobConfig?.optimize ?? true,
      compression: jobConfig?.compression ?? 'medium',
      includeDebugInfo: jobConfig?.includeDebugInfo ?? false,
      targetVersion: jobConfig?.targetVersion ?? '1.0.0',
      customSettings: jobConfig?.customSettings ?? {},
    };

    const job: ExportJob = {
      id: this.genId('export'),
      sceneId,
      sceneName,
      platform,
      status: 'queued',
      progress: 0,
      stages,
      assets: assets.map(a => ({ ...a })),
      convertedAssets: [],
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      config,
    };

    this.jobs.set(job.id, job);

    this.emit({
      type: 'job_created',
      jobId: job.id,
      timestamp: Date.now(),
      data: { sceneId, sceneName, platform, assetCount: assets.length },
    });

    return { ...job, stages: job.stages.map(s => ({ ...s })), assets: job.assets.map(a => ({ ...a })) };
  }

  startExportJob(jobId: string): ExportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== 'queued') throw new Error(`Cannot start job in '${job.status}' state`);

    // Check concurrent limit
    const active = Array.from(this.jobs.values())
      .filter(j => j.status === 'validating' || j.status === 'converting' || j.status === 'optimizing' || j.status === 'packaging').length;
    if (active >= this.config.maxConcurrentJobs) {
      throw new Error(`Maximum concurrent jobs reached (${this.config.maxConcurrentJobs})`);
    }

    job.startedAt = Date.now();

    this.emit({
      type: 'job_started',
      jobId: job.id,
      timestamp: Date.now(),
      data: { platform: job.platform },
    });

    // Execute pipeline synchronously
    this.executePipeline(job);

    return { ...job, stages: job.stages.map(s => ({ ...s })), convertedAssets: job.convertedAssets.map(a => ({ ...a })) };
  }

  private executePipeline(job: ExportJob): void {
    const platformCfg = this.platforms.get(job.platform)!;

    try {
      // Stage 1: Validate
      this.executeStage(job, 0, 'validating', () => {
        // Check assets against platform limits
        const totalSize = job.assets.reduce((s, a) => s + a.sizeBytes, 0);
        if (totalSize > platformCfg.capabilities.maxFileSize) {
          throw new Error(`Total size exceeds platform limit`);
        }
        return { assetsValidated: job.assets.length, totalSize };
      });

      // Stage 2: Convert Assets
      this.executeStage(job, 1, 'converting', () => {
        const converted: ConvertedAsset[] = [];
        for (const asset of job.assets) {
          const supported = platformCfg.requiredAssetFormats[asset.type];
          const needsConversion = supported && !supported.includes(asset.format);

          const targetFormat = needsConversion ? supported[0] : asset.format;
          converted.push({
            sourceId: asset.id,
            targetFormat,
            outputPath: `build/${job.platform}/${asset.name}.${targetFormat}`,
            sizeBytes: needsConversion ? Math.floor(asset.sizeBytes * 0.9) : asset.sizeBytes,
            conversionTimeMs: needsConversion ? 100 : 10,
            warnings: needsConversion ? [`Converted ${asset.format} → ${targetFormat}`] : [],
          });

          this.emit({
            type: 'asset_converted',
            jobId: job.id,
            timestamp: Date.now(),
            data: { assetId: asset.id, sourceFormat: asset.format, targetFormat, needsConversion },
          });
        }
        job.convertedAssets = converted;
        return { convertedCount: converted.length };
      });

      // Stage 3: Convert Scripts
      this.executeStage(job, 2, 'converting', () => {
        const scriptAssets = job.assets.filter(a => a.type === 'script');
        return { scriptsConverted: scriptAssets.length };
      });

      // Stage 4: Optimize (skip if disabled)
      if (this.config.enableOptimization && job.config.optimize) {
        this.executeStage(job, 3, 'optimizing', () => {
          // Simulate optimization: reduce sizes
          for (const ca of job.convertedAssets) {
            if (job.config.compression !== 'none') {
              const ratio = job.config.compression === 'high' ? 0.5 : job.config.compression === 'medium' ? 0.7 : 0.9;
              ca.sizeBytes = Math.floor(ca.sizeBytes * ratio);
            }
          }
          return { compression: job.config.compression, optimized: true };
        });
      } else {
        job.stages[3].status = 'skipped';
      }

      // Stage 5: Package
      this.executeStage(job, 4, 'packaging', () => {
        const totalSize = job.convertedAssets.reduce((s, a) => s + a.sizeBytes, 0);
        return { packageSize: totalSize, format: platformCfg.outputFormat };
      });

      // Stage 6: Finalize
      this.executeStage(job, 5, 'packaging', () => {
        // Create artifact
        const totalSize = job.convertedAssets.reduce((s, a) => s + a.sizeBytes, 0);
        const artifact = this.createArtifact(job, platformCfg, totalSize);
        return { artifactId: artifact.id, artifactSize: artifact.sizeBytes };
      });

      job.status = 'completed';
      job.progress = 1;
      job.completedAt = Date.now();

      this.emit({
        type: 'job_completed',
        jobId: job.id,
        timestamp: Date.now(),
        data: { durationMs: job.completedAt - job.startedAt!, platform: job.platform },
      });
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message ?? 'Unknown error';
      job.completedAt = Date.now();

      this.emit({
        type: 'job_failed',
        jobId: job.id,
        timestamp: Date.now(),
        data: { error: job.error, platform: job.platform },
      });
    }
  }

  private executeStage(
    job: ExportJob,
    stageIndex: number,
    jobStatus: ExportStatus,
    execute: () => Record<string, unknown>,
  ): void {
    const stage = job.stages[stageIndex];
    stage.status = 'running';
    stage.startedAt = Date.now();
    job.status = jobStatus;

    this.emit({
      type: 'stage_started',
      jobId: job.id,
      timestamp: Date.now(),
      data: { stage: stage.stage, index: stageIndex },
    });

    try {
      const details = execute();
      stage.status = 'completed';
      stage.completedAt = Date.now();
      stage.durationMs = stage.completedAt - stage.startedAt;
      stage.details = details;

      // Update progress: each stage is 1/6
      const completedStages = job.stages.filter(s => s.status === 'completed' || s.status === 'skipped').length;
      job.progress = completedStages / job.stages.length;

      this.emit({
        type: 'stage_completed',
        jobId: job.id,
        timestamp: Date.now(),
        data: { stage: stage.stage, durationMs: stage.durationMs, details },
      });
    } catch (err: any) {
      stage.status = 'failed';
      stage.completedAt = Date.now();
      stage.durationMs = stage.completedAt - stage.startedAt;
      stage.errors.push(err.message);

      this.emit({
        type: 'stage_failed',
        jobId: job.id,
        timestamp: Date.now(),
        data: { stage: stage.stage, error: err.message },
      });

      throw err; // propagate to pipeline
    }
  }

  private createArtifact(job: ExportJob, platform: PlatformConfig, sizeBytes: number): Artifact {
    // Find max version for this scene+platform
    let maxVersion = 0;
    for (const a of this.artifacts.values()) {
      if (a.sceneId === job.sceneId && a.platform === job.platform) {
        if (a.version > maxVersion) maxVersion = a.version;
      }
    }

    // Enforce max artifact versions
    if (maxVersion >= this.config.maxArtifactVersions) {
      // Remove oldest version
      let oldest: Artifact | null = null;
      for (const a of this.artifacts.values()) {
        if (a.sceneId === job.sceneId && a.platform === job.platform) {
          if (!oldest || a.version < oldest.version) oldest = a;
        }
      }
      if (oldest) this.artifacts.delete(oldest.id);
    }

    // Enforce max total artifacts
    if (this.artifacts.size >= this.config.maxArtifacts) {
      // Remove oldest artifact overall
      let oldest: Artifact | null = null;
      for (const a of this.artifacts.values()) {
        if (!oldest || a.createdAt < oldest.createdAt) oldest = a;
      }
      if (oldest) this.artifacts.delete(oldest.id);
    }

    const artifact: Artifact = {
      id: this.genId('artifact'),
      jobId: job.id,
      sceneId: job.sceneId,
      platform: job.platform,
      format: platform.outputFormat,
      version: maxVersion + 1,
      sizeBytes,
      checksum: `sha256_${Date.now().toString(36)}`,
      outputPath: `artifacts/${job.platform}/${job.sceneId}_v${maxVersion + 1}.${platform.outputFormat}`,
      createdAt: Date.now(),
      metadata: { sceneName: job.sceneName, compression: job.config.compression },
    };

    this.artifacts.set(artifact.id, artifact);

    this.emit({
      type: 'artifact_created',
      jobId: job.id,
      timestamp: Date.now(),
      data: { artifactId: artifact.id, version: artifact.version, platform: job.platform },
    });

    return artifact;
  }

  cancelExportJob(jobId: string): ExportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== 'queued') {
      throw new Error(`Cannot cancel job in '${job.status}' state`);
    }

    job.status = 'cancelled';
    job.completedAt = Date.now();

    this.emit({
      type: 'job_cancelled',
      jobId: job.id,
      timestamp: Date.now(),
      data: {},
    });

    return { ...job, stages: job.stages.map(s => ({ ...s })) };
  }

  getExportJob(jobId: string): ExportJob | undefined {
    const j = this.jobs.get(jobId);
    if (!j) return undefined;
    return { ...j, stages: j.stages.map(s => ({ ...s })), assets: j.assets.map(a => ({ ...a })), convertedAssets: j.convertedAssets.map(a => ({ ...a })) };
  }

  listExportJobs(sceneId?: string): ExportJob[] {
    let results = Array.from(this.jobs.values());
    if (sceneId) results = results.filter(j => j.sceneId === sceneId);
    return results.map(j => ({
      ...j,
      stages: j.stages.map(s => ({ ...s })),
      assets: j.assets.map(a => ({ ...a })),
      convertedAssets: j.convertedAssets.map(a => ({ ...a })),
    }));
  }

  // --------------------------------------------------------------------------
  // Artifacts
  // --------------------------------------------------------------------------

  getArtifact(artifactId: string): Artifact | undefined {
    const a = this.artifacts.get(artifactId);
    return a ? { ...a } : undefined;
  }

  listArtifacts(sceneId?: string, platform?: TargetPlatform): Artifact[] {
    let results = Array.from(this.artifacts.values());
    if (sceneId) results = results.filter(a => a.sceneId === sceneId);
    if (platform) results = results.filter(a => a.platform === platform);
    return results.map(a => ({ ...a }));
  }

  getLatestArtifact(sceneId: string, platform: TargetPlatform): Artifact | undefined {
    const matching = Array.from(this.artifacts.values())
      .filter(a => a.sceneId === sceneId && a.platform === platform)
      .sort((a, b) => b.version - a.version);
    return matching.length > 0 ? { ...matching[0] } : undefined;
  }

  deleteArtifact(artifactId: string): boolean {
    return this.artifacts.delete(artifactId);
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): ExportStats {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter(j => j.status === 'completed');
    const failed = jobs.filter(j => j.status === 'failed');

    const totalExportTime = completed.reduce((s, j) => {
      return s + (j.completedAt! - j.startedAt!);
    }, 0);

    const exportsByPlatform: Record<string, number> = {};
    for (const j of jobs) {
      exportsByPlatform[j.platform] = (exportsByPlatform[j.platform] ?? 0) + 1;
    }

    const totalFinished = completed.length + failed.length;

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j =>
        j.status === 'validating' || j.status === 'converting' ||
        j.status === 'optimizing' || j.status === 'packaging'
      ).length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
      totalArtifacts: this.artifacts.size,
      totalAssetsConverted: completed.reduce((s, j) => s + j.convertedAssets.length, 0),
      averageExportTimeMs: completed.length > 0 ? totalExportTime / completed.length : 0,
      exportsByPlatform,
      successRate: totalFinished > 0 ? completed.length / totalFinished : 0,
    };
  }
}
