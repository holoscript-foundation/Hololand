/**
 * Testing Agent
 *
 * Autonomous agent for executing tests and generating reports with
 * cryptographic identity and RBAC enforcement.
 *
 * Permissions:
 * - Execute tests in test environment
 * - Read test results
 * - Write test reports
 * - Read coverage data
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
  validateTestingAgentAccess,
  createRBACEnforcer,
} from '../core/rbac-system';

const execAsync = promisify(exec);

export interface TestingAgentConfig {
  agentName: string;
  storageDir: string;
  projectRoot: string;
  testFramework: 'vitest' | 'jest' | 'playwright' | 'cypress';
  environment: 'test' | 'ci';
}

export interface TestResult {
  framework: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export class TestingAgent {
  private identity: AgentIdentity | null = null;
  private token: string | null = null;
  private rbac: RBACEnforcer | null = null;
  private config: TestingAgentConfig;

  constructor(config: TestingAgentConfig) {
    this.config = config;
  }

  /**
   * Initialize agent (load or create identity)
   */
  public async initialize(): Promise<void> {
    console.log('🧪 Initializing Testing Agent...');

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
          AgentRole.TESTING_AGENT,
          this.config.agentName
        );
        await saveAgentIdentity(this.identity, this.config.storageDir);
        console.log(`✅ Created new identity: ${this.identity.agentId}`);
      }
    } catch (error) {
      // Generate new identity on error
      console.log('⚠️ No existing identity found, generating new one...');
      this.identity = await generateAgentIdentity(
        AgentRole.TESTING_AGENT,
        this.config.agentName
      );
      await saveAgentIdentity(this.identity, this.config.storageDir);
      console.log(`✅ Created new identity: ${this.identity.agentId}`);
    }

    // Generate JWT token
    this.token = generateAgentToken(this.identity);
    console.log('🔑 JWT token generated');
    console.log(`📅 Token expires: ${this.identity.expiresAt.toISOString()}`);
  }

  /**
   * List existing identities for this agent
   */
  private async listExistingIdentities(): Promise<string[]> {
    const identityDir = path.join(
      this.config.storageDir,
      'identities',
      AgentRole.TESTING_AGENT
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
   * Execute tests
   */
  public async runTests(
    testPath?: string,
    options?: {
      coverage?: boolean;
      watch?: boolean;
      bail?: boolean;
    }
  ): Promise<TestResult> {
    if (!this.identity || !this.token || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Check RBAC permissions
    const decision = await validateTestingAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'execute',
      this.config.testFramework,
      this.config.environment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Build test command
    const command = this.buildTestCommand(testPath, options);
    console.log(`🧪 Executing: ${command}`);

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.config.projectRoot,
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
          AGENT_ID: this.identity.agentId,
          AGENT_TOKEN: this.token,
        },
      });

      const duration = Date.now() - startTime;

      // Parse test results
      const result = this.parseTestResults(stdout + stderr, duration);

      // Save test report
      await this.saveTestReport(result);

      return result;
    } catch (error: any) {
      // Tests failed (non-zero exit code)
      const duration = Date.now() - startTime;
      const result = this.parseTestResults(error.stdout + error.stderr, duration);

      // Save failed test report
      await this.saveTestReport(result);

      throw new Error(`Tests failed: ${result.failed} failures`);
    }
  }

  /**
   * Build test command based on framework
   */
  private buildTestCommand(
    testPath?: string,
    options?: { coverage?: boolean; watch?: boolean; bail?: boolean }
  ): string {
    const { testFramework } = this.config;
    const opts = options || {};

    let cmd = '';

    switch (testFramework) {
      case 'vitest':
        cmd = 'npx vitest run';
        if (opts.coverage) cmd += ' --coverage';
        if (opts.watch) cmd += ' --watch';
        if (opts.bail) cmd += ' --bail';
        if (testPath) cmd += ` ${testPath}`;
        break;

      case 'jest':
        cmd = 'npx jest';
        if (opts.coverage) cmd += ' --coverage';
        if (opts.watch) cmd += ' --watch';
        if (opts.bail) cmd += ' --bail';
        if (testPath) cmd += ` ${testPath}`;
        break;

      case 'playwright':
        cmd = 'npx playwright test';
        if (opts.bail) cmd += ' --max-failures=1';
        if (testPath) cmd += ` ${testPath}`;
        break;

      case 'cypress':
        cmd = 'npx cypress run';
        if (testPath) cmd += ` --spec ${testPath}`;
        break;
    }

    return cmd;
  }

  /**
   * Parse test results from stdout/stderr
   */
  private parseTestResults(output: string, duration: number): TestResult {
    // Simple parsing (can be enhanced with actual parsers)
    const passedMatch = output.match(/(\d+) passed/i);
    const failedMatch = output.match(/(\d+) failed/i);
    const skippedMatch = output.match(/(\d+) skipped/i);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    const total = passed + failed + skipped;

    // Parse coverage if present
    let coverage: TestResult['coverage'];
    const coverageMatch = output.match(
      /Statements\s*:\s*([\d.]+)%.*Lines\s*:\s*([\d.]+)%.*Functions\s*:\s*([\d.]+)%.*Branches\s*:\s*([\d.]+)%/s
    );

    if (coverageMatch) {
      coverage = {
        statements: parseFloat(coverageMatch[1]),
        lines: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        branches: parseFloat(coverageMatch[4]),
      };
    }

    return {
      framework: this.config.testFramework,
      passed,
      failed,
      skipped,
      total,
      duration,
      coverage,
    };
  }

  /**
   * Save test report
   */
  private async saveTestReport(result: TestResult): Promise<void> {
    if (!this.identity || !this.rbac) {
      throw new Error('Agent not initialized');
    }

    const reportDir = path.join(this.config.projectRoot, 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const reportPath = path.join(
      reportDir,
      `test-report-${Date.now()}.json`
    );

    // Check RBAC permissions for writing report
    const decision = await validateTestingAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'write',
      reportPath,
      this.config.environment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied for writing report: ${decision.reason}`);
    }

    const report = {
      agentId: this.identity.agentId,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      result,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Test report saved: ${reportPath}`);
  }

  /**
   * Read test coverage
   */
  public async readCoverage(): Promise<any> {
    if (!this.identity || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const coveragePath = path.join(this.config.projectRoot, 'coverage', 'coverage-summary.json');

    // Check RBAC permissions
    const decision = await validateTestingAgentAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      'read',
      coveragePath,
      this.config.environment
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    try {
      const content = await fs.readFile(coveragePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      console.warn('⚠️ No coverage data found');
      return null;
    }
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
export async function exampleTestingAgentUsage() {
  const agent = new TestingAgent({
    agentName: 'main-testing-agent',
    storageDir: '/path/to/.agent-identity',
    projectRoot: '/path/to/project',
    testFramework: 'vitest',
    environment: 'test',
  });

  // Initialize
  await agent.initialize();

  // Run tests with coverage
  try {
    const result = await agent.runTests(undefined, { coverage: true });
    console.log('✅ Tests passed:', result);
  } catch (error) {
    console.error('❌ Tests failed:', error);
  }

  // Read coverage data
  const coverage = await agent.readCoverage();
  console.log('Coverage:', coverage);

  // Check identity status
  const info = agent.getIdentityInfo();
  console.log('Identity info:', info);
}
