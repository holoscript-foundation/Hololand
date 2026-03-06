/**
 * @hololand/generation LLMCompositionGenerator
 *
 * Tier 1: LLM-based world composition from natural language prompts.
 * Implements prompt templating, response parsing, composition validation,
 * retry logic, token budget tracking, and caching of recent generations.
 */

export interface CompositionResult {
  theme: string;
  biomes: string[];
  structures: number;
  npcs: number;
  lighting: string;
  timeOfDay: string;
  seed: number;
  /** Additional composition properties from LLM */
  properties: Record<string, unknown>;
}

export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  /** Max tokens for this template */
  maxTokens: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  finishReason: 'stop' | 'length' | 'error';
}

export interface LLMProvider {
  generate(prompt: string, systemPrompt: string, maxTokens: number): Promise<LLMResponse>;
}

export interface LLMCompositionConfig {
  /** Maximum retries on parse failure */
  maxRetries: number;
  /** Token budget per session */
  tokenBudget: number;
  /** Cache size (number of recent generations to keep) */
  cacheSize: number;
  /** Validation: minimum number of biomes */
  minBiomes: number;
  /** Validation: maximum structures allowed */
  maxStructures: number;
  /** Validation: maximum NPCs allowed */
  maxNpcs: number;
}

const DEFAULT_CONFIG: LLMCompositionConfig = {
  maxRetries: 3,
  tokenBudget: 100_000,
  cacheSize: 50,
  minBiomes: 1,
  maxStructures: 100,
  maxNpcs: 50,
};

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'world_composition',
    systemPrompt:
      'You are a VR world composition engine. Given a description, output a JSON object with: ' +
      'theme (string), biomes (string[]), structures (number), npcs (number), lighting (string: ' +
      '"dynamic"|"static"|"baked"), timeOfDay (string: "dawn"|"day"|"dusk"|"night"), and any ' +
      'additional properties in a "properties" object. Output ONLY valid JSON.',
    userPromptTemplate: 'Create a VR world composition for: {{prompt}}\nSeed: {{seed}}',
    maxTokens: 1024,
  },
  {
    name: 'terrain_description',
    systemPrompt:
      'You are a terrain description engine. Given a world theme, describe the terrain in JSON with: ' +
      'heightVariation (0-1), waterCoverage (0-1), vegetationDensity (0-1), rockiness (0-1), ' +
      'primaryTerrain (string), secondaryTerrain (string). Output ONLY valid JSON.',
    userPromptTemplate: 'Describe terrain for a {{theme}} world: {{prompt}}',
    maxTokens: 512,
  },
  {
    name: 'npc_population',
    systemPrompt:
      'You are an NPC population planner. Given a world theme and biome list, suggest NPCs in JSON: ' +
      'npcs (array of {name, role, biome, personality}). Output ONLY valid JSON.',
    userPromptTemplate: 'Plan NPCs for {{theme}} world with biomes [{{biomes}}]: {{prompt}}',
    maxTokens: 2048,
  },
];

interface CacheEntry {
  key: string;
  result: CompositionResult;
  timestamp: number;
}

export class LLMCompositionGenerator {
  private generateCount: number = 0;
  private config: LLMCompositionConfig;
  private templates: Map<string, PromptTemplate> = new Map();
  private provider: LLMProvider | null = null;
  private cache: CacheEntry[] = [];
  private tokensUsed: number = 0;
  private retryHistory: Array<{ prompt: string; attempts: number; success: boolean }> = [];

