/**
 * @hololand/backend — ConversationHarvester
 *
 * Ingests Brittney chat logs, user corrections, and interaction events,
 * then converts them into TrainingExample[] suitable for fine-tuning.
 *
 * Sources:
 *   - Raw chat logs (user↔Brittney messages)
 *   - Correction events (user corrected Brittney's output)
 *   - HoloScript generation sessions (prompt → .holo output)
 *   - Scene debugging sessions (error → fix)
 *
 * Usage:
 *   const harvester = new ConversationHarvester({ minQuality: 0.6 });
 *   const examples = harvester.harvestFromLogs(chatLogs);
 *   const corrections = harvester.harvestFromCorrections(correctionEvents);
 *   const filtered = harvester.filterByQuality(examples, 0.8);
 */

import type { TrainingExample } from './BrittneyFineTuneService';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ChatLog {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  startedAt: number;
  endedAt?: number;
  userId?: string;
  context?: string;
  tags?: string[];
}

export interface CorrectionEvent {
  id: string;
  sessionId: string;
  originalPrompt: string;
  originalOutput: string;
  correctedOutput: string;
  correctionType: 'syntax' | 'logic' | 'style' | 'accuracy' | 'completeness';
  timestamp: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SceneSession {
  id: string;
  prompt: string;
  generatedHolo: string;
  finalHolo?: string;
  errors?: string[];
  fixes?: string[];
  timestamp: number;
}

export interface HarvestConfig {
  /** Minimum quality score to include (0-1). Default: 0.5 */
  minQuality?: number;
  /** Minimum message count for a chat log to be useful. Default: 2 */
  minMessages?: number;
  /** Maximum instruction length in chars. Default: 2000 */
  maxInstructionLength?: number;
  /** Maximum output length in chars. Default: 8000 */
  maxOutputLength?: number;
  /** Include system messages in context. Default: true */
  includeSystemContext?: boolean;
  /** Deduplicate by instruction hash. Default: true */
  deduplicateByInstruction?: boolean;
  /** Default category for harvested examples. */
  defaultCategory?: string;
}

export interface HarvestResult {
  examples: TrainingExample[];
  stats: HarvestStats;
}

export interface HarvestStats {
  totalProcessed: number;
  examplesCreated: number;
  filteredLowQuality: number;
  filteredTooShort: number;
  filteredTooLong: number;
  duplicatesRemoved: number;
  averageQuality: number;
  categoryDistribution: Record<string, number>;
}

// ============================================================================
// ConversationHarvester
// ============================================================================

export class ConversationHarvester {
  private config: Required<HarvestConfig>;
  private seenHashes: Set<string> = new Set();

  constructor(config: HarvestConfig = {}) {
    this.config = {
      minQuality: config.minQuality ?? 0.5,
      minMessages: config.minMessages ?? 2,
      maxInstructionLength: config.maxInstructionLength ?? 2000,
      maxOutputLength: config.maxOutputLength ?? 8000,
      includeSystemContext: config.includeSystemContext ?? true,
      deduplicateByInstruction: config.deduplicateByInstruction ?? true,
      defaultCategory: config.defaultCategory ?? 'conversation',
    };
  }

  // --------------------------------------------------------------------------
  // Chat Log Harvesting
  // --------------------------------------------------------------------------

