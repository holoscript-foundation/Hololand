/**
 * Cryptographic Agent Identity System
 *
 * Provides secure, unique identities for autonomous agents using
 * public/private key cryptography instead of shared API keys.
 *
 * Key Features:
 * - RSA-4096 key pairs for each agent
 * - Short-lived JWT tokens (24-hour expiration)
 * - Automated credential rotation
 * - Zero shared secrets between agents
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

// Agent role definitions
export enum AgentRole {
  COMPONENT_GENERATOR = 'component-generator',
  TESTING_AGENT = 'testing-agent',
  DEPLOYMENT_AGENT = 'deployment-agent',
}

// Permission scopes per agent role
export interface AgentPermissions {
  role: AgentRole;
  allowedPaths: string[];
  allowedOperations: string[];
  allowedEnvironments?: string[];
  maxTokenLifetime: number; // in seconds
}

// Agent identity structure
export interface AgentIdentity {
  agentId: string;
  role: AgentRole;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt: Date;
  permissions: AgentPermissions;
}

// JWT token payload
export interface AgentTokenPayload {
  agentId: string;
  role: AgentRole;
  permissions: AgentPermissions;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation tracking
}

/**
 * Generate cryptographic identity for an agent
 */
export async function generateAgentIdentity(
  role: AgentRole,
  agentName: string
): Promise<AgentIdentity> {
  // Generate RSA-4096 key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Generate unique agent ID
  const agentId = `${role}:${agentName}:${crypto.randomBytes(16).toString('hex')}`;

  // Set expiration (24 hours from now)
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

  // Get role-specific permissions
  const permissions = getPermissionsForRole(role);

  return {
    agentId,
    role,
    publicKey,
    privateKey,
    createdAt,
    expiresAt,
    permissions,
  };
}

/**
 * Get permissions based on agent role (least-privilege principle)
 */
export function getPermissionsForRole(role: AgentRole): AgentPermissions {
  switch (role) {
    case AgentRole.COMPONENT_GENERATOR:
      return {
        role,
        allowedPaths: [
          'src/components/**/*.tsx',
          'src/components/**/*.jsx',
          'src/components/**/*.ts',
          'src/components/**/*.js',
          'component-library/**/*',
        ],
        allowedOperations: [
          'write:jsx',
          'write:tsx',
          'read:component-library',
          'create:component',
          'update:component',
        ],
        maxTokenLifetime: 86400, // 24 hours
      };

    case AgentRole.TESTING_AGENT:
      return {
        role,
        allowedPaths: [
          'src/**/*.spec.ts',
          'src/**/*.spec.tsx',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'tests/**/*',
          'test-reports/**/*',
          'coverage/**/*',
        ],
        allowedOperations: [
          'execute:tests',
          'read:test-results',
          'write:test-reports',
          'read:coverage',
          'execute:vitest',
          'execute:jest',
          'execute:playwright',
          'execute:cypress',
        ],
        allowedEnvironments: ['test', 'ci'],
        maxTokenLifetime: 86400, // 24 hours
      };

    case AgentRole.DEPLOYMENT_AGENT:
      return {
        role,
        allowedPaths: [
          'dist/**/*',
          'build/**/*',
          '.deployment/**/*',
        ],
        allowedOperations: [
          'read:build-artifacts',
          'deploy:dev',
          'deploy:staging',
          'deploy:production',
          'verify:deployment',
          'rollback:deployment',
        ],
        allowedEnvironments: ['dev', 'staging', 'production'],
        maxTokenLifetime: 86400, // 24 hours
      };

    default:
      throw new Error(`Unknown agent role: ${role}`);
  }
}

/**
 * Generate JWT token for an agent identity
 */
export function generateAgentToken(identity: AgentIdentity): string {
  const payload: AgentTokenPayload = {
    agentId: identity.agentId,
    role: identity.role,
    permissions: identity.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(identity.expiresAt.getTime() / 1000),
    jti: crypto.randomBytes(16).toString('hex'), // Unique token ID
  };

  // Sign JWT with agent's private key (RSA-SHA256)
  return jwt.sign(payload, identity.privateKey, {
    algorithm: 'RS256',
    issuer: 'agent-identity-framework',
    audience: 'frontend-development-pipeline',
  });
}

/**
 * Verify and decode agent token
 */
export function verifyAgentToken(
  token: string,
  publicKey: string
): AgentTokenPayload {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'agent-identity-framework',
      audience: 'frontend-development-pipeline',
    }) as AgentTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Agent token has expired. Rotation required.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid agent token signature.');
    }
    throw error;
  }
}

/**
 * Sanitize agentId for use in filesystem paths
 * Windows doesn't allow colons in filenames
 */
function sanitizeAgentId(agentId: string): string {
  return agentId.replace(/:/g, '-');
}

/**
 * Persist agent identity to secure storage
 */
