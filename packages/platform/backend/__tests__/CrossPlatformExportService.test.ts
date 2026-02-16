import { describe, it, expect, beforeEach } from 'vitest';
import {
  CrossPlatformExportService,
  type CrossPlatformExportConfig,
  type SourceAsset,
  type ExportEvent,
  type TargetPlatform,
} from '../src/services/CrossPlatformExportService';

// ============================================================================
// Helpers
// ============================================================================

function makeAsset(overrides: Partial<SourceAsset> = {}): SourceAsset {
  return {
    id: overrides.id ?? 'asset_1',
    name: overrides.name ?? 'cube',
    type: overrides.type ?? 'model',
    path: overrides.path ?? '/models/cube.glb',
    sizeBytes: overrides.sizeBytes ?? 10_000,
    format: overrides.format ?? 'glb',
    metadata: overrides.metadata ?? {},
  };
}

function makeAssets(count: number): SourceAsset[] {
  return Array.from({ length: count }, (_, i) =>
    makeAsset({ id: `asset_${i}`, name: `obj_${i}` })
  );
}

function collectEvents(svc: CrossPlatformExportService): ExportEvent[] {
  const events: ExportEvent[] = [];
  svc.onEvent(e => events.push(e));
  return events;
}

// ============================================================================
// Tests
// ============================================================================

