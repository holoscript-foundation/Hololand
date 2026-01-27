/**
 * BrittneyVRBridge
 * 
 * Connects Brittney AI assistant to the MCP mesh orchestrator for VR/XR integration.
 * Enables voice control, gesture actions, and cross-workspace tool access.
 */

import { HoloScriptRuntime } from '@holoscript/core';

export interface BrittneyVRConfig {
  meshUrl: string;
  agentId: string;
  voiceEnabled: boolean;
  gestureEnabled: boolean;
}

export interface GestureAction {
  gesture: 'wave' | 'point' | 'thumbsUp' | 'thumbsDown' | 'peace' | 'fist';
  action: string;
  args?: Record<string, unknown>;
}

const DEFAULT_GESTURE_ACTIONS: GestureAction[] = [
  { gesture: 'wave', action: 'brittney_greet', args: {} },
  { gesture: 'point', action: 'brittney_describe_target', args: {} },
  { gesture: 'thumbsUp', action: 'brittney_approve', args: {} },
  { gesture: 'thumbsDown', action: 'brittney_reject', args: {} },
  { gesture: 'peace', action: 'brittney_screenshot', args: {} },
  { gesture: 'fist', action: 'scene_reset', args: {} }
];

export class BrittneyVRBridge {
  private config: BrittneyVRConfig;
  private runtime: HoloScriptRuntime;
  private gestureActions: GestureAction[];
  private isXRSession = false;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;

  constructor(runtime: HoloScriptRuntime, config?: Partial<BrittneyVRConfig>) {
    this.runtime = runtime;
    this.config = {
      meshUrl: config?.meshUrl || 'http://localhost:5555',
      agentId: config?.agentId || 'brittney-vr',
      voiceEnabled: config?.voiceEnabled ?? true,
      gestureEnabled: config?.gestureEnabled ?? true
    };
    this.gestureActions = [...DEFAULT_GESTURE_ACTIONS];
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.setupVoice();
  }

  /**
   * Initialize voice recognition
   */
  private setupVoice(): void {
    if (!this.config.voiceEnabled || typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[BrittneyVR] Speech recognition not available');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('[BrittneyVR] Voice input:', transcript);
      const response = await this.chat(transcript);
      this.speak(response);
    };

    this.recognition.onerror = (event) => {
      console.error('[BrittneyVR] Speech error:', event.error);
    };
  }

  /**
   * Start listening for voice input
   */
  startListening(): void {
    if (this.recognition) {
      this.recognition.start();
      console.log('[BrittneyVR] Listening...');
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Speak a response
   */
  speak(text: string): void {
    if (!this.synthesis) return;

    // Cancel any pending speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;

    // Use a natural voice if available
    const voices = this.synthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Female'));
    if (preferred) {
      utterance.voice = preferred;
    }

    this.synthesis.speak(utterance);
  }

  /**
   * Chat with Brittney via mesh
   */
  async chat(message: string): Promise<string> {
    try {
      // Get scene context
      const context = this.getSceneContext();

      // Call mesh tool
      const response = await fetch(`${this.config.meshUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'brittney-mcp',
          tool: 'brittney_chat',
          args: {
            message,
            context
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Mesh call failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        // Execute any action tags in response
        this.executeActionTags(data.result.response || data.result);
        return data.result.response || data.result;
      }

      return 'I had trouble processing that. Try again?';
    } catch (error) {
      console.error('[BrittneyVR] Chat error:', error);
      return 'I\'m offline right now. Please check mesh connection.';
    }
  }

  /**
   * Generate HoloScript code from natural language
   */
  async generateHoloScript(description: string): Promise<{ success: boolean; code: string }> {
    try {
      const response = await fetch(`${this.config.meshUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'holoscript-mcp',
          tool: 'generate_scene',
          args: { description }
        })
      });

      if (!response.ok) {
        throw new Error(`Mesh call failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        const code = typeof data.result === 'string' ? data.result : data.result.code || '';
        this.speak(`Generated HoloScript for: ${description}`);
        return { success: true, code };
      }

      return { success: false, code: '' };
    } catch (error) {
      console.error('[BrittneyVR] Generate error:', error);
      return { success: false, code: '' };
    }
  }

  /**
   * Live-compile and execute HoloScript in the scene
   */
  async liveCompileAndExecute(code: string): Promise<boolean> {
    try {
      // First validate
      const validateResponse = await fetch(`${this.config.meshUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'holoscript-mcp',
          tool: 'validate_syntax',
          args: { code }
        })
      });

      if (!validateResponse.ok) {
        this.speak('Could not validate the code.');
        return false;
      }

      const validateData = await validateResponse.json();
      if (validateData.result?.valid === false) {
        this.speak('The code has errors. Please fix and try again.');
        return false;
      }

      // Then parse
      const parseResponse = await fetch(`${this.config.meshUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'holoscript-mcp',
          tool: 'parse_hs',
          args: { code }
        })
      });

      if (!parseResponse.ok) {
        this.speak('Could not compile the code.');
        return false;
      }

      const parseData = await parseResponse.json();
      
      if (parseData.success && parseData.result) {
        // Execute the AST in the runtime
        this.executeAST(parseData.result);
        this.speak('Code executed successfully!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[BrittneyVR] Live compile error:', error);
      this.speak('Something went wrong during compilation.');
      return false;
    }
  }

  /**
   * Execute HoloScript AST in the scene
   */
  private executeAST(ast: unknown): void {
    // Basic AST execution - create entities from parsed code
    if (!ast || typeof ast !== 'object') return;

    const astObj = ast as Record<string, unknown>;
    
    // Handle hologram declarations
    if (astObj.holograms && Array.isArray(astObj.holograms)) {
      for (const hologram of astObj.holograms) {
        const h = hologram as Record<string, unknown>;
        (this.runtime as any).createEntity?.(
          h.type || 'orb',
          {
            id: h.id,
            position: h.position,
            ...h.traits
          }
        );
        console.log('[BrittneyVR] Created hologram:', h.id);
      }
    }

    // Handle component declarations
    if (astObj.components && Array.isArray(astObj.components)) {
      for (const component of astObj.components) {
        const c = component as Record<string, unknown>;
        console.log('[BrittneyVR] Registered component:', c.name);
      }
    }
  }

  /**
   * Natural language to VR object pipeline
   * "Create a floating blue orb above me"
   */
  async createFromNaturalLanguage(request: string): Promise<boolean> {
    this.speak(`Creating: ${request}`);
    
    // Generate HoloScript
    const generation = await this.generateHoloScript(request);
    if (!generation.success) {
      this.speak('Could not generate the code.');
      return false;
    }

    // Live compile and execute
    return this.liveCompileAndExecute(generation.code);
  }


  async handleGesture(gesture: GestureAction['gesture'], target?: { id?: string; position?: [number, number, number] }): Promise<void> {
    if (!this.config.gestureEnabled) return;

    const action = this.gestureActions.find(g => g.gesture === gesture);
    if (!action) {
      console.log('[BrittneyVR] Unknown gesture:', gesture);
      return;
    }

    console.log('[BrittneyVR] Gesture detected:', gesture, '→', action.action);

    try {
      const response = await fetch(`${this.config.meshUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'brittney-mcp',
          tool: action.action,
          args: {
            ...action.args,
            target,
            context: this.getSceneContext()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.response) {
          this.speak(data.result.response);
        }
      }
    } catch (error) {
      console.error('[BrittneyVR] Gesture action failed:', error);
    }
  }

