/**
 * VoiceMCPPipeline — Connects voice input to MCP tool calls in VR
 *
 * Phase 3: Spatial Brittney
 * Pipeline: SpeechRecognizer → Intent Extraction → MCP Tool Call → Result Display
 *
 * This bridges the existing voice infrastructure (@hololand/voice) with
 * Brittney's MCP tools, enabling voice-driven code generation in VR.
 */

import { logger } from './logger';
import { VoiceProcessor } from './VoiceProcessor';
import { CompilerBridge, getCompilerBridge } from './CompilerBridge';

// ─── Types ───────────────────────────────────────────────────

export interface VoiceMCPConfig {
  /** Wake word to activate listening (default: "brittney") */
  wakeWord?: string;
  /** Language for speech recognition (default: "en-US") */
  language?: string;
  /** Minimum confidence to act on speech (default: 0.6) */
  confidenceThreshold?: number;
  /** Whether to auto-compile generated HoloScript (default: true) */
  autoCompile?: boolean;
  /** MCP server endpoint (default: null = use local bridge) */
  mcpEndpoint?: string | null;
  /** Callback when Brittney starts thinking */
  onThinkingStart?: () => void;
  /** Callback when Brittney stops thinking */
  onThinkingEnd?: () => void;
  /** Callback when Brittney starts speaking */
  onSpeakingStart?: (text: string) => void;
  /** Callback when Brittney stops speaking */
  onSpeakingEnd?: () => void;
  /** Callback for code panel updates */
  onCodeUpdate?: (code: string, compiled?: string) => void;
  /** Callback for console log */
  onConsoleLog?: (message: string, level?: 'info' | 'warn' | 'error') => void;
  /** Callback for diagnostics */
  onDiagnostics?: (message: string, success: boolean) => void;
  /** Callback for preview scene update */
  onPreviewUpdate?: (r3fCode: string) => void;
}

export interface MCPToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface VoicePipelineResult {
  transcript: string;
  intent: string;
  toolCalls: MCPToolCall[];
  holoScript?: string;
  r3fCode?: string;
  explanation?: string;
  error?: string;
}

// ─── Intent → MCP Tool Mapping ──────────────────────────────

interface IntentMapping {
  tools: MCPToolCall[];
  requiresContext?: boolean;
  description: string;
}

const INTENT_MAP: Record<string, (transcript: string, context?: string) => IntentMapping> = {
  create: (transcript, context) => ({
    tools: [
      {
        tool: 'brittney_generate_holoscript',
        args: { prompt: transcript, context: context || '' },
      },
    ],
    description: 'Generate HoloScript from natural language',
  }),

  modify: (transcript, context) => ({
    tools: [
      {
        tool: 'brittney_generate_holoscript',
        args: { prompt: transcript, context: context || '' },
      },
    ],
    requiresContext: true,
    description: 'Modify existing HoloScript code',
  }),

  explain: (_transcript, context) => ({
    tools: [{ tool: 'brittney_explain_scene', args: { code: context || '' } }],
    requiresContext: true,
    description: 'Explain the current scene',
  }),

  fix: (transcript, context) => ({
    tools: [{ tool: 'brittney_suggest_fix', args: { code: context || '', error: transcript } }],
    requiresContext: true,
    description: 'Fix errors in HoloScript code',
  }),

  validate: (_transcript, context) => ({
    tools: [{ tool: 'validate_holoscript', args: { code: context || '' } }],
    requiresContext: true,
    description: 'Validate the current HoloScript',
  }),

  suggest: (transcript) => ({
    tools: [{ tool: 'suggest_traits', args: { description: transcript } }],
    description: 'Suggest VR traits for objects',
  }),

  undo: () => ({
    tools: [{ tool: 'git_revert_last', args: {} }],
    description: 'Undo the last change',
  }),

  save: () => ({
    tools: [{ tool: 'save_workspace', args: {} }],
    description: 'Save current workspace',
  }),

  help: () => ({
    tools: [{ tool: 'get_syntax_reference', args: { topic: 'overview' } }],
    description: 'Show HoloScript help',
  }),
};

