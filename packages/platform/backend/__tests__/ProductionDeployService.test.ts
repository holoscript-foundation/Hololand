/**
 * ProductionDeployService — Tests
 *
 * Container management, CI/CD pipelines, migrations,
 * health monitoring, alerts, scaling, environment promotion,
 * domain/SSL management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProductionDeployService,
  type DeployEvent,
  type Environment,
} from '../src/services/ProductionDeployService';

// ─── Helpers ──────────────────────────────────────────────────────
function setup(config = {}) {
  const svc = new ProductionDeployService(config);
  svc.start();
  return svc;
}

function registerDev(svc: ProductionDeployService, overrides: Record<string, unknown> = {}) {
  return svc.registerContainer({
    name: 'hololand-api',
    image: 'hololand/api',
    tag: 'v1.0.0',
    environment: 'development' as Environment,
    port: 3000,
    ...overrides,
  } as any);
}

function createTestPipeline(svc: ProductionDeployService, overrides: Record<string, unknown> = {}) {
  return svc.createPipeline({
    name: 'deploy-api',
    branch: 'main',
    commitHash: 'abc123',
    environment: 'development' as Environment,
    stages: ['build', 'test', 'deploy'],
    triggeredBy: 'ci-bot',
    ...overrides,
  } as any);
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('ProductionDeployService', () => {
  let svc: ProductionDeployService;

  beforeEach(() => {
    svc = setup();
  });

  // ─── Lifecycle ──────────────────────────────────────────────────
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new ProductionDeployService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('throws when not started', () => {
      const s = new ProductionDeployService();
      expect(() => registerDev(s)).toThrow('not started');
    });

    it('emits events with unsubscribe', () => {
      const events: DeployEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      registerDev(svc);
      expect(events.length).toBeGreaterThan(0);
      const count = events.length;
      unsub();
      registerDev(svc, { name: 'another' });
      expect(events.length).toBe(count);
    });

    it('swallows listener errors', () => {
      svc.onEvent(() => { throw new Error('boom'); });
      expect(() => registerDev(svc)).not.toThrow();
    });
  });

  // ─── Container Management ──────────────────────────────────────
  describe('containers', () => {
    it('registers a container', () => {
      const c = registerDev(svc);
      expect(c.id).toMatch(/^ctr_/);
      expect(c.name).toBe('hololand-api');
      expect(c.status).toBe('pending');
      expect(c.healthStatus).toBe('unknown');
      expect(c.environment).toBe('development');
    });

    it('rejects empty name', () => {
      expect(() => registerDev(svc, { name: '' })).toThrow('name');
    });

    it('rejects empty image', () => {
      expect(() => registerDev(svc, { image: '' })).toThrow('image');
    });

    it('enforces max containers', () => {
      const s = setup({ maxContainers: 2 });
      registerDev(s, { name: 'a' });
      registerDev(s, { name: 'b' });
      expect(() => registerDev(s, { name: 'c' })).toThrow('Maximum containers');
    });

    it('gets container by id', () => {
      const c = registerDev(svc);
      expect(svc.getContainer(c.id)?.name).toBe('hololand-api');
      expect(svc.getContainer('nope')).toBeUndefined();
    });

    it('starts a container', () => {
      const c = registerDev(svc);
      const started = svc.startContainer(c.id);
      expect(started.status).toBe('running');
      expect(started.replicas).toBe(1);
      expect(started.deployedAt).not.toBeNull();
    });

    it('cannot start already running', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      expect(() => svc.startContainer(c.id)).toThrow('already running');
    });

    it('stops a container', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      const stopped = svc.stopContainer(c.id);
      expect(stopped.status).toBe('stopped');
      expect(stopped.replicas).toBe(0);
    });

    it('cannot stop already stopped', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      svc.stopContainer(c.id);
      expect(() => svc.stopContainer(c.id)).toThrow('already stopped');
    });

    it('removes a stopped container', () => {
      const c = registerDev(svc);
      expect(svc.removeContainer(c.id)).toBe(true);
      expect(svc.getContainer(c.id)).toBeUndefined();
    });

    it('cannot remove running container', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      expect(() => svc.removeContainer(c.id)).toThrow('Stop container');
    });

    it('returns false for nonexistent remove', () => {
      expect(svc.removeContainer('nope')).toBe(false);
    });

    it('filters containers by environment', () => {
      registerDev(svc, { name: 'dev-1' });
      registerDev(svc, { name: 'staging-1', environment: 'staging' });
      expect(svc.getContainersByEnv('development')).toHaveLength(1);
      expect(svc.getContainersByEnv('staging')).toHaveLength(1);
      expect(svc.getContainersByEnv('production')).toHaveLength(0);
    });

    it('sets default tag to latest', () => {
      const c = svc.registerContainer({
        name: 'test', image: 'img', environment: 'development',
      });
      expect(c.tag).toBe('latest');
    });
  });

  // ─── Crash & Auto-restart ─────────────────────────────────────
  describe('crash handling', () => {
    it('auto-restarts on crash', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      const restarted = svc.crashContainer(c.id, 'OOM');
      expect(restarted.status).toBe('running');
      expect(restarted.restartCount).toBe(1);
    });

    it('marks failed after max restarts', () => {
      const s = setup({ maxRestarts: 2 });
      const c = registerDev(s);
      s.startContainer(c.id);
      s.crashContainer(c.id, 'crash 1'); // restart 1
      s.crashContainer(c.id, 'crash 2'); // restart 2
      const failed = s.crashContainer(c.id, 'crash 3'); // exceeds max
      expect(failed.status).toBe('failed');
      expect(failed.replicas).toBe(0);
    });

    it('fires alert on final crash', () => {
      const s = setup({ maxRestarts: 1 });
      const c = registerDev(s);
      s.startContainer(c.id);
      s.crashContainer(c.id, 'crash 1'); // restart 1
      s.crashContainer(c.id, 'crash 2'); // exceeds max
      const alerts = s.getActiveAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('does not auto-restart when disabled', () => {
      const s = setup({ autoRestart: false });
      const c = registerDev(s);
      s.startContainer(c.id);
      const crashed = s.crashContainer(c.id, 'OOM');
      expect(crashed.status).toBe('crashed');
    });

    it('emits restart event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const c = registerDev(svc);
      svc.startContainer(c.id);
      svc.crashContainer(c.id, 'OOM');
      expect(events.some(e => e.type === 'container_restarted')).toBe(true);
    });
  });

  // ─── CI/CD Pipelines ──────────────────────────────────────────
  describe('pipelines', () => {
    it('creates a pipeline', () => {
      const p = createTestPipeline(svc);
      expect(p.id).toMatch(/^pipe_/);
      expect(p.status).toBe('pending');
      expect(p.stageCount).toBe(3);
    });

    it('rejects empty name', () => {
      expect(() => createTestPipeline(svc, { name: '' })).toThrow('name');
    });

    it('rejects empty commit hash', () => {
      expect(() => createTestPipeline(svc, { commitHash: '' })).toThrow('Commit hash');
    });

    it('rejects no stages', () => {
      expect(() => createTestPipeline(svc, { stages: [] })).toThrow('At least one stage');
    });

    it('enforces max concurrent pipelines', () => {
      const s = setup({ maxConcurrentPipelines: 2 });
      createTestPipeline(s, { name: 'p1' });
      createTestPipeline(s, { name: 'p2' });
      expect(() => createTestPipeline(s, { name: 'p3' })).toThrow('Maximum concurrent');
    });

    it('starts a pipeline', () => {
      const p = createTestPipeline(svc);
      const started = svc.startPipeline(p.id);
      expect(started.status).toBe('running');
    });

    it('cannot start non-pending', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      expect(() => svc.startPipeline(p.id)).toThrow('not pending');
    });

    it('completes stages sequentially', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', true, ['compiled OK']);
      svc.completeStage(p.id, 'test', true, ['42 passed']);
      const done = svc.completeStage(p.id, 'deploy', true, ['deployed']);
      expect(done.status).toBe('passed');
      expect(done.passedStages).toBe(3);
    });

    it('fails pipeline on stage failure', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', true);
      const failed = svc.completeStage(p.id, 'test', false, ['3 failed']);
      expect(failed.status).toBe('failed');
      expect(failed.failedStages).toBe(1);
    });

    it('skips remaining stages on failure', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', false, ['compilation error']);
      // 'test' and 'deploy' should be skipped
      const info = svc.getPipeline(p.id)!;
      expect(info.passedStages).toBe(0);
      expect(info.failedStages).toBe(1);
      // stageCount is still 3
      expect(info.stageCount).toBe(3);
    });

    it('cancels a pipeline', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      const cancelled = svc.cancelPipeline(p.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('filters pipelines by environment', () => {
      createTestPipeline(svc, { name: 'dev-pipe', environment: 'development' });
      createTestPipeline(svc, { name: 'prod-pipe', environment: 'production' });
      expect(svc.getPipelinesByEnv('development')).toHaveLength(1);
      expect(svc.getPipelinesByEnv('production')).toHaveLength(1);
    });

    it('emits pipeline events', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', true);
      svc.completeStage(p.id, 'test', true);
      svc.completeStage(p.id, 'deploy', true);
      expect(events.some(e => e.type === 'pipeline_started')).toBe(true);
      expect(events.some(e => e.type === 'pipeline_passed')).toBe(true);
    });

    it('emits pipeline_failed event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', false, ['error']);
      expect(events.some(e => e.type === 'pipeline_failed')).toBe(true);
    });

    it('rejects completing already-completed stage', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', true);
      expect(() => svc.completeStage(p.id, 'build', true)).toThrow('already completed');
    });
  });

  // ─── Database Migrations ──────────────────────────────────────
  describe('migrations', () => {
    it('registers a migration', () => {
      const m = svc.registerMigration({
        name: 'create_users',
        version: '001',
        environment: 'development',
        upSql: 'CREATE TABLE users(...)',
        downSql: 'DROP TABLE users',
      });
      expect(m.id).toMatch(/^mig_/);
      expect(m.status).toBe('pending');
    });

    it('prevents duplicate version per env', () => {
      svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      expect(() => svc.registerMigration({
        name: 'b', version: '001', environment: 'development',
        upSql: 'UP2', downSql: 'DOWN2',
      })).toThrow('already exists');
    });

    it('allows same version in different envs', () => {
      svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      const m = svc.registerMigration({
        name: 'a', version: '001', environment: 'staging',
        upSql: 'UP', downSql: 'DOWN',
      });
      expect(m.status).toBe('pending');
    });

    it('applies a migration', () => {
      const m = svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      const applied = svc.applyMigration(m.id);
      expect(applied.status).toBe('applied');
      expect(applied.appliedAt).not.toBeNull();
    });

    it('cannot apply non-pending', () => {
      const m = svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      svc.applyMigration(m.id);
      expect(() => svc.applyMigration(m.id)).toThrow('not pending');
    });

    it('rolls back a migration', () => {
      const m = svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      svc.applyMigration(m.id);
      const rolled = svc.rollbackMigration(m.id);
      expect(rolled.status).toBe('rolled_back');
      expect(rolled.rolledBackAt).not.toBeNull();
    });

    it('cannot rollback non-applied', () => {
      const m = svc.registerMigration({
        name: 'a', version: '001', environment: 'development',
        upSql: 'UP', downSql: 'DOWN',
      });
      expect(() => svc.rollbackMigration(m.id)).toThrow('only rollback applied');
    });

    it('filters migrations by env', () => {
      svc.registerMigration({ name: 'a', version: '001', environment: 'development', upSql: 'UP', downSql: 'D' });
      svc.registerMigration({ name: 'b', version: '002', environment: 'production', upSql: 'UP', downSql: 'D' });
      expect(svc.getMigrationsByEnv('development')).toHaveLength(1);
      expect(svc.getMigrationsByEnv('production')).toHaveLength(1);
    });

    it('emits migration events', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const m = svc.registerMigration({ name: 'a', version: '001', environment: 'development', upSql: 'UP', downSql: 'D' });
      svc.applyMigration(m.id);
      svc.rollbackMigration(m.id);
      expect(events.some(e => e.type === 'migration_applied')).toBe(true);
      expect(events.some(e => e.type === 'migration_rolled_back')).toBe(true);
    });

    it('rejects empty fields', () => {
      expect(() => svc.registerMigration({ name: '', version: '1', environment: 'development', upSql: 'UP', downSql: 'D' })).toThrow('name');
      expect(() => svc.registerMigration({ name: 'a', version: '', environment: 'development', upSql: 'UP', downSql: 'D' })).toThrow('version');
      expect(() => svc.registerMigration({ name: 'a', version: '1', environment: 'development', upSql: '', downSql: 'D' })).toThrow('Up SQL');
    });
  });

  // ─── Health Monitoring ────────────────────────────────────────
  describe('health monitoring', () => {
    it('reports a health check', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({
        containerId: c.id,
        status: 'healthy',
        responseTimeMs: 42,
        checkedAt: Date.now(),
      });
      const updated = svc.getContainer(c.id)!;
      expect(updated.healthStatus).toBe('healthy');
    });

    it('records health history', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({ containerId: c.id, status: 'healthy', responseTimeMs: 10, checkedAt: Date.now() });
      svc.reportHealthCheck({ containerId: c.id, status: 'degraded', responseTimeMs: 500, checkedAt: Date.now() });
      expect(svc.getHealthHistory(c.id)).toHaveLength(2);
    });

    it('fires alert on unhealthy', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({
        containerId: c.id, status: 'unhealthy', responseTimeMs: 0,
        checkedAt: Date.now(), details: 'connection refused',
      });
      const alerts = svc.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('fires warning on degraded', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({
        containerId: c.id, status: 'degraded', responseTimeMs: 2000,
        checkedAt: Date.now(), details: 'slow response',
      });
      const alerts = svc.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('limits health history to 100', () => {
      const c = registerDev(svc);
      for (let i = 0; i < 110; i++) {
        svc.reportHealthCheck({ containerId: c.id, status: 'healthy', responseTimeMs: i, checkedAt: Date.now() });
      }
      expect(svc.getHealthHistory(c.id)).toHaveLength(100);
    });

    it('emits health_check event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const c = registerDev(svc);
      svc.reportHealthCheck({ containerId: c.id, status: 'healthy', responseTimeMs: 10, checkedAt: Date.now() });
      expect(events.some(e => e.type === 'health_check')).toBe(true);
    });
  });

  // ─── Alerts ───────────────────────────────────────────────────
  describe('alerts', () => {
    it('acknowledges an alert', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({ containerId: c.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      const alerts = svc.getActiveAlerts();
      const ack = svc.acknowledgeAlert(alerts[0].id);
      expect(ack.acknowledged).toBe(true);
      expect(ack.acknowledgedAt).not.toBeNull();
    });

    it('only returns unacknowledged in active', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({ containerId: c.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      svc.reportHealthCheck({ containerId: c.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      expect(svc.getActiveAlerts()).toHaveLength(2);
      svc.acknowledgeAlert(svc.getActiveAlerts()[0].id);
      expect(svc.getActiveAlerts()).toHaveLength(1);
    });

    it('gets alerts by container', () => {
      const c1 = registerDev(svc, { name: 'a' });
      const c2 = registerDev(svc, { name: 'b' });
      svc.reportHealthCheck({ containerId: c1.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      svc.reportHealthCheck({ containerId: c2.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      expect(svc.getAlertsByContainer(c1.id)).toHaveLength(1);
    });
  });

  // ─── Scaling ──────────────────────────────────────────────────
  describe('scaling', () => {
    it('sets a scaling policy', () => {
      const c = registerDev(svc);
      const policy = svc.setScalingPolicy(c.id, { minReplicas: 2, maxReplicas: 8 });
      expect(policy.minReplicas).toBe(2);
      expect(policy.maxReplicas).toBe(8);
    });

    it('gets scaling policy', () => {
      const c = registerDev(svc);
      svc.setScalingPolicy(c.id);
      expect(svc.getScalingPolicy(c.id)).toBeDefined();
      expect(svc.getScalingPolicy('nope')).toBeUndefined();
    });

    it('scales container up', () => {
      const c = registerDev(svc, { replicas: 2 });
      svc.startContainer(c.id);
      svc.setScalingPolicy(c.id, { minReplicas: 1, maxReplicas: 5 });
      const scaled = svc.scaleContainer(c.id, 4, 'high load');
      expect(scaled.replicas).toBe(4);
    });

    it('scales container down', () => {
      const c = registerDev(svc, { replicas: 4 });
      svc.startContainer(c.id);
      svc.setScalingPolicy(c.id, { minReplicas: 1, maxReplicas: 10 });
      const scaled = svc.scaleContainer(c.id, 2, 'low load');
      expect(scaled.replicas).toBe(2);
    });

    it('rejects below min replicas', () => {
      const c = registerDev(svc, { replicas: 3 });
      svc.startContainer(c.id);
      svc.setScalingPolicy(c.id, { minReplicas: 2 });
      expect(() => svc.scaleContainer(c.id, 1, 'too low')).toThrow('minimum replicas');
    });

    it('rejects above max replicas', () => {
      const c = registerDev(svc, { replicas: 3 });
      svc.startContainer(c.id);
      svc.setScalingPolicy(c.id, { maxReplicas: 5 });
      expect(() => svc.scaleContainer(c.id, 10, 'too high')).toThrow('maximum replicas');
    });

    it('enforces cooldown', () => {
      const c = registerDev(svc, { replicas: 2 });
      svc.startContainer(c.id);
      svc.setScalingPolicy(c.id, { minReplicas: 1, maxReplicas: 10, cooldownMs: 60000 });
      svc.scaleContainer(c.id, 3, 'first scale');
      expect(() => svc.scaleContainer(c.id, 4, 'too soon')).toThrow('cooldown');
    });

    it('rejects negative replicas', () => {
      const c = registerDev(svc);
      expect(() => svc.scaleContainer(c.id, -1, 'bad')).toThrow('negative');
    });

    it('allows scaling without policy', () => {
      const c = registerDev(svc, { replicas: 2 });
      svc.startContainer(c.id);
      // No policy set — should allow
      const scaled = svc.scaleContainer(c.id, 5, 'ad hoc');
      expect(scaled.replicas).toBe(5);
    });

    it('records scaling events', () => {
      const c = registerDev(svc, { replicas: 2 });
      svc.startContainer(c.id);
      svc.scaleContainer(c.id, 4, 'grow');
      const events = svc.getScalingEvents(c.id);
      expect(events).toHaveLength(1);
      expect(events[0].direction).toBe('up');
      expect(events[0].fromReplicas).toBe(2);
      expect(events[0].toReplicas).toBe(4);
    });

    it('reports CPU usage', () => {
      const c = registerDev(svc);
      svc.reportCpuUsage(c.id, 75, 512);
      const updated = svc.getContainer(c.id)!;
      expect(updated.cpuUsage).toBe(75);
      expect(updated.memoryUsageMB).toBe(512);
    });

    it('clamps CPU to 0-100', () => {
      const c = registerDev(svc);
      svc.reportCpuUsage(c.id, 150, 0);
      expect(svc.getContainer(c.id)!.cpuUsage).toBe(100);
      svc.reportCpuUsage(c.id, -10, 0);
      expect(svc.getContainer(c.id)!.cpuUsage).toBe(0);
    });

    it('emits scaling event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const c = registerDev(svc, { replicas: 2 });
      svc.startContainer(c.id);
      svc.scaleContainer(c.id, 4, 'load');
      expect(events.some(e => e.type === 'scaling_event')).toBe(true);
    });
  });

  // ─── Environment Promotion ────────────────────────────────────
  describe('environment promotion', () => {
    it('promotes dev to staging', () => {
      const c = registerDev(svc);
      const promoted = svc.promote('staging', c.id);
      expect(promoted.environment).toBe('staging');
    });

    it('promotes staging to production', () => {
      const c = registerDev(svc, { environment: 'staging' });
      const promoted = svc.promote('production', c.id);
      expect(promoted.environment).toBe('production');
    });

    it('rejects backwards promotion', () => {
      const c = registerDev(svc, { environment: 'production' });
      expect(() => svc.promote('staging', c.id)).toThrow('Cannot promote');
    });

    it('rejects same-level promotion', () => {
      const c = registerDev(svc);
      expect(() => svc.promote('development', c.id)).toThrow('Cannot promote');
    });

    it('emits promotion event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const c = registerDev(svc);
      svc.promote('staging', c.id);
      expect(events.some(e => e.type === 'environment_promoted')).toBe(true);
    });
  });

  // ─── Domain / SSL ─────────────────────────────────────────────
  describe('domains & SSL', () => {
    it('registers a domain', () => {
      const c = registerDev(svc);
      const d = svc.registerDomain({
        domain: 'api.hololand.io',
        containerId: c.id,
        environment: 'production',
      });
      expect(d.id).toMatch(/^dom_/);
      expect(d.sslEnabled).toBe(false);
    });

    it('rejects duplicate domain', () => {
      const c = registerDev(svc);
      svc.registerDomain({ domain: 'api.hololand.io', containerId: c.id, environment: 'production' });
      expect(() => svc.registerDomain({
        domain: 'api.hololand.io', containerId: c.id, environment: 'production',
      })).toThrow('already registered');
    });

    it('rejects empty domain', () => {
      const c = registerDev(svc);
      expect(() => svc.registerDomain({
        domain: '', containerId: c.id, environment: 'production',
      })).toThrow('Domain is required');
    });

    it('enables SSL', () => {
      const c = registerDev(svc);
      const d = svc.registerDomain({ domain: 'api.hololand.io', containerId: c.id, environment: 'production' });
      const expires = Date.now() + 90 * 24 * 60 * 60 * 1000;
      const updated = svc.enableSsl(d.id, expires);
      expect(updated.sslEnabled).toBe(true);
      expect(updated.sslExpiresAt).toBe(expires);
    });

    it('finds domains expiring soon', () => {
      const c = registerDev(svc);
      const d = svc.registerDomain({ domain: 'soon.io', containerId: c.id, environment: 'production' });
      svc.enableSsl(d.id, Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const d2 = svc.registerDomain({ domain: 'far.io', containerId: c.id, environment: 'production' });
      svc.enableSsl(d2.id, Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

      const expiring = svc.getDomainsExpiringSoon();
      expect(expiring).toHaveLength(1);
      expect(expiring[0].domain).toBe('soon.io');
    });

    it('gets domains by container', () => {
      const c1 = registerDev(svc, { name: 'a' });
      const c2 = registerDev(svc, { name: 'b' });
      svc.registerDomain({ domain: 'a.io', containerId: c1.id, environment: 'production' });
      svc.registerDomain({ domain: 'b.io', containerId: c2.id, environment: 'production' });
      expect(svc.getDomainsByContainer(c1.id)).toHaveLength(1);
    });

    it('emits domain_registered event', () => {
      const events: DeployEvent[] = [];
      svc.onEvent(e => events.push(e));
      const c = registerDev(svc);
      svc.registerDomain({ domain: 'api.io', containerId: c.id, environment: 'production' });
      expect(events.some(e => e.type === 'domain_registered')).toBe(true);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────
  describe('stats', () => {
    it('returns comprehensive stats', () => {
      const c = registerDev(svc);
      svc.startContainer(c.id);
      svc.reportHealthCheck({ containerId: c.id, status: 'healthy', responseTimeMs: 10, checkedAt: Date.now() });
      svc.registerMigration({ name: 'a', version: '001', environment: 'development', upSql: 'UP', downSql: 'D' });
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', true);
      svc.completeStage(p.id, 'test', true);
      svc.completeStage(p.id, 'deploy', true);
      svc.registerDomain({ domain: 'a.io', containerId: c.id, environment: 'production' });

      const stats = svc.getStats();
      expect(stats.totalContainers).toBe(1);
      expect(stats.runningContainers).toBe(1);
      expect(stats.healthyContainers).toBe(1);
      expect(stats.totalPipelines).toBe(1);
      expect(stats.passedPipelines).toBe(1);
      expect(stats.totalMigrations).toBe(1);
      expect(stats.containersByEnv.development).toBe(1);
      expect(stats.totalDomains).toBe(1);
    });

    it('returns empty stats initially', () => {
      const stats = svc.getStats();
      expect(stats.totalContainers).toBe(0);
      expect(stats.runningContainers).toBe(0);
      expect(stats.totalPipelines).toBe(0);
    });

    it('tracks active alerts in stats', () => {
      const c = registerDev(svc);
      svc.reportHealthCheck({ containerId: c.id, status: 'unhealthy', responseTimeMs: 0, checkedAt: Date.now() });
      expect(svc.getStats().activeAlerts).toBe(1);
    });

    it('tracks failed pipelines', () => {
      const p = createTestPipeline(svc);
      svc.startPipeline(p.id);
      svc.completeStage(p.id, 'build', false, ['error']);
      expect(svc.getStats().failedPipelines).toBe(1);
    });
  });
});