  /**
   * Extract training examples from chat logs.
   * Each user→assistant turn pair becomes one training example.
   */
  harvestFromLogs(logs: ChatLog[]): HarvestResult {
    const stats: HarvestStats = {
      totalProcessed: 0,
      examplesCreated: 0,
      filteredLowQuality: 0,
      filteredTooShort: 0,
      filteredTooLong: 0,
      duplicatesRemoved: 0,
      averageQuality: 0,
      categoryDistribution: {},
    };

    const examples: TrainingExample[] = [];
    let qualitySum = 0;

    for (const log of logs) {
      stats.totalProcessed++;

      if (log.messages.length < this.config.minMessages) {
        stats.filteredTooShort++;
        continue;
      }

      const systemMsg = log.messages.find(m => m.role === 'system');
      const turnPairs = this.extractTurnPairs(log.messages);

      for (const pair of turnPairs) {
        const quality = this.scoreQuality(pair.instruction, pair.output);

        if (quality < this.config.minQuality) {
          stats.filteredLowQuality++;
          continue;
        }

        if (pair.instruction.length > this.config.maxInstructionLength) {
          stats.filteredTooLong++;
          continue;
        }

        if (pair.output.length > this.config.maxOutputLength) {
          stats.filteredTooLong++;
          continue;
        }

        if (this.config.deduplicateByInstruction) {
          const hash = this.hashString(pair.instruction);
          if (this.seenHashes.has(hash)) {
            stats.duplicatesRemoved++;
            continue;
          }
          this.seenHashes.add(hash);
        }

        const category = this.inferCategory(pair.instruction, pair.output);
        const difficulty = this.inferDifficulty(pair.instruction, pair.output);

        const example: TrainingExample = {
          id: `harvest_chat_${log.id}_${examples.length}`,
          instruction: pair.instruction,
          output: pair.output,
          system: this.config.includeSystemContext && systemMsg ? systemMsg.content : undefined,
          difficulty,
          category,
          metadata: {
            source: 'chat_log',
            sessionId: log.sessionId,
            quality,
            harvestedAt: Date.now(),
          },
        };

        examples.push(example);
        stats.examplesCreated++;
        qualitySum += quality;

        stats.categoryDistribution[category] = (stats.categoryDistribution[category] || 0) + 1;
      }
    }

    stats.averageQuality = stats.examplesCreated > 0 ? qualitySum / stats.examplesCreated : 0;

    return { examples, stats };
  }

  // --------------------------------------------------------------------------
  // Correction Harvesting
  // --------------------------------------------------------------------------

  /**
   * Convert user corrections into high-quality training examples.
   * Corrections are inherently valuable — they represent exactly where the
   * model got it wrong, and what the right answer should be.
   */
  harvestFromCorrections(corrections: CorrectionEvent[]): HarvestResult {
    const stats: HarvestStats = {
      totalProcessed: 0,
      examplesCreated: 0,
      filteredLowQuality: 0,
      filteredTooShort: 0,
      filteredTooLong: 0,
      duplicatesRemoved: 0,
      averageQuality: 0,
      categoryDistribution: {},
    };

    const examples: TrainingExample[] = [];
    let qualitySum = 0;

    for (const correction of corrections) {
      stats.totalProcessed++;

      if (!correction.originalPrompt.trim() || !correction.correctedOutput.trim()) {
        stats.filteredTooShort++;
        continue;
      }

      if (correction.originalPrompt.length > this.config.maxInstructionLength) {
        stats.filteredTooLong++;
        continue;
      }

      if (this.config.deduplicateByInstruction) {
        const hash = this.hashString(correction.originalPrompt);
        if (this.seenHashes.has(hash)) {
          stats.duplicatesRemoved++;
          continue;
        }
        this.seenHashes.add(hash);
      }

      // Corrections get a quality boost (human-validated output)
      const quality = Math.min(1.0, this.scoreQuality(correction.originalPrompt, correction.correctedOutput) + 0.2);

      const category = `correction_${correction.correctionType}`;
      const difficulty = this.inferDifficulty(correction.originalPrompt, correction.correctedOutput);

      const example: TrainingExample = {
        id: `harvest_corr_${correction.id}`,
        instruction: correction.originalPrompt,
        output: correction.correctedOutput,
        difficulty,
        category,
        metadata: {
          source: 'correction',
          correctionType: correction.correctionType,
          originalOutput: correction.originalOutput,
          quality,
          harvestedAt: Date.now(),
        },
      };

      examples.push(example);
      stats.examplesCreated++;
      qualitySum += quality;

      stats.categoryDistribution[category] = (stats.categoryDistribution[category] || 0) + 1;
    }

    stats.averageQuality = stats.examplesCreated > 0 ? qualitySum / stats.examplesCreated : 0;

    return { examples, stats };
  }

  // --------------------------------------------------------------------------
  // Scene Session Harvesting
  // --------------------------------------------------------------------------

