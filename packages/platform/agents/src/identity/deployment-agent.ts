/**
 * Deployment Agent
 *
 * Autonomous agent for deploying build artifacts to approved environments with
 * cryptographic identity and RBAC enforcement.
 *
 * Permissions:
 * - Read build artifacts (dist/, build/)
 * - Deploy to dev, staging, production
 * - Verify deployments
 * - Rollback failed deployments
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  AgentRole,
  AgentIdentity,
  generateAgentIdentity,
  generateAgentToken,
  saveAgentIdentity,
  loadAgentIdentity,
  needsRotation,
  rotateAgentIdentity,
} from '../core/crypto-identity';
import {
  RBACEnforcer,
  validateDeploymentAgentAccess,
  createRBACEnforcer,
} from '../core/rbac-system';

const execAsync = promisify(exec);

export interface DeploymentAgentConfig {
  agentName: string;
  storageDir: string;
  projectRoot: string;
  deploymentStrategy: 'rsync' | 's3' | 'docker' | 'kubernetes' | 'vercel' | 'netlify';
}

export type Environment = 'dev' | 'staging' | 'production';

export interface DeploymentResult {
  environment: Environment;
  status: 'success' | 'failed' | 'rolled_back';
  timestamp: Date;
  artifactPath: string;
  deploymentUrl?: string;
  duration: number;
  error?: string;
}

export class DeploymentAgent {
  private identity: AgentIdentity | null = null;
  private token: string | null = null;
  private rbac: RBACEnforcer | null = null;
  private config: DeploymentAgentConfig;
  private deploymentHistory: DeploymentResult[] = [];

  constructor(config: DeploymentAgentConfig) {
    this.config = config;
  }

  /**
   * Initialize agent (load or create identity)
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing Deployment Agent...');

    // Initialize RBAC enforcer
    this.rbac = await createRBACEnforcer(this.config.projectRoot);

    // Try to load existing identity
    try {
      const identities = await this.listExistingIdentities();
      if (identities.length > 0) {
        this.identity = await loadAgentIdentity(identities[0], this.config.storageDir);
        console.log(`✅ Loaded existing identity: ${this.identity.agentId}`);

        // Check if rotation needed
        if (needsRotation(this.identity)) {
          console.log('🔄 Identity expired or near expiration, rotating...');
          this.identity = await rotateAgentIdentity(this.identity, this.config.storageDir);
        }
      } else {
        // Generate new identity
        this.identity = await generateAgentIdentity(
          AgentRole.DEPLOYMENT_AGENT,
          this.config.agentName
        );
        await saveAgentIdentity(this.identity, this.config.storageDir);
        console.log(`✅ Created new identity: ${this.identity.agentId}`);
      }
    } catch (error) {
      // Generate new identity on error
      console.log('⚠️ No existing identity found, generating new one...');
      this.identity = await generateAgentIdentity(
        AgentRole.DEPLOYMENT_AGENT,
        this.config.agentName
      );
      await saveAgentIdentity(this.identity, this.config.storageDir);
      console.log(`✅ Created new identity: ${this.identity.agentId}`);
    }

    // Generate JWT token
    this.token = generateAgentToken(this.identity);
    console.log('🔑 JWT token generated');
    console.log(`📅 Token expires: ${this.identity.expiresAt.toISOString()}`);

    // Load deployment history
    await this.loadDeploymentHistory();
  }

  /**
   * List existing identities for this agent
   */
  private async listExistingIdentities(): Promise<string[]> {
    const identityDir = path.join(
      this.config.storageDir,
      'identities',
      AgentRole.DEPLOYMENT_AGENT
    );

    try {
      const files = await fs.readdir(identityDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Deploy build artifacts to target environment
   */
  public async deploy(
    artifactPath: string,
    targetEnvironment: Environment,
    options?: {
      dryRun?: boolean;
      skipVerification?: boolean;
    }
  ): Promise<DeploymentResult> {
    if (!this.identity || !this.token || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const opts = options || {};

    // Check RBAC permissions
    const decision = await validateDeploymentAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'deploy',
      artifactPath,
      targetEnvironment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Verify artifact exists
    const absoluteArtifactPath = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(this.config.projectRoot, artifactPath);

    try {
      await fs.access(absoluteArtifactPath);
    } catch {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    console.log(`🚀 Deploying ${artifactPath} to ${targetEnvironment}...`);
    if (opts.dryRun) {
      console.log('⚠️ DRY RUN MODE - No actual deployment will occur');
    }

    const startTime = Date.now();
    let result: DeploymentResult;

    try {
      // Execute deployment
      const deploymentUrl = await this.executeDeployment(
        absoluteArtifactPath,
        targetEnvironment,
        opts.dryRun || false
      );

      // Verify deployment (unless skipped)
      if (!opts.skipVerification && !opts.dryRun) {
        await this.verifyDeployment(targetEnvironment, deploymentUrl);
      }

      const duration = Date.now() - startTime;

      result = {
        environment: targetEnvironment,
        status: 'success',
        timestamp: new Date(),
        artifactPath,
        deploymentUrl,
        duration,
      };

      console.log(`✅ Deployment successful to ${targetEnvironment} (${duration}ms)`);
      if (deploymentUrl) {
        console.log(`   URL: ${deploymentUrl}`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      result = {
        environment: targetEnvironment,
        status: 'failed',
        timestamp: new Date(),
        artifactPath,
        duration,
        error: error.message,
      };

      console.error(`❌ Deployment failed: ${error.message}`);

      // Auto-rollback on production failures
      if (targetEnvironment === 'production' && !opts.dryRun) {
        console.log('🔄 Attempting auto-rollback...');
        try {
          await this.rollback(targetEnvironment);
          result.status = 'rolled_back';
          console.log('✅ Rollback successful');
        } catch (rollbackError: any) {
          console.error(`❌ Rollback failed: ${rollbackError.message}`);
        }
      }

      throw error;
    } finally {
      // Save deployment record
      this.deploymentHistory.push(result);
      await this.saveDeploymentHistory();
    }

    return result;
  }

  /**
   * Execute deployment based on strategy
   */
  private async executeDeployment(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string | undefined> {
    const { deploymentStrategy } = this.config;

    switch (deploymentStrategy) {
      case 'rsync':
        return this.deployViaRsync(artifactPath, environment, dryRun);

      case 's3':
        return this.deployViaS3(artifactPath, environment, dryRun);

      case 'docker':
        return this.deployViaDocker(artifactPath, environment, dryRun);

      case 'kubernetes':
        return this.deployViaKubernetes(artifactPath, environment, dryRun);

      case 'vercel':
        return this.deployViaVercel(artifactPath, environment, dryRun);

      case 'netlify':
        return this.deployViaNetlify(artifactPath, environment, dryRun);

      default:
        throw new Error(`Unknown deployment strategy: ${deploymentStrategy}`);
    }
  }

  /**
   * Deploy via rsync
   */
  private async deployViaRsync(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string | undefined> {
    const target = process.env[`RSYNC_TARGET_${environment.toUpperCase()}`];
    if (!target) {
      throw new Error(`RSYNC_TARGET_${environment.toUpperCase()} not set`);
    }

    const dryRunFlag = dryRun ? '--dry-run' : '';
    const command = `rsync -avz ${dryRunFlag} ${artifactPath}/ ${target}`;

    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);

    return undefined; // rsync doesn't return URL
  }

  /**
   * Deploy via AWS S3
   */
  private async deployViaS3(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string> {
    const bucket = process.env[`S3_BUCKET_${environment.toUpperCase()}`];
    if (!bucket) {
      throw new Error(`S3_BUCKET_${environment.toUpperCase()} not set`);
    }

    const dryRunFlag = dryRun ? '--dryrun' : '';
    const command = `aws s3 sync ${artifactPath} s3://${bucket}/ ${dryRunFlag}`;

    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);

    return `https://${bucket}.s3.amazonaws.com/`;
  }

  /**
   * Deploy via Docker
   */
  private async deployViaDocker(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string | undefined> {
    const imageName = `app-${environment}:${Date.now()}`;

    if (dryRun) {
      console.log(`Would build Docker image: ${imageName}`);
      return undefined;
    }

    // Build image
    const buildCmd = `docker build -t ${imageName} ${artifactPath}`;
    await execAsync(buildCmd);

    // Push to registry
    const registry = process.env.DOCKER_REGISTRY || 'docker.io';
    const pushCmd = `docker push ${registry}/${imageName}`;
    await execAsync(pushCmd);

    return `${registry}/${imageName}`;
  }

  /**
   * Deploy via Kubernetes
   */
  private async deployViaKubernetes(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string | undefined> {
    const namespace = `app-${environment}`;
    const dryRunFlag = dryRun ? '--dry-run=client' : '';

    const command = `kubectl apply -f ${artifactPath}/deployment.yaml -n ${namespace} ${dryRunFlag}`;

    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);

    return undefined;
  }

  /**
   * Deploy via Vercel
   */
  private async deployViaVercel(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string> {
    const prodFlag = environment === 'production' ? '--prod' : '';

    if (dryRun) {
      console.log(`Would deploy to Vercel with: vercel ${artifactPath} ${prodFlag}`);
      return 'https://example.vercel.app';
    }

    const command = `vercel ${artifactPath} ${prodFlag} --yes`;
    const { stdout } = await execAsync(command);

    // Extract deployment URL from output
    const urlMatch = stdout.match(/https:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : 'https://example.vercel.app';
  }

  /**
   * Deploy via Netlify
   */
  private async deployViaNetlify(
    artifactPath: string,
    environment: Environment,
    dryRun: boolean
  ): Promise<string> {
    const prodFlag = environment === 'production' ? '--prod' : '';

    if (dryRun) {
      console.log(`Would deploy to Netlify with: netlify deploy --dir=${artifactPath} ${prodFlag}`);
      return 'https://example.netlify.app';
    }

    const command = `netlify deploy --dir=${artifactPath} ${prodFlag}`;
    const { stdout } = await execAsync(command);

    // Extract deployment URL
    const urlMatch = stdout.match(/https:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : 'https://example.netlify.app';
  }

  /**
   * Verify deployment
   */
  public async verifyDeployment(
    environment: Environment,
    deploymentUrl?: string
  ): Promise<boolean> {
    if (!this.identity || !this.rbac) {
      throw new Error('Agent not initialized');
    }

    // Check RBAC permissions
    const decision = await validateDeploymentAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'verify',
      `.deployment/${environment}`,
      environment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    console.log(`🔍 Verifying deployment to ${environment}...`);

    // Simple health check (can be enhanced)
    if (deploymentUrl) {
      try {
        const response = await fetch(deploymentUrl);
        if (response.ok) {
          console.log(`✅ Deployment verified: ${deploymentUrl} (status ${response.status})`);
          return true;
        } else {
          throw new Error(`Health check failed: status ${response.status}`);
        }
      } catch (error: any) {
        throw new Error(`Verification failed: ${error.message}`);
      }
    }

    console.log('⚠️ No deployment URL provided, skipping verification');
    return false;
  }

  /**
   * Rollback to previous deployment
   */
  public async rollback(environment: Environment): Promise<void> {
    if (!this.identity || !this.rbac) {
      throw new Error('Agent not initialized');
    }

    // Check RBAC permissions
    const decision = await validateDeploymentAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'rollback',
      `.deployment/${environment}`,
      environment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Find last successful deployment
    const lastSuccess = this.deploymentHistory
      .filter((d) => d.environment === environment && d.status === 'success')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!lastSuccess) {
      throw new Error(`No previous successful deployment found for ${environment}`);
    }

    console.log(`🔄 Rolling back ${environment} to deployment from ${lastSuccess.timestamp}`);

    // Redeploy last successful artifact
    await this.deploy(lastSuccess.artifactPath, environment, {
      skipVerification: true,
    });
  }

  /**
   * Save deployment history
   */
  private async saveDeploymentHistory(): Promise<void> {
    const historyPath = path.join(
      this.config.projectRoot,
      '.deployment',
      'history.json'
    );

    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(
      historyPath,
      JSON.stringify(this.deploymentHistory, null, 2)
    );
  }

  /**
   * Load deployment history
   */
  private async loadDeploymentHistory(): Promise<void> {
    const historyPath = path.join(
      this.config.projectRoot,
      '.deployment',
      'history.json'
    );

    try {
      const content = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(content);
      this.deploymentHistory = history.map((h: any) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      }));
    } catch {
      this.deploymentHistory = [];
    }
  }

  /**
   * Get deployment history
   */
  public getDeploymentHistory(environment?: Environment): DeploymentResult[] {
    if (environment) {
      return this.deploymentHistory.filter((d) => d.environment === environment);
    }
    return this.deploymentHistory;
  }

  /**
   * Get current identity info
   */
  public getIdentityInfo(): {
    agentId: string;
    role: AgentRole;
    expiresAt: Date;
    needsRotation: boolean;
  } | null {
    if (!this.identity) {
      return null;
    }

    return {
      agentId: this.identity.agentId,
      role: this.identity.role,
      expiresAt: this.identity.expiresAt,
      needsRotation: needsRotation(this.identity),
    };
  }

  /**
   * Get JWT token
   */
  public getToken(): string {
    if (!this.token) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.token;
  }
}

/**
 * Example usage
 */
export async function exampleDeploymentAgentUsage() {
  const agent = new DeploymentAgent({
    agentName: 'main-deployment-agent',
    storageDir: '/path/to/.agent-identity',
    projectRoot: '/path/to/project',
    deploymentStrategy: 'vercel',
  });

  // Initialize
  await agent.initialize();

  // Deploy to staging (dry run)
  await agent.deploy('dist', 'staging', { dryRun: true });

  // Deploy to production
  const result = await agent.deploy('dist', 'production');
  console.log('Deployment result:', result);

  // Verify deployment
  await agent.verifyDeployment('production', result.deploymentUrl);

  // View deployment history
  const history = agent.getDeploymentHistory('production');
  console.log('Deployment history:', history);

  // Check identity status
  const info = agent.getIdentityInfo();
  console.log('Identity info:', info);
}
