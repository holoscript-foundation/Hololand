/**
 * Role-Based Access Control (RBAC) System
 *
 * Enforces least-privilege principle for all agent operations.
 * Validates file paths, operations, and environment access based on agent roles.
 *
 * Security Features:
 * - Path traversal prevention
 * - Operation whitelisting
 * - Environment isolation
 * - Audit logging
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { minimatch } from 'minimatch';
import { AgentRole, AgentPermissions, AgentTokenPayload } from './crypto-identity';

// Operation types
export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  CREATE = 'create',
  UPDATE = 'update',
  DEPLOY = 'deploy',
  VERIFY = 'verify',
  ROLLBACK = 'rollback',
}

// Access decision
export interface AccessDecision {
  allowed: boolean;
  reason: string;
  violations?: string[];
}

// Audit log entry
export interface AuditLogEntry {
  timestamp: Date;
  agentId: string;
  role: AgentRole;
  operation: string;
  resource: string;
  allowed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * RBAC Policy Enforcer
 */
export class RBACEnforcer {
  private auditLog: AuditLogEntry[] = [];
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Check if agent can perform operation on resource
   */
  public async checkAccess(
    agent: AgentTokenPayload,
    operation: string,
    resourcePath: string,
    environment?: string
  ): Promise<AccessDecision> {
    const violations: string[] = [];

    // 1. Validate operation is allowed for role
    if (!this.isOperationAllowed(agent.permissions, operation)) {
      violations.push(
        `Operation '${operation}' not allowed for role '${agent.role}'`
      );
    }

    // 2. Validate path access
    const pathDecision = await this.validatePathAccess(
      agent.permissions,
      resourcePath
    );
    if (!pathDecision.allowed) {
      violations.push(pathDecision.reason);
    }

    // 3. Validate environment access (if applicable)
    if (environment && !this.isEnvironmentAllowed(agent.permissions, environment)) {
      violations.push(
        `Environment '${environment}' not allowed for role '${agent.role}'`
      );
    }

    // 4. Check for path traversal attempts
    const traversalCheck = this.checkPathTraversal(resourcePath);
    if (!traversalCheck.allowed) {
      violations.push(traversalCheck.reason);
    }

    const allowed = violations.length === 0;
    const reason = allowed
      ? 'Access granted'
      : violations.join('; ');

    // Log decision
    await this.logAccess({
      timestamp: new Date(),
      agentId: agent.agentId,
      role: agent.role,
      operation,
      resource: resourcePath,
      allowed,
      reason,
      metadata: { environment },
    });

    return {
      allowed,
      reason,
      violations: violations.length > 0 ? violations : undefined,
    };
  }

  /**
   * Check if operation is in allowed list for agent role
   */
  private isOperationAllowed(
    permissions: AgentPermissions,
    operation: string
  ): boolean {
    return permissions.allowedOperations.some((allowedOp) => {
      // Support wildcard matching (e.g., "write:*" matches "write:jsx")
      return minimatch(operation, allowedOp);
    });
  }

  /**
   * Validate path is within allowed directories (glob pattern matching)
   */
  private async validatePathAccess(
    permissions: AgentPermissions,
    resourcePath: string
  ): Promise<AccessDecision> {
    // Resolve to absolute path (relative to project root)
    const absolutePath = path.isAbsolute(resourcePath)
      ? resourcePath
      : path.join(this.projectRoot, resourcePath);

    // Normalize path (remove .., ., etc.)
    const normalizedPath = path.normalize(absolutePath);

    // Check if path starts with project root (prevent escape)
    if (!normalizedPath.startsWith(this.projectRoot)) {
      return {
        allowed: false,
        reason: 'Path outside project root',
      };
    }

    // Get relative path from project root
    const relativePath = path.relative(this.projectRoot, normalizedPath);

    // Check against allowed path patterns
    const matchesAllowedPath = permissions.allowedPaths.some((allowedPattern) =>
      minimatch(relativePath, allowedPattern, { dot: true })
    );

    if (!matchesAllowedPath) {
      return {
        allowed: false,
        reason: `Path '${relativePath}' not in allowed paths for role '${permissions.role}'`,
      };
    }

    return {
      allowed: true,
      reason: 'Path access granted',
    };
  }

  /**
   * Check if environment is allowed for agent role
   */
  private isEnvironmentAllowed(
    permissions: AgentPermissions,
    environment: string
  ): boolean {
    if (!permissions.allowedEnvironments) {
      return true; // No environment restrictions
    }

    return permissions.allowedEnvironments.includes(environment);
  }

  /**
   * Detect path traversal attempts
   */
  private checkPathTraversal(resourcePath: string): AccessDecision {
    const dangerous = ['..', '~', '$', '${', '`'];

    for (const pattern of dangerous) {
      if (resourcePath.includes(pattern)) {
        return {
          allowed: false,
          reason: `Path contains dangerous pattern: '${pattern}'`,
        };
      }
    }

    return {
      allowed: true,
      reason: 'No path traversal detected',
    };
  }

