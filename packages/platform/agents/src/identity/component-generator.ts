/**
 * Component Generator Agent
 *
 * Autonomous agent for generating React/Vue/Angular components with
 * cryptographic identity and RBAC enforcement.
 *
 * Permissions:
 * - Write JSX/TSX to src/components/
 * - Read component library
 * - Create new components
 * - Update existing components
 */

import * as path from 'path';
import * as fs from 'fs/promises';
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
  validateComponentGeneratorAccess,
  createRBACEnforcer,
} from '../core/rbac-system';

export interface ComponentGeneratorConfig {
  agentName: string;
  storageDir: string;
  projectRoot: string;
  componentLibraryPath: string;
}

export class ComponentGeneratorAgent {
  private identity: AgentIdentity | null = null;
  private token: string | null = null;
  private rbac: RBACEnforcer | null = null;
  private config: ComponentGeneratorConfig;

  constructor(config: ComponentGeneratorConfig) {
    this.config = config;
  }

  /**
   * Initialize agent (load or create identity)
   */
  public async initialize(): Promise<void> {
    console.log('🤖 Initializing Component Generator Agent...');

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
          AgentRole.COMPONENT_GENERATOR,
          this.config.agentName
        );
        await saveAgentIdentity(this.identity, this.config.storageDir);
        console.log(`✅ Created new identity: ${this.identity.agentId}`);
      }
    } catch (error) {
      // Generate new identity on error
      console.log('⚠️ No existing identity found, generating new one...');
      this.identity = await generateAgentIdentity(
        AgentRole.COMPONENT_GENERATOR,
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
      AgentRole.COMPONENT_GENERATOR
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
   * Create a new component
   */
  public async createComponent(
    componentName: string,
    framework: 'react' | 'vue' | 'angular',
    componentCode: string
  ): Promise<void> {
    if (!this.identity || !this.token || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Determine file extension
    const extension = framework === 'react' ? '.tsx' : framework === 'vue' ? '.vue' : '.ts';
    const filePath = path.join(
      this.config.projectRoot,
      'src',
      'components',
      `${componentName}${extension}`
    );

    // Check RBAC permissions
    const decision = await validateComponentGeneratorAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      filePath,
      'create'
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write component file
    await fs.writeFile(filePath, componentCode, 'utf-8');
    console.log(`✅ Component created: ${filePath}`);
  }

  /**
   * Update existing component
   */
  public async updateComponent(
    componentPath: string,
    updatedCode: string
  ): Promise<void> {
    if (!this.identity || !this.token || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const absolutePath = path.isAbsolute(componentPath)
      ? componentPath
      : path.join(this.config.projectRoot, componentPath);

    // Check RBAC permissions
    const decision = await validateComponentGeneratorAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      absolutePath,
      'update'
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Check file exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`Component not found: ${componentPath}`);
    }

    // Update component
    await fs.writeFile(absolutePath, updatedCode, 'utf-8');
    console.log(`✅ Component updated: ${absolutePath}`);
  }

  /**
   * Read component library for reference
   */
  public async readComponentLibrary(): Promise<string[]> {
    if (!this.identity || !this.token || !this.rbac) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const libraryPath = path.join(
      this.config.projectRoot,
      this.config.componentLibraryPath
    );

    // Check RBAC permissions
    const decision = await validateComponentGeneratorAccess(
      this.rbac,
      {
        agentId: this.identity.agentId,
        role: this.identity.role,
        permissions: this.identity.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(this.identity.expiresAt.getTime() / 1000),
        jti: 'dummy-jti',
      },
      libraryPath,
      'read'
    );

    if (!decision.allowed) {
      throw new Error(`Access denied: ${decision.reason}`);
    }

    // Read library
    const files = await fs.readdir(libraryPath, { recursive: true });
    return files
      .filter((f) => typeof f === 'string')
      .filter((f) => /\.(jsx|tsx|vue)$/.test(f));
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
   * Get JWT token for API calls
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
export async function exampleComponentGeneratorUsage() {
  const agent = new ComponentGeneratorAgent({
    agentName: 'main-component-generator',
    storageDir: '/path/to/.agent-identity',
    projectRoot: '/path/to/project',
    componentLibraryPath: 'component-library',
  });

  // Initialize
  await agent.initialize();

  // Create a React component
  const reactComponent = `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button onClick={onClick} className="btn btn-primary">
      {label}
    </button>
  );
};
  `.trim();

  await agent.createComponent('Button', 'react', reactComponent);

  // Read component library for inspiration
  const libraryComponents = await agent.readComponentLibrary();
  console.log('Component library:', libraryComponents);

  // Update component
  const updatedComponent = reactComponent.replace(
    'btn-primary',
    'btn-primary btn-lg'
  );
  await agent.updateComponent('src/components/Button.tsx', updatedComponent);

  // Check identity status
  const info = agent.getIdentityInfo();
  console.log('Identity info:', info);
}