  /**
   * Extract training examples from HoloScript generation sessions.
   * These capture "prompt → generated .holo code" pairs, with optional
   * error→fix sequences that are especially valuable.
   */
  harvestFromSceneSessions(sessions: SceneSession[]): HarvestResult {
    const stats: HarvestStats = {
      totalProcessed: 0,
      examplesCreated: 0,
      filteredLowQuality: 0,
      filteredTooShort: 0,
      filteredTooLong: 0,
      duplicatesRemoved: 0,
      averageQuality: 0,
      categoryDistribution: {},
    };

    const examples: TrainingExample[] = [];
    let qualitySum = 0;

    for (const session of sessions) {
      stats.totalProcessed++;

      const outputCode = session.finalHolo || session.generatedHolo;
      if (!session.prompt.trim() || !outputCode.trim()) {
        stats.filteredTooShort++;
        continue;
      }

      if (this.config.deduplicateByInstruction) {
        const hash = this.hashString(session.prompt);
        if (this.seenHashes.has(hash)) {
          stats.duplicatesRemoved++;
          continue;
        }
        this.seenHashes.add(hash);
      }

      const quality = this.scoreQuality(session.prompt, outputCode);
      if (quality < this.config.minQuality) {
        stats.filteredLowQuality++;
        continue;
      }

      // Main generation example
      const genExample: TrainingExample = {
        id: `harvest_scene_${session.id}`,
        instruction: session.prompt,
        output: outputCode,
        difficulty: this.inferDifficulty(session.prompt, outputCode),
        category: 'holoscript_generation',
        metadata: {
          source: 'scene_session',
          hadErrors: !!session.errors?.length,
          quality,
          harvestedAt: Date.now(),
        },
      };

      examples.push(genExample);
      stats.examplesCreated++;
      qualitySum += quality;
      stats.categoryDistribution['holoscript_generation'] =
        (stats.categoryDistribution['holoscript_generation'] || 0) + 1;

      // If there were errors and fixes, create a debugging example too
      if (session.errors?.length && session.fixes?.length) {
        const debugInstruction = `Fix the following HoloScript errors:\n${session.errors.join('\n')}\n\nOriginal code:\n${session.generatedHolo}`;
        const debugOutput = session.fixes.join('\n');

        const debugExample: TrainingExample = {
          id: `harvest_debug_${session.id}`,
          instruction: debugInstruction,
          output: debugOutput,
          difficulty: Math.min(4, (genExample.difficulty || 2) + 1),
          category: 'holoscript_debugging',
          metadata: {
            source: 'scene_session_debug',
            quality: quality + 0.1,
            harvestedAt: Date.now(),
          },
        };

        examples.push(debugExample);
        stats.examplesCreated++;
        qualitySum += quality + 0.1;
        stats.categoryDistribution['holoscript_debugging'] =
          (stats.categoryDistribution['holoscript_debugging'] || 0) + 1;
      }
    }

    stats.averageQuality = stats.examplesCreated > 0 ? qualitySum / stats.examplesCreated : 0;

    return { examples, stats };
  }

  // --------------------------------------------------------------------------
  // Quality Filtering
  // --------------------------------------------------------------------------

  /**
   * Filter examples by a minimum quality threshold.
   */
  filterByQuality(examples: TrainingExample[], threshold?: number): TrainingExample[] {
    const minQ = threshold ?? this.config.minQuality;
    return examples.filter(ex => {
      const q = (ex.metadata?.quality as number) ?? this.scoreQuality(ex.instruction, ex.output);
      return q >= minQ;
    });
  }