// ─── Pipeline Class ─────────────────────────────────────────

export class VoiceMCPPipeline {
  private compilerBridge: CompilerBridge;
  private config: Required<VoiceMCPConfig>;
  private recognition: any = null;
  private listening = false;
  private wakeWordDetected = false;
  private currentContext = '';
  private commandHistory: VoicePipelineResult[] = [];

  constructor(config: VoiceMCPConfig = {}) {
    this.config = {
      wakeWord: config.wakeWord ?? 'brittney',
      language: config.language ?? 'en-US',
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
      autoCompile: config.autoCompile ?? true,
      mcpEndpoint: config.mcpEndpoint ?? null,
      onThinkingStart: config.onThinkingStart ?? (() => {}),
      onThinkingEnd: config.onThinkingEnd ?? (() => {}),
      onSpeakingStart: config.onSpeakingStart ?? (() => {}),
      onSpeakingEnd: config.onSpeakingEnd ?? (() => {}),
      onCodeUpdate: config.onCodeUpdate ?? (() => {}),
      onConsoleLog: config.onConsoleLog ?? (() => {}),
      onDiagnostics: config.onDiagnostics ?? (() => {}),
      onPreviewUpdate: config.onPreviewUpdate ?? (() => {}),
    };

    this.compilerBridge = getCompilerBridge();

    logger.info('[VoiceMCPPipeline] Initialized', {
      wakeWord: this.config.wakeWord,
      language: this.config.language,
    });
  }

  // ─── Public API ────────────────────────────────────────────