export async function saveAgentIdentity(
  identity: AgentIdentity,
  storageDir: string
): Promise<void> {
  const identityDir = path.join(storageDir, 'identities', identity.role);
  await fs.mkdir(identityDir, { recursive: true });

  // Sanitize agentId for filesystem
  const safeAgentId = sanitizeAgentId(identity.agentId);

  // Save public key (can be shared)
  const publicKeyPath = path.join(identityDir, `${safeAgentId}.pub`);
  await fs.writeFile(publicKeyPath, identity.publicKey, { mode: 0o644 });

  // Save private key (must be protected)
  const privateKeyPath = path.join(identityDir, `${safeAgentId}.key`);
  await fs.writeFile(privateKeyPath, identity.privateKey, { mode: 0o600 });

  // Save metadata (no secrets)
  const metadataPath = path.join(identityDir, `${safeAgentId}.json`);
  const metadata = {
    agentId: identity.agentId,
    role: identity.role,
    createdAt: identity.createdAt.toISOString(),
    expiresAt: identity.expiresAt.toISOString(),
    permissions: identity.permissions,
    publicKeyPath,
  };
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), {
    mode: 0o644,
  });

  console.log(`✅ Agent identity saved: ${identity.agentId}`);
  console.log(`   Public key: ${publicKeyPath}`);
  console.log(`   Private key: ${privateKeyPath} (mode: 0600)`);
  console.log(`   Metadata: ${metadataPath}`);
}

/**
 * Load agent identity from storage
 */
export async function loadAgentIdentity(
  agentId: string,
  storageDir: string
): Promise<AgentIdentity> {
  // Extract role from agentId (format: role:name:random)
  const rolePart = agentId.split(':')[0] as AgentRole;
  const identityDir = path.join(storageDir, 'identities', rolePart);

  // Sanitize agentId for filesystem
  const safeAgentId = sanitizeAgentId(agentId);

  // Load metadata
  const metadataPath = path.join(identityDir, `${safeAgentId}.json`);
  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metadataContent);

  // Load keys
  const publicKeyPath = path.join(identityDir, `${safeAgentId}.pub`);
  const privateKeyPath = path.join(identityDir, `${safeAgentId}.key`);

  const publicKey = await fs.readFile(publicKeyPath, 'utf-8');
  const privateKey = await fs.readFile(privateKeyPath, 'utf-8');

  return {
    agentId: metadata.agentId,
    role: metadata.role,
    publicKey,
    privateKey,
    createdAt: new Date(metadata.createdAt),
    expiresAt: new Date(metadata.expiresAt),
    permissions: metadata.permissions,
  };
}

/**
 * Check if agent identity needs rotation (expired or near expiration)
 */
export function needsRotation(identity: AgentIdentity): boolean {
  const now = new Date();
  const timeUntilExpiration = identity.expiresAt.getTime() - now.getTime();
  const oneHour = 60 * 60 * 1000;

  // Rotate if expired or within 1 hour of expiration
  return timeUntilExpiration <= oneHour;
}

/**
 * Rotate agent identity (generate new keys, invalidate old ones)
 */
export async function rotateAgentIdentity(
  oldIdentity: AgentIdentity,
  storageDir: string
): Promise<AgentIdentity> {
  // Extract agent name from old agentId
  const agentName = oldIdentity.agentId.split(':')[1];

  // Generate new identity
  const newIdentity = await generateAgentIdentity(oldIdentity.role, agentName);

  // Save new identity
  await saveAgentIdentity(newIdentity, storageDir);

  // Archive old identity (for audit trail)
  const archiveDir = path.join(storageDir, 'identities', 'archived', oldIdentity.role);
  await fs.mkdir(archiveDir, { recursive: true });

  const oldDir = path.join(storageDir, 'identities', oldIdentity.role);
  const safeOldAgentId = sanitizeAgentId(oldIdentity.agentId);
  const archivePath = path.join(archiveDir, `${safeOldAgentId}-${Date.now()}.json`);

  const archiveData = {
    agentId: oldIdentity.agentId,
    role: oldIdentity.role,
    createdAt: oldIdentity.createdAt.toISOString(),
    expiresAt: oldIdentity.expiresAt.toISOString(),
    rotatedAt: new Date().toISOString(),
    replacedBy: newIdentity.agentId,
  };

  await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));

  // Delete old keys (security best practice)
  await fs.unlink(path.join(oldDir, `${safeOldAgentId}.key`));
  await fs.unlink(path.join(oldDir, `${safeOldAgentId}.pub`));
  await fs.unlink(path.join(oldDir, `${safeOldAgentId}.json`));

  console.log(`🔄 Agent identity rotated: ${oldIdentity.agentId} -> ${newIdentity.agentId}`);
  console.log(`   Old identity archived: ${archivePath}`);

  return newIdentity;
}
