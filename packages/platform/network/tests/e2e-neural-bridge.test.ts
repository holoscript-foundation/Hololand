/**
 * Neural Ollama Bridge - End-to-End Test
 * 
 * Tests the full integration:
 * 1. NeuralOllamaBridge connects to Ollama
 * 2. AgentFactory creates various agent types
 * 3. Agents process state snapshots and generate thoughts
 * 4. RelayService coordinates agents in rooms
 * 
 * Run with: npx tsx tests/e2e-neural-bridge.test.ts
 */

import {
  NeuralOllamaBridge,
  AgentFactory,
  RelayService,
  createNeuralBridge,
  setupNeuralRoom,
} from '../src/index';
import type { StateSnapshot } from '../src/types';

// Test configuration
const TEST_CONFIG = {
  model: 'brittney:latest',
  baseUrl: 'http://localhost:11434',
  timeout: 60000, // 60 seconds for slow models
  temperature: 0.7,
};

// Sample state snapshot for testing
const sampleSnapshot: StateSnapshot = {
  timestamp: Date.now(),
  sequence: 1,
  states: [
    {
      objectId: 'player-001',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      timestamp: Date.now(),
      sequence: 1,
      metadata: { name: 'TestPlayer', type: 'player' },
    },
    {
      objectId: 'npc-shopkeeper',
      position: { x: 5, y: 0, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      timestamp: Date.now(),
      sequence: 1,
      metadata: { name: 'Shopkeeper', type: 'npc' },
    },
    {
      objectId: 'treasure-chest-01',
      position: { x: -2, y: 0, z: 7 },
      timestamp: Date.now(),
      sequence: 1,
      metadata: { type: 'interactive', contents: ['gold', 'potion'] },
    },
  ],
};

async function testOllamaConnection(): Promise<boolean> {
  console.log('\n📡 Testing Ollama connection...');
  const bridge = new NeuralOllamaBridge(TEST_CONFIG);
  
  const available = await bridge.isAvailable();
  if (!available) {
    console.error('❌ Ollama is not available at', TEST_CONFIG.baseUrl);
    return false;
  }
  
  console.log('✅ Ollama is available');
  
  const models = await bridge.listModels();
  console.log('📋 Available models:', models.join(', '));
  
  if (!models.some(m => m.includes('brittney'))) {
    console.warn('⚠️  Brittney model not found, tests may use fallback model');
  }
  
  return true;
}

async function testDirectQuery(): Promise<void> {
  console.log('\n🧠 Testing direct Ollama query...');
  const bridge = new NeuralOllamaBridge(TEST_CONFIG);
  
  const response = await bridge.query([
    { role: 'system', content: 'You are a helpful AI. Respond briefly.' },
    { role: 'user', content: 'What is HoloScript?' },
  ]);
  
  console.log('📝 Response:', response.slice(0, 200) + (response.length > 200 ? '...' : ''));
}

async function testAgentFactory(): Promise<void> {
  console.log('\n🏭 Testing AgentFactory...');
  const { bridge, factory } = createNeuralBridge(TEST_CONFIG);
  
  // Create different agent types
  const npc = factory.createNPC({
    id: 'npc-blacksmith',
    name: 'Grimjaw the Blacksmith',
    personality: 'Gruff but kind-hearted dwarf who loves crafting weapons',
    capabilities: ['dialogue', 'trade'],
  });
  console.log('✅ Created NPC:', npc.id, npc.type);
  
  const moderator = factory.createModerator({ id: 'mod-01' });
  console.log('✅ Created Moderator:', moderator.id, moderator.type);
  
  const assistant = factory.createAssistant({ id: 'helper-01', name: 'Aria' });
  console.log('✅ Created Assistant:', assistant.id, assistant.type);
  
  const guardian = factory.createGuardian({ id: 'guardian-01' });
  console.log('✅ Created Guardian:', guardian.id, guardian.type);
}

async function testAgentThinking(): Promise<void> {
  console.log('\n💭 Testing agent thought processing...');
  const { bridge, factory } = createNeuralBridge({
    ...TEST_CONFIG,
    maxTokens: 256,
  });
  
  // Create a test NPC
  const npc = factory.createNPC({
    id: 'test-npc',
    name: 'Friendly Guide',
    personality: 'Cheerful tour guide who loves helping newcomers explore the world',
    capabilities: ['dialogue', 'navigation'],
  });
  
  console.log('🎭 Agent:', npc.id);
  console.log('📍 Processing state snapshot...');
  
  const startTime = Date.now();
  await npc.processThought(sampleSnapshot);
  const elapsed = Date.now() - startTime;
  
  console.log(`⏱️  Thought processed in ${elapsed}ms`);
  
  // Check conversation history
  const history = bridge.getConversationHistory('test-npc');
  if (history.length > 0) {
    console.log('💬 Agent spoke:', history[history.length - 1].content.slice(0, 100));
  }
}

async function testRelayIntegration(): Promise<void> {
  console.log('\n🔗 Testing RelayService integration...');
  
  const relay = new RelayService({ enableAIAutonomy: true });
  
  const { bridge, factory, agents } = await setupNeuralRoom(relay, 'test-plaza', {
    ...TEST_CONFIG,
    agents: [
      { id: 'plaza-guide', type: 'assistant', name: 'Plaza Guide' },
      { id: 'plaza-guard', type: 'guardian', name: 'Gate Keeper' },
    ],
  });
  
  console.log(`✅ Set up room with ${agents.length} agents`);
  
  // Join a test client
  relay.joinRoom('test-plaza', 'client-001');
  console.log('👤 Client joined room');
  
  // Send a snapshot through the relay
  console.log('📤 Sending state snapshot to room...');
  relay.handleIncomingSnapshot('test-plaza', sampleSnapshot);
  
  // Wait for agent processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if agents responded
  for (const agent of agents) {
    const history = bridge.getConversationHistory(agent.id);
    console.log(`  ${agent.id}: ${history.length} conversation entries`);
  }
  
  // Clean up
  relay.leaveRoom('test-plaza', 'client-001');
  console.log('✅ Test room cleaned up');
}

async function testAgentMigration(): Promise<void> {
  console.log('\n🚀 Testing agent migration...');
  
  const relay = new RelayService({ enableAIAutonomy: true });
  const { bridge } = createNeuralBridge(TEST_CONFIG);
  
  const agent = bridge.createAgent({
    id: 'migrating-agent',
    type: 'npc',
    name: 'Wandering Merchant',
    personality: 'A traveling salesperson who moves between worlds',
  });
  
  relay.registerAgent('source-room', agent);
  console.log('📍 Agent registered in source-room');
  
  // Attempt migration
  const success = await relay.migrateAgent('source-room', 'migrating-agent', 'http://other-node:3000');
  console.log(success ? '✅ Migration successful' : '❌ Migration failed');
}

// Main test runner
async function runTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       NEURAL OLLAMA BRIDGE - END-TO-END TEST SUITE            ');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const tests = [
    { name: 'Ollama Connection', fn: testOllamaConnection, critical: true },
    { name: 'Direct Query', fn: testDirectQuery, critical: false },
    { name: 'Agent Factory', fn: testAgentFactory, critical: false },
    { name: 'Agent Thinking', fn: testAgentThinking, critical: false },
    { name: 'Relay Integration', fn: testRelayIntegration, critical: false },
    { name: 'Agent Migration', fn: testAgentMigration, critical: false },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (test.critical && result === false) {
        console.error(`\n🛑 Critical test "${test.name}" failed - stopping tests`);
        break;
      }
      passed++;
    } catch (error) {
      failed++;
      console.error(`\n❌ Test "${test.name}" failed:`, error instanceof Error ? error.message : error);
      if (test.critical) {
        console.error('🛑 Critical test failed - stopping tests');
        break;
      }
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(console.error);