  /**
   * Get scene context for AI
   */
  private getSceneContext(): Record<string, unknown> {
    const states = (this.runtime as any).getHologramStates?.() || new Map();
    const holograms = Array.from(states.entries()).map(([id, state]: [string, any]) => ({
      id,
      type: state.shape || 'orb',
      position: state.position,
      traits: state.traits || []
    }));

    return {
      currentScene: 'Hololand Central',
      holograms,
      isXR: this.isXRSession,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute action tags from AI response
   */
  private executeActionTags(response: string): void {
    // [UPDATE: id { "position": [0,1,0] }]
    const updateRegex = /\[UPDATE:\s*([\w#]+)\s*({.+?})\]/g;
    let match;

    while ((match = updateRegex.exec(response)) !== null) {
      let id = match[1];
      if (id.startsWith('#')) id = id.substring(1);

      try {
        const props = JSON.parse(match[2]);
        (this.runtime as any).updateEntity?.(id, props);
        console.log('[BrittneyVR] Updated entity:', id, props);
      } catch (e) {
        console.error('[BrittneyVR] Failed to parse update tag:', e);
      }
    }

    // [CREATE: type { "position": [0,1,0], "name": "MyOrb" }]
    const createRegex = /\[CREATE:\s*(\w+)\s*({.+?})\]/g;
    while ((match = createRegex.exec(response)) !== null) {
      const type = match[1];
      try {
        const props = JSON.parse(match[2]);
        (this.runtime as any).createEntity?.(type, props);
        console.log('[BrittneyVR] Created entity:', type, props);
      } catch (e) {
        console.error('[BrittneyVR] Failed to parse create tag:', e);
      }
    }
  }

  /**
   * Enter XR mode
   */
  enterXRMode(): void {
    this.isXRSession = true;
    console.log('[BrittneyVR] Entered XR mode');
    this.speak('I\'m now in VR mode. Just talk to me or use gestures!');
  }

  /**
   * Exit XR mode
   */
  exitXRMode(): void {
    this.isXRSession = false;
    this.stopListening();
    console.log('[BrittneyVR] Exited XR mode');
  }

  /**
   * Register custom gesture action
   */
  registerGestureAction(action: GestureAction): void {
    const existing = this.gestureActions.findIndex(a => a.gesture === action.gesture);
    if (existing >= 0) {
      this.gestureActions[existing] = action;
    } else {
      this.gestureActions.push(action);
    }
  }

  /**
   * Register this agent with the mesh
   */
  async registerWithMesh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.meshUrl}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.config.agentId,
          name: 'Brittney VR Assistant',
          workspace: 'hololand',
          capabilities: ['chat', 'voice', 'gesture', 'scene-control']
        })
      });

      if (response.ok) {
        console.log('[BrittneyVR] Registered with mesh as', this.config.agentId);
        return true;
      }
    } catch (error) {
      console.error('[BrittneyVR] Failed to register with mesh:', error);
    }
    return false;
  }

  /**
   * Check for incoming messages
   */
  async checkInbox(): Promise<void> {
    try {
      const response = await fetch(`${this.config.meshUrl}/agents/${this.config.agentId}/inbox/unread`);
      if (response.ok) {
        const data = await response.json();
        for (const msg of data.messages) {
          console.log('[BrittneyVR] Message from', msg.from, ':', msg.content);
          // Could trigger voice response for important messages
        }
      }
    } catch (error) {
      // Silently fail - mesh may not be available
    }
  }
}

export function createBrittneyVRBridge(runtime: HoloScriptRuntime, config?: Partial<BrittneyVRConfig>): BrittneyVRBridge {
  return new BrittneyVRBridge(runtime, config);
}
