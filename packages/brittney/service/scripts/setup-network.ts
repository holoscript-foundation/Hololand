#!/usr/bin/env node
/**
 * Brittney Network Setup Script
 *
 * Sets up a private Brittney network with master key authentication.
 *
 * Usage:
 *   npx tsx scripts/setup-network.ts           # Interactive setup
 *   npx tsx scripts/setup-network.ts --generate-key
 *   npx tsx scripts/setup-network.ts --show-config
 *   npx tsx scripts/setup-network.ts --add-client <name>
 */

import { randomBytes, createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// Constants
// =============================================================================

const CONFIG_DIR = join(homedir(), '.hololand');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const KEYS_FILE = join(CONFIG_DIR, 'network-keys.json');

interface NetworkConfig {
  masterKey: string;
  networkId: string;
  mode: 'private' | 'public' | 'hybrid';
  clients: ClientKey[];
  created: string;
  lastModified: string;
}

interface ClientKey {
  id: string;
  name: string;
  key: string;
  permissions: ('inference' | 'admin' | 'read-only')[];
  created: string;
  lastUsed?: string;
}

// =============================================================================
// Key Generation
// =============================================================================

function generateSecureKey(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

function generateNetworkId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `hololand-${timestamp}-${random}`;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').substring(0, 16);
}

// =============================================================================
// Config Management
// =============================================================================

function loadNetworkConfig(): NetworkConfig | null {
  if (!existsSync(KEYS_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(KEYS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveNetworkConfig(config: NetworkConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  config.lastModified = new Date().toISOString();
  writeFileSync(KEYS_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function loadBrittneyConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveBrittneyConfig(config: Record<string, unknown>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// =============================================================================
// Commands
// =============================================================================

function initializeNetwork(mode: 'private' | 'public' | 'hybrid' = 'private'): NetworkConfig {
  const existing = loadNetworkConfig();
  if (existing) {
    console.log('⚠️  Network already initialized. Use --reset to reinitialize.');
    return existing;
  }

  const masterKey = generateSecureKey(48);
  const networkId = generateNetworkId();

  const config: NetworkConfig = {
    masterKey,
    networkId,
    mode,
    clients: [],
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };

  saveNetworkConfig(config);

  // Update Brittney config with admin key
  const brittneyConfig = loadBrittneyConfig();
  brittneyConfig.adminApiKey = masterKey;
  brittneyConfig.disallowPublicCloudAccess = mode === 'private';
  brittneyConfig.networkMode = mode;
  saveBrittneyConfig(brittneyConfig);

  console.log('');
  console.log('✨ Brittney Network Initialized');
  console.log('================================');
  console.log('');
  console.log(`Network ID: ${networkId}`);
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log('');
  console.log('🔐 MASTER KEY (save this securely!):');
  console.log('');
  console.log(`   ${masterKey}`);
  console.log('');
  console.log('⚠️  This key will NOT be shown again.');
  console.log('');
  console.log('To connect clients, use:');
  console.log(`   npx tsx scripts/setup-network.ts --add-client "Friend Name"`);
  console.log('');

  return config;
}

function addClient(name: string, permissions: ClientKey['permissions'] = ['inference']): ClientKey | null {
  const config = loadNetworkConfig();
  if (!config) {
    console.error('❌ Network not initialized. Run setup first.');
    return null;
  }

  const clientKey = generateSecureKey(32);
  const clientId = `client-${hashKey(clientKey)}`;

  const client: ClientKey = {
    id: clientId,
    name,
    key: clientKey,
    permissions,
    created: new Date().toISOString(),
  };

  config.clients.push(client);
  saveNetworkConfig(config);

  console.log('');
  console.log('✅ Client Added Successfully');
  console.log('============================');
  console.log('');
  console.log(`Name: ${name}`);
  console.log(`ID: ${clientId}`);
  console.log(`Permissions: ${permissions.join(', ')}`);
  console.log('');
  console.log('🔑 CLIENT KEY (share this with the user):');
  console.log('');
  console.log(`   ${clientKey}`);
  console.log('');
  console.log('Connection instructions for the client:');
  console.log('');
  console.log('1. Set environment variable:');
  console.log(`   export BRITTNEY_AUTH_KEY="${clientKey}"`);
  console.log('');
  console.log('2. Or add to ~/.hololand/config.json:');
  console.log(`   { "authKey": "${clientKey}" }`);
  console.log('');
  console.log('3. Or pass as header when making requests:');
  console.log(`   Authorization: Bearer ${clientKey}`);
  console.log('');

  return client;
}

function listClients(): void {
  const config = loadNetworkConfig();
  if (!config) {
    console.error('❌ Network not initialized.');
    return;
  }

  console.log('');
  console.log('📋 Network Clients');
  console.log('==================');
  console.log('');

  if (config.clients.length === 0) {
    console.log('No clients registered yet.');
    console.log('Use: npx tsx scripts/setup-network.ts --add-client "Name"');
  } else {
    for (const client of config.clients) {
      console.log(`• ${client.name}`);
      console.log(`  ID: ${client.id}`);
      console.log(`  Permissions: ${client.permissions.join(', ')}`);
      console.log(`  Created: ${client.created}`);
      if (client.lastUsed) {
        console.log(`  Last Used: ${client.lastUsed}`);
      }
      console.log('');
    }
  }

  console.log(`Network Mode: ${config.mode.toUpperCase()}`);
  console.log(`Network ID: ${config.networkId}`);
  console.log('');
}

function revokeClient(clientId: string): boolean {
  const config = loadNetworkConfig();
  if (!config) {
    console.error('❌ Network not initialized.');
    return false;
  }

  const index = config.clients.findIndex(c => c.id === clientId || c.name === clientId);
  if (index === -1) {
    console.error(`❌ Client not found: ${clientId}`);
    return false;
  }

  const removed = config.clients.splice(index, 1)[0];
  saveNetworkConfig(config);

  console.log(`✅ Revoked access for: ${removed.name} (${removed.id})`);
  return true;
}

function showConfig(): void {
  const networkConfig = loadNetworkConfig();
  const brittneyConfig = loadBrittneyConfig();

  console.log('');
  console.log('🔧 Current Configuration');
  console.log('========================');
  console.log('');

  if (networkConfig) {
    console.log('Network Status: ✅ Initialized');
    console.log(`Network ID: ${networkConfig.networkId}`);
    console.log(`Mode: ${networkConfig.mode.toUpperCase()}`);
    console.log(`Clients: ${networkConfig.clients.length}`);
    console.log(`Created: ${networkConfig.created}`);
  } else {
    console.log('Network Status: ❌ Not Initialized');
  }

  console.log('');
  console.log('Brittney Config (~/.hololand/config.json):');
  console.log(`  Admin Key: ${brittneyConfig.adminApiKey ? '✅ Set' : '❌ Not Set'}`);
  console.log(`  Disallow Public Cloud: ${brittneyConfig.disallowPublicCloudAccess ?? 'default (true)'}`);
  console.log(`  Port: ${brittneyConfig.port || 11435}`);
  console.log(`  Host: ${brittneyConfig.host || 'localhost'}`);
  console.log('');
}

function generateEnvFile(): void {
  const config = loadNetworkConfig();
  if (!config) {
    console.error('❌ Network not initialized.');
    return;
  }

  const envContent = `# Brittney Network Configuration
# Generated: ${new Date().toISOString()}
# Network: ${config.networkId}

# Master admin key (keep secret!)
BRITTNEY_ADMIN_KEY=${config.masterKey}

# Server settings
BRITTNEY_PORT=11435
BRITTNEY_HOST=0.0.0.0

# Security (private mode blocks unauthenticated cloud access)
BRITTNEY_DISALLOW_PUBLIC_CLOUD=true

# Optional: Cloud fallback (requires authenticated admin)
# BRITTNEY_CLOUD_PROVIDER=openai
# OPENAI_API_KEY=your-key-here
`;

  const envPath = join(CONFIG_DIR, '.env.brittney');
  writeFileSync(envPath, envContent, 'utf-8');

  console.log('');
  console.log('✅ Environment file generated');
  console.log(`   Location: ${envPath}`);
  console.log('');
  console.log('To use:');
  console.log(`   source ${envPath}`);
  console.log('   # or');
  console.log(`   export $(cat ${envPath} | xargs)`);
  console.log('');
}

// =============================================================================
// CLI
// =============================================================================

function printHelp(): void {
  console.log(`
Brittney Network Setup
======================

Commands:
  --init [mode]         Initialize network (mode: private, public, hybrid)
  --generate-key        Generate a new secure key
  --add-client <name>   Add a client with inference permissions
  --add-admin <name>    Add a client with admin permissions
  --list-clients        List all registered clients
  --revoke <id|name>    Revoke client access
  --show-config         Show current configuration
  --generate-env        Generate .env file for server
  --reset               Reset network (WARNING: revokes all access)
  --help                Show this help

Examples:
  npx tsx scripts/setup-network.ts --init private
  npx tsx scripts/setup-network.ts --add-client "My Friend"
  npx tsx scripts/setup-network.ts --list-clients
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printHelp();
    return;
  }

  if (args.includes('--init')) {
    const modeIndex = args.indexOf('--init') + 1;
    const mode = (args[modeIndex] as 'private' | 'public' | 'hybrid') || 'private';
    initializeNetwork(mode);
    return;
  }

  if (args.includes('--generate-key')) {
    const key = generateSecureKey(32);
    console.log(`Generated key: ${key}`);
    return;
  }

  if (args.includes('--add-client')) {
    const nameIndex = args.indexOf('--add-client') + 1;
    const name = args[nameIndex];
    if (!name || name.startsWith('--')) {
      console.error('Please provide a client name');
      return;
    }
    addClient(name, ['inference']);
    return;
  }

  if (args.includes('--add-admin')) {
    const nameIndex = args.indexOf('--add-admin') + 1;
    const name = args[nameIndex];
    if (!name || name.startsWith('--')) {
      console.error('Please provide a client name');
      return;
    }
    addClient(name, ['inference', 'admin']);
    return;
  }

  if (args.includes('--list-clients')) {
    listClients();
    return;
  }

  if (args.includes('--revoke')) {
    const idIndex = args.indexOf('--revoke') + 1;
    const id = args[idIndex];
    if (!id || id.startsWith('--')) {
      console.error('Please provide a client ID or name');
      return;
    }
    revokeClient(id);
    return;
  }

  if (args.includes('--show-config')) {
    showConfig();
    return;
  }

  if (args.includes('--generate-env')) {
    generateEnvFile();
    return;
  }

  if (args.includes('--reset')) {
    const config = loadNetworkConfig();
    if (config) {
      console.log('⚠️  This will revoke ALL client access.');
      console.log('   To confirm, delete ~/.hololand/network-keys.json manually.');
    } else {
      console.log('No network to reset.');
    }
    return;
  }

  printHelp();
}

main().catch(console.error);