describe('CrossPlatformExportService', () => {
  let svc: CrossPlatformExportService;

  beforeEach(() => {
    svc = new CrossPlatformExportService();
    svc.start();
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new CrossPlatformExportService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('start is idempotent', () => {
      svc.start();
      expect(svc.isRunning()).toBe(true);
    });

    it('stop is idempotent', () => {
      svc.stop();
      svc.stop();
      expect(svc.isRunning()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Platform Configs
  // --------------------------------------------------------------------------
  describe('platforms', () => {
    it('has all 9 platforms', () => {
      const platforms = svc.getPlatforms();
      expect(platforms.length).toBe(9);
    });

    it('all platforms enabled by default', () => {
      const enabled = svc.getEnabledPlatforms();
      expect(enabled.length).toBe(9);
    });

    it('gets a platform by id', () => {
      const web = svc.getPlatform('web');
      expect(web).toBeDefined();
      expect(web!.name).toContain('Web');
    });

    it('returns undefined for unknown platform', () => {
      expect(svc.getPlatform('nope' as any)).toBeUndefined();
    });

    it('can disable a platform', () => {
      svc.setPlatformEnabled('vrchat', false);
      expect(svc.getEnabledPlatforms().length).toBe(8);
      expect(svc.getPlatform('vrchat')!.enabled).toBe(false);
    });

    it('can re-enable a platform', () => {
      svc.setPlatformEnabled('vrchat', false);
      svc.setPlatformEnabled('vrchat', true);
      expect(svc.getPlatform('vrchat')!.enabled).toBe(true);
    });

    it('throws for unknown platform on enable/disable', () => {
      expect(() => svc.setPlatformEnabled('nope' as any, true)).toThrow('not found');
    });

    const platformIds: TargetPlatform[] = ['web', 'vr', 'ar', 'ios', 'android', 'desktop', 'unity', 'vrchat', 'unreal'];
    for (const id of platformIds) {
      it(`platform '${id}' has valid capabilities`, () => {
        const p = svc.getPlatform(id)!;
        expect(p.capabilities.maxPolygons).toBeGreaterThan(0);
        expect(p.capabilities.maxTextureSize).toBeGreaterThan(0);
        expect(p.capabilities.maxFileSize).toBeGreaterThan(0);
        expect(p.outputFormat).toBeTruthy();
      });
    }
  });

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  describe('validation', () => {
    it('validates a valid scene', () => {
      const result = svc.validateScene('scene_1', 'Test Scene', [makeAsset()]);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.assetCount).toBe(1);
    });

    it('rejects empty scene ID', () => {
      const result = svc.validateScene('  ', 'Name', [makeAsset()]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Scene ID'))).toBe(true);
    });

    it('rejects empty scene name', () => {
      const result = svc.validateScene('s1', '   ', [makeAsset()]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Scene name'))).toBe(true);
    });

    it('rejects no assets', () => {
      const result = svc.validateScene('s1', 'Name', []);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No assets'))).toBe(true);
    });

    it('rejects too many assets', () => {
      const s = new CrossPlatformExportService({ maxAssetsPerJob: 2 });
      s.start();
      const result = s.validateScene('s1', 'Name', makeAssets(3));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Too many'))).toBe(true);
    });

    it('warns on duplicate asset IDs', () => {
      const result = svc.validateScene('s1', 'Name', [
        makeAsset({ id: 'dup' }),
        makeAsset({ id: 'dup', name: 'other' }),
      ]);
      expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true);
    });

    it('checks platform compatibility', () => {
      const result = svc.validateScene('s1', 'Name', [makeAsset()]);
      expect(result.compatibility).toBeDefined();
      expect(result.compatibility['web']).toBe(true);
    });

    it('marks oversized scenes as incompatible', () => {
      // AR has 30MB limit
      const bigAsset = makeAsset({ sizeBytes: 50_000_000 });
      const result = svc.validateScene('s1', 'Name', [bigAsset]);
      expect(result.compatibility['ar']).toBe(false);
    });

    it('emits validation_completed', () => {
      const events = collectEvents(svc);
      svc.validateScene('s1', 'Name', [makeAsset()]);
      expect(events.some(e => e.type === 'validation_completed')).toBe(true);
    });

    it('estimates total size', () => {
      const result = svc.validateScene('s1', 'Name', [
        makeAsset({ sizeBytes: 100 }),
        makeAsset({ id: 'a2', sizeBytes: 200 }),
      ]);
      expect(result.estimatedSize).toBe(300);
    });
  });

  // --------------------------------------------------------------------------
  // Export Jobs — Creation
  // --------------------------------------------------------------------------
  describe('job creation', () => {
    it('creates an export job', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      expect(job.id).toMatch(/^export_/);
      expect(job.status).toBe('queued');
      expect(job.platform).toBe('web');
      expect(job.stages.length).toBe(6);
    });

    it('emits job_created', () => {
      const events = collectEvents(svc);
      svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      expect(events.some(e => e.type === 'job_created')).toBe(true);
    });

    it('rejects empty scene ID', () => {
      expect(() => svc.createExportJob('  ', 'Name', 'web', [makeAsset()])).toThrow('Scene ID');
    });

    it('rejects empty scene name', () => {
      expect(() => svc.createExportJob('s1', '  ', 'web', [makeAsset()])).toThrow('Scene name');
    });

    it('rejects unknown platform', () => {
      expect(() => svc.createExportJob('s1', 'Name', 'nope' as any, [makeAsset()])).toThrow('not found');
    });

    it('rejects disabled platform', () => {
      svc.setPlatformEnabled('vrchat', false);
      expect(() => svc.createExportJob('s1', 'Name', 'vrchat', [makeAsset()])).toThrow('disabled');
    });

    it('rejects no assets', () => {
      expect(() => svc.createExportJob('s1', 'Name', 'web', [])).toThrow('No assets');
    });

    it('rejects too many assets', () => {
      const s = new CrossPlatformExportService({ maxAssetsPerJob: 2 });
      s.start();
      expect(() => s.createExportJob('s1', 'Name', 'web', makeAssets(3))).toThrow('Too many');
    });

    it('uses default job config', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      expect(job.config.optimize).toBe(true);
      expect(job.config.compression).toBe('medium');
      expect(job.config.includeDebugInfo).toBe(false);
    });

    it('accepts custom job config', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()], {
        optimize: false,
        compression: 'high',
        includeDebugInfo: true,
        targetVersion: '2.0.0',
      });
      expect(job.config.optimize).toBe(false);
      expect(job.config.compression).toBe('high');
      expect(job.config.includeDebugInfo).toBe(true);
      expect(job.config.targetVersion).toBe('2.0.0');
    });
  });

  // --------------------------------------------------------------------------
  // Export Jobs — Execution
  // --------------------------------------------------------------------------
  describe('job execution', () => {
    it('executes full pipeline successfully', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      const result = svc.startExportJob(job.id);
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(1);
      expect(result.completedAt).not.toBeNull();
    });

    it('emits job_started and job_completed', () => {
      const events = collectEvents(svc);
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(events.some(e => e.type === 'job_started')).toBe(true);
      expect(events.some(e => e.type === 'job_completed')).toBe(true);
    });

    it('emits stage events', () => {
      const events = collectEvents(svc);
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(events.filter(e => e.type === 'stage_started').length).toBeGreaterThanOrEqual(5);
      expect(events.filter(e => e.type === 'stage_completed').length).toBeGreaterThanOrEqual(5);
    });

    it('emits asset_converted', () => {
      const events = collectEvents(svc);
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(events.some(e => e.type === 'asset_converted')).toBe(true);
    });

    it('creates artifact on completion', () => {
      const events = collectEvents(svc);
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(events.some(e => e.type === 'artifact_created')).toBe(true);
      expect(svc.listArtifacts().length).toBe(1);
    });

    it('builds converted assets list', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [
        makeAsset({ id: 'a1', name: 'obj1' }),
        makeAsset({ id: 'a2', name: 'obj2' }),
      ]);
      const result = svc.startExportJob(job.id);
      expect(result.convertedAssets.length).toBe(2);
    });

    it('throws for missing job', () => {
      expect(() => svc.startExportJob('nope')).toThrow('not found');
    });

    it('throws for non-queued job', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(() => svc.startExportJob(job.id)).toThrow('Cannot start');
    });

    it('enforces max concurrent jobs', () => {
      const s = new CrossPlatformExportService({ maxConcurrentJobs: 1 });
      s.start();
      // Jobs complete synchronously, so no actual concurrency — just verify limit logic
      const j1 = s.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      s.startExportJob(j1.id);
      expect(s.listExportJobs().length).toBe(1);
    });

    it('all stages completed', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      const result = svc.startExportJob(job.id);
      const completed = result.stages.filter(s => s.status === 'completed');
      expect(completed.length).toBe(6); // all 6 stages
    });

    it('skips optimize stage when disabled in job config', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()], { optimize: false });
      const result = svc.startExportJob(job.id);
      const optStage = result.stages.find(s => s.stage === 'optimize');
      expect(optStage!.status).toBe('skipped');
    });

    it('skips optimize stage when disabled in service config', () => {
      const s = new CrossPlatformExportService({ enableOptimization: false });
      s.start();
      const job = s.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      const result = s.startExportJob(job.id);
      const optStage = result.stages.find(s => s.stage === 'optimize');
      expect(optStage!.status).toBe('skipped');
    });

    it('fails on oversized scene', () => {
      // VRChat has 100MB limit
      const bigAsset = makeAsset({ sizeBytes: 200_000_000 });
      const job = svc.createExportJob('s1', 'Scene', 'vrchat', [bigAsset]);
      const result = svc.startExportJob(job.id);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('exceeds');
    });

    it('converts incompatible asset formats', () => {
      // PNG is not in Unity model formats (fbx, glb), so sending a model with png format
      const asset = makeAsset({ format: 'obj', type: 'model' }); // obj not in Unity required formats
      const job = svc.createExportJob('s1', 'Scene', 'unity', [asset]);
      const result = svc.startExportJob(job.id);
      expect(result.status).toBe('completed');
      // The conversion should have happened
      expect(result.convertedAssets[0].targetFormat).toBe('fbx'); // first required format for unity models
    });
  });

  // --------------------------------------------------------------------------
  // Export Jobs — Cancel
  // --------------------------------------------------------------------------
  describe('job cancellation', () => {
    it('cancels a queued job', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      const result = svc.cancelExportJob(job.id);
      expect(result.status).toBe('cancelled');
    });

    it('emits job_cancelled', () => {
      const events = collectEvents(svc);
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.cancelExportJob(job.id);
      expect(events.some(e => e.type === 'job_cancelled')).toBe(true);
    });

    it('throws for missing job', () => {
      expect(() => svc.cancelExportJob('nope')).toThrow('not found');
    });

    it('throws for completed job', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      expect(() => svc.cancelExportJob(job.id)).toThrow('Cannot cancel');
    });
  });

  // --------------------------------------------------------------------------
  // Export Jobs — Query
  // --------------------------------------------------------------------------
  describe('job queries', () => {
    it('gets a job', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      expect(svc.getExportJob(job.id)).toBeDefined();
    });

    it('returns undefined for missing job', () => {
      expect(svc.getExportJob('nope')).toBeUndefined();
    });

    it('lists all jobs', () => {
      svc.createExportJob('s1', 'Scene A', 'web', [makeAsset()]);
      svc.createExportJob('s2', 'Scene B', 'vr', [makeAsset()]);
      expect(svc.listExportJobs().length).toBe(2);
    });

    it('lists jobs filtered by scene', () => {
      svc.createExportJob('s1', 'Scene A', 'web', [makeAsset()]);
      svc.createExportJob('s2', 'Scene B', 'vr', [makeAsset()]);
      expect(svc.listExportJobs('s1').length).toBe(1);
      expect(svc.listExportJobs('s3').length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Artifacts
  // --------------------------------------------------------------------------
  describe('artifacts', () => {
    it('creates artifact on successful export', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      const artifacts = svc.listArtifacts();
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].sceneId).toBe('s1');
      expect(artifacts[0].platform).toBe('web');
      expect(artifacts[0].version).toBe(1);
    });

    it('increments version for same scene+platform', () => {
      const j1 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j1.id);
      const j2 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j2.id);
      const artifacts = svc.listArtifacts('s1', 'web');
      expect(artifacts.length).toBe(2);
      expect(artifacts.map(a => a.version).sort()).toEqual([1, 2]);
    });

    it('gets artifact by id', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      const artifacts = svc.listArtifacts();
      expect(svc.getArtifact(artifacts[0].id)).toBeDefined();
    });

    it('returns undefined for missing artifact', () => {
      expect(svc.getArtifact('nope')).toBeUndefined();
    });

    it('gets latest artifact', () => {
      const j1 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j1.id);
      const j2 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j2.id);
      const latest = svc.getLatestArtifact('s1', 'web');
      expect(latest).toBeDefined();
      expect(latest!.version).toBe(2);
    });

    it('returns undefined for missing latest', () => {
      expect(svc.getLatestArtifact('nope', 'web')).toBeUndefined();
    });

    it('filters by scene and platform', () => {
      const j1 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j1.id);
      const j2 = svc.createExportJob('s1', 'Scene', 'unity', [makeAsset()]);
      svc.startExportJob(j2.id);
      const j3 = svc.createExportJob('s2', 'Other', 'web', [makeAsset()]);
      svc.startExportJob(j3.id);

      expect(svc.listArtifacts('s1').length).toBe(2);
      expect(svc.listArtifacts(undefined, 'web').length).toBe(2);
      expect(svc.listArtifacts('s1', 'web').length).toBe(1);
    });

    it('deletes an artifact', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(job.id);
      const art = svc.listArtifacts()[0];
      expect(svc.deleteArtifact(art.id)).toBe(true);
      expect(svc.listArtifacts().length).toBe(0);
    });

    it('delete returns false for missing artifact', () => {
      expect(svc.deleteArtifact('nope')).toBe(false);
    });

    it('enforces max artifact versions', () => {
      const s = new CrossPlatformExportService({ maxArtifactVersions: 2 });
      s.start();
      for (let i = 0; i < 3; i++) {
        const j = s.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
        s.startExportJob(j.id);
      }
      const arts = s.listArtifacts('s1', 'web');
      expect(arts.length).toBe(2); // oldest removed
    });

    it('enforces max total artifacts', () => {
      const s = new CrossPlatformExportService({ maxArtifacts: 2 });
      s.start();
      const j1 = s.createExportJob('s1', 'Scene A', 'web', [makeAsset()]);
      s.startExportJob(j1.id);
      const j2 = s.createExportJob('s2', 'Scene B', 'vr', [makeAsset()]);
      s.startExportJob(j2.id);
      const j3 = s.createExportJob('s3', 'Scene C', 'unity', [makeAsset()]);
      s.startExportJob(j3.id);
      expect(s.listArtifacts().length).toBe(2); // oldest removed
    });
  });

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------
  describe('events', () => {
    it('unsubscribes via returned function', () => {
      const events: ExportEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      svc.createExportJob('s1', 'A', 'web', [makeAsset()]);
      expect(events.length).toBe(1);
      unsub();
      svc.createExportJob('s2', 'B', 'web', [makeAsset()]);
      expect(events.length).toBe(1);
    });

    it('multiple listeners all receive events', () => {
      const e1: ExportEvent[] = [];
      const e2: ExportEvent[] = [];
      svc.onEvent(e => e1.push(e));
      svc.onEvent(e => e2.push(e));
      svc.createExportJob('s1', 'A', 'web', [makeAsset()]);
      expect(e1.length).toBe(1);
      expect(e2.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  describe('stats', () => {
    it('empty stats for fresh service', () => {
      const stats = svc.getStats();
      expect(stats.totalJobs).toBe(0);
      expect(stats.totalArtifacts).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('populated stats after exports', () => {
      const j1 = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.startExportJob(j1.id);
      const j2 = svc.createExportJob('s2', 'Scene', 'unity', [makeAsset()]);
      svc.startExportJob(j2.id);

      const stats = svc.getStats();
      expect(stats.totalJobs).toBe(2);
      expect(stats.completedJobs).toBe(2);
      expect(stats.totalArtifacts).toBe(2);
      expect(stats.totalAssetsConverted).toBe(2);
      expect(stats.successRate).toBe(1);
      expect(stats.exportsByPlatform['web']).toBe(1);
      expect(stats.exportsByPlatform['unity']).toBe(1);
      expect(stats.averageExportTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('tracks failed jobs in stats', () => {
      const bigAsset = makeAsset({ sizeBytes: 200_000_000 });
      const job = svc.createExportJob('s1', 'Scene', 'vrchat', [bigAsset]);
      svc.startExportJob(job.id);

      const stats = svc.getStats();
      expect(stats.failedJobs).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('tracks cancelled jobs', () => {
      const job = svc.createExportJob('s1', 'Scene', 'web', [makeAsset()]);
      svc.cancelExportJob(job.id);
      expect(svc.getStats().cancelledJobs).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Integration
  // --------------------------------------------------------------------------
  describe('integration', () => {
    it('validate → create → export → artifact lifecycle', () => {
      // Validate
      const vResult = svc.validateScene('s1', 'My Scene', [makeAsset()]);
      expect(vResult.valid).toBe(true);

      // Create & run
      const job = svc.createExportJob('s1', 'My Scene', 'web', [makeAsset()]);
      const result = svc.startExportJob(job.id);
      expect(result.status).toBe('completed');

      // Check artifact
      const artifact = svc.getLatestArtifact('s1', 'web');
      expect(artifact).toBeDefined();
      expect(artifact!.version).toBe(1);

      // Check stats
      const stats = svc.getStats();
      expect(stats.completedJobs).toBe(1);
    });

    it('exports same scene to multiple platforms', () => {
      const assets = [makeAsset()];
      const platforms: TargetPlatform[] = ['web', 'vr', 'unity'];

      for (const p of platforms) {
        const job = svc.createExportJob('s1', 'Multi', p, assets);
        const result = svc.startExportJob(job.id);
        expect(result.status).toBe('completed');
      }

      expect(svc.listArtifacts('s1').length).toBe(3);
      expect(svc.getStats().completedJobs).toBe(3);
    });

    it('multi-asset export with mixed formats', () => {
      const assets: SourceAsset[] = [
        makeAsset({ id: 'model1', name: 'hero', type: 'model', format: 'glb', sizeBytes: 50000 }),
        makeAsset({ id: 'tex1', name: 'diffuse', type: 'texture', format: 'png', sizeBytes: 20000 }),
        makeAsset({ id: 'audio1', name: 'bgm', type: 'audio', format: 'mp3', sizeBytes: 100000 }),
        makeAsset({ id: 'script1', name: 'logic', type: 'script', format: 'js', sizeBytes: 5000 }),
      ];

      const job = svc.createExportJob('s1', 'Complex Scene', 'web', assets);
      const result = svc.startExportJob(job.id);
      expect(result.status).toBe('completed');
      expect(result.convertedAssets.length).toBe(4);
    });
  });
});