  /**
   * Merge multiple harvest results, deduplicating across them.
   */
  mergeResults(...results: HarvestResult[]): HarvestResult {
    const allExamples: TrainingExample[] = [];
    const mergedStats: HarvestStats = {
      totalProcessed: 0,
      examplesCreated: 0,
      filteredLowQuality: 0,
      filteredTooShort: 0,
      filteredTooLong: 0,
      duplicatesRemoved: 0,
      averageQuality: 0,
      categoryDistribution: {},
    };

    const seenIds = new Set<string>();

    for (const result of results) {
      mergedStats.totalProcessed += result.stats.totalProcessed;
      mergedStats.filteredLowQuality += result.stats.filteredLowQuality;
      mergedStats.filteredTooShort += result.stats.filteredTooShort;
      mergedStats.filteredTooLong += result.stats.filteredTooLong;

      for (const ex of result.examples) {
        if (seenIds.has(ex.id)) {
          mergedStats.duplicatesRemoved++;
          continue;
        }
        seenIds.add(ex.id);
        allExamples.push(ex);

        const cat = ex.category || 'unknown';
        mergedStats.categoryDistribution[cat] = (mergedStats.categoryDistribution[cat] || 0) + 1;
      }

      // Merge category distributions from stats
      for (const [cat, count] of Object.entries(result.stats.categoryDistribution)) {
        // Already counted from examples above
        void cat;
        void count;
      }
    }

    mergedStats.examplesCreated = allExamples.length;
    mergedStats.duplicatesRemoved += results.reduce((s, r) => s + r.stats.duplicatesRemoved, 0);

    const qualitySum = allExamples.reduce((sum, ex) => {
      return sum + ((ex.metadata?.quality as number) ?? 0.5);
    }, 0);
    mergedStats.averageQuality = allExamples.length > 0 ? qualitySum / allExamples.length : 0;

    return { examples: allExamples, stats: mergedStats };
  }

  /**
   * Reset the deduplication cache.
   */
  resetDedup(): void {
    this.seenHashes.clear();
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private extractTurnPairs(messages: ChatMessage[]): Array<{ instruction: string; output: string }> {
    const pairs: Array<{ instruction: string; output: string }> = [];
    const nonSystem = messages.filter(m => m.role !== 'system');

    for (let i = 0; i < nonSystem.length - 1; i++) {
      if (nonSystem[i].role === 'user' && nonSystem[i + 1].role === 'assistant') {
        pairs.push({
          instruction: nonSystem[i].content.trim(),
          output: nonSystem[i + 1].content.trim(),
        });
      }
    }

    return pairs;
  }

  /**
   * Score quality of an instruction→output pair (0-1).
   * Higher scores indicate better training value.
   */
  scoreQuality(instruction: string, output: string): number {
    let score = 0.5; // baseline

    // Length checks — too short is low quality
    if (instruction.length < 10) score -= 0.3;
    else if (instruction.length > 30) score += 0.1;

    if (output.length < 20) score -= 0.2;
    else if (output.length > 100) score += 0.1;

    // Code detection — HoloScript code is high value
    if (output.includes('composition') || output.includes('object') || output.includes('@')) score += 0.15;
    if (output.includes('template') || output.includes('state {')) score += 0.1;

    // Question quality — specific questions are better
    if (instruction.includes('?') || instruction.toLowerCase().startsWith('how')) score += 0.05;
    if (instruction.toLowerCase().includes('create') || instruction.toLowerCase().includes('build')) score += 0.05;

    // Penalize very short/empty
    if (instruction.trim().length === 0 || output.trim().length === 0) return 0;

    return Math.max(0, Math.min(1, score));
  }

  private inferCategory(instruction: string, output: string): string {
    const text = `${instruction} ${output}`.toLowerCase();

    if (text.includes('composition') || text.includes('.holo') || text.includes('holoscript')) return 'holoscript_generation';
    if (text.includes('@grabbable') || text.includes('@physics') || text.includes('trait')) return 'vr_traits';
    if (text.includes('error') || text.includes('fix') || text.includes('debug')) return 'debugging';
    if (text.includes('scene') || text.includes('environment') || text.includes('skybox')) return 'scene_design';
    if (text.includes('network') || text.includes('multiplayer') || text.includes('@networked')) return 'networking';
    if (text.includes('animation') || text.includes('animate') || text.includes('keyframe')) return 'animation';
    if (text.includes('ui') || text.includes('button') || text.includes('panel')) return 'ui_design';

    return this.config.defaultCategory;
  }

  private inferDifficulty(instruction: string, output: string): number {
    const text = `${instruction} ${output}`.toLowerCase();
    let complexity = 1;

    // Length-based
    if (output.length > 500) complexity++;
    if (output.length > 2000) complexity++;

    // Feature-based
    if (text.includes('@networked') || text.includes('sync')) complexity++;
    if (text.includes('physics') || text.includes('collision')) complexity++;
    if (text.includes('animation') || text.includes('keyframe')) complexity++;
    if (text.includes('logic {') || text.includes('action ')) complexity++;

    return Math.min(4, complexity);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return `h_${hash.toString(36)}`;
  }
}
