/**
 * Automated Credential Rotation System
 *
 * Manages 24-hour credential lifecycle for all agents:
 * - Monitors expiration times
 * - Automatically rotates credentials before expiration
 * - Sends notifications for rotation events
 * - Maintains audit trail of all rotations
 *
 * Security features:
 * - Zero-downtime rotation
 * - Graceful period for token transition
 * - Automatic cleanup of expired credentials
 * - Revocation list for compromised tokens
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AgentRole,
  AgentIdentity,
  loadAgentIdentity,
  needsRotation,
  rotateAgentIdentity,
} from './crypto-identity';

export interface RotationConfig {
  storageDir: string;
  checkInterval: number; // milliseconds
  rotationWindow: number; // milliseconds before expiration to rotate
  notificationWebhook?: string;
}

export interface RotationEvent {
  timestamp: Date;
  agentId: string;
  role: AgentRole;
  oldIdentity: string;
  newIdentity: string;
  reason: 'scheduled' | 'manual' | 'compromised';
  success: boolean;
  error?: string;
}

export class CredentialRotationManager {
  private config: RotationConfig;
  private rotationHistory: RotationEvent[] = [];
  private intervalHandle: NodeJS.Timeout | null = null;
  private revokedTokens: Set<string> = new Set();

  constructor(config: RotationConfig) {
    this.config = config;
  }

  /**
   * Start automated rotation monitoring
   */
  public async start(): Promise<void> {
    console.log('🔄 Starting credential rotation manager...');

    // Load revocation list
    await this.loadRevocationList();

    // Initial check
    await this.checkAndRotateAll();

    // Schedule periodic checks
    this.intervalHandle = setInterval(
      () => this.checkAndRotateAll(),
      this.config.checkInterval
    );

    console.log(
      `✅ Rotation manager started (check interval: ${this.config.checkInterval}ms)`
    );
  }

  /**
   * Stop rotation monitoring
   */
  public stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('⏸️ Rotation manager stopped');
    }
  }

  /**
   * Check all agents and rotate if needed
   */
  private async checkAndRotateAll(): Promise<void> {
    console.log('🔍 Checking all agents for rotation needs...');

    const roles = [
      AgentRole.COMPONENT_GENERATOR,
      AgentRole.TESTING_AGENT,
      AgentRole.DEPLOYMENT_AGENT,
    ];

    for (const role of roles) {
      await this.checkRoleIdentities(role);
    }
  }

  /**
   * Check all identities for a specific role
   */
  private async checkRoleIdentities(role: AgentRole): Promise<void> {
    const identityDir = path.join(this.config.storageDir, 'identities', role);

    try {
      const files = await fs.readdir(identityDir);
      const metadataFiles = files.filter((f) => f.endsWith('.json'));

      for (const metadataFile of metadataFiles) {
        const agentId = metadataFile.replace('.json', '');
        await this.checkAndRotateIdentity(agentId);
      }
    } catch (error) {
      console.warn(`⚠️ Could not check identities for role ${role}:`, error);
    }
  }

  /**
   * Check and rotate a specific identity if needed
   */
  private async checkAndRotateIdentity(agentId: string): Promise<void> {
    try {
      // Load identity
      const identity = await loadAgentIdentity(agentId, this.config.storageDir);

      // Check if rotation needed
      if (this.shouldRotate(identity)) {
        console.log(`🔄 Rotating credentials for ${agentId}...`);
        await this.rotateIdentity(identity, 'scheduled');
      }
    } catch (error: any) {
      console.error(`❌ Failed to check/rotate ${agentId}:`, error.message);
    }
  }

  /**
   * Determine if identity should be rotated
   */
  private shouldRotate(identity: AgentIdentity): boolean {
    const now = new Date();
    const timeUntilExpiration = identity.expiresAt.getTime() - now.getTime();

    // Rotate if within rotation window (default: 1 hour before expiration)
    return timeUntilExpiration <= this.config.rotationWindow;
  }

  /**
   * Rotate an identity
   */
  private async rotateIdentity(
    identity: AgentIdentity,
    reason: 'scheduled' | 'manual' | 'compromised'
  ): Promise<void> {
    const event: RotationEvent = {
      timestamp: new Date(),
      agentId: identity.agentId,
      role: identity.role,
      oldIdentity: identity.agentId,
      newIdentity: '',
      reason,
      success: false,
    };

    try {
      // Perform rotation
      const newIdentity = await rotateAgentIdentity(
        identity,
        this.config.storageDir
      );

      event.newIdentity = newIdentity.agentId;
      event.success = true;

      console.log(
        `✅ Rotated ${identity.role}: ${identity.agentId} -> ${newIdentity.agentId}`
      );

      // Add old identity to revocation list
      this.revokedTokens.add(identity.agentId);
      await this.saveRevocationList();

      // Send notification
      await this.notifyRotation(event);
    } catch (error: any) {
      event.error = error.message;
      event.success = false;

      console.error(`❌ Rotation failed for ${identity.agentId}:`, error.message);
    } finally {
      // Record event
      this.rotationHistory.push(event);
      await this.saveRotationHistory();
    }
  }

  /**
   * Manually rotate an identity
   */
  public async manualRotate(agentId: string): Promise<void> {
    console.log(`🔄 Manual rotation requested for ${agentId}...`);

    const identity = await loadAgentIdentity(agentId, this.config.storageDir);
    await this.rotateIdentity(identity, 'manual');
  }

  /**
   * Revoke compromised identity
   */
  public async revokeCompromised(agentId: string): Promise<void> {
    console.log(`⚠️ Revoking compromised identity: ${agentId}...`);

    const identity = await loadAgentIdentity(agentId, this.config.storageDir);

    // Add to revocation list immediately
    this.revokedTokens.add(agentId);
    await this.saveRevocationList();

    // Rotate to new credentials
    await this.rotateIdentity(identity, 'compromised');

    console.log(`✅ Compromised identity revoked and rotated: ${agentId}`);
  }

  /**
   * Check if token is revoked
   */
  public isRevoked(agentId: string): boolean {
    return this.revokedTokens.has(agentId);
  }

  /**
   * Save revocation list
   */
  private async saveRevocationList(): Promise<void> {
    const revocationPath = path.join(
      this.config.storageDir,
      'revocation-list.json'
    );

    const data = {
      updatedAt: new Date().toISOString(),
      revokedTokens: Array.from(this.revokedTokens),
    };

    await fs.writeFile(revocationPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load revocation list
   */
  private async loadRevocationList(): Promise<void> {
    const revocationPath = path.join(
      this.config.storageDir,
      'revocation-list.json'
    );

    try {
      const content = await fs.readFile(revocationPath, 'utf-8');
      const data = JSON.parse(content);
      this.revokedTokens = new Set(data.revokedTokens);
      console.log(`📋 Loaded ${this.revokedTokens.size} revoked tokens`);
    } catch {
      this.revokedTokens = new Set();
      console.log('📋 No existing revocation list found');
    }
  }

  /**
   * Save rotation history
   */
  private async saveRotationHistory(): Promise<void> {
    const historyPath = path.join(
      this.config.storageDir,
      'rotation-history.json'
    );

    const data = {
      totalRotations: this.rotationHistory.length,
      lastRotation: this.rotationHistory[this.rotationHistory.length - 1],
      history: this.rotationHistory,
    };

    await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
  }

  /**
   * Send rotation notification (webhook)
   */
  private async notifyRotation(event: RotationEvent): Promise<void> {
    if (!this.config.notificationWebhook) {
      return;
    }

    try {
      await fetch(this.config.notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credential_rotation',
          event,
        }),
      });
    } catch (error) {
      console.warn('⚠️ Failed to send rotation notification:', error);
    }
  }

  /**
   * Get rotation statistics
   */
  public getStatistics(): {
    totalRotations: number;
    successfulRotations: number;
    failedRotations: number;
    revokedTokens: number;
    lastRotation?: RotationEvent;
  } {
    const successful = this.rotationHistory.filter((e) => e.success).length;
    const failed = this.rotationHistory.filter((e) => !e.success).length;

    return {
      totalRotations: this.rotationHistory.length,
      successfulRotations: successful,
      failedRotations: failed,
      revokedTokens: this.revokedTokens.size,
      lastRotation: this.rotationHistory[this.rotationHistory.length - 1],
    };
  }

  /**
   * Get rotation history for specific agent or role
   */
  public getHistory(filter?: {
    agentId?: string;
    role?: AgentRole;
    startDate?: Date;
    endDate?: Date;
  }): RotationEvent[] {
    let filtered = this.rotationHistory;

    if (filter?.agentId) {
      filtered = filtered.filter(
        (e) => e.agentId === filter.agentId || e.newIdentity === filter.agentId
      );
    }

    if (filter?.role) {
      filtered = filtered.filter((e) => e.role === filter.role);
    }

    if (filter?.startDate) {
      filtered = filtered.filter((e) => e.timestamp >= filter.startDate!);
    }

    if (filter?.endDate) {
      filtered = filtered.filter((e) => e.timestamp <= filter.endDate!);
    }

    return filtered;
  }

  /**
   * Export rotation history
   */
  public async exportHistory(outputPath: string): Promise<void> {
    const data = {
      exportedAt: new Date().toISOString(),
      statistics: this.getStatistics(),
      history: this.rotationHistory,
      revokedTokens: Array.from(this.revokedTokens),
    };

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Rotation history exported to: ${outputPath}`);
  }
}

/**
 * Create rotation manager with default config
 */
export function createRotationManager(
  storageDir: string,
  options?: {
    checkInterval?: number;
    rotationWindow?: number;
    notificationWebhook?: string;
  }
): CredentialRotationManager {
  const config: RotationConfig = {
    storageDir,
    checkInterval: options?.checkInterval || 60 * 60 * 1000, // 1 hour
    rotationWindow: options?.rotationWindow || 60 * 60 * 1000, // 1 hour before expiration
    notificationWebhook: options?.notificationWebhook,
  };

  return new CredentialRotationManager(config);
}

/**
 * Example usage
 */
export async function exampleRotationManagerUsage() {
  // Create rotation manager
  const manager = createRotationManager('/path/to/.agent-identity', {
    checkInterval: 60 * 60 * 1000, // Check every hour
    rotationWindow: 60 * 60 * 1000, // Rotate 1 hour before expiration
    notificationWebhook: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  });

  // Start automated rotation
  await manager.start();

  // Manual rotation
  await manager.manualRotate('component-generator:main:abc123');

  // Revoke compromised identity
  await manager.revokeCompromised('testing-agent:ci:def456');

  // Check if token is revoked
  const isRevoked = manager.isRevoked('testing-agent:ci:def456');
  console.log('Is revoked:', isRevoked);

  // Get statistics
  const stats = manager.getStatistics();
  console.log('Rotation statistics:', stats);

  // Get history for specific role
  const history = manager.getHistory({
    role: AgentRole.DEPLOYMENT_AGENT,
  });
  console.log('Deployment agent rotation history:', history);

  // Export history
  await manager.exportHistory('/path/to/rotation-history-export.json');

  // Stop rotation manager (when shutting down)
  manager.stop();
}