  /**
   * Start continuous listening for voice commands.
   * Listens for wake word, then processes the following utterance.
   */
  start(): boolean {
    if (!VoiceProcessor.isWebSpeechSupported()) {
      logger.warn('[VoiceMCPPipeline] Web Speech API not supported');
      this.config.onConsoleLog('⚠ Voice input not supported in this browser', 'warn');
      return false;
    }

    this.recognition = VoiceProcessor.initWebSpeech();
    if (!this.recognition) return false;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;

    this.recognition.onresult = (event: any) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event: any) => {
      logger.error('[VoiceMCPPipeline] Speech error', { error: event.error });
      this.config.onConsoleLog(`⚠ Voice error: ${event.error}`, 'error');

      // Auto-restart on non-fatal errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setTimeout(() => {
          if (this.listening) this.recognition?.start();
        }, 500);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart continuous listening
      if (this.listening) {
        setTimeout(() => this.recognition?.start(), 100);
      }
    };

    this.listening = true;
    this.recognition.start();
    this.config.onConsoleLog(
      `> Voice listening started (wake word: "${this.config.wakeWord}")`,
      'info'
    );
    return true;
  }

  /**
   * Stop listening for voice commands.
   */
  stop(): void {
    this.listening = false;
    this.wakeWordDetected = false;
    this.recognition?.stop();
    this.recognition = null;
    this.config.onConsoleLog('> Voice listening stopped', 'info');
  }

  /**
   * Process a text command directly (bypass speech recognition).
   * Useful for typed commands or testing.
   */
  async processTextCommand(text: string): Promise<VoicePipelineResult> {
    return this.processCommand(text, 1.0);
  }

  /**
   * Set the current editor context (current HoloScript code).
   */
  setContext(code: string): void {
    this.currentContext = code;
  }

  /**
   * Get command history.
   */
  getHistory(): VoicePipelineResult[] {
    return [...this.commandHistory];
  }

  // ─── Speech Handling ───────────────────────────────────────

  private handleSpeechResult(event: any): void {
    const results = event.results;
    const latest = results[results.length - 1];

    if (!latest.isFinal) return;

    const transcript = latest[0].transcript.trim().toLowerCase();
    const confidence = latest[0].confidence;

    logger.debug('[VoiceMCPPipeline] Speech result', { transcript, confidence });

    // Check for wake word
    if (!this.wakeWordDetected) {
      if (transcript.includes(this.config.wakeWord)) {
        this.wakeWordDetected = true;

        // Extract command after wake word
        const wakeIdx = transcript.indexOf(this.config.wakeWord);
        const afterWake = transcript.substring(wakeIdx + this.config.wakeWord.length).trim();

        if (afterWake.length > 2) {
          // Wake word + command in same utterance: "Brittney, add a portal"
          this.processCommand(afterWake, confidence);
        } else {
          // Just wake word — wait for next utterance
          this.config.onConsoleLog('> Listening...', 'info');
        }
      }
      return;
    }

    // After wake word — process the command
    if (confidence >= this.config.confidenceThreshold) {
      this.processCommand(transcript, confidence);
    } else {
      this.config.onConsoleLog(
        `> Low confidence (${(confidence * 100).toFixed(0)}%): "${transcript}"`,
        'warn'
      );
    }

    this.wakeWordDetected = false;
  }

  // ─── Command Processing ────────────────────────────────────

  private async processCommand(
    transcript: string,
    confidence: number
  ): Promise<VoicePipelineResult> {
    this.config.onThinkingStart();
    this.config.onConsoleLog(`> "${transcript}" (${(confidence * 100).toFixed(0)}%)`, 'info');

    const intent = this.extractIntent(transcript);
    const mapping =
      INTENT_MAP[intent]?.(transcript, this.currentContext) ??
      INTENT_MAP.create(transcript, this.currentContext);

    logger.info('[VoiceMCPPipeline] Processing command', {
      intent,
      tools: mapping.tools.map((t) => t.tool),
    });

    const result: VoicePipelineResult = {
      transcript,
      intent,
      toolCalls: mapping.tools,
    };

    try {
      // Execute MCP tool calls
      for (const toolCall of mapping.tools) {
        const toolResult = await this.callMCPTool(toolCall);

        if (!toolResult.success) {
          result.error = toolResult.error;
          this.config.onDiagnostics(`✗ ${toolResult.error}`, false);
          continue;
        }

        // Extract results based on tool type
        if (toolCall.tool === 'brittney_generate_holoscript') {
          result.holoScript =
            (toolResult.data as any)?.holoScript || (toolResult.data as any)?.code || '';
          result.explanation = (toolResult.data as any)?.explanation || 'Code generated.';

          this.config.onCodeUpdate(result.holoScript!);

          // Auto-compile if enabled
          if (this.config.autoCompile && result.holoScript) {
            const compiled = await this.compileCode(result.holoScript);
            if (compiled) {
              result.r3fCode = compiled;
              this.config.onPreviewUpdate(compiled);
            }
          }
        }

        if (toolCall.tool === 'validate_holoscript') {
          const valid = (toolResult.data as any)?.valid;
          const errors = (toolResult.data as any)?.errors || [];
          if (valid) {
            this.config.onDiagnostics('✓ Valid HoloScript', true);
          } else {
            this.config.onDiagnostics(`✗ ${errors.join(', ')}`, false);
          }
          result.explanation = valid ? 'Code is valid!' : `Found ${errors.length} error(s).`;
        }

        if (toolCall.tool === 'suggest_traits') {
          const traits = (toolResult.data as any)?.traits || [];
          result.explanation = `Suggested traits: ${traits.join(', ')}`;
        }

        if (toolCall.tool === 'brittney_explain_scene') {
          result.explanation = (toolResult.data as any)?.explanation || 'No explanation available.';
        }

        if (toolCall.tool === 'brittney_suggest_fix') {
          result.holoScript = (toolResult.data as any)?.fixedCode || '';
          result.explanation = (toolResult.data as any)?.explanation || 'Applied fix.';
          if (result.holoScript) this.config.onCodeUpdate(result.holoScript);
        }
      }

      // Speak the explanation
      if (result.explanation) {
        this.config.onSpeakingStart(result.explanation);
        this.config.onConsoleLog(`Brittney: ${result.explanation}`, 'info');
      }
    } catch (error) {
      result.error = `Pipeline error: ${error}`;
      this.config.onDiagnostics(`✗ ${result.error}`, false);
      logger.error('[VoiceMCPPipeline] Command processing failed', { error });
    } finally {
      this.config.onThinkingEnd();
    }

    this.commandHistory.push(result);
    return result;
  }

  // ─── Intent Extraction ─────────────────────────────────────

  private extractIntent(text: string): string {
    const normalized = text.toLowerCase();

    // Direct command patterns
    if (/^(undo|revert|go back)/.test(normalized)) return 'undo';
    if (/^(save|store)/.test(normalized)) return 'save';
    if (/^(help|how do|what is|show me)/.test(normalized)) return 'help';
    if (/^(explain|describe|what does)/.test(normalized)) return 'explain';
    if (/^(fix|repair|debug)/.test(normalized)) return 'fix';
    if (/^(validate|check|verify)/.test(normalized)) return 'validate';
    if (/^(suggest|recommend|what traits)/.test(normalized)) return 'suggest';

    // Modification vs creation
    if (/^(change|modify|update|edit|make .* (bigger|smaller|red|blue|green))/.test(normalized))
      return 'modify';

    // Default: creation
    if (/^(create|make|build|add|generate|spawn|place|put)/.test(normalized)) return 'create';

    // Fall back to create for ambiguous commands
    return 'create';
  }

  // ─── MCP Tool Calling ──────────────────────────────────────

  private async callMCPTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    logger.info('[VoiceMCPPipeline] Calling MCP tool', { tool: toolCall.tool });

    try {
      if (this.config.mcpEndpoint) {
        // Remote MCP call via HTTP
        const response = await fetch(`${this.config.mcpEndpoint}/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: toolCall.tool,
            args: toolCall.args,
          }),
        });

        if (!response.ok) {
          return { success: false, error: `MCP call failed: ${response.statusText}` };
        }

        const data = await response.json();
        return { success: true, data };
      }

      // Local bridge — use HololandAIBridge for generation
      if (toolCall.tool === 'brittney_generate_holoscript') {
        const { HololandAIBridge } = await import('./HololandAIBridge');
        const bridge = new HololandAIBridge({ enableCompilation: this.config.autoCompile });
        const result = await bridge.translateToHoloScript({
          naturalLanguage: toolCall.args.prompt as string,
          context: { existingCode: toolCall.args.context as string },
        });
        return {
          success: true,
          data: {
            holoScript: result.holoScript,
            r3fCode: result.r3fCode,
            explanation: result.explanation || 'Code generated successfully.',
          },
        };
      }

      // For other tools, attempt direct MCP WebSocket connection
      return await this.callMCPViaWebSocket(toolCall);
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  /**
   * Call MCP tool via WebSocket (for Brittney MCP server connection)
   */
  private async callMCPViaWebSocket(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Fallback: return descriptive error so user knows the tool isn't connected
    logger.warn('[VoiceMCPPipeline] MCP tool not available locally', { tool: toolCall.tool });
    return {
      success: false,
      error: `Tool "${toolCall.tool}" requires MCP server connection. Set mcpEndpoint in config.`,
    };
  }

  // ─── Compilation ───────────────────────────────────────────

  private async compileCode(holoScript: string): Promise<string | null> {
    try {
      const result = await this.compilerBridge.compile(holoScript);
      if (result.success) {
        this.config.onDiagnostics('✓ Compiled successfully', true);
        return result.r3fCode || null;
      } else {
        this.config.onDiagnostics(`✗ Compilation: ${result.error || 'Unknown error'}`, false);
        return null;
      }
    } catch (error) {
      this.config.onDiagnostics(`✗ Compiler error: ${error}`, false);
      return null;
    }
  }
}
