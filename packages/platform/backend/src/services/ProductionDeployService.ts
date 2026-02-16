/**
 * @hololand/backend — ProductionDeployService
 *
 * Container orchestration, health monitoring, CI/CD pipeline management,
 * environment promotion, database migrations, scaling, and SSL/domain
 * management for Hololand platform deployments.
 *
 * Architecture:
 *   Code Push → CI/CD Pipeline → Build → Test → Deploy
 *       ↓                                          ↓
 *   MigrationTracker                        HealthMonitor
 *       ↓                                          ↓
 *   EnvPromotion  ← ← ← ← ← ← ← ← ←    AlertDispatcher
 *                                                  ↓
 *                                           ScalingPolicy → Container
 *
 * Environments:
 *   development – Local/dev cluster
 *   staging     – Pre-production validation
 *   production  – Live traffic
 *
 * Usage:
 *   const deploy = new ProductionDeployService({ healthCheckIntervalMs: 30000 });
 *   deploy.start();
 *
 *   const container = deploy.registerContainer({ ... });
 *   deploy.createPipeline({ ... });
 *   deploy.promote('staging', container.id);
 */

// ============================================================================
// Types
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';
export type ContainerStatus = 'pending' | 'pulling' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'crashed';
export type PipelineStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
export type StageStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type MigrationStatus = 'pending' | 'running' | 'applied' | 'failed' | 'rolled_back';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ScalingDirection = 'up' | 'down';

// ─── Container Records ─────────────────────────────────────────

export interface ContainerRecord {
  id: string;
  name: string;
  image: string;
  tag: string;
  environment: Environment;
  status: ContainerStatus;
  healthStatus: HealthStatus;
  port: number;
  replicas: number;
  desiredReplicas: number;
  cpuUsage: number;       // 0-100
  memoryUsageMB: number;
  restartCount: number;
  lastHealthCheck: number | null;
  deployedAt: number | null;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// ─── Pipeline Records ───────────────────────────────────────────

export interface PipelineStage {
  name: string;
  status: StageStatus;
  startedAt: number | null;
  completedAt: number | null;
  duration: number;       // ms
  logs: string[];
  error?: string;
}

export interface PipelineRecord {
  id: string;
  name: string;
  branch: string;
  commitHash: string;
  environment: Environment;
  status: PipelineStatus;
  stages: PipelineStage[];
  triggeredBy: string;
  startedAt: number | null;
  completedAt: number | null;
  duration: number;       // ms total
  createdAt: number;
}

// ─── Migration Records ──────────────────────────────────────────

export interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  environment: Environment;
  status: MigrationStatus;
  upSql: string;
  downSql: string;
  appliedAt: number | null;
  rolledBackAt: number | null;
  createdAt: number;
}

// ─── Alerts & Health ────────────────────────────────────────────

export interface AlertRecord {
  id: string;
  containerId: string;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: number;
  acknowledgedAt: number | null;
}

export interface HealthCheckResult {
  containerId: string;
  status: HealthStatus;
  responseTimeMs: number;
  checkedAt: number;
  details?: string;
}

// ─── Scaling ────────────────────────────────────────────────────

export interface ScalingPolicy {
  containerId: string;
  minReplicas: number;
  maxReplicas: number;
  cpuThresholdUp: number;    // Scale up when above this %
  cpuThresholdDown: number;  // Scale down when below this %
  cooldownMs: number;        // Min time between scaling
  lastScaleAt: number | null;
}

export interface ScalingEvent {
  containerId: string;
  direction: ScalingDirection;
  fromReplicas: number;
  toReplicas: number;
  reason: string;
  timestamp: number;
}

// ─── SSL / Domain ───────────────────────────────────────────────

export interface DomainRecord {
  id: string;
  domain: string;
  containerId: string;
  environment: Environment;
  sslEnabled: boolean;
  sslExpiresAt: number | null;
  createdAt: number;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  tag: string;
  environment: Environment;
  status: ContainerStatus;
  healthStatus: HealthStatus;
  port: number;
  replicas: number;
  desiredReplicas: number;
  cpuUsage: number;
  memoryUsageMB: number;
  restartCount: number;
  deployedAt: number | null;
  createdAt: number;
}