  /**
   * Log access decision to audit trail
   */
  private async logAccess(entry: AuditLogEntry): Promise<void> {
    this.auditLog.push(entry);

    // Also write to persistent audit log file
    const logDir = path.join(this.projectRoot, '.agent-identity', 'audit');
    await fs.mkdir(logDir, { recursive: true });

    const logFile = path.join(
      logDir,
      `audit-${entry.timestamp.toISOString().split('T')[0]}.jsonl`
    );

    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, logLine);
  }

  /**
   * Get audit log for time range
   */
  public getAuditLog(
    startTime?: Date,
    endTime?: Date
  ): AuditLogEntry[] {
    let filtered = this.auditLog;

    if (startTime) {
      filtered = filtered.filter((entry) => entry.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter((entry) => entry.timestamp <= endTime);
    }

    return filtered;
  }

  /**
   * Get access violations for an agent
   */
  public getViolations(agentId: string): AuditLogEntry[] {
    return this.auditLog.filter(
      (entry) => entry.agentId === agentId && !entry.allowed
    );
  }

  /**
   * Export audit log to JSON file
   */
  public async exportAuditLog(outputPath: string): Promise<void> {
    const data = {
      exportedAt: new Date().toISOString(),
      totalEntries: this.auditLog.length,
      entries: this.auditLog,
    };

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Audit log exported to: ${outputPath}`);
  }
}

/**
 * Role-specific permission validators
 */

/**
 * Validate Component Generator permissions
 */
export async function validateComponentGeneratorAccess(
  rbac: RBACEnforcer,
  agent: AgentTokenPayload,
  filePath: string,
  operation: 'read' | 'write' | 'create' | 'update'
): Promise<AccessDecision> {
  // Must be Component Generator role
  if (agent.role !== AgentRole.COMPONENT_GENERATOR) {
    return {
      allowed: false,
      reason: 'Agent is not a Component Generator',
    };
  }

  // Only allow JSX/TSX operations
  const validExtensions = ['.jsx', '.tsx', '.js', '.ts'];
  const fileExtension = path.extname(filePath);

  if (!validExtensions.includes(fileExtension)) {
    return {
      allowed: false,
      reason: `Invalid file type: ${fileExtension}. Component Generator only supports ${validExtensions.join(', ')}`,
    };
  }

  // Check RBAC access
  const operationString = `${operation}:${fileExtension.slice(1)}`;
  return rbac.checkAccess(agent, operationString, filePath);
}

/**
 * Validate Testing Agent permissions
 */
export async function validateTestingAgentAccess(
  rbac: RBACEnforcer,
  agent: AgentTokenPayload,
  operation: 'execute' | 'read' | 'write',
  resource: string,
  environment: 'test' | 'ci'
): Promise<AccessDecision> {
  // Must be Testing Agent role
  if (agent.role !== AgentRole.TESTING_AGENT) {
    return {
      allowed: false,
      reason: 'Agent is not a Testing Agent',
    };
  }

  // Build operation string
  let operationString: string;
  if (operation === 'execute') {
    // Validate test framework
    const allowedFrameworks = ['vitest', 'jest', 'playwright', 'cypress'];
    const framework = allowedFrameworks.find((fw) => resource.includes(fw));
    if (!framework) {
      return {
        allowed: false,
        reason: `Unknown test framework in resource: ${resource}`,
      };
    }
    operationString = `execute:${framework}`;
  } else {
    operationString = `${operation}:${resource.includes('report') ? 'test-reports' : 'test-results'}`;
  }

  // Check RBAC access
  return rbac.checkAccess(agent, operationString, resource, environment);
}

/**
 * Validate Deployment Agent permissions
 */
export async function validateDeploymentAgentAccess(
  rbac: RBACEnforcer,
  agent: AgentTokenPayload,
  operation: 'deploy' | 'verify' | 'rollback' | 'read',
  artifact: string,
  targetEnvironment: 'dev' | 'staging' | 'production'
): Promise<AccessDecision> {
  // Must be Deployment Agent role
  if (agent.role !== AgentRole.DEPLOYMENT_AGENT) {
    return {
      allowed: false,
      reason: 'Agent is not a Deployment Agent',
    };
  }

  // Production deployments require additional verification
  if (targetEnvironment === 'production' && operation === 'deploy') {
    // Check if artifact is from build directory
    if (!artifact.startsWith('dist/') && !artifact.startsWith('build/')) {
      return {
        allowed: false,
        reason: 'Production deployments must use build artifacts from dist/ or build/',
      };
    }
  }

  // Build operation string
  const operationString = `${operation}:${targetEnvironment}`;

  // Check RBAC access
  return rbac.checkAccess(agent, operationString, artifact, targetEnvironment);
}

/**
 * Helper: Create RBAC enforcer with project root detection
 */
export async function createRBACEnforcer(
  projectRootHint?: string
): Promise<RBACEnforcer> {
  let projectRoot = projectRootHint;

  if (!projectRoot) {
    // Try to find project root (look for package.json)
    projectRoot = process.cwd();
    let currentDir = projectRoot;

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      try {
        await fs.access(packageJsonPath);
        projectRoot = currentDir;
        break;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }
  }

  console.log(`📁 RBAC Enforcer initialized with project root: ${projectRoot}`);
  return new RBACEnforcer(projectRoot);
}
