/**
 * @hololand/ai-bridge
 *
 * AI Bridge for Natural Language → HoloScript Translation
 * Enables normies to build in VR using natural language
 */

import { logger } from './logger';
import { NaturalLanguageTranslator, type TranslationResult } from './NaturalLanguageTranslator';
import { VoiceProcessor, type VoiceProcessingResult } from './VoiceProcessor';
import { CodeExplainer, type ExplanationResult } from './CodeExplainer';
import { CodeOptimizer, type OptimizationResult } from './CodeOptimizer';

export interface AIBridgeConfig {
  enableVoice?: boolean;
  enableOptimization?: boolean;
  confidenceThreshold?: number;
  maxSuggestions?: number;
}

export interface BuildRequest {
  naturalLanguage: string;
  context?: {
    existingCode?: string;
    location?: { x: number; y: number; z: number };
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export class HololandAIBridge {
  private translator: NaturalLanguageTranslator;
  private voiceProcessor: VoiceProcessor;
  private codeExplainer: CodeExplainer;
  private codeOptimizer: CodeOptimizer;
  private config: Required<AIBridgeConfig>;

  constructor(config: AIBridgeConfig = {}) {
    this.config = {
      enableVoice: config.enableVoice ?? true,
      enableOptimization: config.enableOptimization ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxSuggestions: config.maxSuggestions ?? 5,
    };

    this.translator = new NaturalLanguageTranslator(this.config.confidenceThreshold);
    this.voiceProcessor = new VoiceProcessor();
    this.codeExplainer = new CodeExplainer();
    this.codeOptimizer = new CodeOptimizer(this.config.maxSuggestions);

    logger.info('[HololandAIBridge] Initialized', {
      enableVoice: this.config.enableVoice,
      enableOptimization: this.config.enableOptimization,
    });
  }

  /**
   * Translate natural language to HoloScript
   *
   * @example
   * const result = await bridge.translateToHoloScript({
   *   naturalLanguage: "create a coffee shop with a counter and menu board",
   *   context: { userLevel: 'beginner' }
   * });
   */
  async translateToHoloScript(request: BuildRequest): Promise<TranslationResult> {
    logger.info('[HololandAIBridge] Translating natural language to HoloScript', {
      input: request.naturalLanguage.substring(0, 50),
    });

    try {
      const result = await this.translator.translate(
        request.naturalLanguage,
        request.context
      );

      if (result.confidence < this.config.confidenceThreshold) {
        logger.warn('[HololandAIBridge] Low confidence translation', {
          confidence: result.confidence,
          threshold: this.config.confidenceThreshold,
        });
      }

      return result;
    } catch (error) {
      logger.error('[HololandAIBridge] Translation failed', { error });
      throw error;
    }
  }

  /**
   * Process voice command in VR
   *
   * @example
   * const result = await bridge.processVoiceCommand(audioBuffer);
   */
  async processVoiceCommand(audio: ArrayBuffer): Promise<VoiceProcessingResult> {
    if (!this.config.enableVoice) {
      throw new Error('[HololandAIBridge] Voice processing is disabled');
    }

    logger.info('[HololandAIBridge] Processing voice command');

    try {
      const voiceResult = await this.voiceProcessor.process(audio);

      if (voiceResult.confidence < this.config.confidenceThreshold) {
        return {
          ...voiceResult,
          holoScript: null,
          needsClarification: true,
        };
      }

      // Translate recognized text to HoloScript
      const translation = await this.translateToHoloScript({
        naturalLanguage: voiceResult.text,
      });

      return {
        ...voiceResult,
        holoScript: translation.holoScript,
        suggestions: translation.suggestions,
      };
    } catch (error) {
      logger.error('[HololandAIBridge] Voice processing failed', { error });
      throw error;
    }
  }

  /**
   * Explain HoloScript code in simple terms
   *
   * @example
   * const explanation = await bridge.explainCode(holoScriptCode, 'beginner');
   */
  async explainCode(
    holoScript: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<ExplanationResult> {
    logger.info('[HololandAIBridge] Explaining code', {
      codeLength: holoScript.length,
      userLevel,
    });

    try {
      return await this.codeExplainer.explain(holoScript, userLevel);
    } catch (error) {
      logger.error('[HololandAIBridge] Code explanation failed', { error });
      throw error;
    }
  }

  /**
   * Optimize HoloScript code
   *
   * @example
   * const optimized = await bridge.optimizeCode(holoScriptCode);
   */
  async optimizeCode(holoScript: string): Promise<OptimizationResult> {
    if (!this.config.enableOptimization) {
      throw new Error('[HololandAIBridge] Code optimization is disabled');
    }

    logger.info('[HololandAIBridge] Optimizing code', {
      codeLength: holoScript.length,
    });

    try {
      return await this.codeOptimizer.optimize(holoScript, this.config.maxSuggestions);
    } catch (error) {
      logger.error('[HololandAIBridge] Code optimization failed', { error });
      throw error;
    }
  }

  /**
   * Generate code from template
   *
   * @example
   * const code = await bridge.generateFromTemplate('coffee-shop', { size: 'large' });
   */
  async generateFromTemplate(
    templateName: string,
    params: Record<string, any> = {}
  ): Promise<TranslationResult> {
    logger.info('[HololandAIBridge] Generating from template', {
      template: templateName,
      params: Object.keys(params),
    });

    // Build natural language description from template
    const description = this.buildTemplateDescription(templateName, params);

    return this.translateToHoloScript({
      naturalLanguage: description,
      context: { userLevel: 'beginner' },
    });
  }

  /**
   * Get suggestions for partial input
   *
   * @example
   * const suggestions = await bridge.getSuggestions("create a...");
   */
  async getSuggestions(partialInput: string): Promise<string[]> {
    logger.info('[HololandAIBridge] Getting suggestions', {
      input: partialInput.substring(0, 30),
    });

    try {
      return await this.translator.getSuggestions(partialInput);
    } catch (error) {
      logger.error('[HololandAIBridge] Suggestion generation failed', { error });
      return [];
    }
  }

  /**
   * Build natural language description from template
   */
  private buildTemplateDescription(templateName: string, params: Record<string, any>): string {
    const templates: Record<string, (p: any) => string> = {
      'coffee-shop': (p) => `create a ${p.size || 'medium'} coffee shop with a counter, menu board, and ${p.seating || '4'} tables`,
      'retail-store': (p) => `create a retail store with ${p.shelves || '8'} shelves, a checkout counter, and ${p.displayWindows || '2'} display windows`,
      'art-gallery': (p) => `create an art gallery with ${p.walls || '4'} exhibition walls, ${p.pedestals || '6'} pedestals, and lighting`,
      'office': (p) => `create an office space with ${p.desks || '4'} desks, a conference room, and ${p.meetingRooms || '2'} meeting rooms`,
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      throw new Error(`[HololandAIBridge] Unknown template: ${templateName}`);
    }

    return templateFn(params);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIBridgeConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[HololandAIBridge] Configuration updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<AIBridgeConfig>> {
    return { ...this.config };
  }
}