export interface PipelineInfo {
  id: string;
  name: string;
  branch: string;
  commitHash: string;
  environment: Environment;
  status: PipelineStatus;
  stageCount: number;
  passedStages: number;
  failedStages: number;
  triggeredBy: string;
  duration: number;
  createdAt: number;
}

export interface DeployConfig {
  /** Health check interval in ms. Default: 30000 */
  healthCheckIntervalMs?: number;
  /** Max containers. Default: 50 */
  maxContainers?: number;
  /** Max concurrent pipelines. Default: 5 */
  maxConcurrentPipelines?: number;
  /** Auto-restart on crash. Default: true */
  autoRestart?: boolean;
  /** Max restarts before marking failed. Default: 3 */
  maxRestarts?: number;
  /** CPU threshold for auto-scale up. Default: 80 */
  defaultCpuThresholdUp?: number;
  /** CPU threshold for auto-scale down. Default: 20 */
  defaultCpuThresholdDown?: number;
  /** Default cooldown between scaling events. Default: 60000 */
  defaultScalingCooldownMs?: number;
  /** SSL renewal threshold in days. Default: 30 */
  sslRenewalThresholdDays?: number;
}

export type DeployEventType =
  | 'container_registered'
  | 'container_started'
  | 'container_stopped'
  | 'container_crashed'
  | 'container_restarted'
  | 'pipeline_started'
  | 'pipeline_passed'
  | 'pipeline_failed'
  | 'migration_applied'
  | 'migration_rolled_back'
  | 'health_check'
  | 'alert_fired'
  | 'scaling_event'
  | 'environment_promoted'
  | 'domain_registered';

export interface DeployEvent {
  type: DeployEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface DeployStats {
  totalContainers: number;
  runningContainers: number;
  healthyContainers: number;
  totalPipelines: number;
  passedPipelines: number;
  failedPipelines: number;
  totalMigrations: number;
  appliedMigrations: number;
  activeAlerts: number;
  containersByEnv: Record<Environment, number>;
  totalScalingEvents: number;
  totalDomains: number;
}

// ============================================================================
// Service
// ============================================================================

export class ProductionDeployService {
  private readonly config: Required<DeployConfig>;
  private containers: Map<string, ContainerRecord> = new Map();
  private pipelines: Map<string, PipelineRecord> = new Map();
  private migrations: Map<string, MigrationRecord> = new Map();
  private alerts: Map<string, AlertRecord> = new Map();
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private scalingEvents: ScalingEvent[] = [];
  private domains: Map<string, DomainRecord> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private running = false;
  private listeners: Array<(event: DeployEvent) => void> = [];
  private idCounter = 0;

  constructor(config: DeployConfig = {}) {
    this.config = {
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? 30000,
      maxContainers: config.maxContainers ?? 50,
      maxConcurrentPipelines: config.maxConcurrentPipelines ?? 5,
      autoRestart: config.autoRestart ?? true,
      maxRestarts: config.maxRestarts ?? 3,
      defaultCpuThresholdUp: config.defaultCpuThresholdUp ?? 80,
      defaultCpuThresholdDown: config.defaultCpuThresholdDown ?? 20,
      defaultScalingCooldownMs: config.defaultScalingCooldownMs ?? 60000,
      sslRenewalThresholdDays: config.sslRenewalThresholdDays ?? 30,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: DeployEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: DeployEventType, data: Record<string, unknown>): void {
    const event: DeployEvent = { type, timestamp: Date.now(), data };
    for (const l of this.listeners) {
      try { l(event); } catch { /* swallow listener errors */ }
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // --------------------------------------------------------------------------
  // Container Management
  // --------------------------------------------------------------------------

  registerContainer(opts: {
    name: string;
    image: string;
    tag?: string;
    environment: Environment;
    port?: number;
    replicas?: number;
    metadata?: Record<string, unknown>;
  }): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    if (!opts.name || !opts.name.trim()) throw new Error('Container name is required');
    if (!opts.image || !opts.image.trim()) throw new Error('Container image is required');

    if (this.containers.size >= this.config.maxContainers) {
      throw new Error(`Maximum containers reached (${this.config.maxContainers})`);
    }

    const id = this.nextId('ctr');
    const now = Date.now();

    const record: ContainerRecord = {
      id,
      name: opts.name.trim(),
      image: opts.image.trim(),
      tag: opts.tag ?? 'latest',
      environment: opts.environment,
      status: 'pending',
      healthStatus: 'unknown',
      port: opts.port ?? 3000,
      replicas: 0,
      desiredReplicas: opts.replicas ?? 1,
      cpuUsage: 0,
      memoryUsageMB: 0,
      restartCount: 0,
      lastHealthCheck: null,
      deployedAt: null,
      createdAt: now,
      updatedAt: now,
      metadata: opts.metadata,
    };

    this.containers.set(id, record);
    this.emit('container_registered', { containerId: id, name: record.name, environment: record.environment });
    return this.toContainerInfo(record);
  }

  getContainer(containerId: string): ContainerInfo | undefined {
    const c = this.containers.get(containerId);
    return c ? this.toContainerInfo(c) : undefined;
  }

  startContainer(containerId: string): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);
    if (c.status === 'running') throw new Error('Container already running');

    c.status = 'running';
    c.replicas = c.desiredReplicas;
    c.deployedAt = Date.now();
    c.updatedAt = Date.now();
    this.emit('container_started', { containerId, name: c.name });
    return this.toContainerInfo(c);
  }

