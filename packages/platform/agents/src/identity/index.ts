/**
 * Agent Identity Framework
 *
 * Comprehensive cryptographic identity and RBAC system for autonomous agents
 * in frontend development pipelines.
 *
 * @package agent-identity-framework
 * @version 1.0.0
 * @author Your Name <your.email@example.com>
 * @license MIT
 */

// Core exports
export {
  AgentRole,
  AgentIdentity,
  AgentPermissions,
  AgentTokenPayload,
  generateAgentIdentity,
  getPermissionsForRole,
  generateAgentToken,
  verifyAgentToken,
  saveAgentIdentity,
  loadAgentIdentity,
  needsRotation,
  rotateAgentIdentity,
} from './core/crypto-identity';

export {
  OperationType,
  AccessDecision,
  AuditLogEntry,
  RBACEnforcer,
  validateComponentGeneratorAccess,
  validateTestingAgentAccess,
  validateDeploymentAgentAccess,
  createRBACEnforcer,
} from './core/rbac-system';

export {
  RotationConfig,
  RotationEvent,
  CredentialRotationManager,
  createRotationManager,
} from './core/credential-rotation';

// Agent exports
export {
  ComponentGeneratorConfig,
  ComponentGeneratorAgent,
} from './agents/component-generator';

export {
  TestingAgentConfig,
  TestResult,
  TestingAgent,
} from './agents/testing-agent';

export {
  DeploymentAgentConfig,
  Environment,
  DeploymentResult,
  DeploymentAgent,
} from './agents/deployment-agent';

// Middleware exports
export {
  AuthenticatedRequest,
  AuthMiddlewareConfig,
  createAuthMiddleware,
  createFastifyAuthPlugin,
  extractFilePathFromBody,
  extractFilePathFromParams,
} from './middleware/auth-middleware';

/**
 * Quick setup function for new projects
 */
export async function setupAgentIdentityFramework(config: {
  projectRoot: string;
  storageDir?: string;
  enableRotation?: boolean;
  rotationCheckInterval?: number;
  rotationWindow?: number;
}): Promise<{
  componentGenerator: ComponentGeneratorAgent;
  testingAgent: TestingAgent;
  deploymentAgent: DeploymentAgent;
  rotationManager?: CredentialRotationManager;
}> {
  const { setupIdentities } = await import('./scripts/setup-identities');

  const storageDir = config.storageDir || `${config.projectRoot}/.agent-identity`;

  // Setup identities
  await setupIdentities({
    projectRoot: config.projectRoot,
    storageDir,
  });

  // Initialize agents
  const componentGenerator = new ComponentGeneratorAgent({
    agentName: 'main-component-generator',
    storageDir,
    projectRoot: config.projectRoot,
    componentLibraryPath: 'component-library',
  });

  const testingAgent = new TestingAgent({
    agentName: 'ci-testing',
    storageDir,
    projectRoot: config.projectRoot,
    testFramework: 'vitest',
    environment: 'test',
  });

  const deploymentAgent = new DeploymentAgent({
    agentName: 'production-deployer',
    storageDir,
    projectRoot: config.projectRoot,
    deploymentStrategy: 'vercel',
  });

  await Promise.all([
    componentGenerator.initialize(),
    testingAgent.initialize(),
    deploymentAgent.initialize(),
  ]);

  // Start rotation manager if enabled
  let rotationManager: CredentialRotationManager | undefined;
  if (config.enableRotation !== false) {
    rotationManager = createRotationManager(storageDir, {
      checkInterval: config.rotationCheckInterval || 60 * 60 * 1000,
      rotationWindow: config.rotationWindow || 60 * 60 * 1000,
    });
    await rotationManager.start();
  }

  return {
    componentGenerator,
    testingAgent,
    deploymentAgent,
    rotationManager,
  };
}

/**
 * Version information
 */
export const VERSION = '1.0.0';
export const NAME = 'agent-identity-framework';
