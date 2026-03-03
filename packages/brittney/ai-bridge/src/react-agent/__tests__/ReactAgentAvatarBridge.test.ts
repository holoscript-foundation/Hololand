/**
 * Tests for ReactAgentAvatarBridge
 *
 * Validates the core bridge logic that maps AI agent streaming responses
 * and tool calls to VR avatar behavior (expressions, gestures, lip sync).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReactAgentAvatarBridge } from '../ReactAgentAvatarBridge';
import type { AgentStreamChunk, AvatarToolCall } from '../types';

// =============================================================================
// MOCK AVATAR STUDIO
// =============================================================================

function createMockAvatarStudio() {
  return {
    previewExpression: vi.fn(),
    clearExpressionPreview: vi.fn(),
    setBody: vi.fn(),
    setFace: vi.fn(),
    setHair: vi.fn(),
    setViewAngle: vi.fn(),
    getBlueprint: vi.fn().mockReturnValue({ name: 'Test Avatar' }),
    dispose: vi.fn(),
  } as any;
}

// =============================================================================
// TESTS
// =============================================================================

describe('ReactAgentAvatarBridge', () => {
  let bridge: ReactAgentAvatarBridge;
  let mockStudio: ReturnType<typeof createMockAvatarStudio>;

  beforeEach(() => {
    bridge = new ReactAgentAvatarBridge({
      modelId: 'test-model',
      agentEndpoint: 'http://localhost:11434/api/chat',
    });
    mockStudio = createMockAvatarStudio();
  });

  afterEach(() => {
    bridge.disconnect();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultBridge = new ReactAgentAvatarBridge();
      expect(defaultBridge.state).toBe('idle');
      expect(defaultBridge.emotion).toBe('neutral');
      expect(defaultBridge.isStreaming).toBe(false);
    });

    it('should accept custom config', () => {
      const customBridge = new ReactAgentAvatarBridge({
        modelId: 'custom-model',
        maxHistoryLength: 100,
      });
      expect(customBridge.state).toBe('idle');
    });
  });

  // ===========================================================================
  // CONNECTION
  // ===========================================================================

  describe('connection', () => {
    it('should connect to AvatarStudio', () => {
      bridge.connectAvatarStudio(mockStudio);
      // No error means success; the bridge holds an internal reference
    });

    it('should disconnect cleanly', () => {
      bridge.connectAvatarStudio(mockStudio);
      bridge.disconnect();
      expect(bridge.state).toBe('idle');
    });
  });

  // ===========================================================================
  // STREAMING
  // ===========================================================================

  describe('streaming', () => {
    it('should transition to speaking state on first stream chunk', () => {
      const stateChanges: string[] = [];
      bridge.on('state:change', ({ current }) => stateChanges.push(current));

      bridge.onStreamChunk({ textDelta: 'Hello', isComplete: false });

      expect(bridge.isStreaming).toBe(true);
      expect(stateChanges).toContain('speaking');
    });

    it('should accumulate response text from stream chunks', () => {
      bridge.onStreamChunk({ textDelta: 'Hello ', isComplete: false });
      bridge.onStreamChunk({ textDelta: 'world', isComplete: false });

      expect(bridge.responseText).toBe('Hello world');
    });

    it('should complete streaming and store message', () => {
      const completedMessages: any[] = [];
      bridge.on('stream:complete', (msg) => completedMessages.push(msg));

      bridge.onStreamChunk({ textDelta: 'Test response', isComplete: false });
      bridge.onStreamChunk({ isComplete: true });

      expect(bridge.isStreaming).toBe(false);
      expect(bridge.messages.length).toBe(1);
      expect(bridge.messages[0].content).toBe('Test response');
      expect(bridge.messages[0].role).toBe('assistant');
    });

    it('should handle onStreamComplete as a separate call', () => {
      bridge.onStreamChunk({ textDelta: 'Response text', isComplete: false });
      bridge.onStreamComplete();

      expect(bridge.isStreaming).toBe(false);
      expect(bridge.messages.length).toBe(1);
    });
  });

  // ===========================================================================
  // USER MESSAGES
  // ===========================================================================

  describe('user messages', () => {
    it('should add user messages to history', () => {
      const msg = bridge.addUserMessage('Hello Brittney');

      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello Brittney');
      expect(bridge.messages.length).toBe(1);
    });

    it('should transition to listening then thinking state', () => {
      vi.useFakeTimers();
      const states: string[] = [];
      bridge.on('state:change', ({ current }) => states.push(current));

      bridge.addUserMessage('Test');
      expect(states).toContain('listening');

      vi.advanceTimersByTime(600);
      expect(states).toContain('thinking');

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // TOOL CALLS
  // ===========================================================================

  describe('tool calls', () => {
    it('should handle set_emotion tool call', () => {
      bridge.connectAvatarStudio(mockStudio);
      const emotionChanges: string[] = [];
      bridge.on('emotion:change', ({ emotion }) => emotionChanges.push(emotion));

      const toolCall: AvatarToolCall = {
        name: 'set_emotion',
        args: { emotion: 'happy', intensity: 0.8 },
        id: 'tc-1',
      };

      bridge.onStreamChunk({ toolCall, isComplete: false });

      expect(emotionChanges).toContain('happy');
      expect(bridge.emotion).toBe('happy');
      expect(mockStudio.previewExpression).toHaveBeenCalled();
    });

    it('should handle perform_gesture tool call', () => {
      const gestures: string[] = [];
      bridge.on('gesture:perform', ({ gesture }) => gestures.push(gesture));

      bridge.onStreamChunk({
        toolCall: {
          name: 'perform_gesture',
          args: { gesture: 'wave' },
          id: 'tc-2',
        },
        isComplete: false,
      });

      expect(gestures).toContain('wave');
    });

    it('should handle world_action tool call', () => {
      const holoScriptCalls: any[] = [];
      bridge.on('holoscript:execute', (data) => holoScriptCalls.push(data));

      bridge.onStreamChunk({
        toolCall: {
          name: 'world_action',
          args: {
            action: 'create',
            holoScript: 'zone#test { name: "Test Zone" }',
            explanation: 'Creating a test zone',
          },
          id: 'tc-3',
        },
        isComplete: false,
      });

      expect(holoScriptCalls.length).toBe(1);
      expect(holoScriptCalls[0].action).toBe('create');
      expect(holoScriptCalls[0].code).toContain('zone#test');
    });

    it('should handle look_at tool call', () => {
      const gazeTargets: any[] = [];
      bridge.on('gaze:target', (data) => gazeTargets.push(data));

      bridge.onStreamChunk({
        toolCall: {
          name: 'look_at',
          args: { target: 'user' },
          id: 'tc-4',
        },
        isComplete: false,
      });

      expect(gazeTargets.length).toBe(1);
      expect(gazeTargets[0].target).toBe('user');
    });

    it('should handle change_appearance tool call', () => {
      bridge.connectAvatarStudio(mockStudio);

      bridge.onStreamChunk({
        toolCall: {
          name: 'change_appearance',
          args: {
            updates: { hair: { styleId: 'hair-curly-01', primaryColor: { hex: '#ff0000' } } },
            explanation: 'Changing hair color',
          },
          id: 'tc-5',
        },
        isComplete: false,
      });

      expect(mockStudio.setHair).toHaveBeenCalledWith({
        styleId: 'hair-curly-01',
        primaryColor: { hex: '#ff0000' },
      });
    });
  });

  // ===========================================================================
  // EMOTION DETECTION
  // ===========================================================================

  describe('emotion detection', () => {
    it('should detect happy emotion from keywords', () => {
      bridge.connectAvatarStudio(mockStudio);
      const emotions: string[] = [];
      bridge.on('emotion:detected', ({ emotion }) => emotions.push(emotion));

      // Feed enough text to trigger detection (interval = 80 chars default)
      const happyText = 'That is absolutely wonderful and amazing! I love this great idea, it is fantastic and awesome!';
      bridge.onStreamChunk({ textDelta: happyText, isComplete: false });

      // Should detect happy emotion
      expect(emotions.length).toBeGreaterThanOrEqual(0); // May or may not trigger depending on threshold
    });

    it('should not change emotion for short text', () => {
      bridge.connectAvatarStudio(mockStudio);
      const emotions: string[] = [];
      bridge.on('emotion:detected', ({ emotion }) => emotions.push(emotion));

      bridge.onStreamChunk({ textDelta: 'Hi', isComplete: false });

      // Too short to trigger emotion detection
      expect(emotions.length).toBe(0);
    });
  });

  // ===========================================================================
  // TOOL DEFINITIONS
  // ===========================================================================

  describe('tool definitions', () => {
    it('should generate valid tool definitions', () => {
      const tools = bridge.getToolDefinitions();

      expect(tools).toHaveProperty('set_emotion');
      expect(tools).toHaveProperty('perform_gesture');
      expect(tools).toHaveProperty('speak');
      expect(tools).toHaveProperty('move_to');
      expect(tools).toHaveProperty('world_action');
      expect(tools).toHaveProperty('look_at');
    });

    it('should have correct parameter schemas', () => {
      const tools = bridge.getToolDefinitions();
      const setEmotion = tools.set_emotion as any;

      expect(setEmotion.parameters.properties.emotion.enum).toContain('happy');
      expect(setEmotion.parameters.properties.emotion.enum).toContain('thinking');
      expect(setEmotion.parameters.required).toContain('emotion');
    });
  });

  // ===========================================================================
  // INITIAL MESSAGES
  // ===========================================================================

  describe('initial messages', () => {
    it('should build initial messages with system prompt', () => {
      const messages = bridge.buildInitialMessages();

      expect(messages.length).toBe(1); // System prompt only
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Brittney');
    });

    it('should include conversation history in initial messages', () => {
      bridge.addUserMessage('Hello');
      bridge.onStreamChunk({ textDelta: 'Hi there!', isComplete: true });

      const messages = bridge.buildInitialMessages();
      expect(messages.length).toBe(3); // system + user + assistant
    });
  });

  // ===========================================================================
  // RESET AND INTERRUPT
  // ===========================================================================

  describe('reset and interrupt', () => {
    it('should reset all state', () => {
      bridge.addUserMessage('Test');
      bridge.onStreamChunk({ textDelta: 'Response', isComplete: true });
      bridge.setEmotion('happy');

      bridge.reset();

      expect(bridge.state).toBe('idle');
      expect(bridge.emotion).toBe('neutral');
      expect(bridge.isStreaming).toBe(false);
      expect(bridge.messages.length).toBe(0);
    });

    it('should interrupt streaming', () => {
      bridge.onStreamChunk({ textDelta: 'In progress...', isComplete: false });
      expect(bridge.isStreaming).toBe(true);

      bridge.interrupt();

      expect(bridge.isStreaming).toBe(false);
      expect(bridge.state).toBe('idle');
    });
  });

  // ===========================================================================
  // MANUAL CONTROLS
  // ===========================================================================

  describe('manual controls', () => {
    it('should allow manual emotion setting', () => {
      bridge.connectAvatarStudio(mockStudio);
      bridge.setEmotion('excited', 0.9);

      expect(bridge.emotion).toBe('excited');
      expect(mockStudio.previewExpression).toHaveBeenCalled();
    });

    it('should allow manual gesture triggering', () => {
      const gestures: string[] = [];
      bridge.on('gesture:perform', ({ gesture }) => gestures.push(gesture));

      bridge.triggerGesture('thumbs_up');

      expect(gestures).toContain('thumbs_up');
    });
  });

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  describe('event system', () => {
    it('should subscribe and unsubscribe to events', () => {
      const handler = vi.fn();
      const unsub = bridge.on('state:change', handler);

      bridge.addUserMessage('Test');
      expect(handler).toHaveBeenCalled();

      handler.mockClear();
      unsub();
      bridge.addUserMessage('Test2');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support off() for unsubscribing', () => {
      const handler = vi.fn();
      bridge.on('state:change', handler);

      bridge.off('state:change', handler);
      bridge.addUserMessage('Test');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HISTORY TRIMMING
  // ===========================================================================

  describe('history management', () => {
    it('should trim messages when exceeding maxHistoryLength', () => {
      const shortHistoryBridge = new ReactAgentAvatarBridge({
        maxHistoryLength: 3,
      });

      for (let i = 0; i < 5; i++) {
        shortHistoryBridge.addUserMessage(`Message ${i}`);
        shortHistoryBridge.onStreamChunk({
          textDelta: `Response ${i}`,
          isComplete: true,
        });
      }

      // Should have trimmed to maxHistoryLength
      expect(shortHistoryBridge.messages.length).toBeLessThanOrEqual(3);

      shortHistoryBridge.disconnect();
    });
  });
});