  stopContainer(containerId: string): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);
    if (c.status === 'stopped') throw new Error('Container already stopped');

    c.status = 'stopped';
    c.replicas = 0;
    c.updatedAt = Date.now();
    this.emit('container_stopped', { containerId, name: c.name });
    return this.toContainerInfo(c);
  }

  crashContainer(containerId: string, reason: string): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);

    c.restartCount++;

    if (this.config.autoRestart && c.restartCount <= this.config.maxRestarts) {
      c.status = 'running';
      c.updatedAt = Date.now();
      this.emit('container_restarted', { containerId, reason, restartCount: c.restartCount });
    } else {
      c.status = c.restartCount > this.config.maxRestarts ? 'failed' : 'crashed';
      c.replicas = 0;
      c.updatedAt = Date.now();
      this.emit('container_crashed', { containerId, reason, restartCount: c.restartCount });

      this.fireAlert(containerId, 'critical', `Container ${c.name} crashed: ${reason}`);
    }

    return this.toContainerInfo(c);
  }

  removeContainer(containerId: string): boolean {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) return false;
    if (c.status === 'running') throw new Error('Stop container before removing');
    this.containers.delete(containerId);
    this.scalingPolicies.delete(containerId);
    this.healthHistory.delete(containerId);
    return true;
  }

  getContainersByEnv(env: Environment): ContainerInfo[] {
    return Array.from(this.containers.values())
      .filter(c => c.environment === env)
      .map(c => this.toContainerInfo(c));
  }

  // --------------------------------------------------------------------------
  // CI/CD Pipelines
  // --------------------------------------------------------------------------

  createPipeline(opts: {
    name: string;
    branch: string;
    commitHash: string;
    environment: Environment;
    stages: string[];
    triggeredBy: string;
  }): PipelineInfo {
    if (!this.running) throw new Error('Service not started');
    if (!opts.name.trim()) throw new Error('Pipeline name is required');
    if (!opts.commitHash.trim()) throw new Error('Commit hash is required');
    if (!opts.stages.length) throw new Error('At least one stage is required');

    const active = Array.from(this.pipelines.values()).filter(
      p => p.status === 'running' || p.status === 'pending'
    ).length;
    if (active >= this.config.maxConcurrentPipelines) {
      throw new Error(`Maximum concurrent pipelines reached (${this.config.maxConcurrentPipelines})`);
    }

    const id = this.nextId('pipe');

    const stages: PipelineStage[] = opts.stages.map(name => ({
      name,
      status: 'pending' as StageStatus,
      startedAt: null,
      completedAt: null,
      duration: 0,
      logs: [],
    }));

    const record: PipelineRecord = {
      id,
      name: opts.name.trim(),
      branch: opts.branch,
      commitHash: opts.commitHash.trim(),
      environment: opts.environment,
      status: 'pending',
      stages,
      triggeredBy: opts.triggeredBy,
      startedAt: null,
      completedAt: null,
      duration: 0,
      createdAt: Date.now(),
    };

    this.pipelines.set(id, record);
    return this.toPipelineInfo(record);
  }

  getPipeline(pipelineId: string): PipelineInfo | undefined {
    const p = this.pipelines.get(pipelineId);
    return p ? this.toPipelineInfo(p) : undefined;
  }

  startPipeline(pipelineId: string): PipelineInfo {
    if (!this.running) throw new Error('Service not started');
    const p = this.pipelines.get(pipelineId);
    if (!p) throw new Error(`Pipeline ${pipelineId} not found`);
    if (p.status !== 'pending') throw new Error('Pipeline is not pending');

    p.status = 'running';
    p.startedAt = Date.now();
    this.emit('pipeline_started', { pipelineId, name: p.name, environment: p.environment });
    return this.toPipelineInfo(p);
  }

  completeStage(pipelineId: string, stageName: string, passed: boolean, logs: string[] = []): PipelineInfo {
    if (!this.running) throw new Error('Service not started');
    const p = this.pipelines.get(pipelineId);
    if (!p) throw new Error(`Pipeline ${pipelineId} not found`);
    if (p.status !== 'running') throw new Error('Pipeline is not running');

    const stage = p.stages.find(s => s.name === stageName);
    if (!stage) throw new Error(`Stage ${stageName} not found`);
    if (stage.status !== 'pending' && stage.status !== 'running') {
      throw new Error(`Stage ${stageName} is already completed`);
    }

    stage.status = passed ? 'passed' : 'failed';
    stage.startedAt = stage.startedAt ?? Date.now();
    stage.completedAt = Date.now();
    stage.duration = stage.completedAt - stage.startedAt;
    stage.logs = logs;

    if (!passed) {
      stage.error = logs[logs.length - 1] ?? 'Stage failed';
      // Mark remaining stages as skipped
      for (const s of p.stages) {
        if (s.status === 'pending') s.status = 'skipped';
      }
      p.status = 'failed';
      p.completedAt = Date.now();
      p.duration = p.completedAt - (p.startedAt ?? p.createdAt);
      this.emit('pipeline_failed', { pipelineId, stage: stageName });
    }

    // Check if all stages passed
    const allDone = p.stages.every(s => s.status === 'passed');
    if (allDone) {
      p.status = 'passed';
      p.completedAt = Date.now();
      p.duration = p.completedAt - (p.startedAt ?? p.createdAt);
      this.emit('pipeline_passed', { pipelineId, name: p.name, environment: p.environment });
    }

    return this.toPipelineInfo(p);
  }

  cancelPipeline(pipelineId: string): PipelineInfo {
    if (!this.running) throw new Error('Service not started');
    const p = this.pipelines.get(pipelineId);
    if (!p) throw new Error(`Pipeline ${pipelineId} not found`);

    p.status = 'cancelled';
    p.completedAt = Date.now();
    p.duration = p.completedAt - (p.startedAt ?? p.createdAt);
    for (const s of p.stages) {
      if (s.status === 'pending' || s.status === 'running') s.status = 'skipped';
    }
    return this.toPipelineInfo(p);
  }

  getPipelinesByEnv(env: Environment): PipelineInfo[] {
    return Array.from(this.pipelines.values())
      .filter(p => p.environment === env)
      .map(p => this.toPipelineInfo(p));
  }

  // --------------------------------------------------------------------------
  // Database Migrations
  // --------------------------------------------------------------------------

  registerMigration(opts: {
    name: string;
    version: string;
    environment: Environment;
    upSql: string;
    downSql: string;
  }): MigrationRecord {
    if (!this.running) throw new Error('Service not started');
    if (!opts.name.trim()) throw new Error('Migration name is required');
    if (!opts.version.trim()) throw new Error('Migration version is required');
    if (!opts.upSql.trim()) throw new Error('Up SQL is required');

    // Check for duplicate version in environment
    const existing = Array.from(this.migrations.values())
      .find(m => m.version === opts.version && m.environment === opts.environment);
    if (existing) throw new Error(`Migration version ${opts.version} already exists in ${opts.environment}`);

    const id = this.nextId('mig');
    const record: MigrationRecord = {
      id,
      name: opts.name.trim(),
      version: opts.version.trim(),
      environment: opts.environment,
      status: 'pending',
      upSql: opts.upSql,
      downSql: opts.downSql,
      appliedAt: null,
      rolledBackAt: null,
      createdAt: Date.now(),
    };

    this.migrations.set(id, record);
    return record;
  }

  applyMigration(migrationId: string): MigrationRecord {
    if (!this.running) throw new Error('Service not started');
    const m = this.migrations.get(migrationId);
    if (!m) throw new Error(`Migration ${migrationId} not found`);
    if (m.status !== 'pending') throw new Error('Migration is not pending');

    m.status = 'applied';
    m.appliedAt = Date.now();
    this.emit('migration_applied', { migrationId, name: m.name, version: m.version, environment: m.environment });
    return { ...m };
  }

  rollbackMigration(migrationId: string): MigrationRecord {
    if (!this.running) throw new Error('Service not started');
    const m = this.migrations.get(migrationId);
    if (!m) throw new Error(`Migration ${migrationId} not found`);
    if (m.status !== 'applied') throw new Error('Can only rollback applied migrations');

    m.status = 'rolled_back';
    m.rolledBackAt = Date.now();
    this.emit('migration_rolled_back', { migrationId, name: m.name, version: m.version });
    return { ...m };
  }

  getMigrationsByEnv(env: Environment): MigrationRecord[] {
    return Array.from(this.migrations.values())
      .filter(m => m.environment === env)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  // --------------------------------------------------------------------------
  // Health Monitoring
  // --------------------------------------------------------------------------

  reportHealthCheck(result: HealthCheckResult): void {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(result.containerId);
    if (!c) throw new Error(`Container ${result.containerId} not found`);

    c.healthStatus = result.status;
    c.lastHealthCheck = result.checkedAt;
    c.updatedAt = Date.now();

    const history = this.healthHistory.get(result.containerId) ?? [];
    history.push(result);
    // Keep last 100 checks
    if (history.length > 100) history.splice(0, history.length - 100);
    this.healthHistory.set(result.containerId, history);

    this.emit('health_check', {
      containerId: result.containerId,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
    });

    // Auto-alert on unhealthy
    if (result.status === 'unhealthy') {
      this.fireAlert(result.containerId, 'critical', `Container unhealthy: ${result.details ?? 'no details'}`);
    } else if (result.status === 'degraded') {
      this.fireAlert(result.containerId, 'warning', `Container degraded: ${result.details ?? 'no details'}`);
    }
  }

  getHealthHistory(containerId: string): HealthCheckResult[] {
    return [...(this.healthHistory.get(containerId) ?? [])];
  }

  // --------------------------------------------------------------------------
  // Alerts
  // --------------------------------------------------------------------------

  private fireAlert(containerId: string, severity: AlertSeverity, message: string): AlertRecord {
    const id = this.nextId('alert');
    const record: AlertRecord = {
      id,
      containerId,
      severity,
      message,
      acknowledged: false,
      createdAt: Date.now(),
      acknowledgedAt: null,
    };

    this.alerts.set(id, record);
    this.emit('alert_fired', { alertId: id, containerId, severity, message });
    return record;
  }

  acknowledgeAlert(alertId: string): AlertRecord {
    if (!this.running) throw new Error('Service not started');
    const a = this.alerts.get(alertId);
    if (!a) throw new Error(`Alert ${alertId} not found`);
    a.acknowledged = true;
    a.acknowledgedAt = Date.now();
    return { ...a };
  }

  getActiveAlerts(): AlertRecord[] {
    return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
  }

  getAlertsByContainer(containerId: string): AlertRecord[] {
    return Array.from(this.alerts.values()).filter(a => a.containerId === containerId);
  }

  // --------------------------------------------------------------------------
  // Scaling
  // --------------------------------------------------------------------------

  setScalingPolicy(containerId: string, opts?: {
    minReplicas?: number;
    maxReplicas?: number;
    cpuThresholdUp?: number;
    cpuThresholdDown?: number;
    cooldownMs?: number;
  }): ScalingPolicy {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);

    const policy: ScalingPolicy = {
      containerId,
      minReplicas: opts?.minReplicas ?? 1,
      maxReplicas: opts?.maxReplicas ?? 10,
      cpuThresholdUp: opts?.cpuThresholdUp ?? this.config.defaultCpuThresholdUp,
      cpuThresholdDown: opts?.cpuThresholdDown ?? this.config.defaultCpuThresholdDown,
      cooldownMs: opts?.cooldownMs ?? this.config.defaultScalingCooldownMs,
      lastScaleAt: null,
    };

    this.scalingPolicies.set(containerId, policy);
    return { ...policy };
  }

  getScalingPolicy(containerId: string): ScalingPolicy | undefined {
    const p = this.scalingPolicies.get(containerId);
    return p ? { ...p } : undefined;
  }

  scaleContainer(containerId: string, replicas: number, reason: string): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);
    if (replicas < 0) throw new Error('Replicas cannot be negative');

    const policy = this.scalingPolicies.get(containerId);
    if (policy) {
      if (replicas < policy.minReplicas) throw new Error(`Below minimum replicas (${policy.minReplicas})`);
      if (replicas > policy.maxReplicas) throw new Error(`Above maximum replicas (${policy.maxReplicas})`);

      // Check cooldown
      if (policy.lastScaleAt) {
        const elapsed = Date.now() - policy.lastScaleAt;
        if (elapsed < policy.cooldownMs) {
          throw new Error(`Scaling cooldown active (${Math.ceil((policy.cooldownMs - elapsed) / 1000)}s remaining)`);
        }
      }
      policy.lastScaleAt = Date.now();
    }

    const direction: ScalingDirection = replicas > c.replicas ? 'up' : 'down';
    const event: ScalingEvent = {
      containerId,
      direction,
      fromReplicas: c.replicas,
      toReplicas: replicas,
      reason,
      timestamp: Date.now(),
    };
    this.scalingEvents.push(event);

    c.replicas = replicas;
    c.desiredReplicas = replicas;
    c.updatedAt = Date.now();

    this.emit('scaling_event', {
      containerId,
      direction,
      fromReplicas: event.fromReplicas,
      toReplicas: replicas,
      reason,
    });

    return this.toContainerInfo(c);
  }

  reportCpuUsage(containerId: string, cpuPercent: number, memoryMB: number): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);

    c.cpuUsage = Math.min(100, Math.max(0, cpuPercent));
    c.memoryUsageMB = Math.max(0, memoryMB);
    c.updatedAt = Date.now();
    return this.toContainerInfo(c);
  }

  getScalingEvents(containerId?: string): ScalingEvent[] {
    if (containerId) {
      return this.scalingEvents.filter(e => e.containerId === containerId);
    }
    return [...this.scalingEvents];
  }

  // --------------------------------------------------------------------------
  // Environment Promotion
  // --------------------------------------------------------------------------

  promote(targetEnv: Environment, containerId: string): ContainerInfo {
    if (!this.running) throw new Error('Service not started');
    const c = this.containers.get(containerId);
    if (!c) throw new Error(`Container ${containerId} not found`);

    const envOrder: Environment[] = ['development', 'staging', 'production'];
    const currentIdx = envOrder.indexOf(c.environment);
    const targetIdx = envOrder.indexOf(targetEnv);

    if (targetIdx <= currentIdx) {
      throw new Error(`Cannot promote from ${c.environment} to ${targetEnv}`);
    }

    const prev = c.environment;
    c.environment = targetEnv;
    c.updatedAt = Date.now();

    this.emit('environment_promoted', {
      containerId,
      from: prev,
      to: targetEnv,
      image: c.image,
      tag: c.tag,
    });

    return this.toContainerInfo(c);
  }

  // --------------------------------------------------------------------------
  // Domain / SSL Management
  // --------------------------------------------------------------------------

  registerDomain(opts: {
    domain: string;
    containerId: string;
    environment: Environment;
    sslEnabled?: boolean;
    sslExpiresAt?: number;
  }): DomainRecord {
    if (!this.running) throw new Error('Service not started');
    if (!opts.domain.trim()) throw new Error('Domain is required');
    const c = this.containers.get(opts.containerId);
    if (!c) throw new Error(`Container ${opts.containerId} not found`);

    // Check for duplicate domain
    const existing = Array.from(this.domains.values()).find(d => d.domain === opts.domain);
    if (existing) throw new Error(`Domain ${opts.domain} already registered`);

    const id = this.nextId('dom');
    const record: DomainRecord = {
      id,
      domain: opts.domain.trim(),
      containerId: opts.containerId,
      environment: opts.environment,
      sslEnabled: opts.sslEnabled ?? false,
      sslExpiresAt: opts.sslExpiresAt ?? null,
      createdAt: Date.now(),
    };

    this.domains.set(id, record);
    this.emit('domain_registered', { domainId: id, domain: record.domain, containerId: opts.containerId });
    return record;
  }

  enableSsl(domainId: string, expiresAt: number): DomainRecord {
    if (!this.running) throw new Error('Service not started');
    const d = this.domains.get(domainId);
    if (!d) throw new Error(`Domain ${domainId} not found`);
    d.sslEnabled = true;
    d.sslExpiresAt = expiresAt;
    return { ...d };
  }

  getDomainsExpiringSoon(): DomainRecord[] {
    const threshold = Date.now() + (this.config.sslRenewalThresholdDays * 24 * 60 * 60 * 1000);
    return Array.from(this.domains.values())
      .filter(d => d.sslEnabled && d.sslExpiresAt !== null && d.sslExpiresAt <= threshold);
  }

  getDomainsByContainer(containerId: string): DomainRecord[] {
    return Array.from(this.domains.values()).filter(d => d.containerId === containerId);
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): DeployStats {
    const containers = Array.from(this.containers.values());
    const pipelines = Array.from(this.pipelines.values());
    const migrations = Array.from(this.migrations.values());

    const byEnv: Record<string, number> = { development: 0, staging: 0, production: 0 };
    for (const c of containers) {
      byEnv[c.environment] = (byEnv[c.environment] ?? 0) + 1;
    }

    return {
      totalContainers: containers.length,
      runningContainers: containers.filter(c => c.status === 'running').length,
      healthyContainers: containers.filter(c => c.healthStatus === 'healthy').length,
      totalPipelines: pipelines.length,
      passedPipelines: pipelines.filter(p => p.status === 'passed').length,
      failedPipelines: pipelines.filter(p => p.status === 'failed').length,
      totalMigrations: migrations.length,
      appliedMigrations: migrations.filter(m => m.status === 'applied').length,
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged).length,
      containersByEnv: byEnv as Record<Environment, number>,
      totalScalingEvents: this.scalingEvents.length,
      totalDomains: this.domains.size,
    };
  }

  // --------------------------------------------------------------------------
  // DTO Converters
  // --------------------------------------------------------------------------

  private toContainerInfo(c: ContainerRecord): ContainerInfo {
    return {
      id: c.id,
      name: c.name,
      image: c.image,
      tag: c.tag,
      environment: c.environment,
      status: c.status,
      healthStatus: c.healthStatus,
      port: c.port,
      replicas: c.replicas,
      desiredReplicas: c.desiredReplicas,
      cpuUsage: c.cpuUsage,
      memoryUsageMB: c.memoryUsageMB,
      restartCount: c.restartCount,
      deployedAt: c.deployedAt,
      createdAt: c.createdAt,
    };
  }

  private toPipelineInfo(p: PipelineRecord): PipelineInfo {
    return {
      id: p.id,
      name: p.name,
      branch: p.branch,
      commitHash: p.commitHash,
      environment: p.environment,
      status: p.status,
      stageCount: p.stages.length,
      passedStages: p.stages.filter(s => s.status === 'passed').length,
      failedStages: p.stages.filter(s => s.status === 'failed').length,
      triggeredBy: p.triggeredBy,
      duration: p.duration,
      createdAt: p.createdAt,
    };
  }
}