  constructor(config?: Partial<LLMCompositionConfig>, provider?: LLMProvider) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = provider ?? null;
    for (const t of DEFAULT_TEMPLATES) {
      this.templates.set(t.name, t);
    }
  }

  // ── Original API (preserved) ─────────────────────────────────────

  async generate(prompt: string, seed: number): Promise<Record<string, unknown>> {
    this.generateCount++;

    // Check cache first
    const cacheKey = this.computeCacheKey(prompt, seed);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // If no LLM provider, use deterministic composition
    if (!this.provider) {
      const result = this.deterministicGenerate(prompt, seed);
      this.addToCache(cacheKey, result);
      return result;
    }

    // LLM-powered generation with retry logic
    const template = this.templates.get('world_composition')!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Check token budget
        if (this.tokensUsed >= this.config.tokenBudget) {
          throw new Error(`Token budget exhausted: ${this.tokensUsed}/${this.config.tokenBudget}`);
        }

        const userPrompt = this.renderTemplate(template.userPromptTemplate, {
          prompt,
          seed: String(seed),
        });

        const response = await this.provider.generate(
          userPrompt,
          template.systemPrompt,
          template.maxTokens,
        );

        this.tokensUsed += response.tokensUsed;

        // Parse and validate
        const parsed = this.parseResponse(response.text);
        const validated = this.validateComposition(parsed, seed);

        this.retryHistory.push({ prompt, attempts: attempt + 1, success: true });
        this.addToCache(cacheKey, validated);
        return validated;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // All retries failed: fall back to deterministic
    this.retryHistory.push({ prompt, attempts: this.config.maxRetries, success: false });
    const fallback = this.deterministicGenerate(prompt, seed);
    this.addToCache(cacheKey, fallback);
    return fallback;
  }

  // ── Prompt templating ────────────────────────────────────────────

  private renderTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Register a custom prompt template.
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  // ── Response parsing ─────────────────────────────────────────────

  private parseResponse(text: string): Record<string, unknown> {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    // Try to extract JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${cleaned.substring(0, 200)}`);
    }
  }

  // ── Composition validation ───────────────────────────────────────

  private validateComposition(
    raw: Record<string, unknown>,
    seed: number,
  ): CompositionResult {
    const theme = typeof raw.theme === 'string' ? raw.theme : 'fantasy';

    let biomes: string[];
    if (Array.isArray(raw.biomes)) {
      biomes = raw.biomes.filter((b): b is string => typeof b === 'string');
    } else {
      biomes = ['plains'];
    }
    if (biomes.length < this.config.minBiomes) {
      biomes.push('plains');
    }

    let structures = typeof raw.structures === 'number' ? raw.structures : 5;
    structures = Math.max(0, Math.min(this.config.maxStructures, Math.floor(structures)));

    let npcs = typeof raw.npcs === 'number' ? raw.npcs : 3;
    npcs = Math.max(0, Math.min(this.config.maxNpcs, Math.floor(npcs)));

    const validLighting = ['dynamic', 'static', 'baked'];
    const lighting = typeof raw.lighting === 'string' && validLighting.includes(raw.lighting)
      ? raw.lighting
      : 'dynamic';

    const validTimes = ['dawn', 'day', 'dusk', 'night'];
    const timeOfDay = typeof raw.timeOfDay === 'string' && validTimes.includes(raw.timeOfDay)
      ? raw.timeOfDay
      : 'day';

    // Extract additional properties
    const knownKeys = new Set(['theme', 'biomes', 'structures', 'npcs', 'lighting', 'timeOfDay', 'seed']);
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!knownKeys.has(key)) {
        properties[key] = value;
      }
    }

    return { theme, biomes, structures, npcs, lighting, timeOfDay, seed, properties };
  }

  // ── Deterministic fallback ───────────────────────────────────────

  private deterministicGenerate(prompt: string, seed: number): CompositionResult {
    const lp = prompt.toLowerCase();
    const theme = lp.includes('forest') ? 'forest'
      : lp.includes('city') || lp.includes('urban') ? 'urban'
      : lp.includes('ocean') || lp.includes('water') ? 'oceanic'
      : lp.includes('desert') ? 'desert'
      : lp.includes('mountain') ? 'alpine'
      : lp.includes('space') ? 'cosmic'
      : 'fantasy';

    const biomeMap: Record<string, string[]> = {
      forest: ['dense_forest', 'clearing', 'river'],
      urban: ['downtown', 'park', 'suburbs'],
      oceanic: ['shallow_reef', 'deep_ocean', 'beach'],
      desert: ['dunes', 'oasis', 'canyon'],
      alpine: ['peak', 'valley', 'glacier'],
      cosmic: ['asteroid', 'nebula', 'station'],
      fantasy: ['plains', 'hills', 'river'],
    };

    return {
      theme,
      biomes: biomeMap[theme] ?? biomeMap.fantasy,
      structures: Math.floor(seed % 10 + 5),
      npcs: Math.floor(seed % 5 + 3),
      lighting: 'dynamic',
      timeOfDay: seed % 2 === 0 ? 'day' : 'dusk',
      seed,
      properties: {},
    };
  }

  // ── Cache management ─────────────────────────────────────────────

  private computeCacheKey(prompt: string, seed: number): string {
    return `${prompt.toLowerCase().trim()}::${seed}`;
  }

  private getCached(key: string): CompositionResult | null {
    const entry = this.cache.find((e) => e.key === key);
    return entry?.result ?? null;
  }

  private addToCache(key: string, result: CompositionResult): void {
    // Remove existing entry with same key
    this.cache = this.cache.filter((e) => e.key !== key);
    this.cache.push({ key, result, timestamp: Date.now() });

    // Evict oldest if over capacity
    while (this.cache.length > this.config.cacheSize) {
      this.cache.shift();
    }
  }

  clearCache(): void {
    this.cache = [];
  }

  getCacheSize(): number {
    return this.cache.length;
  }

  // ── Token budget tracking ────────────────────────────────────────

  getTokensUsed(): number {
    return this.tokensUsed;
  }

  getTokenBudgetRemaining(): number {
    return Math.max(0, this.config.tokenBudget - this.tokensUsed);
  }

  resetTokenBudget(): void {
    this.tokensUsed = 0;
  }

  // ── Provider management ──────────────────────────────────────────

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  hasProvider(): boolean {
    return this.provider !== null;
  }

  // ── Stats ────────────────────────────────────────────────────────

  getGenerateCount(): number {
    return this.generateCount;
  }

  getRetryHistory(): Array<{ prompt: string; attempts: number; success: boolean }> {
    return [...this.retryHistory];
  }

  getSuccessRate(): number {
    if (this.retryHistory.length === 0) return 1;
    const successes = this.retryHistory.filter((r) => r.success).length;
    return successes / this.retryHistory.length;
  }
}
